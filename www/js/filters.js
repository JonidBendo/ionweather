angular.module('ionic.weather.filters', ['ionic.weather.services'])

.filter('tempInt', function() {
  return function(input) {
    return parseInt(input);
  }
});
