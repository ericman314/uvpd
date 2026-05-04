angular.module('socket', []).factory('socket', function($rootScope) {
  if(typeof(io) !== 'undefined') {
    var socket = io(null, {'sync disconnect on unload':true});
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
      },
      removeAllListeners: function(eventName) {
        socket.removeAllListeners(eventName);
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