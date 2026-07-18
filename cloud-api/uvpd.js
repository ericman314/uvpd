var fs = require('fs')
var express = require('express')
var config = require('./config')
var bodyParser = require('body-parser')
var util = require('util')
var app = express()
var server = require('http').Server(app)
var io = require('socket.io')(server)
var mysql = require('mysql')
var morgan = require('morgan')
var { execSync, execFile } = require('child_process')
var fileUpload = require('express-fileupload')
var uuid = require('uuid/v1')
var moment = require('moment')

var dataDir = config.dataDir || __dirname

var conn = mysql.createPool({
  connectionLimit: 10,
  host: config.dbHost,
  user: config.dbUser,
  password: config.dbPw,
  database: config.dbName
})

app.use(morgan('combined'))

app.use(fileUpload({ safeFileNames: true, preserveExtension: 4, limits: { fileSize: 15 * 1024 * 1024 } }))

app.use(bodyParser.json({       // to support JSON-encoded bodies
  limit: '20mb'
}))
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true,
  limit: '20mb'
}))

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
    return
  }
  next()
})

app.post('/api/v3/mysqldump', (req, res) => {
  if (req.body.secret === config.secret) {
    const cmd = `mysql --database pinewood -u${config.dbUser} -p${config.dbPw}`
    try {
      var output = execSync(cmd, { maxBuffer: 1e7, input: req.body.sql, timeout: 3000 })
      res.json({ ok: true })
      io.emit('newdata')
    } catch (ex) {
      console.log(ex.toString())
      res.json({ err: ex })
    }
  } else {
    res.json({ err: 'Incorrect secret' })
  }
})

// app.get('/api/v3/mysqldump', (req, res) => {
//   res.json({ err: 'Please try again using POST' })
// })

app.get('/api/v3/events', function (req, res) {
  var where = 'WHERE hidden = 0'
  var params = []
  // Compare against Utah-local date (server is UTC). -06:00 is MDT.
  if (req.query.hasOwnProperty('dayStart')) {
    where += " AND DATEDIFF(eventDate, CONVERT_TZ(NOW(), '+00:00', '-06:00')) >= ? "
    params.push(req.query.dayStart)
  }
  if (req.query.hasOwnProperty('dayEnd')) {
    where += " AND DATEDIFF(eventDate, CONVERT_TZ(NOW(), '+00:00', '-06:00')) < ? "
    params.push(req.query.dayEnd)
  }
  conn.query(`SELECT * FROM Events ${where} ORDER BY EventDate DESC`, params, function (err, rows) {
    if (err) {
      console.log(err)
      res.json({ error: err })
    }
    else {
      res.json(rows)
    }
  })
})

app.get('/api/v3/carsByEventId', function (req, res) {
  // Does not require the secret key (it would be public anyway)
  if (/^[0-9]+$/.test(req.query.eventId)) {
    conn.query("SELECT * FROM Cars WHERE eventId = ?", [req.query.eventId], function (err, rows) {
      if (err) {
        res.json({ error: err })
      }
      else {
        res.json(rows)
      }
    })
  }
})

app.get('/api/v3/resultsByEventId', function (req, res) {
  if (/^[0-9]+$/.test(req.query.eventId)) {
    conn.query("SELECT * FROM Results WHERE eventId = ?", [req.query.eventId], function (err, rows) {
      if (err) {
        res.json({ error: err })
      }
      else {
        res.json(rows)
      }
    })
  }
})

app.get('/api/v3/carsAndResultsByEventId', function (req, res) {
  if (/^[0-9]+$/.test(req.query.eventId)) {

    const carSql = `SELECT Cars.*, GROUP_CONCAT(DISTINCT Achievements.achievement SEPARATOR ', ') as allAchs FROM Cars 
    LEFT JOIN Achievements ON Cars.carId = Achievements.carId
    WHERE Cars.eventId = ?
    GROUP BY Cars.carId`

    conn.query(carSql, [req.query.eventId], function (err, cars) {
      if (err) {
        res.json({ error: err })
      }
      else {
        conn.query("SELECT * FROM Results WHERE eventId = ?", [req.query.eventId], function (err, results) {
          if (err) {
            res.json({ error: err })
          }
          else {
            res.json({ cars, results })
          }
        })
      }
    })
  }
})

