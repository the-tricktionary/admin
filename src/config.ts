import * as Sentry from '@sentry/vue'
import { initializeApp } from 'firebase/app'

import type { Router } from 'vue-router'

const firebaseConfig = {
  apiKey: 'AIzaSyD07mROu__kGOuJ-0MyjtjS6R5-DiTfUpM',
  authDomain: 'the-tricktionary.com',
  projectId: 'project-5641153190345267944',
  messagingSenderId: '1048157266079',
  appId: '1:1048157266079:web:a8ae83f6f16d7436',
  measurementId: 'G-G282NYD80K'
}

initializeApp(firebaseConfig)

export function initSentry ({ app, router }: { app: NonNullable<Parameters<typeof Sentry.init>[0]>['app'], router: Router }) {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      app,
      dsn: import.meta.env.VITE_SENTRY_DSN,
      release: `tricktionary-admin@${import.meta.env.VITE_COMMIT_REF?.toString()}`,
      environment: import.meta.env.VITE_CONTEXT?.toString(),
      integrations: [Sentry.browserTracingIntegration({
        router,
      })],
      tracePropagationTargets: ['api.the-tricktionary.com', 'admin.the-tricktionary.com'],
      tracesSampleRate: 1.0
    })
  }
}
