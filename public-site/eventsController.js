var eventsApp = angular.module('eventsApp', ['ngSanitize']);

// socket.io provider
eventsApp.factory('socket', function($rootScope) {
  if(typeof(io) !== 'undefined') {
    var socket = io();
    return {
      on: function (eventName, callback) {
        socket.on(eventName, function () {  
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        })
      }
    };
  }
  else {
    return {
      on: function (eventName, callback) {
        console.log("socket.on failed; socket.io is not be loaded.");
      },
      emit: function (eventName, callback) {
        console.log("socket.emit failed; socket.io is not be loaded.");
      }
    }
  }
});

// Local storage provider
eventsApp.factory("LS", function($window, $rootScope) {
  return {
    set: function(key, value) {
      $window.localStorage && $window.localStorage.setItem(key, value);
      return this;
    },
    get: function(key) {
      return $window.localStorage && $window.localStorage.getItem(key);
    }
  };
});

// Events controller
eventsApp.controller('EventsCtrl', function ($scope, $timeout, socket, LS) {

  /*********** Model data *************/
  // View state parameters
  $scope.showLoading = true;
  $scope.showServerNotResponding = false;
  $scope.showLogin = false;
  $scope.showEventCodeNotFound = false;
  $scope.showEventDetails = false;
  
  // Data
  $scope.cars = [];
  $scope.categories = [];
  $scope.events = [];
  $scope.results = [];
  $scope.runs = [];
  
  // Refactored data (probably a better way to do this?)
  $scope.boards = [];
  
  // Other
  $scope.eventCode = '';
  
  /************ UI helper functions *********/
  // Gets the name of the currently loaded event
  $scope.getEventName = function() {
    var event = $scope.events[Object.keys($scope.events)[0]];
    if(event) {
      return event.Name;
    }
  };
  
  $scope.getEventDate = function() {
    var event = $scope.events[Object.keys($scope.events)[0]];
    if(event) {
      return moment(event.Date).format("dddd, MMM D, YYYY");
    }
  };
  
  $scope.joinWithBr = function(arr) {
    return arr.map(function(e, i) { return "Lane " + (i+1) + ": " + e; }).join('<br>');
  };
  
  /************ UI Events ***************/
  // User has submitted an event code
  $scope.eventCodeChanged = function() {
    socket.emit('code', { EventCode: $scope.eventCode });
    $scope.showEventCodeNotFound = false;
  };
  
  // User clicked on "Choose another event"
  $scope.chooseAnotherEvent = function() {
    $scope.showLogin = true;
    setTimeout(function() {
      document.getElementById('eventCodeInput').focus();
    }, 0);
    
  };
    
  /************* socket events ************/
  // The server is asking us to enter an event code.
  socket.on('please-identify', function (data) {
    $scope.showLogin = true;
    $scope.showLoading = false;
    setTimeout(function() {
      document.getElementById('eventCodeInput').focus();
    }, 0);
    
  });
  
  // The server has accepted the event code and has sent us a token.
  socket.on('identity-ok', function (data) {
		// The server accepted our authentication
		if(data.token) {
      LS.set('eventToken', data.token);
		}
    $scope.showLogin = false;
    $scope.showLoading = false;
		$scope.showEventDetails = true;
	});
  
  socket.on('identity-fail', function (data) {
		$scope.showEventCodeNotFound = true;
	});
  
  // The server has sent us the entire data set.
   socket.on('data-all', function (data) {
    for(var key in data) {
			if(data.hasOwnProperty(key)) {
				for(var i=0; i<data[key].length; i++) {
					var keyColumn = primaryKeys[key];
					var keyValue = data[key][i][keyColumn];
					$scope[key][keyValue] = data[key][i];
				}
			} 
		}	
    refactorData();
	});
  
  // Used to identify the primary key in each table
	var primaryKeys = {
		events: "EventId",
		categories: "CategoryId",
		cars: "CarId",
		runs: "RunId",
		results: "ResultId"
	};
  
  // The server has sent as an incremental update to the data set.
  socket.on('data-upsert', function (data) {
		for(var key in data) {
      if(data.hasOwnProperty(key)) {
        // Replace with the new data
				for(var i=0; i<data[key].length; i++) {
					var keyColumn = primaryKeys[key];
					var keyValue = data[key][i][keyColumn];
					$scope[key][keyValue] = data[key][i];
				}
			}
		}
    refactorData();
	});
	
  // The server has removed a piece of data.
	socket.on('data-delete', function (data) {
		for(var key in data) {
			if(data.hasOwnProperty(key)) {
				// Delete each of the given data
				for(var i=0; i<data[key].length; i++) {
					var keyColumn = primaryKeys[key];
					var keyValue = data[key][i][keyColumn];
					delete $scope[key][keyValue];
				}
			}
		}
    refactorData();
	});
  
  /*************** other helper functions ******************/
  // Convert the relational data to a form that is easier to display
  var refactorData = function() {
    $scope.boards = [];
		
		for(var i in $scope.categories) {
      var CategoryId = $scope.categories[i].CategoryId;
      var newCat = {};
      newCat.Name = $scope.categories[i].Name; 
      var newCars = [];
      for(var j in $scope.cars) {
        var CarId = $scope.cars[j].CarId;
        if($scope.cars[j].CategoryId === CategoryId) {
          var newCar = {};
          newCar.Name = $scope.cars[j].Name;
          
          // Now search for the times
          newCar.Times = ['','','',''];
          newCar.BestTime = 1000000000;
          for(var ResultId in $scope.results) {
            if($scope.results.hasOwnProperty(ResultId)) {
              if($scope.results[ResultId].CarId === CarId) {
                var Lane = $scope.results[ResultId].Lane;
                var Time = $scope.results[ResultId].Time;
                if(newCar.Times[Lane] !== '')
                  newCar.Times[Lane] += "/";
                if(Time)  {
                  newCar.Times[Lane] += Time.toFixed(3);
                  newCar.BestTime = Math.min(newCar.BestTime, Time).toFixed(3);
                }
              }
            }
          }
          newCars.push(newCar);
        }
      }
      
      newCars.sort(function(a, b) {
        return a.BestTime - b.BestTime;
      });
      
      newCat.cars = newCars;
      $scope.boards.push(newCat);
		}
  };
  
  // Final setup
  angular.element(document).ready(function () {
    socket.emit('greetings', {token: LS.get('eventToken')});
    $timeout(function() {
      $scope.showServerNotResponding = true;
    }, 3000);
  });
  
});