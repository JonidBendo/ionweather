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

  this.getCurrent = function(lat, lng, units, locString) {
    Weather.getAtLocation(lat, lng, units).then(function(resp) {
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

      Geo.reverseGeocode(lat, lng).then(function(locString) {
        $scope.currentLocationString = locString;
        _this.getBackgroundImage(lat, lng, locString);
        DataStore.setData(locString, lat, lng);
      });

      _this.getCurrent(lat, lng, units);
    }, function(error) {
      alert('Unable to get current location: ' + error);
    });

  });

  $scope.$broadcast("refreshData",  {city: null });
})

.controller('SettingsCtrl', function($scope, $state, Cities, DataStore, Settings) {
  $scope.cities = Cities.all();
  $scope.currentdate = new Date();
  $scope.title = "Custom Title";

  $scope.datePickerCallback = function (val) {
      if(typeof(val)==='undefined'){
          console.log('Date not selected');
      }else{
          console.log('Selected date is : ', val);
      }
  };

  $scope.changeCity = function(cityId) {
    //get lat and longitude for seleted location
    var lat  = $scope.cities[cityId].lat; //latitude
    var lgn  = $scope.cities[cityId].lgn; //longitude
    var city = $scope.cities[cityId].name; //city name

    $scope.modal.hide();
    $scope.$root.$broadcast("refreshData", {city: city, longitude: lgn, latitude: lat, units: Settings.units });
  };

  $scope.changeUnits = function(unit) {
    Settings.set(unit);
    $scope.modal.hide();
    $scope.$root.$broadcast("refreshData", {city: DataStore.city, longitude: DataStore.longitude, latitude: DataStore.latitude, units: Settings.units });
  };

  $scope.closeSettings = function() {
    $scope.modal.hide();
  };

});
