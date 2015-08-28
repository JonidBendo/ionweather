/**
 * Wunderground's API pricing is silly, so it's removed for now.

var wundergroundWeather = ['$q', '$resource', 'WUNDERGROUND_API_KEY', function($q, $resource, WUNDERGROUND_API_KEY) {
  var baseUrl = 'http://api.wunderground.com/api/' + WUNDERGROUND_API_KEY;

  var locationResource = $resource(baseUrl + '/geolookup/conditions/q/:coords.json', {
    callback: 'JSON_CALLBACK'
  }, {
    get: {
      method: 'JSONP'
    }
  });

  var forecastResource = $resource(baseUrl + '/forecast/q/:coords.json', {
    callback: 'JSON_CALLBACK'
  }, {
    get: {
      method: 'JSONP'
    }
  });

  var hourlyResource = $resource(baseUrl + '/hourly/q/:coords.json', {
    callback: 'JSON_CALLBACK'
  }, {
    get: {
      method: 'JSONP'
    }
  });

  return {
    getForecast: function(lat, lng) {
      var q = $q.defer();

      forecastResource.get({
        coords: lat + ',' + lng
      }, function(resp) {
        q.resolve(resp);
      }, function(httpResponse) {
        q.reject(httpResponse);
      });

      return q.promise;
    },

    getHourly: function(lat, lng) {
      var q = $q.defer();

      hourlyResource.get({
        coords: lat + ',' + lng
      }, function(resp) {
        q.resolve(resp);
      }, function(httpResponse) {
        q.reject(httpResponse);
      });

      return q.promise;
    },

    getAtLocation: function(lat, lng) {
      var q = $q.defer();

      locationResource.get({
        coords: lat + ',' + lng
      }, function(resp) {
        q.resolve(resp);
      }, function(error) {
        q.reject(error);
      });

      return q.promise;
    }
  }
}];
*/

var forecastioWeather = ['$q', '$resource', '$http', 'FORECASTIO_KEY', '$filter', function($q, $resource, $http, FORECASTIO_KEY, $filter) {
  var url = 'https://api.forecast.io/forecast/' + FORECASTIO_KEY + '/';

  var weatherResource = $resource(url, {
    callback: 'JSON_CALLBACK',
  }, {
    get: {
      method: 'JSONP'
    }
  });

  return {
    getAtLocation: function(lat, lng, units, date) {
      if(date) {
        var result = $filter('date')(date, 'yyyy-MM-ddTHH:mm:ss');
        return $http.jsonp(url + lat + ',' + lng+ ',' + result + '?callback=JSON_CALLBACK&units='+units);
      } else {
        return $http.jsonp(url + lat + ',' + lng + '?callback=JSON_CALLBACK&units='+units);
     }
    },
    getForecast: function(locationString) {
    },
    getHourly: function(locationString) {
    }
  }
}];


angular.module('ionic.weather.services', ['ngResource'])

.factory('Settings', function() {
  var Settings = {
    units: 'si',
    date: null
    };

    // Set a settings val
    Settings.setUnits = function(v) {
      Settings.units = v;
    };
    Settings.setDate = function(k) {
      Settings.date = k;
    };
    Settings.getUnits = function() {
      return Settings.units;
    };
  // Save the settings to be safe
  return Settings;
})

.factory('Geo', function($q) {
  return {
    reverseGeocode: function(lat, lng) {
      var q = $q.defer();

      var geocoder = new google.maps.Geocoder();
      geocoder.geocode({
        'latLng': new google.maps.LatLng(lat, lng)
      }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          console.log('Reverse', results);
          if(results.length > 1) {
            var r = results[1];
            var a, types;
            var parts = [];
            var foundLocality = false;
            var foundState = false;
            for(var i = 0; i < r.address_components.length; i++) {
              a = r.address_components[i];
              types = a.types;
              for(var j = 0; j < types.length; j++) {
                if(!foundLocality && types[j] == 'locality') {
                  foundLocality = true;
                  parts.push(a.long_name);
                } else if(!foundState && types[j] == 'administrative_area_level_1') {
                  foundState = true;
                  parts.push(a.short_name);
                }
              }
            }
            console.log('Reverse', parts);
            q.resolve(parts.join(', '));
          }
        } else {
          console.log('reverse fail', results, status);
          q.reject(results);
        }
      })

      return q.promise;
    },
    getLocation: function() {
      var q = $q.defer();

      navigator.geolocation.getCurrentPosition(function(position) {
        q.resolve(position);
      }, function(error) {
        q.reject(error);
      });

      return q.promise;
    }
  };
})

.factory('Flickr', function($q, $resource, FLICKR_API_KEY) {
  var baseUrl = 'https://api.flickr.com/services/rest/'


  var flickrSearch = $resource(baseUrl, {
    method: 'flickr.groups.pools.getPhotos',
    group_id: '1463451@N25',
    safe_search: 1,
    jsoncallback: 'JSON_CALLBACK',
    api_key: FLICKR_API_KEY,
    format: 'json'
  }, {
    get: {
      method: 'JSONP'
    }
  });

  return {
    search: function(tags, lat, lng) {
      var q = $q.defer();

      console.log('Searching flickr for tags', tags);

      flickrSearch.get({
        tags: (tags.length > 0 ? tags[0] : ''),
        lat: lat,
        lng: lng
      }, function(val) {
        q.resolve(val);
      }, function(httpResponse) {
        q.reject(httpResponse);
      });

      return q.promise;
    }
  };
})

.factory('Cities', function() {
var cities = [
    { id: 0, name: 'Amsterdam', lat: 52.3667 , lgn: 4.9000 },
    { id: 1, name: 'Rotterdam' ,lat: 51.9167 , lgn: 4.5000 },
    { id: 2, name: 'Utrecht' ,lat: 52.0833 , lgn: 5.1167 },
    { id: 3, name: 'Eindhoven' ,lat: 51.4333 , lgn: 5.4833 },
    { id: 4, name: 'Deventer' ,lat: 52.2500 , lgn: 6.1500 },
    { id: 5, name: 'The Hague' ,lat: 52.0833 , lgn: 4.3167 },
    { id: 6, name: 'Haarlem' ,lat: 52.3833 , lgn: 4.6333 }
  ];

  return {
    all: function() {
      return cities;
    },
    get: function(cityId) {
      // Simple index lookup
      return cities[cityId];
    }
  }
})

.factory('DataStore', function() {
    //create datastore with default values
    var DataStore = {
        city:       'Miami',
        latitude:   25.7877,
        longitude:  80.2241 };

    DataStore.setData = function (city, lat, lng) {
       DataStore.city = city;
       DataStore.latitude = lat;
       DataStore.longitude = lng;
    };

    return DataStore;
})

.factory('Weather', forecastioWeather);