// New style using HTML5 canvas and dataURL
app.post('/api/v3/checkin', function (req, res) {

  var checkInId = uuid()
  var carName = req.body.name
  var nickname = req.body.nickname
  var den = req.body.den
  var checkInEventId = req.body.checkInEventId

  console.log(carName)  // At this point, the unicode characters aren't working....
  // What are the headers?
  console.log(req.headers)

  // Add entry to database
  conn.query("INSERT INTO CheckIn SET ?", [{ checkInId, carName, nickname, den, checkInEventId }], function (err) {
    if (err) {
      res.redirect('/check-in-failed')
      console.log(err)
      return
    }

    // Save file
    let preamble = 'data:image/jpeg;base64,'
    if (req.body.photo.startsWith(preamble)) {
      let outfile = dataDir + '/checkin/' + checkInId + '.jpg'
      let imgData = req.body.photo.substr(preamble.length)
      fs.writeFile(outfile, imgData, { encoding: 'base64' }, err => {
        if (err) {
          console.log(err)
          res.redirect('/check-in-failed')
          return
        }
        res.redirect('/check-in-confirmation')
      })
    }
  })
})


/*
// Old style using traditional file upload and resize on server
app.post('/api/v3/checkin', function (req, res) {
 
  console.log(req.body)
  console.log(req.files)
 
  var checkInId = uuid()
  var carName = req.body.name
  var nickname = req.body.nickname
  var den = req.body.den
 
  // Add entry to database
  conn.query("INSERT INTO CheckIn SET ?", [{ checkInId, carName, nickname, den }], function (err) {
    if (err) {
      res.redirect('/check-in-failed')
      console.log(err)
      return
    }
 
    inFile = __dirname + '/tmp/' + req.files.photo.name
    outFile = __dirname + '/checkin/' + checkInId + '.jpg'
 
    // Move file to temporary folder
    req.files.photo.mv(inFile, function (err) {
      if (err) {
        res.redirect('/check-in-failed')
        console.log(err)
        return
      }
 
      // Convert, resize, and crop
      execFile('convert', [inFile, '-resize', '640x480^', '-gravity', 'center', '-extent', '640x480', '-quality', '90', outFile], function (err) {
        if (err) {
          res.redirect('/check-in-failed')
          console.log(err)
          return
        }
        res.redirect('/check-in-confirmation')
      })
    })
  })
})
*/

app.post('/api/v3/checkinadded', function (req, res) {
  var checkInId = req.body.checkInId
  var addedToEventId = req.body.eventId
  conn.query("UPDATE CheckIn SET addedToEventId = ? WHERE checkInId = ?", [addedToEventId, checkInId], function (err) {
    if (err) {
      console.log(err)
      res.json({ err: err })
      return
    }
    res.json({ success: true })
  })
})

app.get('/api/v3/checkinlist', function (req, res) {
  if (req.query.secret === config.secret) {

    let where = 'WHERE 1 = 1'
    let params = []
    if (req.query.notAdded) {
      where += ' AND addedToEventId IS NULL'
    }
    if (req.query.recent) {
      where += ' AND DATEDIFF(NOW(), time) < 4'
    }
    if (req.query.eventId) {
      where += ' AND checkInEventId = ?'
      params.push(req.query.eventId)
    }
    let sql = `SELECT * FROM CheckIn ${where} ORDER BY time DESC`

    conn.query(sql, params, function (err, rows) {
      if (err) {
        console.log(err)
        res.json({ err: err })
        return
      }
      res.json(rows)
    })
  }
  else {
    res.json({ err: 'Incorrect secret' })
  }
})

app.post('/api/v3/vote', function (req, res) {
  // Does not require secret key
  if (req.body.votes) {
    var votes = req.body.votes.split(',')
    if (votes.length <= 3) {
      for (var i = 0; i < votes.length; i++) {
        var vote = votes[i]
        if (/[0-9]{1,9}/.test(vote)) {
          conn.query("INSERT INTO Votes(carId, Votes) VALUES(?, 1) ON DUPLICATE KEY UPDATE Votes = Votes + 1", [vote], function (err) {
            if (err) {
              console.log(err)
            }
          })
        }
      }
    }
  }
  // Every request results in an (almost) immediate and identical response; do not betray any secrets!
  res.json({ "message": "Thank you" })

})

