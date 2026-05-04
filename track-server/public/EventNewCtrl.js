angular.module('EventNewCtrl', []).controller('EventNewCtrl', function($scope, $http, $state, $uibModalInstance, options) {

  // This is confusing -- don't mix up $scope.options.model with $scope.model.options.
  $scope.model = { options: {} };
  
  $scope.options = options;
  
  if($scope.options.model) {
    $scope.model = $scope.options.model;
  }
  
  $scope.newEventFormDatePickerOpen = false;
 

  $scope.close = function () {
    $uibModalInstance.dismiss('cancel');
  };
  
  $scope.commit = function () {
    $uibModalInstance.close($scope.model);
  };
  
 
 
  
  $scope.onTimeSet = function(newDate, oldDate) {
    $scope.newEventFormDatePickerOpen = false;
  };
  
  
});