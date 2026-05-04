angular.module('QrcodeDirective', []).directive('qrcode', function() {
  return {
    restrict: 'A',
    scope: true,
    link: function(scope, element, attrs) {
      scope.$watch('shortUrl', function(val) {
        if(val) {
          new QRCode(element[0], val);
        }
      });
    } 
  };    
});