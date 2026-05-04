angular.module('CarDeleteCtrl', []).controller('CarDeleteCtrl', function($scope, $http, $state, $uibModalInstance) {

  $scope.close = function () {
    $uibModalInstance.dismiss('cancel');
  };
  
  $scope.commit = function () {
    $uibModalInstance.close();
  };
  
});