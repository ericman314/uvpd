var express = require('express')
var app = express()
var bodyParser = require('body-parser')
var morgan = require('morgan')
var config = require('./config/config.json')
var fs = require('fs')
var mysql = require('mysql')
var server = require('http').Server(app)
var io = require('socket.io')(server)
var { exec } = require('child_process')
const moment = require('moment')
var { SerialPort } = require('serialport')
var { ReadlineParser } = require('@serialport/parser-readline')

/** Create a pool of connections to the MySQL database */
var pool = mysql.createPool({
  connectionLimit: 10,
  host: config.mysql_host,
  user: config.mysql_user,
  password: config.mysql_pass,
  database: 'pinewood'
})

/**
 * Executes the sql command with the optional supplied data
 * @param {String} sql The sql command to execute
 * @param {Array} data Array of values to be safely inserted into the command
 * @returns {Promise}
 */
function query(sql, data) {
  return new Promise((resolve, reject) => {
    pool.query(sql, data, (err, results, fields) => {
      if (err) {
        return reject(err)
      }
      return resolve(results)
    })
  })
}


server.listen(config.localport, () => {
  console.log('Pinewood derby app listening on port ' + config.localport)
})

app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.text({ limit: '10mb' }))

app.use('/', express.static(__dirname + '/public/'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html')
})

app.post('/api/eventNewSave', (req, res) => {

  // TODO: Validate req.body

  sql = 'INSERT INTO Events(eventName, eventDate, multiplier) VALUES(?, ?, ?)'

  query(sql, [req.body.name, moment(req.body.date).format('YYYY-MM-DD HH:mm:ss'), req.body.multiplier]).then(
    result => { res.json(result) },
    reason => {
      console.error(reason)
      res.json({ err: reason })
    }
  )

})

app.post('/api/eventUpdate', (req, res) => {

  var sql = 'UPDATE Events SET ? WHERE eventId = ?'
  var data = [{ eventName: req.body.name, eventDate: moment(req.body.date).format('YYYY-MM-DD HH:mm:ss'), multiplier: req.body.multiplier }, req.body.eventId]
  query(sql, data).then(
    result => { res.json(result) },
    reason => {
      console.error(reason)
      res.json({ err: reason })
    }
  )

})

app.post('/api/eventDelete', (req, res) => {

  var seq = Promise.resolve()
  seq.then(() => {
    return query('DELETE Results FROM Results JOIN Cars ON Results.carId = Cars.carId WHERE Cars.eventId = ?', [req.body.eventId])
  }).then(() => {
    return query('DELETE FROM Cars WHERE eventId = ?', [req.body.eventId])
  }).then(() => {
    return query('DELETE FROM Events WHERE eventId = ?', [req.body.eventId])
  }).then(
    result => { res.json(result) }
  ).catch(reason => {
    console.error(reason)
    res.json({ err: reason })
  })

})

app.post('/api/eventDeleteResults', (req, res) => {

  var queries = []

  queries.push(query('DELETE Results FROM Results JOIN Cars ON Results.carId = Cars.carId WHERE Cars.eventId = ?', [req.body.eventId]))
  queries.push(query('DELETE FROM Achievements WHERE eventId = ?', [req.body.eventId]))

  Promise.all(queries).then(
    results => { res.json(results) },
    reason => {
      console.error(reason)
      res.json({ err: reason })
    }
  )

})

app.get('/api/results.csv', (req, res) => {
  if (req.query.eventId) {
    getResultsData(req.query.eventId).then(data => {
      var csv = []
      for (var i = 0; i < data.flatTable.length; i++) {
        for (var j = 0; j < data.flatTable[i].length; j++) {
          //      data.flatTable.[i][j] = data.flatTable.[i][j].replace(/"/g, '\\"');
        }
        csv[i] = data.flatTable[i].join(',')
      }

      var csvText = csv.join('\r\n')
      res.type('text/csv').send(csvText)
    },
      err => {
        res.send(err)
      })
  }
  else {
    res.send("Missing query parameter: eventId")
  }
})

