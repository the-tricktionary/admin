import { createHead } from '@unhead/vue/client'
import { initSentry } from './config'
import { type Component, createApp } from 'vue'

import router from './routes'
import App from './App.vue'
import 'uno.css'
import 'unfonts.css'

export const app = createApp(App as Component)

initSentry({ app, router })

app.use(router)
  .use(createHead())
  .mount('#app')
