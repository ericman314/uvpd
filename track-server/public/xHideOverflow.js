angular.module('hideOverflow', []).directive('hideOverflow', function() {
  
  return {
    link: function (scope, element, attrs) {
      
      document.body.className += " x-hide-overflow";
      
      element.on("$destroy", function() {
        document.body.className = document.body.className.replace(/\bx-hide-overflow\b/, '');
      });
    }
  };
  
});