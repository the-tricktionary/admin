/* global angular */
'use strict'
/**
 * @class trick.tricks
 * @memberOf trick
 * @requires ngRoute
 */
angular.module('trick.tricks', ['ngRoute'])

  .config([
    '$routeProvider',
    function ($routeProvider) {
      $routeProvider.when('/tricks/:id0?/:id1?', {
        templateUrl: '/tricks/tricks.html',
        controller: 'TricksCtrl'
      })
    }
  ])

  .controller('TricksCtrl', function ($scope, $firebaseArray, $firebaseObject,
    $location, $anchorScroll, $routeParams, $filter, Db, Auth) {
    $scope.Subpage('Tricks')

    /**
     * @name $scope.id0
     * @type {string}
     * @memberOf trick.details.DetailsCtrl
     */
    $scope.id0 = ($routeParams.id0 ? Number($routeParams.id0) : undefined)
    /**
     * @name $scope.id1
     * @type {string}
     * @memberOf trick.details.DetailsCtrl
     */
    $scope.id1 = ($routeParams.id1 ? Number($routeParams.id1) : undefined)

    var trickRef = Db.child('tricks')
    /**
     * @name $scope.data
     * @function
     * @memberOf trick.dash.DashCtrl
     * @description create a synchronized array stored in scope
     */
    $scope.data = $firebaseArray(trickRef)
    $scope.typeifs = {}
    var langsRef = Db.child('langs')
    /**
     * @name $scope.langs
     * @function
     * @memberOf trick.dash.DashCtrl
     * @description create a syncronised object stored in scope
     */
    $scope.langs = $firebaseObject(langsRef)
    /** Create reference to database path */
    var translationRef = Db.child('i18n').child('translated')
    /**
     * @name $scope.i18n
     * @function
     * @memberOf trick.dash.DashCtrl
     * @description create a syncronised object stored in scope
     */
    $scope.i18n = $firebaseObject(translationRef)
    $scope.typeifs = {}
    var langsRef = Db.child('langs')
    /**
     * @name $scope.langs
     * @function
     * @memberOf trick.dash.DashCtrl
     * @description create a syncronised object stored in scope
     */
    $scope.langs = $firebaseObject(langsRef)

    if (typeof $scope.id0 !== 'undefined' && typeof $scope.id1 !== 'undefined') {
      $scope.editing = true
      $scope.data.$loaded(function () {
        if (typeof $scope.data[$scope.id0] === 'undefined') {
          $scope.data[$scope.id0] = {
            id0: $scope.id0,
            level: '' + ($scope.id0 + 1),
            subs: {}
          }
        }
        if (typeof $scope.data[$scope.id0].subs === 'undefined') $scope.data[$scope.id0].subs = {}
        if (typeof $scope.data[$scope.id0].subs[$scope.id1] === 'undefined') {
          $scope.data[$scope.id0].subs[$scope.id1] = {
            id1: $scope.id1,
            prerequisites: [],
            alternativeNames: []
          }
        }
        if (typeof $scope.data[$scope.id0].subs[$scope.id1].prerequisites === 'undefined') $scope.data[$scope.id0].subs[$scope.id1].prerequisites = []
        if (typeof $scope.data[$scope.id0].subs[$scope.id1].alternativeNames === 'undefined') $scope.data[$scope.id0].subs[$scope.id1].alternativeNames = []
      })
    }

    /**
     * @name $scope.anchor
     * @function
     * @memberOf trick.dash.DashCtrl
     * @description Store URL's anchor value (`#disclaimer` for example) in the scope
     */
    var anchor = $location.hash()
    /** Configure $anchorScroll to take the navbar into consideration */
    $anchorScroll.yOffset = 200
    /** Scroll To anchor */
    setTimeout(function () {
      $anchorScroll()
    }, 100)
    /**
     * return a list of classes to apply
     * @param  {int} id0
     * @param  {int} id1
     * @return {string}
     */
    $scope.class = function (id0, id1) {
      var x = ''
      x += (id0 + '' + id1 === anchor ? 'pop ' : '')
      return x
    }

    let flat = function (data) {
      let flat = []
      let levs = data.forEach(function (level) {
        let tricks = []
        level.subs.forEach(function (trick) {
          let mod = {
            id0: level.id0,
            id1: trick.id1
          }
          // mod.level = 'Level ' + level.level
          flat.push(mod)
        })
      })
      return flat
    }

    $scope.flat = []
    $scope.data.$loaded(function (data) {
      $scope.flat = flat(data)
    })

    $scope.newTrick = function () {
      if (typeof $scope.newid0 === 'undefined' || $scope.newid0 === '' || $scope.newid0 === null) return
      $location.path('/tricks/' + $scope.newid0 + '/' + ($scope.data[$scope.newid0].subs.length || 0))
    }

    $scope.unverify = function (fed) {
      $scope.data[$scope.id0].subs[$scope.id1].levels[fed].verified = {
        date: $filter('date')((new Date()), 'yyyy-MM-dd'),
        vLevel: 0,
        verified: false,
        verifier: $scope.user.uid
      }
    }

    $scope.newPrereq = function () {
      $scope.data[$scope.id0].subs[$scope.id1].prerequisites.push({})
    }

    $scope.delPrereq = function (index) {
      $scope.data[$scope.id0].subs[$scope.id1].prerequisites.splice(index, 1)
    }

    $scope.newAltName = function () {
      $scope.data[$scope.id0].subs[$scope.id1].alternativeNames.push('')
    }

    $scope.delAltName = function (index) {
      $scope.data[$scope.id0].subs[$scope.id1].alternativeNames.splice(index, 1)
    }

    $scope.save = function () {
      $scope.saving = true
      $scope.data.$save($scope.data[$scope.id0]).then(function () {
        $location.path('/tricks')
      })
    }
  })
