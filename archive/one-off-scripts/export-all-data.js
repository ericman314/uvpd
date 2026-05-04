var mongoose = require('mongoose');
var Event = require('./EventModel.js');
var Url = require('./UrlModel.js');
var Car = require('./CarModel.js');
var util = require('util');
var config = require('./config/config.json');
var process = require('process');
var mysql = require('mysql')
var moment = require('moment')
mongoose.connect(config.dbUrl); // connect to our database


/** Create a pool of connections to the MySQL database */
var pool  = mysql.createPool({
  connectionLimit : 10,
  host            : config.mysql_host,
  user            : config.mysql_user,
  password        : config.mysql_pass,
  database        : 'pinewood'
});


var cars = [];
console.log('resultId,ResultTime,lane,time,carId,Name,eventDate,multiplier,eventId,eventName');

var excludeEventIds = [
  '57d1a838af68f14c4d661cd9',
  '5891434ce56ad8b0152c0180',
  '5a9dd5d06266eed60e9ab99c',
  '59a5e3bd879822583694a500'
];

// Protect against accidental execution
let cutoffDate = '2019-06-10'
if(moment().isAfter(cutoffDate)) {
  console.log('Cannot execute after', cutoffDate)
  process.exit(1)
}

// Drop all tables

Event.find().then(function(docs) {

  var totalCars = 0;

  // Add this event to mysql


  for(var i=0; i<docs.length; i++) {
    
    var event = docs[i];
   
    var theseResults = [];

    if(excludeEventIds.includes(event.id)) {
      continue;
    }
    
    var cars = event.cars;

    for(var j=0; j<cars.length; j++) {
      var car = cars[j];
      var results = car.results;
      for(var k=0; k<results.length; k++) {
        var result = results[k];
        theseResults.push(results[k]);
        
        //  console.log(`${result.id},${result.date},${result.lane},${result.time.toFixed(6)},${car.id},"${car.name}",${event.date},${event.multiplier},${event.id},"${event.name}"`);
      }
      
      totalCars++;
      // console.log(event.date, event.name, event.multiplier);
    }
    
    theseResults.sort((a,b) => { return a.date + a.time < b.date + b.time ? -1 : 1; });
  
    if(theseResults.length === 0) {
      continue;
    }
    
    var curTime = theseResults[0].date;
    var place = 1;
    for(var j=0; j<theseResults.length; j++) {
      if(theseResults[j].date.getTime() != curTime.getTime()) {
        curTime = theseResults[j].date;
        place = 1;
      }
      theseResults[j].place = place;
      place++;
    }

    // Now loop through each car. Results will be iterated in chrono order, and place numbers are now known, just like they will be in the real thing.

    for(var j=0; j<cars.length; j++) {
      var car = cars[j];
      var ach = [];

      for(var k=0; k<car.results.length; k++) {
        var result = car.results[k];

        // Generate metadata that will be available during an actual race
        var isLastRace = k === car.results.length-1;

        // Find other results that raced this race
        var allTimes = [];
        for(var m=0; m<theseResults.length; m++) {
          if(theseResults[m].date.getTime() === result.date.getTime()) {
            allTimes.push(theseResults[m].time);
          }
        }
        allTimes.sort();


        // Transcendent car: Have a time of 2.718xxx (e): Will almost never happen
        if(result.time.toFixed(6).startsWith('2.718')) {
          ach.push('Transcendent Car');
        }

        // Fred Flintstone: Have a time over 4.00: 0.5% of cars
        if(result.time >= 4.0) {
          ach.push('Fred Flintstone Car');
        }
 
        // Well-rounded car: Have a time of 3.14xxxx (pi): 1% of cars
        if(result.time.toFixed(6).startsWith('3.14')) {
          ach.push('Well-Rounded Car');
        }

        // Top 1%: Have a time under 2.75: 1% of cars       
        if(result.time <= 2.75) {
          ach.push('Top 1%');
        }

        // Top 5%: Have a time under 2.775: 5% of cars       
        if(result.time <= 2.775) {
          ach.push('Top 5%');
        }

        // Top 1%: Have a time under 2.794: 10% of cars       
        if(result.time <= 2.794) {
          ach.push('Top 10%');
        }

        // Fuel-efficient vehicle: Have a time over 3.5: 2.8% of cars
        if(result.time > 3.5) {
          ach.push('Fuel-Efficient Vehicle');
        }

        // Photo Finish 1: Win a single race by 0.01s: 3% of cars
        if(result.place === 1 && allTimes.length > 1 && allTimes[1] - allTimes[0] < 0.01) {
          ach.push('Photo Finish');
        }

        // Photo Finish 2: Finish a race within 0.01s of another racer
        var myTimeIdx = allTimes.indexOf(result.time);
        if(myTimeIdx > 0 && allTimes[myTimeIdx] - allTimes[myTimeIdx-1] < 0.001
          ||
          myTimeIdx < allTimes.length-1 && allTimes[myTimeIdx+1] - allTimes[myTimeIdx] < 0.001) {
            ach.push('Splitting Hairs');
          }

        // The Come-back Kid: Finish last, then finish first
        if(result.place === 1) {
          // Is a previous result last place?
          for(var m=0; m<k; m++) {
            if(car.results[m].place === 4) {
              ach.push('Come-back Kid');
              break;
            }
          }
        }

        // The Runner-Up: Finish 2nd in each race
        if(isLastRace) {
          var fails = 0;
          for(var m=0; m<car.results.length; m++) {
            if(car.results[m].place !== 2) {
              fails++;
              break;
            }
          }
          if(fails <= 0) {
            ach.push('The Runner Up');
          }
        }
 
        // Finely tuned: Finish all races within 0.02 s
        if(isLastRace) {
          var minTime = 99;
          var maxTime = 0;
          for(var m=0; m<car.results.length; m++) {
            minTime = Math.min(car.results[m].time, minTime);
            maxTime = Math.max(car.results[m].time, maxTime);
          }
          if(maxTime - minTime < 0.02) {
            ach.push('Finely Tuned');
          }
        }

        // Cutting Edge: Improve your time in each race
        if(isLastRace) {
          var fail = false;
          for(var m=0; m<car.results.length-1; m++) {
            if(car.results[m].time < car.results[m+1].time) {
              fail = true;
            }
          }
          if(!fail) {
            ach.push('Cutting Edge');
          }
        }

        // Strong Finisher: Have your best time on your final race: 30% of cars
        if(isLastRace) {
          var minTime = 99;
          var maxTime = 0;
          for(var m=0; m<car.results.length; m++) {
            minTime = Math.min(car.results[m].time, minTime);
            maxTime = Math.max(car.results[m].time, maxTime);
          }
          if(result.time === minTime) {
            ach.push('Strong Finisher');
          }
        }

        // Wild Car: Achieve a spread of times greater than half of a second
        var minTime = 99;
        var maxTime = 0;
        for(var m=0; m<car.results.length; m++) {
          minTime = Math.min(car.results[m].time, minTime);
          maxTime = Math.max(car.results[m].time, maxTime);
        }
        if(maxTime - minTime > 0.5) {
          ach.push('Wild Car');
        }

      }

      car.achievements = ach;
    }

    for(var j=0; j<cars.length; j++) {
      var achs = cars[j].achievements.sort((a, b) => { return a>b ? 1:-1 });
      for(var k=achs.length; k>=0; k--) {
        if(achs[k] === achs[k-1] || achs[k] === '') {
          achs.splice(k, 1);
        }
      }
      cars[j].achievements = achs;
      console.log(cars[j].name + ": " + achs.length + " achievements. " + cars[j].achievements.join('|'));
    }
    // console.log(util.inspect(event, true, 6, true));
    // console.log(theseResults);
  }

  console.log(totalCars);

  mongoose.disconnect();
})
.catch(ex => {
  console.log(ex);
});



