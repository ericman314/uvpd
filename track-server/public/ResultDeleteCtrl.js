angular.module('ResultDeleteCtrl', []).controller('ResultDeleteCtrl', function($scope, $http, $state, $uibModalInstance) {

  $scope.close = function () {
    $uibModalInstance.dismiss('cancel');
  };
  
  $scope.commit = function () {
    $uibModalInstance.close();
  };
  
});