app.get('/api/eventCarsResults', (req, res) => {

  if (req.query.eventId) {
    var queries = []

    let selectEventsSql = mysql.format('SELECT * FROM Events WHERE eventId = ?', [req.query.eventId])

    let selectCarsSql = mysql.format(`SELECT Cars.*, GROUP_CONCAT(DISTINCT Achievements.Achievement SEPARATOR ',') as achievements
    FROM Cars
    LEFT JOIN Achievements ON Cars.carId = Achievements.carId
    WHERE Cars.eventId = ?
    GROUP BY Cars.carId`, [req.query.eventId])

    let selectResultsSql = mysql.format('SELECT * FROM Results JOIN Cars ON Results.carId = Cars.carId WHERE Cars.eventId = ?', [req.query.eventId])

    queries.push(query(selectEventsSql))
    queries.push(query(selectCarsSql))
    queries.push(query(selectResultsSql))

    Promise.all(queries).then(
      results => {
        res.json({ event: results[0][0], cars: results[1], results: results[2] })
      },
      reason => {
        res.json({ err: reason })
        console.log(reason)
      }
    )
  }
  else {
    res.json({ err: "Missing query parameter: eventId" })
  }
})

app.get('/api/eventList', (req, res) => {
  query('SELECT * FROM Events ORDER BY eventDate DESC').then(
    result => { res.json(result) },
    reason => {
      console.log(reason)
      res.json({ err: reason })
    }
  )
})

app.post('/api/newCarSave', (req, res) => {

  // Save the image somewhere other than the db
  var imageData = req.body.car.imageData

  if (req.body.eventId && req.body.car) {

    var newCar = {
      eventId: req.body.eventId,
      carName: req.body.car.carName,
      deferPerm: req.body.car.deferPerm
    }

    if (req.body.car.weight) newCar.weight = req.body.car.weight
    if (req.body.car.den) newCar.den = req.body.car.den
    if (req.body.car.nickname) newCar.nickname = req.body.car.nickname


    query('INSERT INTO Cars SET ?', newCar).then(
      result => {

        if (imageData) {
          imageData = imageData.replace('data:image/jpeg;base64,', '')
          var filename = __dirname + "/public/cars/" + result.insertId + ".jpg"
          fs.writeFile(filename, new Buffer(imageData, "base64"), (err) => {
            if (err) {
              console.error(err)
            }
          })
        }

        //      sendCarToRemoteServer(newCar._id.toString(), req.body.eventId, newCar.name, imageData);
        res.json({ result: result, secret: config.apiSecret })

      },
      reason => {
        console.log(reason)
        res.json({ err: reason })
      }
    )
  }
  else {
    res.json({ err: "Missing data: eventId and/or car" })
  }

})

// Give the client the secret (just ask!) This is actually so we don't have to store the secret anywhere else
app.get('/api/apiSecret', (req, res) => {
  res.json({ secret: config.apiSecret })
})

app.post('/api/carUpdate', (req, res) => {

  // Save the image somewhere other than the db
  var imageData = req.body.imageData

  if (req.body.carId) {

    var updCar = {
      carName: req.body.carName,
      deferPerm: req.body.deferPerm
    }

    if (req.body.weight) updCar.weight = req.body.weight
    if (req.body.den) updCar.den = req.body.den
    if (req.body.nickname) updCar.nickname = req.body.nickname


    query('UPDATE Cars SET ? WHERE carId = ?', [updCar, req.body.carId]).then(
      result => {

        if (imageData) {
          imageData = imageData.replace('data:image/jpeg;base64,', '')
          var filename = __dirname + "/public/cars/" + req.body.carId + ".jpg"
          fs.writeFile(filename, new Buffer(imageData, "base64"), (err) => {
            console.error(err)
          })
        }

        res.json({ result: result, car: updCar, secret: config.apiSecret })

      },
      reason => {
        console.log(reason)
        res.json({ err: reason })
      }
    )
  }
  else {
    res.json({ err: "Missing data: carId" })
  }

})

/** Provide the client with the public site URL (differs depending on whether this is development or production) */
app.get('/publicSiteUrl', (req, res) => {
  res.json({ url: config.publicSiteUrl })
})