app.post('/api/v3/carImage', function (req, res) {

  console.log(req.body)

  if (req.body.secret === config.secret) {

    // Validate req.body.Id if you value your life
    if (/[0-9]{1,9}/.test(req.body.Id)) {

      var filename = dataDir + "/cars/" + req.body.Id + ".jpg"
      if (req.body.imageData) {
        console.log("Writing " + filename)
        const imageData = req.body.imageData.replace('data:image/jpeg;base64,', '')
        fs.writeFile(filename, new Buffer(imageData, "base64"), err => {
          if (err) {
            console.log(err)
            return
          }
          res.json({ "result": "Image received" })
        })

      }
      else {
        // Check to see if image file exists.

        fs.stat(filename, function (err, stat) {
          if (err == null) {
            res.json({ "result": "Image exists" })
          }
          else if (err.code == 'ENOENT') {
            res.json({ "result": "Image does not exist" })
          }
          else {
            console.log('Some other error: ', err.code)
            res.json({ "err": err.code })
          }
        })
      }
    }
    else {
      res.json("{err: Invalid Id}")
    }

  }
  else {
    res.status('403')
    console.log("Forbidden")
  }

})

app.get('/api/v3/carDetails/', function (req, res) {
  if (/[0-9]{1,9}/.test(req.query.id)) {
    // Get all the details for this car
    let carId = parseInt(req.query.id)

    // Get basic info for car
    conn.query('SELECT * FROM Cars WHERE carId = ?', [carId], (err, rows) => {
      if (err) {
        return res.json({ err })
      }
      if (rows.length === 0) {
        return res.json({ err: 'Not found' })
      }
      let car = rows[0]
      // Get achievements for this car
      conn.query('SELECT * FROM Achievements WHERE carId = ?', [carId], (err, rows) => {
        if (err) {
          return res.json({ err })
        }
        car.achievements = rows.map(r => r.achievement)

        // Get results for this car
        conn.query('SELECT * FROM Results WHERE carId = ? ORDER BY resultDate ASC', [carId], (err, rows) => {
          if (err) {
            return res.json({ err })
          }
          car.results = rows

          // Find list of available replay videos
          fs.readdir(dataDir + '/videos', (err, files) => {
            if (err) {
              return res.json({ err })
            }

            files.reverse()

            // Ugh. There are timestamps on the results and these videos, but _they don't match_. They are usually within 10 seconds of each other.
            let nReplaysFound = 0
            for (let f of files) {
              let fd = moment(f.substring(0, f.indexOf('.webm')))
              for (let r of car.results) {
                if (r.replayFilename) continue
                let fr = moment(r.resultDate)
                let diff = fr.diff(fd)
                if (diff > -12000 && diff < 2000) {
                  r.replayFilename = f
                  nReplaysFound++
                }
              }
              if (nReplaysFound === car.results.length) {
                break
              }
            }

            res.json(car)
          })
        })
      })
    })
  }
})

app.use('/api/v3/video', express.static(dataDir + '/videos'))


app.get('/api/v3/cars/:id.jpg', function (req, res) {
  if (/[0-9]{1,9}/.test(req.params.id)) {
    var filename = dataDir + "/cars/" + req.params.id + ".jpg"
    res.sendFile(filename)
  }
})

app.get('/api/v3/checkin/:id.jpg', function (req, res) {
  if (/[0-9a-f\-]{36}/.test(req.params.id)) {
    var filename = dataDir + "/checkin/" + req.params.id + ".jpg"
    res.sendFile(filename)
  }
})

app.use(function (req, res, next) {
  res.status(404)
  res.send({ error: 'Not found' })
})

io.on('connection', socket => {
  console.log('socket connected:' + socket.id)
})

server.listen(config.expressPort, function () {
  console.log("Listening on *:" + config.expressPort)
})
