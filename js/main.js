var app = angular.module('socialBotApp',['ngRoute','ngStorage']);
app.controller('website',function($scope,$localStorage,$location) {
  $scope.websiteData = {};
  $scope.addWebsite = function() {
    $localStorage.data = [];
    var data = {
      "website": $scope.websiteData.httpType + "://" + $scope.websiteData.website
    };
    $localStorage.data.push(data);
    window.location.href='/plugin';
  }
});

app.controller('plugin',function($scope,$localStorage,$location,$http,$interval) {
  var pluginInstall = false;
  checkPluginExists();
      function checkPluginExists() {
        $http({
        method: 'GET',
        url: $localStorage.data[0].website+'/wp-json/socialbot/v1/posts'
        }).then(function(response) {
            console.log(response);
            if(response.status === 200) {
              pluginInstall = true;
               if(timer) {
                 $scope.killtimer();
              }
              window.location.href='/social';
            }
        }, function(response) {
        });
      }
      if($localStorage.data !== undefined && $localStorage.data[0].website !== undefined) {
        $scope.link = $localStorage.data[0].website+"/wp-admin/plugin-install.php?tab=plugin-information&plugin=social-bot-hook";
      }
      var timer=$interval(function(){
        if(pluginInstall) {
          $scope.killtimer();
        } else {
          checkPluginExists();
        }
      },10000);

      $scope.killtimer=function(){
        if(angular.isDefined(timer)) {
          $interval.cancel(timer);
          timer=undefined;
        }
      };
});


app.controller('social',function($scope,$localStorage,$location) {
  var fbToken = null;
  $scope.token = window.token;
  var pageId = null;
  checkTokenExists();
  function checkTokenExists() {
    if($scope.token !== null) {
      $scope.token = JSON.parse($scope.token);
    }
  }
  $scope.addSocial = function($index,id) {
    console.log($index,id);
    pageId = id;
  }
  $scope.confirmPage = function() {
    var selectedPage = $scope.token.pages.filter(function(singlePage) {
      return singlePage.id === pageId;
    });
    $localStorage.data[0].fbPage = selectedPage[0];
  }
});
