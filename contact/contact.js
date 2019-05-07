'use strict'
/* global angular, firebase */
/**
 * @class trick.contact
 * @memberOf trick
 * @requires ngRoute
 */

angular.module('trick.contact', ['ngRoute'])

  .config([
    '$routeProvider',
    function ($routeProvider) {
      $routeProvider.when('/contact', {
        templateUrl: '/contact/contact.html',
        controller: 'ContactCtrl'
      })
    }
  ])

  /**
   * @class trick.contact.ContactCtrl
   * @param {service} $scope
   * @param {service} $firebaseArray
   * @param {service} $location
   * @param {service} $anchorScroll
   * @param {service} Auth
   * @param {service} Db
   */
  .controller('ContactCtrl', function ($scope, $firebaseArray, $location,
    $anchorScroll, Auth, Db, marked) {
    Auth.$onAuthStateChanged(function () {
      $scope.Subpage('Contact')

      /** Configure $anchorScroll to take the navbar into consideration */
      $anchorScroll.yOffset = 200

      if ($scope.user) {
        /**
         * @name $scope.newName
         * @type {string}
         * @description contains user's Display name
         */
        $scope.newName = $scope.user.displayName
        /**
         * @name $scope.newEmail
         * @type {string}
         * @description contains user's email
         */
        $scope.newEmail = $scope.user.email
      }

      /** Create reference to database path */
      if ($scope.admin) {
        var u = $location.search().u
        var ref
        if (u) {
          ref = Db.child('contact/' + u)
          $scope.person = $firebaseArray(ref)
          $scope.u = true
          if ($scope.i) {
            $scope.person.$loaded()
              .then(function () {
                setTimeout(function () {
                  $anchorScroll($scope.i)
                }, 500)
              })
          }
        } else {
          ref = Db.child('contact')
          $scope.people = $firebaseArray(ref)
          $scope.u = false
        }
      } else {
        $location.path('/')
      }
    })

    /**
     * @name $scope.i
     * @type {?string}
     * @description contains id of a specific issue to be highlighted
     */
    $scope.i = $location.search().i

    /**
     * @name $scope.newReply
     * @function
     * @memberOf trick.contact.ContactCtrl
     * @description reply to an issue
     * @param {object} issue
     * @param {string} newReplyText
     */
    $scope.newReply = function (issue, newReplyText) {
      /**
       * @name len
       * @type {number}
       * @description get length of $scope.person[$scope.person.$indexFor(issue.$id)].replies array or return 0 if nonexistent
       */
      var len = ($scope.person[$scope.person.$indexFor(issue.$id)].replies
        ? $scope.person[$scope.person.$indexFor(issue.$id)].replies.length
        : 0)
      /**
       * @name $scope.person[$scope.person.$indexFor(issue.$id)].replies
       * @type {object}
       * @description return object replies if existing, else init empty object
       */
      $scope.person[$scope.person.$indexFor(issue.$id)].replies =
        ($scope.person[$scope.person.$indexFor(issue.$id)].replies
        ? $scope.person[$scope.person.$indexFor(issue.$id)].replies
        : {})
      /**
       * @name $scope.person[$scope.person.$indexFor(issue.$id)].replies[0 + len]
       * @type {object}
       * @description assign user's name and reply to a new child in object's array
       */
      $scope.person[$scope.person.$indexFor(issue.$id)].replies[0 + len] = {
        name: $scope.newName,
        reply: newReplyText
      }
      $scope.person.$save(issue)
    }

    $scope.keys = function (obj) {
      if (typeof obj === 'undefined' || obj === null) return []
      return Object.keys(obj).filter(function (key) {
        return !key.startsWith('$')
      })
    }

    $scope.unresolved = function (obj) {
      return $scope.keys(obj).filter(function (key) {
        return !obj[key].resolved
      }).length
    }

    $scope.issues = function (obj) {
      return $scope.keys(obj).length
    }

    $scope.$location = $location
  })