app.get('/mysqldump', (req, res) => {

  let where = ''
  console.log(req.query.eventId)
  if (/[0-9]{1,24}/.test(req.query.eventId)) {
    where = `--where="eventId=${req.query.eventId}"`
  }
  console.log(where)

  let cmd
  if (req.query.complete) {
    cmd = `mysqldump --databases pinewood -u${config.mysql_user} -p${config.mysql_pass} --single-transaction`
  } else {
    cmd = `mysqldump --databases pinewood -u${config.mysql_user} -p${config.mysql_pass} --single-transaction --no-create-info --replace ${where}`
  }

  exec(cmd, { maxBuffer: 1e7 }, (err, stdout, stderr) => {
    if (err) {
      console.error(err)
      res.json({ err: err })
    }
    else {
      res.json({ output: stdout, secret: config.apiSecret })
    }
  })

})

function sendCarToRemoteServer(carId, eventId, Name, imageData) {
  var sent = false

  console.log("Sending car to remote server")
  var form = {
    Id: carId,
    eventId: eventId,
    Name: Name,
    secret: config.apiSecret
  }

  if (imageData) {
    // "data:image/jpeg;base64," has already been stripped off
    form.imageData = imageData
  }

  // TODO: This will need to be offloaded to the client: the server will not have an internet connection.
  /*
  request.post('https://utahvalleypinewoodderby.com/api/v2/car', {form: form}, (err, res) => {
    if(err) {
      console.log(err);
    }
    
    if(res && res.body) {
        
      var data = JSON.parse(res.body);
      
      if(data.err) {
        console.log(data.err);
      }
      if(data.result) {
        console.log(data.result);
      }
      if(data.result && data.result == "Image does not exist") {
        // Send the image
        console.log("We need to send the image.");
        var filename = __dirname + "/public/cars/" + carId + ".jpg";
        fs.readFile(filename, (err, buffer) => {
          if(err) {
            console.log(err);
          }
          form.imageData = buffer.toString('base64');
          request.post('https://utahvalleypinewoodderby.com/api/v2/car', {form: form}, (err, res) => {
            if(err) {
              console.log(err);
            }
            
          });
          
        });
        
      }
    }
    
  });
*/

}

app.post('/api/carDelete', (req, res) => {

  if (req.body.carId) {

    var seq = Promise.resolve()
    seq.then(() => {
      return query('DELETE FROM Results WHERE carId = ?', [req.body.carId])
    }).then(() => {
      return query('DELETE FROM Cars WHERE carId = ?', [req.body.carId])
    }).then(() => {
      res.json({ result: "deleted" })
    }).catch(reason => {
      console.error(reason)
      res.json({ err: reason })
    })
  }
  else {
    res.json({ err: "Missing data: carId" })
  }

})

app.get('/api/car', (req, res) => {

  if (req.query.carId) {


    var queries = []

    let selectCarSql = mysql.format(`SELECT Cars.*, GROUP_CONCAT(DISTINCT Achievements.Achievement SEPARATOR ',') as achievements
        FROM Cars
        LEFT JOIN Achievements ON Cars.carId = Achievements.carId
        WHERE Cars.carId = ?`, [req.query.carId])

    let selectResultsSql = mysql.format('SELECT * FROM Results WHERE carId = ?', [req.query.carId])

    queries.push(query(selectCarSql))
    queries.push(query(selectResultsSql))

    Promise.all(queries).then(
      results => {
        res.json({ car: results[0][0], results: results[1] })
      },
      reason => {
        res.json({ err: reason })
        console.log(reason)
      }
    )
  }
  else {
    res.json({ err: "Missing query parameter: carId" })
  }

})

app.post('/api/result', (req, res) => {

  if (req.body.eventId && req.body.carId && req.body.lane && req.body.time && req.body.place && req.body.resultDate) {

    var newResult = {
      eventId: req.body.eventId,
      carId: req.body.carId,
      lane: req.body.lane,
      time: req.body.time,
      place: req.body.place,
      resultDate: moment(req.body.resultDate).format('YYYY-MM-DD HH:mm:ss')
    }

    query('INSERT INTO Results SET ?', newResult).then(
      result => {
        res.json({ result: result })
      },
      reason => {
        res.json({ err: reason })
        return console.log(reason)
      }
    )
  }
  else {
    res.json({ err: "Missing data: carId, lane, date, place, and/or time" })
  }
})

