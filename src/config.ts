import * as Sentry from '@sentry/vue'
import { initializeApp } from 'firebase/app'

import type { FirebaseOptions } from 'firebase/app'
import type { Router } from 'vue-router'

if (!import.meta.env.VITE_FIREBASE_CONFIG) throw new Error('VITE_FIREBASE_CONFIG is not set, see the README')
const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG) as FirebaseOptions

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
