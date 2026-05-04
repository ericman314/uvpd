// https://gist.github.com/mlynch/dd407b93ed288d499778
angular.module('autofocus', []).directive('autofocus', ['$timeout', function($timeout) {
  return {
    restrict: 'A',
    link : function($scope, $element) {
      $timeout(function() {
        $element[0].focus();
      });
    }
  }
}]);