app.post('/api/achievements', (req, res) => {


  if (req.body.carId && req.body.achievements && req.body.eventId && req.body.achievements.length) {
    let sql = 'INSERT IGNORE INTO Achievements(carId, Achievement, eventId, AchHash) VALUES ?'
    let data = req.body.achievements.map(a => {
      let hash = require('crypto').createHash('md5').update(a).digest("hex")
      return [req.body.carId, a, req.body.eventId, hash]
    })
    let formatted = mysql.format(sql, [data])

    query(formatted).then(
      result => {
        res.json({ result: result })
      },
      reason => {
        res.json({ err: reason })
        return console.log(reason)
      }
    )
  }
  else {
    res.json({ err: "Missing data: carId and/or achievements and/or eventId" })
  }
})

app.post('/api/resultDelete', (req, res) => {

  if (req.body.resultId) {

    query('DELETE FROM Results WHERE resultId = ?', [req.body.resultId]).then(
      result => {
        res.json({ result: "deleted" })
      },
      reason => {
        console.error(reason)
        res.json({ err: reason })
      }
    )
  }
  else {
    res.json({ err: "Missing data: resultId" })
  }
})

app.post('/api/videoUpload', (req, res) => {
  let buff = Buffer(req.body.substring(req.body.indexOf(',') + 1), 'base64')
  let fn = `${__dirname}/videos/${new Date()}.webm`
  fs.writeFile(fn, buff, () => {
    res.json({ result: 'saved' })
  })
})

app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html')
})


/*********** socket.io ************/



var socket

io.on("connection", sock => {
  socket = sock

  // Simulation
  socket.on('simulate', data => {
    handleSerialData(data)
  })

})


function getResultsData(eventId) {


  var queries = []

  let selectEventsSql = mysql.format('SELECT * FROM Events WHERE eventId = ?', [eventId])

  let selectCarsSql = mysql.format(`SELECT Cars.*, GROUP_CONCAT(DISTINCT Achievements.Achievement SEPARATOR ',') as achievements
  FROM Cars
  LEFT JOIN Achievements ON Cars.carId = Achievements.carId
  WHERE Cars.eventId = ?
  GROUP BY Cars.carId`, [eventId])

  let selectResultsSql = mysql.format('SELECT * FROM Results JOIN Cars ON Results.carId = Cars.carId WHERE Cars.eventId = ?', [eventId])

  queries.push(query(selectEventsSql))
  queries.push(query(selectCarsSql))
  queries.push(query(selectResultsSql))

  Promise.all(queries).then(
    results => {
      console.log(results)
      // res.json({ event: results[0][0], cars: results[1], results: results[2] })
    },
    reason => {
      res.json({ err: reason })
      console.log(reason)
    }
  )

  return 

  return Event.findById(eventId).then(doc => {

    // DO something with doc and return it
    var data = []

    var mult = doc.multiplier
    var header = ["Car", "place", "Best time", "Average time", "den", "Weight", "COM"]

    for (var i = 0; i < mult; i++) {
      header.push("Blue Lane")
      header.push("Yellow Lane")
      header.push("Green Lane")
      header.push("Red Lane")
    }

    //data.push(header);  

    bestTimes = []

    for (var i = 0; i < doc.cars.length; i++) {

      var laneMultCount = [0, 0, 0, 0]

      var row = [doc.cars[i].name, 0, 0, 0, doc.cars[i].den, doc.cars[i].weight, doc.cars[i].com]
      var offsetHeader = row.length - 1

      var bestTime = 99999
      var sumTime = 0
      for (var j = 0; j < doc.cars[i].results.length; j++) {
        var result = doc.cars[i].results[j]
        bestTime = Math.min(bestTime, result.time)
        sumTime += result.time
        row[offsetHeader + result.lane + laneMultCount[result.lane - 1] * 4] = result.time
        laneMultCount[result.lane - 1]++
      }
      if (doc.cars[i].results.length > 0) {
        sumTime /= doc.cars[i].results.length
      }
      else {
        sumTime = ''
        bestTime = ''
      }

      row[3] = sumTime
      row[2] = bestTime

      bestTimes.push({ Id: doc.cars[i]._id.toString(), BestTime: bestTime })

      for (var k = 0; k < row.length; k++) {
        if (typeof (row[k]) === 'undefined') {
          row[k] = ''
        }
      }

      console.log(row)

      data.push(row)

    }

    data.splice(0, 0, header)

    console.log(data.map(a => [a[0], a[1], a[2], a[3], a[4]].join(',')))

    return { flatTable: data, docCode: doc.code, bestTimes: bestTimes }

  }, console.error)
}

