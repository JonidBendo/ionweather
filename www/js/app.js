angular.module('ionic.weather', ['ionic', 'ionic-datepicker', 'ionic.weather.services', 'ionic.weather.filters', 'ionic.weather.directives'])

.constant('WUNDERGROUND_API_KEY', '1cc2d3de40fa5af0')

.constant('FORECASTIO_KEY', '6cd60fbcb0b1723b2074948499da0689')

.constant('FLICKR_API_KEY', '4b379d22563c0c0b496fdd6851d9f263')

.filter('int', function() {
  return function(v) {
    return parseInt(v) || '';
  };
})

.controller('WeatherCtrl', function($scope, $timeout, $rootScope, Weather, Geo, Flickr, DataStore, Settings, $ionicModal, $ionicPlatform) {
  var _this = this;

  $ionicPlatform.ready(function() {
    // Hide the status bar
    if(window.StatusBar) {
      StatusBar.hide();
    }
  });

  $scope.activeBgImageIndex = 0;

  $scope.showSettings = function() {
    if(!$scope.settingsModal) {
     // Load the modal from the given template URL
      $ionicModal.fromTemplateUrl('settings.html', function(modal) {
        $scope.settingsModal = modal;
        $scope.settingsModal.show();
      }, {
        // The animation we want to use for the modal entrance
        animation: 'slide-in-up'
      });
    } else {
      $scope.settingsModal.show();
    }
  };

  $scope.refresh = function(){
    $scope.$root.$broadcast("refreshData", {city: DataStore.city, longitude: DataStore.longitude, latitude: DataStore.latitude, units: Settings.units, date:Settings.date });
  };

  this.getBackgroundImage = function(lat, lng, locString) {
    Flickr.search(locString, lat, lng).then(function(resp) {
      var photos = resp.photos;
      if(photos.photo.length) {
        $scope.bgImages = photos.photo;
        _this.cycleBgImages();
      }
    }, function(error) {
      console.error('Unable to get Flickr images', error);
    });
  };

  this.getCurrent = function(lat, lng, units, date, locString) {
    Weather.getAtLocation(lat, lng, units, date).then(function(resp) {
      /*
      if(resp.response && resp.response.error) {
        alert('This Wunderground API Key has exceeded the free limit. Please use your own Wunderground key');
        return;
      }
      */
      $scope.current = resp.data;
      console.log('GOT CURRENT', $scope.current);
      $rootScope.$broadcast('scroll.refreshComplete');
    }, function(error) {
      alert('Unable to get current conditions');
      console.error(error);
    });
  };

  this.cycleBgImages = function() {
    $timeout(function cycle() {
      if($scope.bgImages) {
        $scope.activeBgImage = $scope.bgImages[$scope.activeBgImageIndex++ % $scope.bgImages.length];
      }
      //$timeout(cycle, 10000);
    });
  };


  $scope.$on('refreshData', function(event, args) {
    Geo.getLocation().then(function(position) {
      if (args.city) {
        var lat = args.latitude;
        var lng = args.longitude;
      } else {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
      }
      var units = Settings.units;
      var date = Settings.date;
      Geo.reverseGeocode(lat, lng).then(function(locString) {
        $scope.currentLocationString = locString;
        _this.getBackgroundImage(lat, lng, locString);
        DataStore.setData(locString, lat, lng);
        $scope.$broadcast("loadMap",  {locstr: locString, latitude: lat, longitude: lng });
      });

      _this.getCurrent(lat, lng, units, date);
    }, function(error) {
      alert('Unable to get current location: ' + error);
    });

  });

  $scope.$on('loadMap',function(event, args) {
    var map;
    var geoJSON;
    var request;
    var gettingData = false;
    var openWeatherMapKey = "31c0691beceb45a65ba863551eed330e";

    var mapOptions = {
      zoom: 9,
      center: new google.maps.LatLng(args.latitude, args.longitude)
    };

    map = new google.maps.Map(document.getElementById('map'), mapOptions);


    // Sets up and populates the info window with details
    map.data.addListener('click', function(event) {
      infowindow.setContent(
       "<img src=" + event.feature.getProperty("icon") + ">"
       + "<br /><strong>" + event.feature.getProperty("city") + "</strong>"
       + "<br />" + event.feature.getProperty("temperature") + "&deg;C"
       + "<br />" + event.feature.getProperty("weather")
       );
      infowindow.setOptions({
          position:{
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          },
          pixelOffset: {
            width: 0,
            height: -15
          }
        });
      infowindow.open(map);
    });

    var checkIfDataRequested = function() {
      // Stop extra requests being sent
      while (gettingData === true) {
        request.abort();
        gettingData = false;
      }
      getCoords();
    };
    google.maps.event.addListener(map, 'idle', checkIfDataRequested);
    // Get the coordinates from the Map bounds
    var getCoords = function() {
      var bounds = map.getBounds();
      var NE = bounds.getNorthEast();
      var SW = bounds.getSouthWest();
      getWeather(NE.lat(), NE.lng(), SW.lat(), SW.lng());
    };
    // Make the weather request
    var getWeather = function(northLat, eastLng, southLat, westLng) {
      gettingData = true;
      var requestString = "http://api.openweathermap.org/data/2.5/box/city?bbox="
                          + westLng + "," + northLat + "," //left top
                          + eastLng + "," + southLat + "," //right bottom
                          + map.getZoom()
                          + "&cluster=yes&format=json"
                          + "&APPID=" + openWeatherMapKey;
      request = new XMLHttpRequest();
      request.onload = proccessResults;
      request.open("get", requestString, true);
      request.send();
    };
    // Take the JSON results and proccess them
    var proccessResults = function() {
      console.log(this);
      var results = JSON.parse(this.responseText);
      if (results.list.length > 0) {
          resetData();
          for (var i = 0; i < results.list.length; i++) {
            geoJSON.features.push(jsonToGeoJson(results.list[i]));
          }
          drawIcons(geoJSON);
      }
    };
    var infowindow = new google.maps.InfoWindow();

    // For each result that comes back, convert the data to geoJSON
    var jsonToGeoJson = function (weatherItem) {
      var feature = {
        type: "Feature",
        properties: {
          city: weatherItem.name,
          weather: weatherItem.weather[0].main,
          temperature: weatherItem.main.temp,
          min: weatherItem.main.temp_min,
          max: weatherItem.main.temp_max,
          humidity: weatherItem.main.humidity,
          pressure: weatherItem.main.pressure,
          windSpeed: weatherItem.wind.speed,
          windDegrees: weatherItem.wind.deg,
          windGust: weatherItem.wind.gust,
          icon: "http://openweathermap.org/img/w/"
                + weatherItem.weather[0].icon  + ".png",
          coordinates: [weatherItem.coord.lon, weatherItem.coord.lat]
        },
        geometry: {
          type: "Point",
          coordinates: [weatherItem.coord.lon, weatherItem.coord.lat]
        }
      };

      // Set the custom marker icon
      map.data.setStyle(function(feature) {
        return {
          icon: {
            url: feature.getProperty('icon'),
            anchor: new google.maps.Point(args.latitude, args.longitude)
          }
        };
      });
      // returns object
      return feature;
    };
    // Add the markers to the map
    var drawIcons = function (weather) {
       map.data.addGeoJson(geoJSON);
       // Set the flag to finished
       gettingData = false;
    };
    // Clear data layer and geoJSON
    var resetData = function () {
      geoJSON = {
        type: "FeatureCollection",
        features: []
      };
      map.data.forEach(function(feature) {
        map.data.remove(feature);
      });
    };

    $scope.map = map;
  });

  $scope.$broadcast("refreshData",  {city: null });
})

