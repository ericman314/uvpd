angular.module('CalibrateCtrl', ['scale', 'chart.js']).controller('CalibrateCtrl', function($scope, scale) {

  $scope.spans = [];

  $scope.weight = {};
  
  
  $scope.ozData = [[0]];
  $scope.posData = [[0]];
  
  scale.registerCallback(function(data) {
    
    console.log(data.w1, data.w2);
    $scope.weight.w1 = data.w1;
    $scope.weight.w2 = data.w2;
    
    $scope.weight.oz = data.oz;
    $scope.weight.pct = data.pct;
    
    $scope.weight.pos = data.pos;
    
    $scope.ozData[[0]] = $scope.weight.oz;
    
    $scope.posData[[0]] = $scope.weight.pos;
    
  });
  
  $scope.$on('$destroy', function() {
    scale.unregisterCallback();
  })
  
  $scope.zero = function() {
    scale.zero();
  };
  
  $scope.span = function() {
    scale.span();
    
    $scope.spans = [scale.getSpans().map(function(e) { return {x: e.w1, y: e.w2}; })];
  };
  
  
  $scope.options = {
    scales: {
      xAxes: [{
          type: 'linear',
          position: 'bottom'
      }]
    },
    
    showLines: false
  };

  $scope.optionsWeight = {
    
    scales: {
      yAxes: [{
        type: 'linear',
        ticks: {
          min: 0,
          max: 6
        }
      }]
    }
  };
  
  $scope.optionsPos = {
     scales: {
      xAxes: [{
        type: 'linear',
        ticks: {
          min: 0,
          max: 8
        }
      }]
    }
  };
  
  $scope.labelsOz = ["Weight (oz)"];
  $scope.labelsPos = ["COM (in)"];
 
  
});