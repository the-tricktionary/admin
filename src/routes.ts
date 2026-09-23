import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import useAuth, { whenAuthKnown } from './hooks/useAuth'
import useGrants from './hooks/useGrants'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    superAdmin?: boolean
    trickEditor?: boolean
    speedEditor?: boolean
    translator?: boolean
  }
}

export const routes: RouteRecordRaw[] = [
  { name: 'auth', path: '/auth', component: async () => await import('./views/Auth.vue'), meta: { public: true } },
  { name: 'tricks', path: '/', component: async () => await import('./views/Tricks.vue') },
  { name: 'trick-new', path: '/trick/new', component: async () => await import('./views/TrickNew.vue'), meta: { trickEditor: true } },
  { name: 'trick', path: '/trick/:id', component: async () => await import('./views/Trick.vue') },
  { name: 'submissions', path: '/submissions', component: async () => await import('./views/Submissions.vue'), meta: { trickEditor: true } },
  { name: 'users', path: '/users', component: async () => await import('./views/Users.vue'), meta: { superAdmin: true } },
  { name: 'rulesets', path: '/rulesets', component: async () => await import('./views/Rulesets.vue'), meta: { superAdmin: true } },
  { name: 'languages', path: '/languages', component: async () => await import('./views/Languages.vue'), meta: { superAdmin: true } },
  { name: 'notices', path: '/notices', component: async () => await import('./views/Notices.vue'), meta: { superAdmin: true } },
  { name: 'translations', path: '/translations', component: async () => await import('./views/Translations.vue'), meta: { translator: true } },
  { name: 'event-definitions', path: '/event-definitions', component: async () => await import('./views/EventDefinitions.vue'), meta: { speedEditor: true } },
  { name: 'settings', path: '/settings', component: async () => await import('./views/Settings.vue') },
  { name: 'no-access', path: '/no-access', component: async () => await import('./views/NoAccess.vue') },
  { name: 'not_found', path: '/:catchAll(.*)*', component: async () => await import('./views/404.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async to => {
  await whenAuthKnown()

  const { firebaseUser } = useAuth()
  const { isSuperAdmin, canEditTricks, canEditEventDefinitions, canTranslate, hasAnyAccess } = useGrants()

  if (to.meta.public) return true

  if (!firebaseUser.value) {
    return { path: '/auth', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
  }

  if (!hasAnyAccess.value) {
    return to.path === '/no-access' ? true : { path: '/no-access' }
  }

  if (to.meta.superAdmin && !isSuperAdmin.value) return { path: '/' }

  if (to.meta.trickEditor && !canEditTricks.value) return { path: '/' }

  if (to.meta.translator && !canTranslate.value) return { path: '/' }
  if (to.meta.speedEditor && !canEditEventDefinitions.value) return { path: '/' }

  return true
})

export default router
