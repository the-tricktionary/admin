'use strict'
/* global angular, firebase */
/**
 * @class trick.contact
 * @memberOf trick
 * @requires ngRoute
 */

angular.module('trick.shop', ['ngRoute'])

  .config([
    '$routeProvider',
    function ($routeProvider) {
      $routeProvider.when('/shop', {
        templateUrl: '/shop/shop.html',
        controller: 'ShopCtrl'
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
  .controller('ShopCtrl', function ($scope, $firebaseArray, $location,
    $anchorScroll, Auth, Db) {
    Auth.$onAuthStateChanged(function () {
      $scope.Subpage('Shop')

      /** Configure $anchorScroll to take the navbar into consideration */
      $anchorScroll.yOffset = 200

      /** Create reference to database path */
      $scope.livemode = true
      $scope.shipped = false
      $scope.orders = {}
      $scope.products = {}
      $scope.resolved = {}
      $scope.totals = {}

      $scope.findBySku = (products, sku, receipt) => {
        let vatPaid = false
        let id = Object.keys(products).filter((id) => {
          let skus = Object.keys(products[id].skus)
            .map(key => ({ sku: products[id].skus[key], currency: key.split('-')[0], vat: key.split('-').length === 2, key }))
            .concat(Object.keys(products[id]['test-skus'])
              .map(key => ({ sku: products[id]['test-skus'][key], currency: key.split('-')[0], vat: key.split('-').length === 2, key })))
          let idx = skus.findIndex(obj => obj.sku === sku)
          if (idx >= 0) {
            vatPaid = skus[idx].vat
            return true
          }
          return false
        })[0]
        let output = {
          ...products[id]
        }
        output.vatPaid = vatPaid
        output.id = id
        output.receipt = receipt
        return output
      }

      $scope.ship = (id) => {
        console.log(id)
        let shippedCallable = firebase.functions().httpsCallable('shipped')
        shippedCallable({ tracking: $scope.orders[id].tracking || '', id: id })
      }

      if ($scope.admin) {
        firebase.firestore().collection('products').onSnapshot(qSnap => {
          qSnap.forEach(dSnap => {
            $scope.products[dSnap.id] = dSnap.data()
          })
          $scope.$apply()
        })
        firebase.firestore().collection('orders').onSnapshot(qSnap => {
          qSnap.forEach(dSnap => {
            $scope.orders[dSnap.id] = dSnap.data()
            if ($scope.orders[dSnap.id].paid) {
              $scope.resolved[dSnap.id] = $scope.orders[dSnap.id].paidItems.map(product => ({ product, resolved: $scope.findBySku($scope.products, (typeof product.sku === 'string' ? product.sku : product.sku.id), dSnap.id) }))
              console.log(dSnap.id, $scope.resolved[dSnap.id])
              $scope.totals[dSnap.id] = $scope.resolved[dSnap.id].map(product => ({
                subtotal: product.product.quantity * product.resolved.prices[$scope.orders[dSnap.id].currency],
                vat: Math.round(product.product.quantity * product.resolved.prices[$scope.orders[dSnap.id].currency] * (1 - (1 / (1 + (product.resolved.vatPaid ? product.resolved.vat : 0))))),
                total: product.product.quantity * product.product.amount
              })).reduce((curr, acc) => ({
                subtotal: curr.subtotal + acc.subtotal,
                vat: curr.vat + acc.vat,
                total: curr.total + acc.total
              }))
              console.log(dSnap.id, $scope.totals[dSnap.id])
            } else {
              $scope.resolved[dSnap.id] = $scope.orders[dSnap.id].requestedItems.map(product => ({ product, resolved: $scope.findBySku($scope.products, (typeof product.sku === 'string' ? product.sku : product.sku.id), dSnap.id) }))
              $scope.totals[dSnap.id] = $scope.resolved[dSnap.id].map(product => ({
                subtotal: product.product.quantity * product.resolved.prices[$scope.orders[dSnap.id].currency],
                vat: product.product.quantity * product.resolved.prices[$scope.orders[dSnap.id].currency] * (product.resolved.vatPaid ? product.resolved.vat : 0),
                total: product.product.quantity * product.resolved.prices[$scope.orders[dSnap.id].currency] * (product.resolved.vatPaid ? 1 + product.resolved.vat : 1)
              })).reduce((curr, acc) => ({
                subtotal: curr.subtotal + acc.subtotal,
                vat: curr.vat + acc.vat,
                total: curr.total + acc.total
              }))
            }
            console.log($scope.orders[dSnap.id], dSnap.id)
          })
          $scope.$apply()
        })
      } else {
        $location.path('/')
      }
    })
  })