/**************** serial ***********************/

var port
var parser

setInterval(function () {
  if (!port || !port.isOpen) {
    console.log('Port is not open')
    console.log(port)
    SerialPort.list().then(ports => {

      // console.log('Ports:')
      // console.log(ports)

      var usbPorts = ports.map(x => x.path).filter(x => x.indexOf('ACM') > 0)
      if (usbPorts.length > 0) {

        console.log("Available ports: " + usbPorts.join(", ") + ". Trying to connect to " + usbPorts[0])
        port = new SerialPort({ path: usbPorts[0], baudRate: 115200 }, function (err) {
          if (err) {
            console.log(err)
            socket.emit("serialState", { connected: false, err: err })
            port = null
          } else {
            console.log('Connected!')
          }

          if (socket) {
            socket.emit("serialState", { connected: true, port: usbPorts[0] })
          }
        })

        port.on('error', function (err) {
          console.log('Error: ', err.message)
          port.close(function () {
            port = null
          })
          port = null
        })

        port.on('disconnect', function (err) {
          console.log('Disconnect: ', err.message)
          port = null
        })

        port.on('close', function () {
          console.log("Port closed.")
          port = null
        })

        parser = port.pipe(new ReadlineParser())

        parser.on('data', function (data) {
          handleSerialData(data.toString().trim())
        })


      }
      else {
        //console.log("No serial ports available");
        if (socket) {
          socket.emit("serialState", { connected: false, err: "No serial ports available" })
        }
      }
    }).catch(err => {
      console.log(err)
    })
  }

  if (port && port.isOpen && socket) {
    socket.emit("serialState", { connected: true })
  }

}, 5000)

let startTime

function handleSerialData(data) {
  console.log(data)
  if (data[0] === 'S') {
    if (socket) {
      startTime = Date.now()
      socket.emit('startingGateReleased')
    }
    else {
      console.log("Warning: socket not open")
    }
  }
  else if (data[0] === 'T') {
    var match = /^Trigger,([0-3]),([0-9]+)/.exec(data)

    if (socket) {
      if (match) {
        var lane = 5-(1+parseInt(match[1]))
        let time = parseInt(match[2]) * 1e-6
        let softwareTime = (Date.now() - startTime) * 1e-3
        let ratio = time / softwareTime
        console.log("hw/sw = " + ratio + ")")
        socket.emit('trigger', { lane, time, softwareTime })
      }
      else {
        console.log("Warning: invalid trigger message received: " + data)
      }
    }
    else {
      console.log("Warning: socket not open")
    }
  }
  else if (data[0] === 'E') {
    if (socket) {
      socket.emit('arduinoError', data)
    }
    else {
      console.log("Warning: socket not open")
    }
  }
  else if (data[0] === 'R') {
    if (socket) {
      socket.emit('readyForStart')
    }
    else {
      console.log("Warning: socket not open")
    }
  }
  else if (data[0] === 'P') {
    if (socket) {
      var match = /^Pin state change,([0-3]),([01])/.exec(data)

      if (socket) {
        if (match) {
          var lane = 5-(1+parseInt(match[1]))
          let state = parseInt(match[2])
          socket.emit('pinStateChange', { lane, state })
        }
      }
    }
    else {
      console.log("Warning: unrecognized message: " + data)
    }
  }

}