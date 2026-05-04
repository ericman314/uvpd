angular.module('videoStream', []).directive('videoStream', [function() {
  return {
    restrict: 'A',
    link : function($scope) {
      alert("Here we are!");
    }
  }
}]);