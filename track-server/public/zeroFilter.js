angular.module('zeroFilter', []).filter('zeroFilter', function() {
  return function(input) {
    if(/^0(\.0+)?$/.test(input)) {
      return "";
    }
    else { 
      return input;
    }
  };
});