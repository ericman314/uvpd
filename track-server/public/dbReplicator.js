angular.module("dbReplicator", []).factory('dbReplicator', function($http) {

  console.log("Factory function for dbReplicator");

  console.log("TODO: Rate limiting on dbReplicator")

  var publicSiteUrl;

  $http.get('/publicSiteUrl').then(result => {
    publicSiteUrl = result.data.url;
  })
  .catch(err => {
    console.error(err);
  });


  var timeout
  var queue = []

  function processQueue() {

    queue.forEach(req => {
      console.log('Processing dbReplicator(' + req.eventId + ', ' + req.complete + ')')
      $http.get('/mysqldump', { params: req }).then(result => {
        console.log(result.data);

        var payload = {
          sql: result.data.output,
          secret: result.data.secret
        }
        console.log(payload)
        $http({
          method: 'POST',
          url: publicSiteUrl + '/api/v3/mysqldump',
          data: payload
        }).then(result => {
          console.log(result)
        })
      })
      .catch(err => {
        console.error(err);
      });
    })
    queue = []
    timeout = null

  }

  var factory = function(eventId, complete) {
    
    complete = !!complete
    
    if (!queue.some(req => req.eventId === eventId && req.complete === complete )) {
      // Queue this request
      console.log('Queuing dbReplicator(' + eventId + ', ' + complete + ')')
      queue.push({ eventId: eventId, complete: complete })
    }

    if (!timeout) {
      timeout = setTimeout(processQueue, 2000)
    }
  }

  factory.sendImage = function(carId, imageData, secret) {
    var payload = {
      imageData: imageData,
      Id: carId,
      secret: secret
    }

    return $http({
      method: 'POST',
      url: publicSiteUrl + '/api/v3/carImage',
      data: payload
    })
  }

  return factory;

});