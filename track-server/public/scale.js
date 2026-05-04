angular.module('scale', ['socket']).factory('scale', function(socket, $timeout) {
  
  // TODO: Make these parameters persistent
  var zero1 = 1330000;
  var zero2 = 506500;
  var icpt1 = 946176;
  var icpt2 = 1067031;
  var posA = 7.2124;
  var posB = 0.2128;
  var spans = [];
  
  var timer = $timeout(noWeight);
  
  var w1, w2, oz, pct, pos;
  
  var _callback = function() {};
  
  socket.on("weight", function(data) {
    
    w1 = data.w1 - zero1;
    w2 = data.w2 - zero2;
    
    oz = (w1 / icpt1 + w2 / icpt2) * 5.000;
    
    pct = w2 / icpt2 / (w1 / icpt1 + w2 / icpt2);
    
    pos = posA * pct + posB;
    
    _callback({w1: w1, w2: w2, oz: oz, pct: pct, pos: pos});
    
    $timeout.cancel(timer);
    timer = $timeout(noWeight, 500);
    
  });
  
  function noWeight() {
    _callback({w1: 0, w2: 0, oz: 0, pct: 0, pos: 0, error: true});
  }
  
  function zero() {
    zero1 += w1;
    zero2 += w2;
  }
  
  function span() {
    spans.push({w1: w1, w2: w2});
  }
  
  // Expose external API
  return {
    
    registerCallback: function(callback) { if(typeof(callback) === 'function') _callback = callback; },
      
    unregisterCallback: function() { _callback = function() {}; },
    
    zero: zero,
    
    span: span,
    
    getSpans: function() { return spans; },
  };
  
  
});