angular.module('pinewoodApp', [
  'ui.router',
  'ui.bootstrap',
  'ui.bootstrap.datetimepicker',
  'ui.dateTimeInput',
  'ui.bootstrap.modal',
  'appStates',
  'socket',
  'scale',
  'ngSanitize',
  'EventNewCtrl',
  'EventDeleteCtrl',
  'EventDeleteResultsCtrl',
  'EventCtrl',
  'EventListCtrl',
  'AddCarsCtrl',
  'AddFromMobileCheckinCtrl',
  'CarCtrl',
  'CarDeleteCtrl',
  'ResultDeleteCtrl',
  'CalibrateCtrl',
  'autofocus',
  'videoStream',
  'instantReplay',
  'ngAnimate',
  'hideOverflow',
  'zeroFilter',
  'QrcodeDirective',
  'dbReplicator',
  'onLoad'
])
.config(["$locationProvider", function($locationProvider) {
  $locationProvider.html5Mode(true);
}])
.config(["$animateProvider", function($animateProvider) {
  $animateProvider.classNameFilter(/x-angular-animate/);
}]);