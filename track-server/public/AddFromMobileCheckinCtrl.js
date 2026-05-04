angular.module('AddFromMobileCheckinCtrl', []).controller('AddFromMobileCheckinCtrl', function ($scope, $uibModalInstance, $http, options) {

  $scope.loading = true

  $scope.model = {}

  $scope.cars = {}

  $scope.info = { mess: 'Please wait...' }

  $scope.filters = {
    eventId: options.eventId,
    showAllEvents: 0,
    showAddedCars: 0
  }

  $scope.loadCheckInCars = function () {
    console.log('loadCheckInCars')
    $http.get('/api/apiSecret').then(function (res1) {

      var secret = res1.data.secret

      let url = `https://utahvalleypinewoodderby.com/api/v3/checkinlist?recent=1&secret=${secret}&cacheBuster=${Date.now()}`

      if (!$scope.filters.showAllEvents) {
        url += `&eventId=${$scope.filters.eventId}`
      }

      if (!$scope.filters.showAddedCars) {
        url += `&notAdded=1`
      }

      $http.get(url).then(function (res) {
        // $http.get('https://utahvalleypinewoodderby.com/api/v3/checkinlist?secret=' + secret).then(function (res) {
        if (res.data && res.data.length === 0) {
          $scope.info.mess = 'No cars have been checked in yet'
          $scope.cars = []
        }
        else if (!res.data) {
          $scope.info.mess = 'Invalid data'
        }
        else if (res.data.err) {
          $scope.info.mess = res.data.err
        }
        else {
          $scope.info.mess = ''
          $scope.cars = res.data
        }
      }).catch(function (err) {
        $scope.info.mess = err
      })

    })
  }

  $scope.chooseCar = function (checkInId) {
    console.log(checkInId)
    $uibModalInstance.close($scope.cars.find(c => c.checkInId === checkInId))
  }

  $scope.close = function () {
    $uibModalInstance.dismiss('cancel')
  }

  $scope.loadCheckInCars()


});