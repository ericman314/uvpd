angular.module('instantReplay', []).directive('instantReplay', [function () {
  return {
    restrict: 'A',
    link: function ($scope, $element) {


      var width = 640    // We will scale the photo width to this
      var height = 0     // This will be computed based on the input stream

      var streaming = false

      var localStream

      var div = $element[0]
      var video = $element[0].querySelector('video')

      var mediaRecorder
      var chunks = []
      var count = 0

      startVideo()

      function startVideo() {

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
              width: 1280,
              height: 720,
              frameRate: 60
            },
            audio: false
          },
          initMediaRecorder,
          function (err) {
            console.log("An error occured! " + err)
          }
        )

        //  video.play();

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
      }

      $scope.$on('startVideo', function (event, args) {

        startVideo()

      })

      $scope.$on('startRecording', function (event, args) {
        mediaRecorder.start()
      })

      $scope.$on('stopRecording', function (event, args) {
        mediaRecorder.stop()
      })

      $scope.$on('showInstantReplay', function (event, args) {
        video.play()


      })

      $scope.$on('showVideo', function (event, args) {
        div.classList.add("shown")
      })

      $scope.$on('hideVideo', function (event, args) {
        div.classList.remove("shown")
      })


      $scope.$on('$destroy', function () {

        if (localStream) {
          var tracks = localStream.getTracks()
          for (var i in tracks) {
            tracks[i].stop()
          }
        }
      })

      function initMediaRecorder(stream) {

        if (typeof MediaRecorder.isTypeSupported == 'function') {
          if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            var options = { mimeType: 'video/webm;codecs=vp9' }
          } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
            var options = { mimeType: 'video/webm;codecs=h264' }
          } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
            var options = { mimeType: 'video/webm;codecs=vp8' }
          }
          console.log('Using ' + options.mimeType)
          mediaRecorder = new MediaRecorder(stream, options)
        } else {
          console.log('isTypeSupported is not supported, using default codecs for browser')
          mediaRecorder = new MediaRecorder(stream)
        }

        video.defaultPlaybackRate = 0.5
        video.loop = true
        // var url = window.URL || window.webkitURL;
        video.srcObject = stream
        // video.src = URL.createObjectURL(stream)

        video.play()

        mediaRecorder.ondataavailable = function (e) {
          //log('Data available...');
          //console.log(e.data);
          //console.log(e.data.type);
          //console.log(e);
          chunks.push(e.data)
        }

        mediaRecorder.onerror = function (e) {
          console.log('Error: ', e)
        }


        mediaRecorder.onstart = function () {
          console.log('Started & state = ' + mediaRecorder.state)
        }

        mediaRecorder.onstop = function () {
          console.log('Stopped  & state = ' + mediaRecorder.state)

          var blob = new Blob(chunks, { type: "video/webm" })
          chunks = []

          video.srcObject = null  //  Reset this, otherwise the video will continue to show the live stream
          let url = window.URL.createObjectURL(blob)
          video.src = url


          var reader = new FileReader()
          reader.readAsDataURL(blob)
          reader.onloadend = function () {
            var base64data = reader.result
            console.log(base64data)
            fetch('/api/videoUpload', {
              method: 'POST',
              headers: {
                'Content-Type': 'text/plain'
              },
              body: base64data// JSON.stringify({ data: base64data })
            })
          }


          // var a = document.createElement('a');
          // a.style.display = 'none';
          // a.href = url;
          // a.download = `${new Date()}.webm`;
          // document.body.appendChild(a);
          // a.click();
          // setTimeout(function() {
          //   document.body.removeChild(a);
          //   window.URL.revokeObjectURL(url);
          // }, 100);
        }

        mediaRecorder.onpause = function () {
          console.log('Paused & state = ' + mediaRecorder.state)
        }

        mediaRecorder.onresume = function () {
          console.log('Resumed  & state = ' + mediaRecorder.state)
        }

        mediaRecorder.onwarning = function (e) {
          console.log('Warning: ' + e)
        }
      }


    }
  }
}]);