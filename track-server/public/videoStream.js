angular.module('videoStream', []).directive('videoStream', [function () {
  return {
    restrict: 'A',
    link: function ($scope, $element) {


      var width = 640    // We will scale the photo width to this
      var height = 0     // This will be computed based on the input stream

      var streaming = false

      var localStream

      var video = $element[0].querySelector('video')
      var canvas = $element[0].querySelector('canvas')

      navigator.getMedia = (
        // (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia
      )

      navigator.getMedia(
        {
          video: {
            width: 640,
            height: 480,
          },
          audio: false
        },
        function (stream) {
          localStream = stream
          if (navigator.mozGetUserMedia) {
            video.mozSrcObject = stream
          } else {
            var vendorURL = window.URL || window.webkitURL
            video.srcObject = stream
            // video.src = vendorURL.createObjectURL(stream);
          }
          video.play()
        },
        function (err) {
          console.log("An error occured! " + err)
        }
      )

      video.addEventListener('canplay', function (ev) {
        if (!streaming) {
          height = video.videoHeight / (video.videoWidth / width)

          // Firefox currently has a bug where the height can't be read from
          // the video, so we will make assumptions if this happens.

          if (isNaN(height)) {
            height = width / (4 / 3)
          }

          //video.setAttribute('width', width);
          //video.setAttribute('height', height);
          //canvas.setAttribute('width', width);
          //canvas.setAttribute('height', height);
          streaming = true
        }
      }, false)

      $scope.$on("takePicture", function (event, args) {

        var context = canvas.getContext('2d')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        $scope.$emit("hereIsThePicture", canvas.toDataURL('image/jpeg'))

      })


      $scope.$on('$destroy', function () {

        if (localStream) {
          var tracks = localStream.getTracks()
          for (var i in tracks) {
            tracks[i].stop()
          }
        }
      })

    }
  }
}]);