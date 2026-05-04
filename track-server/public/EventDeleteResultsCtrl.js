angular.module('EventDeleteResultsCtrl', []).controller('EventDeleteResultsCtrl', function($scope, $http, $state, $uibModalInstance) {

  $scope.confirm = false;

  $scope.close = function () {
    $uibModalInstance.dismiss('cancel');
  };
  
  $scope.commit = function () {
    $uibModalInstance.close();
  };
  
});