var mongoose = require('mongoose');
var ObjectId = mongoose.ObjectId;
var config = require('./config/config.json');
var fs = require('fs');
var Event = require('./EventModel.js');
var Url = require('./UrlModel.js');
var Car = require('./CarModel.js');


mongoose.connect(config.dbUrl); // connect to our database

var fout = fs.createWriteStream("results.csv");

Event.find({}, function(err, events) {  
  events.forEach(function(event) {
    event.cars.forEach(function(car) {
      car.results.forEach(function(result) {
        console.log(event.id, result.id, car.id, event.name, car.name, result.lane, result.time);
        fout.write([event.id, result.id, car.id, event.name, car.name, result.lane, result.time].join(',') + "\n");
      });
    });
  });
});

setTimeout(function() {
fout.end();
},5000);