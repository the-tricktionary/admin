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
    drawer: false,

    discipline: 'sr',
    tab: null,
    trick: null,
    search: '',
    tricks: {
      sr: [],
      dd: [],
      wh: []
    },
    loaded: {
      sr: false,
      dd: false,
      wh: false
    },
    types: [],
    saving: false,
    valid: false,
    reqRule: [v => !!v || 'Required'],
    error: false,
    newPrereqId: null
  }),

  computed: {
    levelArrays () {
      const out = {}
      for (const trick of this.tricks[this.discipline]) {
        if (!Object.prototype.hasOwnProperty.call(out, trick.level)) out[trick.level] = []
        out[trick.level].push(trick)
      }
      return out
    },

    tricksWithoutCurrent () {
      return this.tricks[this.discipline].filter(trick => trick.id !== this.trick.id)
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

    changeDiscipline (discipline) {
      this.discipline = discipline
      this.load()
    },
    getTrick (id) {
      return this.tricks[this.discipline].find(trick => trick.id === id)
    },

    load () {
      const discipline = `${this.discipline}`

      firebase.firestore().collection('tricks' + discipline.toUpperCase()).get().then(qSnap => {
        this.loaded[discipline] = true
        qSnap.forEach(dSnap => {
          const trickIdx = this.tricks[discipline].findIndex(trick => trick.id === dSnap.id)

          if (trickIdx !== -1) {
            this.tricks[discipline].splice(trickIdx, 1, {
              id: dSnap.id,
              ...dSnap.data()
            })
          } else {
            this.tricks[discipline].push({
              id: dSnap.id,
              ...dSnap.data()
            })
          }
        })
      })

      firebase.firestore().collection('i18n').doc('en').collection('tricktypes').doc('translated').get().then(dSnap => {
        const keys = Object.keys(dSnap.data())
        this.$set(this, 'types', keys)
      })
    },

    edit (trick) {
      if (!trick.videos) this.$set(trick, 'videos', {})
      if (!trick.levels) this.$set(trick, 'levels', {})
      if (!trick.levels.ijru) this.$set(trick.levels, 'ijru', {})
      if (!trick.levels.ijru.verified) this.$set(trick.levels.ijru, 'verified', {})
      this.$set(this, 'trick', trick)
    },
    close () {
      this.$set(this, 'trick', null)
      this.$set(this, 'newPrereqId', null)
    },
    save () {
      const discipline = `${this.discipline}`
      const { id, ...trick } = this.trick

      this.$refs.form.validate()

      if (!this.valid || !trick.name || !trick.level || !trick.type) {
        this.error = 'From is missing required fields'
        return
      }

      this.saving = true

      if (!id || !trick.createdAt) trick.createdAt = firebase.firestore.FieldValue.serverTimestamp()
      trick.updatedAt = firebase.firestore.FieldValue.serverTimestamp()

      const baseRef = firebase.firestore().collection('tricks' + discipline.toUpperCase())
      const promise = id
        ? baseRef.doc(id).set(trick, { merge: true })
        : baseRef.add(trick)


      promise.then(dSnap => {
        this.saving = false

        if (!dSnap) return this.close()

        const trickIdx = this.tricks[discipline].findIndex(trick => trick.id === dSnap.id)

        if (trickIdx !== -1) {
          this.tricks[discipline].splice(trickIdx, 1, {
            id: dSnap.id,
            ...trick
          })
        } else {
          this.tricks[discipline].push({
            id: dSnap.id,
            ...trick
          })
        }

        this.close()
      })
      .catch(err => {
        this.error = err.message
      })
    },

    generateSlug () {
      this.$set(this.trick, 'slug', this.trick.name.toLocaleLowerCase().replace(/[^a-z]/g, '-').replace(/-{2,}/g, '-'))
    },

    newAlternativeName () {
      if (!this.trick.alternativeNames) this.$set(this.trick, 'alternativeNames', [])
      this.trick.alternativeNames.push('')
    },
    removeAlternativeName (idx) {
      this.trick.alternativeNames.splice(idx, 1)
    },
    setAlternativeName (idx, name) {
      this.trick.alternativeNames.splice(idx, 1, name)
    },

    addPrereq (newPrereqId) {
      console.log(newPrereqId)
      if (!this.trick.prerequisites) this.$set(this.trick, 'prerequisites', [])
      const discipline = `${this.discipline}`

      this.trick.prerequisites.push({
        id: newPrereqId,
        ref: firebase.firestore().collection('tricks' + discipline.toUpperCase()).doc(newPrereqId)
      })

      this.newPrereqId = null
    },
    removePrereq (idx) {
      this.trick.prerequisites.splice(idx, 1)
    },

    verifyTrick (trick, vLevel, verified) {
      this.$set(trick.levels.ijru.verified, 'date', firebase.firestore.Timestamp.now())
      this.$set(trick.levels.ijru.verified, 'vLevel', vLevel)
      this.$set(trick.levels.ijru.verified, 'verified', verified)
      this.$set(trick.levels.ijru.verified, 'verifier', this.uid)
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