/**
 * achievements:
 * 
 * Transcendent car: Have a time of 2.718xxx (e): Has never happened
 * Fred Flintstone: Have a time over 4.00: 1.7% of cars
 * Fuel-efficient vehicle: Have a time over 3.5: 6% of cars
 * Well-rounded car: Have a time of 3.14xxxx (pi): 4% of cars
 * Top 10%: Have a time under 2.794: 10% of cars 
 * Top 5%: Have a time under 2.775: 5% of cars
 * Top 1%: Have a time under 2.75: 1% of cars
 * Photo Finish: Win a single race by 0.01s: 13% of cars
 * Splitting Hairs: Finish a race within 0.001s of another racer: 7% of cars
 * The Come-back Kid: Finish last, then finish first: 10% of cars
 * The Runner-Up: Finish 2nd in each race: 2% of cars
 * Finely tuned: Finish all races within 0.02 s: 19% of cars
 * Strong Finisher: Have your best time on your final race: 30% of cars
 * Cutting-edge: Improve your time in each race: 12% of cars
 * 
 * Percentage of cars earning this number of achievements:
 * 0: 30%
 * 1: 33%
 * 2: 21%
 * 3: 10%
 * 4: 3.2%
 * 5: 1.4%
 * 6: 0.6%
 * 
 */

/*

Simulation mode, no peripherals plugged in. Not full screen. Dev tools open.
W   L
20  0

Adding camera with0ut usb extension cable.
W   L
20  0

Adding extension cable.
W   L
20  0

Adding Arduino
W   L
20  0

Chrome in full screen (F11)
W   L
20  0

Adding projector
W   L
19  1
The one loss was with the camera pointed at the projector screen. The image was washed out so I moved it back to pointing at the computer. Could the bright light on the camera increase the frame rate and cause a buffer overrun or something???

Pointing camera at bright object
W   L
19  1

Plugged finish line into Arduino
W   L
16  6


*/
