'use strict'
/* global angular, firebase */
/**
 * @class trick.dash
 * @memberOf trick
 * @requires ngRoute
 */
angular.module('trick.levels', ['ngRoute'])

  .config([
    '$routeProvider',
    function ($routeProvider) {
      $routeProvider.when('/levels', {
        templateUrl: '/levels/levels.html',
        controller: 'LevelsCtrl'
      })
    }
  ])

  .controller('LevelsCtrl', function ($scope, $sce, $firebaseArray,
    $firebaseObject,
    $anchorScroll, $location, Db, Auth) {
    $scope.Subpage('Admin')
    var messaging = firebase.messaging()
    Auth.$onAuthStateChanged(function () {
      if ($scope.admin) {
        var trickRef = Db.child('tricks')
        $scope.data = $firebaseArray(trickRef)
        getPermission()
      } else {
        $location.path('/')
      }
    })

    $anchorScroll.yOffset = 200
    setTimeout(function () {
      $anchorScroll()
    }, 100)

    $scope.status = {}

    $scope.accept = function (id0, id1, federation, newLevel) {
      var ref = Db.child('tricks')
        .child(id0)
        .child('subs')
        .child(id1)
        .child('levels')
        .child(federation)
      var updates = {}
      updates['level'] = newLevel
      updates['verified/suggestion'] = null
      updates['verified/verified'] = true
      ref.update(updates)
        .then(function () {
          $scope.status[id0 + '' + id1] = 'saved'
        })
    }

    $scope.deny = function (id0, id1, federation, newLevel) {
      var ref = Db.child('tricks')
        .child(id0)
        .child('subs')
        .child(id1)
        .child('levels')
        .child(federation)
      var updates = {}
      updates['verified/suggestion'] = null
      updates['verified/verified'] = false
      ref.update(updates)
        .then(function () {
          $scope.status[id0 + '' + id1] = 'saved'
        })
    }

    $scope.trustAsResourceUrl = $sce.trustAsResourceUrl

    var getPermission = function () {
      messaging.requestPermission()
        .then(function () {
          console.log('Notification permission granted.')
          getToken()
        })
        .catch(function (err) {
          console.log('Unable to get permission to notify.', err)
        })
    }

    var getToken = function () {
      messaging.getToken()
        .then(function (currentToken) {
          if (currentToken) {
            var ref = Db.child('users')
              .child($scope.user.uid)
              .child('fcm')
              .child('levels-web')
            ref.set(currentToken)
          } else {
            // Show permission request.
            console.log(
              'No Instance ID token available. Request permission to generate one.'
            )
            getPermission()
          }
        })
        .catch(function (err) {
          console.log('An error occurred while retrieving token. ', err)
          var ref = Db.child('users')
            .child($scope.user.uid)
            .child('fcm')
            .child('levels-web')
          ref.set(null)
        })
    }

    messaging.onTokenRefresh(getToken)
  })
