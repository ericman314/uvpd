var fs = require('fs');
var express = require('express');
var config = require('./config');
var bodyParser = require('body-parser')
var util = require('util');
var app = express();
var mysql = require('mysql');
var { execSync } = require('child_process')

var conn = mysql.createPool({
  connectionLimit: 10,
  host     : config.dbHost,
  user     : config.dbUser,
  password : config.dbPw,
  database : config.dbName
})


app.use(bodyParser.json({       // to support JSON-encoded bodies
  limit: '1mb'
}));       
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true,
  limit: '1mb'
})); 

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  if ('OPTIONS' === req.method) {
    res.sendStatus(200);
    return
  }
  next();
});

app.post('/api/v3/mysqldump', (req, res) => {
  if(req.body.secret === config.secret) {
    // TODO: Read SQL
    const cmd = `mysql --database pinewood -u${config.dbUser} -p${config.dbPw}`
    try {
      var output = execSync(cmd, { maxBuffer: 1e7, input: req.body.sql, timeout: 3000 })
      res.json({ ok: true })
    } catch (ex) {
      console.log(ex.toString())
      res.json({ err: ex })
    }
  } else {
    res.json({ err: 'Incorrect secret' })
  }
})

app.get('/api/v3/mysqldump', (req, res) => {
  res.json({ err: 'Please try again using POST' })
})

app.get('/api/v2/recentEvents', function(req, res) {
  
  // Does not require the secret key (it would be public anyway)
  conn.query("SELECT Name, Date, ResultsURL, Id, OnlineVoting FROM Events WHERE DATEDIFF(NOW(), Date) < 7 ORDER BY Events.Date DESC", function(err, rows) {
    if(err) {
      res.json({error: err});
    }
    else {
      res.json(rows);
    }
  });

});

app.get('/api/v2/recentCars', function(req, res) {

  // Does not require the secret key (it would be public anyway)
  conn.query("SELECT Cars.Name, Cars.Id, Cars.EventId, Cars.BestTime, Cars.Votes FROM Cars JOIN Events ON Cars.EventId = Events.Id WHERE DATEDIFF(NOW(), Events.Date) < 7 ORDER BY Events.Date DESC", function(err, rows) {
    if(err) {
      res.json({error: err});
    }
    else {
      res.json(rows);
    }
  });


});

app.post('/api/v2/recentEvent', function(req, res) {

  if(req.body.secret === config.secret) {
    
    conn.query("REPLACE INTO Events(Id, Name, Date, ResultsURL, OnlineVoting) VALUES(?, ?, ?, ?, ?)", [req.body.Id, req.body.Name, req.body.Date, req.body.ResultsURL, req.body.OnlineVoting == 'true' ? 1 : 0], function(err) {
      if(err) {
        console.log(err);
        res.json({error: err});
      }
      else {
        res.json({success: 1});
      }
    });

  }
  else {
    res.status('403');
    console.log("Forbidden");
  }

});

app.post('/api/v2/vote', function(req, res) {
  // Does not require secret key
  if(req.body.votes) {
    var votes = req.body.votes.split(',');
    if(votes.length <= 3) {
      for(var i=0; i<votes.length; i++) {
        var vote = votes[i];
        if(/[0-9a-f]{24}/.test(vote)) {
          conn.query("UPDATE Cars SET Votes = Votes + 1 WHERE Id = ?", [vote], function(err) {
            if(err) {
              console.log(err);
            }
          }); 
        }
      }
    }
  }
  // Every request results in an immediate and identical response; do not betray any secrets!
  res.json({"message": "Thank you"});

});

app.post('/api/v2/car', function(req, res) {

  if(req.body.secret === config.secret) {

    // Validate req.body.Id if you value your life
    if(/[0-9a-f]{24}/.test(req.body.Id)) {

      conn.query("REPLACE INTO Cars(Id, EventId, Name) VALUES(?, ?, ?)", [req.body.Id, req.body.EventId, req.body.Name], function(err, rows) {
        if(err) {
          console.log(err);
          res.json({error: err});
        }
        else {

          var filename = __dirname + "/cars/" + req.body.Id + ".jpg";
          if(req.body.imageData) {
            console.log("Writing " + filename);
            try {
              fs.writeFile(filename, new Buffer(req.body.imageData, "base64"));
            } catch (ex) {
              console.log(ex);
            }

            res.json({"result": "Image received"});
          }
          else {
            // Check to make sure the image file exists.

            fs.stat(filename, function(err, stat) {
              if(err == null) {
                res.json({"result": "Image exists"});
              }
              else if(err.code == 'ENOENT') {
                res.json({"result": "Image does not exist"});
              }
              else {
                console.log('Some other error: ', err.code);
                res.json({"err": err.code});
              }
            });
          }
        }
      });
    }
    else {
      res.json("{err: Invalid Id}");
    }

  }
  else {
    res.status('403');
    console.log("Forbidden");
  }

});

app.post('/api/v2/bestTimes', function(req, res) {


  if(req.body.secret === config.secret) {
    if(Array.isArray(req.body.BestTimes)) {
      for(var i=0; i<req.body.BestTimes.length; i++) {
        conn.query("UPDATE Cars SET BestTime = ? WHERE Id = ?", [req.body.BestTimes[i].BestTime, req.body.BestTimes[i].Id], function(err, rows) {
          if(err) {
            console.log(err);
          }
        }); 
      }
    }
  }

});

app.get('/api/v2/cars/:id.jpg', function(req, res) {

  if(/[0-9a-f]{24}/.test(req.params.id)) {
    var filename = __dirname + "/cars/" + req.params.id + ".jpg";
    res.sendFile(filename);
  }
});

app.use(function(req, res, next) {
  res.status(404);
  res.send({error: 'Not found' });
});

app.listen(config.expressPort, function() {
  console.log("Listening on *:" + config.expressPort);
});
