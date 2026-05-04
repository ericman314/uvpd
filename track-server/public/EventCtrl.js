angular.module('EventCtrl', ['socket']).controller('EventCtrl', function ($scope, $state, $stateParams, $http, $timeout, $interval, $uibModal, $rootScope, socket, dbReplicator) {

  /*
   * If one of the lanes is not working for some reason, remove the defective lane from this array.
   */
  // 2018-04-17 Lane 2 is triggering immediately.
  // 2018-04-23 Lane 2 was fixed.
  $scope.lanes = [1, 2, 3, 4];

  $scope.pinStates = [, 1, 1, 1, 1];

  $scope.laneColors = { 1: 'Blue', 2: 'Yellow', 3: 'Green', 4: 'Red' };
  $scope.allLanes = [1, 2, 3, 4];

  $scope.enableSimulation = false;

  $scope.event = {};
  $scope.cars = [];
  $scope.results = [];

  $scope.arduinoReady = false
  $scope.weAreReady = false

  $scope.webViewLink = '';
  $scope.shortUrl = '';
  $scope.raceTimes = [, 0, 0, 0, 0];  // Begin at index 1

  $scope.initTime = (new Date()).toString();


  $scope.messages = [

    'If your name and car appear under NOW RACING, place your car on the track. Remember to retrieve your car at the finish line after each race.',

    'Each car will race once on each lane. Only the best time will count.',

    'View live results at <b>UtahValleyPinewoodDerby.com</b>',

    'Parents, thank you for keeping your children away from the track.',

    'The first pinewood derby was held on May 15, 1953 at Manhattan Beach, California.',

    'The pinewood derby was created as a more accessible alternative to the Soap Box Derby.',

    '"I wanted to devise a wholesome, constructive activity that would foster a closer father-son relationship and promote craftsmanship and good sportsmanship through competition." - Don Murphy, Founder of the Pinewood Derby',

    'Live results from this race can be found at <b>UtahValleyPinewoodDerby.com</b>.',

    'Where are books about pinewood derby cars kept in the library?',

    'Where are books about pinewood derby cars kept in the library?<br><br><b>In the non-friction section.</b>',

    'In October 1954, Boys\' Life Magazine offered to provide plans for a track, starting, and finishing line mechanisms for 15 cents.',

    'The pinewood derby track, cars, and rules have changed very little since their inception 65 years ago.',

    'Since the first pinewood derby, Cub Scouts have built close to 100 million pinewood derby cars!',

    'If all the pinewood derby cars ever built were laid end-to-end, the line of cars would stretch halfway around the earth.',

    'The first pinewood derby track used a simple electronic circuit comprising a pair of doorbell buttons and lightbulbs to indicate the winner of each race.',

    'The electronic timer used on this track is accurate to a twenty-thousandth of a second and can detect a first-place finish by less than a hundredth of an inch.',

    'What is the laziest part of a car?',

    'What is the laziest part of a car?<br><br><b>The wheels, because they\'re always tired.</b>',

    'View a Google spreadsheet of live results on your mobile device by visiting <b>UtahValleyPinewoodDerby.com</b>.',

    'A typical pinewood derby track is between 32 and 40 feet long, and four feet high.',

    'The longest pinewood derby track ever constructed was in Ashland, Nebraska, and measured 1,819 feet in length, longer than six football fields. The winning car\'s time was 1 minute and 17 seconds.',

    'If a pinewood derby car racing down a track was enlarged to the size of a real automobile, it would be speeding along at more than 200 miles per hour!',

    ''

  ];

  $scope.messageIndex = 0;

  console.log("Initializing controller at " + $scope.initTime);


  const resultsSorter = (a, b) => {
    let aTime = new Date(a.resultDate).getTime() - a.lane
    let bTime = new Date(b.resultDate).getTime() - b.lane
    if (aTime < bTime) return 1
    else if (aTime > bTime) return -1
    else return 0
  }


  $interval(function () {
    var d = new Date();
    var hr = d.getHours();
    var min = d.getMinutes();
    var ampm = "am";
    if (hr > 12) {
      hr -= 12;
      ampm = "pm";
    }
    $scope.wall_time = hr + ":" + ("0" + min).substr(-2) + " " + ampm;

  }, 1000);

  if ($state.current.name == "event-details.race") {
    $state.go('event-details');
  }

  if ($stateParams.eventId) {

    $http.get('/api/eventCarsResults', { params: { eventId: $stateParams.eventId } }).then(function (result) {
      if (result.data.err) {
        console.error(result.data.err);
      }
      else {
        $scope.event = result.data.event;
        $scope.cars = result.data.cars;
        $scope.results = result.data.results;
        $scope.results.sort(resultsSorter)
        $scope.cars.forEach(car => { car.achievements = car.achievements ? car.achievements.split(',') : [] })
      }
    },
      function (reason) {
        console.log(reason);
      });

  }

  $scope.filterEmptyResults = function (value, index, array) {
    return value.result.time > 0;
  };

  $scope.editEvent = function () {

    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'event-new.html',
      controller: 'EventNewCtrl',
      size: 'lg',
      resolve: {
        options: function () {
          return {
            heading: "Edit Event",
            okButton: "Update",
            model: {
              name: $scope.event.eventName,
              date: $scope.event.eventDate,
              multiplier: $scope.event.multiplier
            }
          };
        }
      }
    });

    modalInstance.result.then(function (updatedEvent) {
      updatedEvent.eventId = $scope.event.eventId;
      $http.post('/api/eventUpdate', updatedEvent).then(function (response) {
        if (response.data.err) {
          console.error(response.data.err);
        }
        else {
          console.log(response);
          $scope.event.eventName = updatedEvent.name;
          $scope.event.eventDate = updatedEvent.date;
          $scope.event.multiplier = updatedEvent.multiplier;
        }
        // Send data to public website
        dbReplicator($scope.event.eventId);
      },
        function (reason) {
          console.error(reason);
        });


    },
      function () {
        // All done
      });

  };

  $scope.deleteEvent = function () {

    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'event-delete.html',
      controller: 'EventDeleteCtrl',
      size: 'sm',
    });

    modalInstance.result.then(function (result) {

      $http.post('/api/eventDelete', { eventId: $scope.event.eventId }).then(function (response) {
        if (response.data.err) {
          console.error(response.data.err);
        }
        else {
          console.log(response);
          $state.go('events-list');
        }
      },
        function (reason) {
          console.error(reason);
        });

      // TODO: Also delete from public site

    },
      function () {
        // All done
      });

  };

  var reloadAllData = function () {
    return $http.get('/api/eventCarsResults', { params: { eventId: $stateParams.eventId } }).then(function (result) {
      if (result.data.err) {
        console.error(result.data.err);
      }
      else {
        $scope.event = result.data.event;
        $scope.cars = result.data.cars;
        $scope.results = result.data.results;
        $scope.results.sort(resultsSorter)
        $scope.cars.forEach(car => { car.achievements = car.achievements ? car.achievements.split(',') : [] })
      }
      return result;
    },
      function (reason) {
        console.log(reason);
      });
  };

  $scope.eventDeleteResults = function () {

    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'event-delete-results.html',
      controller: 'EventDeleteResultsCtrl',
      size: 'sm',
    });

    modalInstance.result.then(function (result) {

      $http.post('/api/eventDeleteResults', { eventId: $scope.event.eventId }).then(function (response) {
        if (response.data.err) {
          console.error(response.data.err);
        }
        else {
          console.log(response);
          reloadAllData();

          // Strange bug: when using $state.reloadAllData(), then racingLane and onDeckLane are undefined in the socket event handler, even after assigning them in gotoRace! Very strange. This locally defined reloadAllData() function works though. UPDATE: This was caused by using a singleton socket.io dependency that did not unregister socket.on events when the controller was reloaded.

        }
        // Send data to public website
        dbReplicator($scope.event.eventId, true);
      },
        function (reason) {
          console.error(reason);
        });

    },
      function () {
        // All done
      });

  };

  $scope.addCars = function () {
    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'addCars.html',
      controller: 'AddCarsCtrl',
      size: 'lg',
      resolve: {
        options: function () {
          return {
            heading: "New Car",
            okButton: "Add",
            eventId: $scope.event.eventId
          };
        }
      }
    });

    modalInstance.result.then(function (newCar) {
      // The server will remove the imageData from newCar before saving in the db, and it will save the image data to a file with name equal to the _id of the newly created car.

      $http.post('/api/newCarSave', { car: newCar, eventId: $scope.event.eventId }).then(function (result) {
        if (result.data.err) {
          console.log(result.data.err);
        }
        else {
          if (newCar.checkInId) {
            // TODO: Tell the remote check-in server that we have added this car, so it doesn't appear again
            $http.post('https://utahvalleypinewoodderby.com/api/v3/checkinadded', { checkInId: newCar.checkInId, eventId: $scope.event.eventId })
            delete newCar.checkInId
          }
          newCar.carId = result.data.result.insertId;
          $scope.cars.push(newCar);

          // Re-open the dialog
          $scope.addCars();

          // Send data to public website
          dbReplicator($scope.event.eventId);

          // Send car image to public website
          dbReplicator.sendImage(newCar.carId, newCar.imageData, result.data.secret)
        }
      },
        function (reason) {
          console.error(reason);
        });


    },
      function () {
        // All done
      });
  };

  $scope.duplicateName = function () {
    var allNames = [];
    if ($scope.cars) {
      for (var i = 0; i < $scope.cars.length; i++) {
        allNames.push($scope.cars[i].name);
      }
      allNames.sort();
      for (var i = 0; i < allNames.length - 1; i++) {
        if (allNames[i] === allNames[i + 1]) {
          return allNames[i];
        }
      }
    }
    return null;
  };

  $scope.gotoRace = function () {

    // It takes two loops through moveToNextRun to get the cars into the racing position.
    for (var iter = 0; iter < 2; iter++) {
      // Check to see if any cars are currently racing. If so, return early.
      for (var j = 0; j < $scope.cars.length; j++) {
        if ($scope.cars[j].racingLane)
          break;
      }
      $scope.moveToNextRun();
    }
    $scope.status = "READY";

    $scope.$broadcast('initializeInstantReplayStream');

    // Reset everything
    $scope.standingsThisRace = [];
    $scope.standings = [];
    $scope.achievementsThisRace = [];
    $scope.animateRacing = false;
    $scope.animateOnDeckMoveUp = false;
    $scope.animateOnDeckAppear = false;
    for (i in $scope.lanes) {
      $scope.raceTimes[$scope.lanes[i]] = 0;
    }

    // Transition to child state 
    $state.go('event-details.race');
  };

  $scope.gotoWelcome = function () {
    $state.go('event-details.welcome');
  }

  $scope.gotoCredits = function () {
    $state.go('event-details.credits');
  }

  $scope.saveResult = function (car, lane, time, place, date) {

    var newResult = {
      lane: lane,
      time: time,
      place: place,
      resultDate: moment(date).format("YYYY-MM-DD HH:mm:ss"),
      carId: car.carId,
      eventId: $scope.event.eventId
    };

    $scope.results.push(newResult);
    $scope.results.sort(resultsSorter)

    // Format date in local time for POSTing since MySQL probably won't get the timezone right

    $http.post('/api/result', newResult).then(function (result) {
      if (result.data.err) {
        console.log(result.data.err);
      }
      else {
        // Add the inserted id which will enable us to delete the result without reloading
        newResult.resultId = result.data.result.insertId;
        newResult.resultDate = date.toISOString();
      }

      // Send data to public website
      dbReplicator($scope.event.eventId);
    }, function (reason) {
      console.log(reason);
    });


  };

  $scope.saveAchievements = function (car) {
    if (car.achievements && car.achievements.length) {
      $http.post('/api/achievements', { carId: car.carId, achievements: car.achievements, eventId: $scope.event.eventId }).then(function (result) {
        if (result.data.err) {
          console.error(result.data.err);
        }

        // Send data to public website
        dbReplicator($scope.event.eventId);
      }, function (reason) {
        console.log(reason);
      });
    }
  };

  $scope.deleteResult = function (result) {

    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'result-delete.html',
      controller: 'ResultDeleteCtrl',
      size: 'sm',
    });

    modalInstance.result.then(function (modalResult) {
      $http.post('/api/resultDelete', { resultId: result.resultId }).then(function (response) {
        if (response.data.err) {
          console.log(response.data.err);
        }
        else {
          console.log(response);

          var idx = $scope.results.indexOf(result);
          $scope.results.splice(idx, 1);

          // Send data to public website
          dbReplicator($scope.event.eventId);
        }
      },
        function (reason) {
          console.error(reason);
        });
    },
      function () {
        // All done
      });

  };

  /**
   * Get all the results for the specified car
   * @param {Car} car The car whose results to get
   * @returns {Result[]} The results of the specified car
   */
  $scope.getResultsByCar = function (car) {
    return $scope.results.filter(r => r.carId === car.carId);
  }

  /**
   * Get the car that belongs to this result.
   * @param {Result} result The result whose car to get
   * @returns {Car} The car belonging to the specified car.
   */
  $scope.getCarFromResult = function (result) {
    return $scope.cars.filter(c => c.carId === result.carId)[0];
  }


  $scope.deferTemporarily = function (lane) {

    // Swap car racing and car on deck    
    var racingCar = $scope.getRacing(lane);
    var onDeckCar = $scope.getOnDeck(lane);

    if(!racingCar) return

    racingCar.onDeckLane = lane;
    racingCar.racingLane = 0;
    if (onDeckCar) {
      onDeckCar.onDeckLane = 0;
      onDeckCar.racingLane = lane;
    }

  };

  $scope.deferPermanently = function (lane) {
    var cars = $scope.cars;

    var car = $scope.getRacing(lane);
    if(!car) return
    car.deferPerm = 1;

    for (var j = 0; j < cars.length; j++) {
      cars[j].onDeckLane = 0;
      cars[j].racingLane = 0;
    }

    $scope.moveToNextRun();
    $scope.moveToNextRun();

    $http.post('/api/carUpdate', car).then(function(response) {
      if(response.data.err) {
        console.log(response.data.err);
      }
      else {
        console.log(response);
        dbReplicator(car.eventId);
      }        
    },
    function(reason) {
      console.error(reason);
    });
  };

  $scope.moveToNextRun = function () {

    var cars = $scope.cars;

    // Move each of the cars on deck to racing    
    for (var j = 0; j < cars.length; j++) {

      cars[j].racingLane = cars[j].onDeckLane;
      cars[j].onDeckLane = 0;
    }

    // Calculate next cars to be on deck

    // This formula is deterministic so that the race order will be the same if the page is refreshed
    for (var idx in $scope.lanes) {
      var i = $scope.lanes[idx];
      // Calculate a score for each car on this lane
      var bestScore = null, bestCar = null;

      for (var j = 0; j < cars.length; j++) {
        var car = cars[j];
        var results = $scope.getResultsByCar(car);
        var score = 0;

        // Cars should run once on each lane before twice on any lane, and so on.
        // Has this car run on this lane enough times yet?
        if (results.filter(function (e) { return e.lane === i; }).length * $scope.lanes.length > results.length + (car.racingLane ? 1 : 0)) {
          score += 1e12;
        }

        // Has this car run enough times yet, including the currently scheduled race?
        if (results.filter(function (e) { return e; }).length + (car.racingLane ? 1 : 0) >= $scope.event.multiplier) {
          score += 1e12;
        }

        // How many times has the car raced?
        score += results.filter(function (e) { return e; }).length * 1e4;

        // How many times has this car ran on this lane?
        score += results.filter(function (e) { return e.lane === i; }).length * 1e5;

        // Is it racing right now on this lane?
        if (car.racingLane === i) {
          score += 1e12;
        }

        // Is it racing right now on any lane?
        if (car.racingLane) {
          score += 1e4;
        }

        // Has it already been scheduled for the next race?
        if (car.onDeckLane) {
          score += 1e12;
        }

        // Is the car deferred?
        if (car.deferPerm) {
          score += 1e12;
        }

        // Subtract the car's best time
        var times = results.filter(function (e) { return e; }).map(function (e) { return e.time; });
        if (times.length) {
          score -= Math.min.apply(null, times);
        }

        if (score < 9e11 && (score < bestScore || bestScore === null)) {
          bestScore = score;
          bestCar = car;
        }
      }

      if (bestCar) {
        bestCar.onDeckLane = i;
      }
    }
  };

  $scope.getOnDeck = function (lane) {
    for (var i in $scope.cars) {
      if ($scope.cars[i].onDeckLane === lane) {
        return $scope.cars[i];
      }
    }
  };

  $scope.getRacing = function (lane) {
    for (var i in $scope.cars) {
      if ($scope.cars[i].racingLane === lane) {
        return $scope.cars[i];
      }
    }
  };

  $scope.getOnDeckId = function (lane) {
    var thing = $scope.getOnDeck(lane);
    if (thing) {
      return thing.carId;
    }
    else {
      return "none";
    }
  };

  $scope.getRacingId = function (lane) {
    var thing = $scope.getRacing(lane);
    if (thing) {
      return thing.carId;
    }
    else {
      return "none";
    }
  };

  $scope.getOnDeckName = function (lane) {
    var thing = $scope.getOnDeck(lane);
    if (thing) {
      return thing.carName;
    }
    else {
      return "Unassigned";
    }
  };

  $scope.getRacingName = function (lane, opts) {
    opts = opts || {};
    var thing = $scope.getRacing(lane);
    if (thing) {
      return thing.carName;
    }
    else {
      if (opts.colorIfUnassigned)
        return $scope.laneColors[lane] + " Lane";
      else
        return "Unassigned";
    }
  };

  $scope.getRacingNickname = function (lane, opts) {
    opts = opts || {};
    var thing = $scope.getRacing(lane);
    if (thing) {
      return thing.nickname;
    }
  };

  $scope.getPlace = function (lane) {
    var place = 1;
    if ($scope.raceTimes[lane]) {
      for (i in $scope.lanes) {
        if ($scope.lanes[i] != lane && $scope.raceTimes[$scope.lanes[i]] && $scope.raceTimes[$scope.lanes[i]] < $scope.raceTimes[lane]) {
          place++;
        }
      }
      return place;
    }
    else {
      return '';
    }
  };

  $scope.getBestTimeThisRace = function () {
    var bestTime = 999;
    for (i in $scope.lanes) {
      if ($scope.raceTimes[$scope.lanes[i]] && $scope.raceTimes[$scope.lanes[i]] < bestTime) {
        bestTime = $scope.raceTimes[$scope.lanes[i]];
      }
    }
    return bestTime;
  };

  $scope.standingsThisRace = [];

  $scope.standings = [];
  $scope.computeStandings = function () {

    // Create array, then sort by bestTime:
    /**
     * [
     *   {
     *     name,
     *     bestTime
     *   }
     * ]
     */


    var bestBestTime = 9999;
    var allTimes = [];
    for (var i = 0; i < $scope.cars.length; i++) {
      var car = $scope.cars[i];
      var results = $scope.getResultsByCar(car);
      var bestTime = 9999;
      for (var j = 0; j < results.length; j++) {
        if (results[j].time < bestTime) {
          bestTime = results[j].time;
        }
      }
      if (bestTime < 9999) {
        allTimes.push({
          carName: car.carName,
          nickname: car.nickname && (' ' + car.nickname),
          time: bestTime
        });
        if (bestTime < bestBestTime) {
          bestBestTime = bestTime;
        }
      }
    }

    allTimes.sort(function (a, b) { return a.time - b.time; });

    for (var i = 0; i < allTimes.length; i++) {
      allTimes[i].place = i + 1;
      allTimes[i].deltaTime = allTimes[i].time - bestBestTime;
    }

    $scope.standings = [];

    for (var i = 0; i < allTimes.length; i++) {
      let j = i;
      if (i == 12) break;
      $timeout(function () {
        $scope.standings.push(allTimes[j]);
      }, 8000 + j * 100);
    }


  };

  $scope.achievementsThisRace = [];

  $scope.awardAchievements = function () {

    // The race just ended. Each car contains all results up to this moment.
    $scope.achievementsThisRace = [];

    // Make sure standings are sorted (in case serial port is not so serial??)

    $scope.standingsThisRace.sort((a, b) => a.time > b.time ? 1 : -1);

    $scope.lanes.forEach(lane => {
      var ach = [];

      var car = $scope.getRacing(lane);
      if (!car) {
        // No car assigned to this lane
        return;
      }
      var results = $scope.getResultsByCar(car);
      var result = results[0]; // Results are sorted in reverse chronological order, so [0] is the most recent

      if (!result) {
        // Car has no results (probably has not finished any races yet)
        return
      }

      // Was this race this car's last?
      var isLastRace = results.length === $scope.event.multiplier;

      // Transcendent car: Have a time of 2.718xxx (e): Will almost never happen
      if (result.time.toFixed(6).startsWith('2.718')) {
        ach.push('e-Car');
      }

      // Fred Flintstone: Have a time over 4.00: 0.5% of cars
      if (result.time >= 4.0 && result.time < 10.0) {
        ach.push('Off-Road Vehicle');
      }

      // Well-rounded car: Have a time of 3.14xxxx (pi): 1% of cars
      if (result.time.toFixed(6).startsWith('3.14')) {
        ach.push('pi-Car');
      }

      if (result.time.toFixed(6).startsWith('3.0000')) {
        ach.push('Exactly 3 Seconds')
      }

      if (result.time.toFixed(6).startsWith('4.0000')) {
        ach.push('Exactly 4 Seconds')
      }

      // Top 1%: Have a time under 2.75: 1% of cars       
      if (result.time <= 2.75) {
        ach.push('Top 1%');
      }

      // Top 5%: Have a time under 2.775: 5% of cars       
      if (result.time <= 2.775) {
        ach.push('Top 5%');
      }

      // Top 1%: Have a time under 2.794: 10% of cars       
      if (result.time <= 2.794) {
        ach.push('Top 10%');
      }

      // Fuel-efficient vehicle: Have a time over 3.5: 2.8% of cars
      if (result.time >= 3.5 && result.time < 4.0) {
        ach.push('Fuel-Efficient Vehicle');
      }

      // By a Nose: Win a single race by 0.01s: 13% of cars
      if (result.place === 1 && $scope.standingsThisRace.length > 1 && $scope.standingsThisRace[1].time - $scope.standingsThisRace[0].time < 0.01) {
        ach.push('By a Nose');
      }

      // Photo Finish: Finish a race within 0.001s of another racer: 7% of cars
      if ((result.place > 1 && result.time - $scope.standingsThisRace[result.place - 2].time < 0.001
        ||
        result.place < $scope.standingsThisRace.length && $scope.standingsThisRace[result.place].time - result.time < 0.001)
        && result.time < 10) {
        ach.push('Photo Finish');
      }

      // The Come-back Kid: Finish last, then finish first: 10% of cars
      if (result.place === 1) {
        // Is a previous result last place?
        for (var j = 0; j < results.length - 1; j++) {
          if (results[j].place === $scope.lanes.length) {
            ach.push('Come From Behind');
            break;
          }
        }
      }

      // The Runner-Up: Finish 2nd in each race: 2% of cars
      if (isLastRace) {
        var fails = 0;
        for (var j = 0; j < results.length; j++) {
          if (results[j].place !== 2) {
            fails++;
          }
        }
        if (fails <= 0) {
          ach.push('Second Every Time');
        }
      }

      // Finely tuned: Finish all races within 0.02 s: 19% of cars
      if (isLastRace) {
        var minTime = 99;
        var maxTime = 0;
        for (var m = 0; m < results.length; m++) {
          minTime = Math.min(results[m].time, minTime);
          maxTime = Math.max(results[m].time, maxTime);
        }
        if (maxTime - minTime < 0.02) {
          ach.push('Steady Racer');
        }
      }

      // Cutting Edge: Improve your time in each race: 12% of cars
      if (isLastRace) {
        var fail = false;
        for (var m = 0; m < results.length - 1; m++) {
          if (results[m].time > results[m + 1].time) {
            fail = true;
          }
        }
        if (!fail) {
          ach.push('Faster Each Race');
        }
      }

      // Strong Finisher: Have your best time on your final race: 30% of cars
      if (isLastRace) {
        var minTime = 99;
        var maxTime = 0;
        for (var m = 0; m < results.length; m++) {
          minTime = Math.min(results[m].time, minTime);
          maxTime = Math.max(results[m].time, maxTime);
        }
        if (result.time === minTime) {
          ach.push('Fastest Last');
        }
      }

      // Wild Car: Achieve a spread of times greater than half of a second
      var minTime = 99;
      var maxTime = 0;
      for (var m = 0; m < results.length; m++) {
        if (results[m].time < 10) {
          minTime = Math.min(results[m].time, minTime);
          maxTime = Math.max(results[m].time, maxTime);
        }
      }
      if (maxTime - minTime > 0.5) {
        ach.push('Unpredictable');
      }


      // car earned ach achievements. Remove ones the car has already earned.
      car.achievements = car.achievements || [];

      ach = ach.filter(a => !car.achievements.includes(a));

      car.achievements = car.achievements.concat(ach);

      $scope.achievementsThisRace[lane] = ach;

      console.log(car.carName + " has new achievements: " + ach.join(',') + "; all achievements are: " + car.achievements.join(','));

      $scope.saveAchievements(car);

    })

    console.log($scope.achievementsThisRace);

  };

  $scope.getResultsByCarAndLane = function (car, lane) {
    return $scope.getResultsByCar(car).filter(function (e) { return e.lane === lane; }).map(function (e) { return e.time.toFixed(4); }).join(', ');
  };

  $scope.getTime = function (dateStr) {
    return new Date(dateStr).getTime()
  }

  $scope.formatTime = function (time) {
    if (time === 10) {
      return "DNF"
    }
    else {
      return time.toFixed(4)
    }
  }


  $scope.status = "READY";

  /* Real-time track events are handled over socket.io */

  function tick() {
    $scope.currentTime = new Date();
    if ($scope.status === "RACING" || $scope.status === "ENDED") {
      $timeout(tick, 52);   // The 52 is to avoid a repeating pattern (0.000, 0.050, 0.100, 0.150, etc.)
    }

    if ($scope.status === 'RACING') {
      if ($scope.currentTime.getTime() - $scope.gateReleaseTime > 6000 || $scope.standingsThisRace.length === $scope.lanes.length) {
        $scope.stopRace()
      }
    }

    if ($scope.status === 'ENDED') {
      if ($scope.arduinoReady && $scope.weAreReady) {
        readyForStart()
      }
    }
  };

  $scope.stopRace = function () {

    // Ignore if not on the racing page 
    if ($state.current.name != "event-details.race")
      return console.log("Info: ignoring event stopRace");

    $scope.status = "ENDED";


    // Prepend new result
    /* [array]
     *  |
     *  +--date
     *  +--[lane]
     *      |
     *      +--car
     *      +--result
     */

    $scope.addDnfResults();

    $scope.awardAchievements();

    $timeout(function () {
      $scope.$broadcast('stopRecording');
    }, 400);

    $timeout(function () {
      $scope.$broadcast('showInstantReplay');
    }, 600);

    $timeout(function () {
      $scope.weAreReady = true
    }, 8000)

    $scope.computeStandings();

  }

  function readyForStart() {
    // Ignore event if not on the racing page
    if ($state.current.name != "event-details.race")
      return console.log("Info: ignoring event readyForStart");


    /*  I don't think we need this...?
    // Add result of this race to our resultList
    var lanes = [];
    
    for(i in $scope.lanes) {
    
    if($scope.raceTimes[$scope.lanes[i]]) {
    
      if($scope.getRacing($scope.lanes[i])) {
        lanes[i] = {
          car: $scope.getRacing($scope.lanes[i]),
          result: {
            time: $scope.raceTimes[$scope.lanes[i]]
          }
        };
      }
      else {
        if($scope.raceTimes[$scope.lanes[i]]) {
          // No assigned car, but display the time anyway
          lanes[i] = {
            car: { _id: "none", name: " " },
            result: {
              time: $scope.raceTimes[$scope.lanes[i]]
            }
          };
        }
      }
    }
    else {
      lanes[i] = { };
    }
    }
    
    
    
    var newResult = {
    date: new Date($scope.gateReleaseTime),
    lanes: lanes
    };
    
    // TODO: Finish the next line, I don't think newResult contains the complete set of result information
    $scope.results.splice(0, 0, newResult);
    */


    var timer = 0;
    //$timeout(function() { $scope.animateRacing = true; }, timer);
    //$timeout(function() { $scope.animateOnDeckMoveUp = true; }, timer);

    $scope.status = "READY";
    //timer += 500;  // 500
    $timeout(function () {
      $scope.animateRacing = false;
      $scope.animateOnDeckMoveUp = false;
      $scope.animateOnDeckAppear = true;
      $scope.moveToNextRun();
    }, timer);

    timer += 1000;

    $timeout(function () { $scope.animateOnDeckAppear = false; }, timer);

    $timeout(function () {
      for (i in $scope.lanes) {
        $scope.raceTimes[$scope.lanes[i]] = 0;
      }
    }, 1000);

    // Reset the video and mediaRecorder
    $scope.$broadcast('startVideo');
    $scope.$broadcast('hideVideo');

    $scope.standingsThisRace = [];
    $scope.standings = [];
    $scope.achievementsThisRace = [];

    $scope.messageIndex = ($scope.messageIndex + 1) % $scope.messages.length;

  }

  $scope.addDnfResults = function () {

    // Loop through each lane. If the lane has a car assigned to it, and the raceTime is 0, it means the car didn't finish. Give it a time of 10 seconds to represent DNF

    // Each DNF car will have the same place
    var place = $scope.standingsThisRace.length + 1;

    $scope.lanes.forEach(lane => {

      if ($scope.raceTimes[lane] === 0) {

        if ($scope.getRacing(lane)) {
          $scope.saveResult($scope.getRacing(lane), lane, 10, place, new Date($scope.gateReleaseTime));
          $scope.raceTimes[lane] = 10.0; // Represents DNF
        }

        $scope.standingsThisRace.push({
          car: $scope.getRacing(lane),
          place: place,
          name: $scope.getRacingName(lane, { colorIfUnassigned: true }),
          time: 10,
          // deltaTime: $scope.standingsThisRace.length > 0 ? data.time - $scope.standingsThisRace[0].time : 0,
          lane: lane
        });
      }
    })


    console.log('TODO')
  }

  socket.removeAllListeners("readyForStart");
  socket.on("readyForStart", function (data) {

    // The Arduino is ready to start, but are we?
    $scope.arduinoReady = true


  });

  socket.removeAllListeners('pinStateChange')
  socket.on('pinStateChange', function (data) {
    $scope.pinStates[data.lane] = data.state
    console.log(data)
  })


  socket.removeAllListeners('startingGateReleased');   // If controller is reinitialized, make sure the old $scope doesn't receive any events
  socket.on('startingGateReleased', function (data) {
    // Ignore event if not on the racing page
    if ($state.current.name != "event-details.race")
      return console.log("Info: ignoring event startingGateReleased");

    // The starting gate was released!
    if ($scope.status === "READY") {
      $scope.gateReleaseTime = Date.now();
      $scope.status = "RACING";
      $scope.$broadcast('showVideo');
      $scope.$broadcast('startRecording');
      $scope.arduinoReady = false
      $scope.weAreReady = false
      tick();
    }
    else {
      // alert("Starting gate was released prematurely. Please reset.");
    }


  });

  /* 
   * I just realized the big bug here is that if the controller is unloaded and reinitialized, the old socket.on events still remain and continue
   * to fire on the old controllers. That's why everything is getting out of sync, why we were getting double results being saved, and so forth.
   * Both socket.on events, each belonging to a different controller, were writing to the database. Nasty bug!
   *
   * I finally realized what was happening when I outputted the timestamp that the $scope was created inside socket.on("trigger"). When I saw 
   * that two $scopes with different timestamps were getting the trigger called on them, it all clicked.
   *
   * The solution is to call "removeAllListeners" on each listener before calling "on". This ensures that any prior listeners are removed.
   */

  socket.removeAllListeners('trigger');   // If controller is reinitialized, make sure the old $scope doesn't receive any events
  socket.on('trigger', function (data) {

    // Ignore event if not on the racing page
    if ($state.current.name != "event-details.race")
      return console.log("Info: ignoring event trigger");

    // Ignore event if lane is disabled
    if (!$scope.lanes.includes(data.lane)) {
      return console.log("Info: ignoring event trigger (lane disabled)");
    }

    console.log(data);
    // A car crossed the finish line.

    // We are guaranteed not to receive more than one trigger per lane. UPDATE: NO!
    // Oops, serious bug here! The arduino might give us more than one trigger now. So glad we tested for this!!!!!!
    // Fixed via:  if ($cope.raceTImes[data.lane] === 0)

    var place = $scope.standingsThisRace.length + 1;

    if ($scope.status === "RACING") {

      if ($scope.raceTimes[data.lane] === 0) {
        $scope.raceTimes[data.lane] = data.time;

        if ($scope.getRacing(data.lane)) {
          $scope.saveResult($scope.getRacing(data.lane), data.lane, data.time, place, new Date($scope.gateReleaseTime));
        }

        $scope.standingsThisRace.push({
          car: $scope.getRacing(data.lane),
          place: place,
          name: $scope.getRacingName(data.lane, { colorIfUnassigned: true }),
          time: data.time,
          deltaTime: $scope.standingsThisRace.length > 0 ? data.time - $scope.standingsThisRace[0].time : 0,
          lane: data.lane
        });
      }
    }


  });

  socket.removeAllListeners('serialState');
  socket.on('serialState', function (data) {
    $scope.serialConnected = data.connected;
    $scope.serialError = data.err;
    $scope.serialPort = data.port;
  });

  // Simulation
  $scope.simulateStartGate = function () {

    socket.emit('simulate', "Start");

    // Most lanes will get a trigger but some might not.
    var maxTime = 0;
    for (var i = 0; i < 4; i++) {
      (function (ii) {
        var time = Math.random() * 1500 + 2000;
        maxTime = Math.max(time, maxTime);
        $timeout(function () {
          $scope.simulateLane(ii, time);
        }, time);
      })(i);
    }

    // $timeout(function() { socket.emit('simulate', 'E'); }, maxTime + 10);

  };

  $scope.simulateResetGate = function () {
    socket.emit('simulate', "Ready");
  };

  $scope.simulateLane = function (lane, time) {
    socket.emit('simulate', "Trigger," + lane + "," + Math.floor(time * 1000));
  };
});