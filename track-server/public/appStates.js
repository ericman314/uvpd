angular.module('appStates', []).config([
  '$stateProvider',
  '$urlRouterProvider',
  function($stateProvider, $urlRouterProvider) {
  
    $urlRouterProvider.otherwise('/events-list');
  
    $stateProvider
      /*.state('home', {
        url: '/',
        templateUrl: 'home.html'
      })*/
      .state('events-list', {
        url: '/events-list',
        templateUrl: 'events-list.html',
        controller: 'EventListCtrl'
      })
      .state('event-new', {
        url: '/events-new',
        templateUrl: 'event-new.html',
        controller: 'EventNewCtrl'
      })
      .state('event-details', {
        url: '/events/:eventId',
        templateUrl: 'event.html',
        controller: 'EventCtrl'
      })
      .state('event-details.race', {
        url: '/race',
        templateUrl: 'race.html'       
      })
      .state('event-details.welcome', {
        url: '/welcome',
        templateUrl: 'welcome.html'
      })
      .state('event-details.credits', {
        url: '/credits',
        templateUrl: 'credits.html'
      })
      .state('car-details', {
        url: '/cars/:carId',
        templateUrl: 'car.html',
        controller: 'CarCtrl'
      })
      .state('calibrate', {
        url: '/calibrate',
        templateUrl: 'calibrate.html',
        controller: 'CalibrateCtrl'
      })
      ;
  }
]);