.controller('SettingsCtrl', function($scope, $state, Cities, DataStore, Settings) {
  $scope.cities = Cities.all();

  $scope.currentDate = new Date();
  $scope.title = "Custom Title";

  $scope.datePickerCallback = function (val) {
      if(typeof(val)==='undefined'){
          console.log('Date not selected');
      }else{
          Settings.setDate(val);
          $scope.$root.$broadcast("refreshData", {city: DataStore.city, longitude: DataStore.longitude, latitude: DataStore.latitude, units: Settings.units, date:Settings.date });
      }
  };

  $scope.changeCity = function(cityId) {
    //get lat and longitude for seleted location
    var lat  = $scope.cities[cityId].lat; //latitude
    var lgn  = $scope.cities[cityId].lgn; //longitude
    var city = $scope.cities[cityId].name; //city name

    $scope.modal.hide();
    $scope.$root.$broadcast("refreshData", {city: city, longitude: lgn, latitude: lat, units: Settings.units, date:Settings.date });
  }

  $scope.changeUnits = function(unit) {
    Settings.setUnits(unit);
    $scope.modal.hide();
    $scope.$root.$broadcast("refreshData", {city: DataStore.city, longitude: DataStore.longitude, latitude: DataStore.latitude, units: Settings.units, date:Settings.date });
  }

  $scope.closeSettings = function() {
    $scope.modal.hide();
  };

});
