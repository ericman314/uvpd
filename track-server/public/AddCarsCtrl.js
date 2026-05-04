angular.module('AddCarsCtrl', ['scale']).controller('AddCarsCtrl', function ($scope, $uibModalInstance, $uibModal, options, scale) {

  $scope.loading = true
  $scope.timestampOffset

  $scope.model = { deferPerm: 0 }

  $scope.view = {}

  $scope.options = options


  $scope.weight = {}

  scale.registerCallback(function (data) {

    if (!data.error) {

      // Grant a 0.015 oz grace window
      if (data.oz > 5.0 && data.oz < 5.015) {
        data.oz = 5.0
      }

      $scope.weight.oz = data.oz.toFixed(2)

      // Get rid of ugly negative sign
      if ($scope.weight.oz === "-0.00") {
        $scope.weight.oz = "0.00"
      }

      if ($scope.weight.oz > 0.5) {
        $scope.weight.com = Math.round(data.pos * 100) / 100
      }
      else {
        $scope.weight.com = "-.--"
      }
    }
    else {
      $scope.weight.oz = null
      $scope.weight.com = null
    }

  })

  $scope.tare = scale.zero

  $scope.recordWeight = function () {
    $scope.model.weight = $scope.weight.oz
    $scope.model.com = $scope.weight.com
  }

  $scope.$on('$destroy', function () {
    scale.unregisterCallback()
  })

  if (options.model) {
    $scope.model = options.model

    if ($scope.model.carId) {
      $scope.view.imgsrc = "/cars/" + $scope.model.carId + ".jpg?v=" + Date.now()

      // TODO: Get image data

    }
  }

  $scope.onImgLoad = function (e) {
    console.log('Image loaded')
    var img = document.getElementById('carImage')
    var canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    var context = canvas.getContext('2d')
    context.drawImage(img, 0, 0)
    $scope.model.imageData = canvas.toDataURL('image/jpeg')
    // console.log($scope.model.imageData)
  }

  $scope.close = function () {
    $uibModalInstance.dismiss('cancel')
  }

  $scope.$on("hereIsThePicture", function (event, data) {

    $scope.model.imageData = data
    $scope.view.imgsrc = data

  })

  $scope.rotatePicture = function (angle) {
    console.log('rotate', angle)

    var img = document.getElementById('carImage')
    var canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    // Zoom to fill the canvas1
    let factor=Math.max(canvas.width/canvas.height,canvas.height/canvas.width)
    var context = canvas.getContext('2d')
    context.translate(canvas.width / 2, canvas.height / 2)
    context.scale(factor,factor)
    context.rotate(angle * Math.PI / 180)
    context.drawImage(img, -canvas.width / 2, -canvas.height / 2)
    $scope.model.imageData = canvas.toDataURL('image/jpeg')
    $scope.view.imgsrc = $scope.model.imageData

  }

  $scope.add = function () {
    $uibModalInstance.close($scope.model)
  }

  $scope.handleKeydown = function ($event) {
    console.log($event)
    if ($event.code === 'KeyP' && $event.ctrlKey) {
      //alert('You pressed Ctrl+P');
      $scope.takePicture()
      $event.preventDefault()
    }
    else if ($event.code === 'KeyM' && $event.ctrlKey) {
      $scope.addFromMobileCheckin()
      $event.preventDefault()
    }
  }

  $scope.takePicture = function () {
    $scope.$broadcast("takePicture")
  }


  $scope.addFromMobileCheckin = function () {

    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'addFromMobileCheckin.html',
      controller: 'AddFromMobileCheckinCtrl',
      size: 'lg',
      resolve: {
        options: function () {
          return {
            eventId: $scope.options.eventId
          }
        }
      }
    })

    modalInstance.result.then(function (newCar) {
      // We selected a car.
      console.log(newCar)
      $scope.model.carName = newCar.carName
      $scope.model.nickname = newCar.nickname
      $scope.model.den = newCar.den
      $scope.model.checkInId = newCar.checkInId
      $scope.model.deferPerm = 0
      $scope.view.imgsrc = "https://utahvalleypinewoodderby.com/api/v3/checkin/" + newCar.checkInId + ".jpg"
    },
      function () {
        // All done
      })
  }

});