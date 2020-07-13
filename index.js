/* globals Vue, Vuetify, firebase */

const gAuthProvider = new firebase.auth.GoogleAuthProvider()
const admins = [
  'Kpz3afszjBR0qwZYUrKURRJx2cm2', // Dylan
  'g0G3A7FxieN333lZ2RKclkmv9Uw1' // Svante
]

firebase.firestore().enablePersistence()

const dateFormatter = new Intl.DateTimeFormat()

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
    drawer: false
  }),

  computed: {},

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
