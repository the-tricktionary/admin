/* globals Vue, Vuetify, firebase */

const gAuthProvider = new firebase.auth.GoogleAuthProvider()
const admins = [
  'Kpz3afszjBR0qwZYUrKURRJx2cm2', // Dylan
  'g0G3A7FxieN333lZ2RKclkmv9Uw1' // Svante
]

firebase.firestore().enablePersistence()

const dateFormatter = new Intl.DateTimeFormat()
const shippedCallable = firebase.functions().httpsCallable('shipped')

new Vue({
  el: '#app',
  vuetify: new Vuetify({
    theme: {
      themes: {
        light: {
          primary: '#fe3500',
          secondary: '#ffc107',
          accent: '#ffeb3b',
          error: '#fe3500',
          warning: '#ff9800',
          info: '#3f51b5',
          success: '#4caf50'
        }
      }
    }
  }),
  data: () => ({
    authDialog: 'unchecked',
    uid: null,
    drawer: false,

    loaded: {
      orders: false,
      products: false,

      product: true, // used to know if currently saving one entry
      shipped: true // ^^^
    },

    orders: [],
    products: [],
    livemode: true,
    showShipped: false,
    printId: null,

    vatValues: [
      { text: '25%', value: 0.25 },
      { text: '12%', value: 0.12 },
      { text: '6%', value: 0.06 },
      { text: '0%', value: 0 }
    ]
  }),

  computed: {
    resolved () {
      const output = {}

      for (const order of this.orders) {
        const productRows = []

        if (order.paid) {
          for (const productRow of order.paidItems) {
            const resolvedProductInfo = this.productInfoBySku(typeof productRow.sku === 'string' ? productRow.sku : productRow.sku.id)
            productRows.push({
              qty: productRow.quantity,
              name: resolvedProductInfo.name,
              vatTotal: Math.round(productRow.quantity * productRow.amount * (1 - (1 / (1 + resolvedProductInfo.vat)))),
              vatPercentage: resolvedProductInfo.vat,
              total: productRow.quantity * productRow.amount,
              currency: resolvedProductInfo.currency,
              unit: resolvedProductInfo.unit,
              unitPrice: resolvedProductInfo.price
            })
          }
        } else {
          for (const productRow of order.requestedItems) {
            const resolvedProductInfo = this.productInfoBySku(typeof productRow.sku === 'string' ? productRow.sku : productRow.sku.id)
            productRows.push({
              qty: productRow.quantity,
              name: resolvedProductInfo.name,
              vatTotal: Math.round(productRow.quantity * resolvedProductInfo.price * (1 - (1 / (1 + resolvedProductInfo.vat)))),
              vatPercentage: resolvedProductInfo.vat,
              total: productRow.quantity * resolvedProductInfo.price,
              currency: resolvedProductInfo.currency,
              unit: resolvedProductInfo.unit,
              unitPrice: resolvedProductInfo.price
            })
          }
        }


        resolvedOrder = {
          productRows,
          ...productRows.reduce((acc, curr) => {
            acc.subtotal += curr.total - curr.vatTotal,
            acc.vatTotal += curr.vatTotal,
            acc.total += curr.total
            acc.currency = curr.currency
            return acc
          }, { subtotal: 0, vatTotal: 0, total: 0 })
        }

        output[order.id] = resolvedOrder
      }

      return output
    }
  },

  created () {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        if (admins.includes(user.uid)) {
          this.authDialog = 'authed'
          this.uid = user.uid
          this.load()
        } else {
          this.uid = null
          this.authDialog = 'notadmin'
        }
      } else {
        this.authDialog = 'unchecked'
        this.uid = null
      }
    })
  },

  methods: {
    login () {
      firebase.auth().signInWithPopup(gAuthProvider)
    },
    logout () {
      firebase.auth().signOut()
    },

    insertDSnaps (qSnap, arrName) {
      qSnap.forEach(dSnap => {
        const idx = this[arrName].findIndex(item => item.id === dSnap.id)

        if (idx !== -1) {
          this[arrName].splice(idx, 1, {
            id: dSnap.id,
            ...dSnap.data()
          })
        } else {
          this[arrName].push({
            id: dSnap.id,
            ...dSnap.data()
          })
        }
      })
    },

    load () {
      firebase.firestore().collection('products').get().then(qSnap => {
        this.loaded.products = true
        this.insertDSnaps(qSnap, 'products')
      })

      firebase.firestore().collection('orders').get().then(qSnap => {
        this.loaded.orders = true
        this.insertDSnaps(qSnap, 'orders')
      })
    },
    async ship (order) {
      this.loaded.shipped = false
      const response = await shippedCallable({ tracking: order.tracking || '', id: order.id })
      if (response.shipped) this.insertDSnaps([{ ...order, ...response }])
      this.loaded.shipped = true
    },
    async saveProduct ({ id, ...product}) {
      this.loaded.product = false
      await firebase.firestore().collection('products').doc(id).update({
        qty: parseInt(product.qty, 10),
        name: product.name || '',
        description: product.description || '',
        image: product.image || '',
      })
      this.loaded.product = true
    },

    filterOrders (items, search) {
      return items.filter(item => {
        if (this.livemode && !item.livemode) return false
        if (!this.livemode && item.livemode) return false

        if (!this.showShipped && item.shipped) return false

        return true
      })
    },

    productInfoBySku (sku) {
      const product = this.products.find(product => {
        const skus = [...Object.values(product.skus), ...Object.values(product['test-skus'])]
        return skus.includes(sku)
      })

      const skuEntries = [...Object.entries(product.skus), ...Object.entries(product['test-skus'])]
      const skuName = skuEntries.find(entry => entry[1] === sku)[0]
      const [currency, withVat] = skuName.split('-')

      return {
        name: product.name,
        currency,
        vat: !!withVat ? product.vat : 0,
        unit: product.unit,
        price: product.prices[currency]
      }
    },

    print (order) {
      this.printId = order.id
      this.drawer = false
      setTimeout(() => {
        window.print()
        setTimeout(() => {
          this.printId = null
        }, 500)
      }, 500)
    }
  },
  filters: {
    timestamp (value) {
      if (!value) return ''
      if (!(value instanceof firebase.firestore.Timestamp)) return value
      const date = dateFormatter.format(value.toDate())

      return date
    }
  }
})
