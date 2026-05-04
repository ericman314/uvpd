var mongoose = require('mongoose');
var Event = require('./EventModel.js');
var Url = require('./UrlModel.js');
var Car = require('./CarModel.js');
var util = require('util');
var config = require('./config/config.json');
var process = require('process');
var mysql = require('mysql')
var moment = require('moment')
var fs = require('fs')
mongoose.connect(config.dbUrl); // connect to our database


/** Create a pool of connections to the MySQL database */
var pool  = mysql.createPool({
  connectionLimit : 10,
  host            : config.mysql_host,
  user            : config.mysql_user,
  password        : config.mysql_pass,
  database        : 'pinewood'
});



var excludeEventIds = [
  '57d1a838af68f14c4d661cd9',
  '5891434ce56ad8b0152c0180',
  '5a9dd5d06266eed60e9ab99c',
  '59a5e3bd879822583694a500'
];

let eventIds = {}
let carIds = {}
let resultIds = {}


// Protect against accidental execution
let cutoffDate = '2019-06-23'
if(moment().isAfter(cutoffDate)) {
  console.log('To protect against accidental loss of data, this script cannot be executed after', cutoffDate)
  process.exit(1)
}

// Drop all tables
pool.query('TRUNCATE TABLE Cars', () => {})
pool.query('TRUNCATE TABLE Events', () => {})
pool.query('TRUNCATE TABLE Results', () => {})
pool.query('TRUNCATE TABLE achievements', () => {})

Event.find().then(function(docs) {

  var totalCars = 0;

  docs.forEach(event => {

    if(excludeEventIds.includes(event.id)) {
      console.log('Excluding event', event.name)
      return;
    }
    
    // Add this event to mysql
    console.log(event.name)

    pool.query('INSERT INTO Events(eventName, eventDate, multiplier, code, shortUrl, longUrl, enableVoting) VALUES(?, ?, ?, ?, ?, ?, ?)', [event.name, event.date, event.multiplier, event.code, null, null, (event.options && event.options.onlineVoting) || false], (err, results) => {
      if(err) {
        console.error(err)
        return
      }

      let newEventId = results.insertId
      eventIds[event._id] = newEventId

      var cars = event.cars;

      // Add each car
      cars.forEach(car => {


        pool.query('INSERT INTO Cars(eventId, carName, weight, den, nickname) VALUES(?, ?, ?, ?, ?)', [newEventId, car.name, car.weight, car.den, car.nickname], (err, results) => {
          if(err) {
            console.error(err)
            return
          }

          let newCarId = results.insertId
          carIds[car._id] = newCarId

          fs.copyFile(__dirname + '/../www-pinewood-local/public/cars/' + car.id + '.jpg', __dirname + '/public/cars/' + newCarId + '.jpg', (err) => {
            if(err) {
              console.error(err)
            }
          })          

          let carResults = car.results

          // Add each result
          carResults.forEach(result => {
            pool.query('INSERT INTO Results(carId, lane, time, resultDate, place, eventId) VALUES(?, ?, ?, ?, ?, ?)', [newCarId, result.lane, result.time, result.date, result.place, newEventId], (err, results) => {
              if(err) {
                console.error(err)
                return
              }
            })
          })

          let achs = car.achievements
          achs.forEach(ach => {
            pool.query('INSERT INTO achievements(carId, Achievement, eventId) VALUES(?, ?, ?)', [newCarId, ach, newEventId], (err, results) => {
              if(err) {
                console.error(err)
                return
              }
            })
          })

        })

      })

      
    })
    
    var theseResults = [];
    
    
    
    
  })
  
  setTimeout(() => {
    fs.writeFileSync('carIds.json', JSON.stringify(carIds))
    console.log("File written");
  }, 5000);

})
.catch(ex => {
  console.log(ex);
});

