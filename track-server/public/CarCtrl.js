angular.module('CarCtrl', []).controller('CarCtrl', function($scope, $state, $stateParams, $http, $timeout, $uibModal, dbReplicator) {

  const resultsSorter = (a, b) => {
    let aTime = new Date(a.resultDate).getTime() - a.lane
    let bTime = new Date(b.resultDate).getTime() - b.lane
    if (aTime < bTime) return 1
    else if (aTime > bTime) return -1
    else return 0
  }

  $scope.car = {};

  if($stateParams.carId) {
    
    $http.get('/api/car', {params: { carId: $stateParams.carId } }).then(function(result) {
      if(result.data.err) {
        console.log(result.data.err);
      }
      else {
        console.log(result);
        $scope.car = result.data.car;
        $scope.results = result.data.results;
        $scope.results.sort(resultsSorter)
        $scope.imageUrl = "/cars/" + $scope.car.carId + ".jpg?v=" + Date.now();
      }
    },
    function(reason) {
      console.log(reason);
    });
      
  }

  $scope.editCar = function() {
    console.log($scope.car)
    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'addCars.html',
      controller: 'AddCarsCtrl',
      size: 'lg',
      resolve: {
        options: function () {
          return {
            heading: "Edit Car",
            okButton: "Update",
            model: {
              carName: $scope.car.carName,
              nickname: $scope.car.nickname,
              den: $scope.car.den,
              weight: $scope.car.weight,
              com: $scope.car.com,
              carId: $scope.car.carId,
              deferPerm: $scope.car.deferPerm
            }
          };
        }
      }
    });
    
    modalInstance.result.then(function (updatedCar) {
      updatedCar.carId = $scope.car.carId;
      // The server will remove the imageData from newCar before saving in the db, and it will save the image data to a file with name equal to the _id of the newly created car.
     
      /*
      if(!updatedCar.weight) {
        updatedCar.weight = "";
      }
      
      if(!updatedCar.com) {
        updatedCar.com = "";
      }
      */

      console.log(updatedCar)

      $http.post('/api/carUpdate', updatedCar).then(function(response) {
        if(response.data.err) {
          console.log(response.data.err);
        }
        else {
          console.log(response);
          $scope.car = updatedCar;
          $scope.imageUrl = "/cars/" + $scope.car.carId + ".jpg?v=" + Date.now();

          dbReplicator($scope.car.eventId);
          dbReplicator.sendImage(updatedCar.carId, updatedCar.imageData, response.data.secret)
        }        
      },
      function(reason) {
        console.error(reason);
      });

      
    },
    function() {
      // All done
    });
  
  };  
  
  $scope.deleteCar = function() {
  
    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'car-delete.html',
      controller: 'CarDeleteCtrl',
      size: 'sm',
    });
    
    modalInstance.result.then(function (result) {

      $http.post('/api/carDelete', {carId:$scope.car.carId}).then(function(response) {
        if(response.data.err) {
          console.log(response.data.err);
        }
        else {
          console.log(response);
          dbReplicator($scope.car.eventId);
          $state.go('event-details', {eventId: $scope.car.eventId});
        }        
      },
      function(reason) {
        console.error(reason);
      });

    },
    function() {
      // All done
    });
  
  };
  
  $scope.deleteResult = function(result) {
  
    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'result-delete.html',
      controller: 'ResultDeleteCtrl',
      size: 'sm',
    });
    
    modalInstance.result.then(function (modalResult) {
      
      $http.post('/api/resultDelete', {resultId:result.resultId}).then(function(response) {
        if(response.data.err) {
          console.log(response.data.err);
        }
        else {
          console.log(response);
          $state.go($state.current, {}, {reload: true});

          // Send data to public website
          dbReplicator(result.eventId);
        }        
      },
      function(reason) {
        console.error(reason);
      });

      
    },
    function() {
      // All done
    });
  
  };

  
  $scope.formatTime = function (time) {
    if (time === 10) {
      return "DNF"
    }
    else {
      return time.toFixed(4)
    }
  }

  
});