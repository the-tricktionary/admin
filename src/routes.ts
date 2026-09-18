import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import useAuth, { whenAuthKnown } from './hooks/useAuth'
import useGrants from './hooks/useGrants'

declare module 'vue-router' {
  interface RouteMeta {
    /** Reachable without being signed in */
    public?: boolean
    /** Only reachable with a super admin grant */
    superAdmin?: boolean
    /** Only reachable with a grant that allows editing tricks */
    trickEditor?: boolean
  }
}

export const routes: RouteRecordRaw[] = [
  { name: 'auth', path: '/auth', component: async () => await import('./views/Auth.vue'), meta: { public: true } },
  { name: 'tricks', path: '/', component: async () => await import('./views/Tricks.vue') },
  { name: 'trick-new', path: '/trick/new', component: async () => await import('./views/TrickNew.vue'), meta: { trickEditor: true } },
  { name: 'trick', path: '/trick/:id', component: async () => await import('./views/Trick.vue') },
  { name: 'users', path: '/users', component: async () => await import('./views/Users.vue'), meta: { superAdmin: true } },
  { name: 'rulesets', path: '/rulesets', component: async () => await import('./views/Rulesets.vue'), meta: { superAdmin: true } },
  { name: 'no-access', path: '/no-access', component: async () => await import('./views/NoAccess.vue') },
  { name: 'not_found', path: '/:catchAll(.*)*', component: async () => await import('./views/404.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async to => {
  // a page can only be judged once we know who, if anyone, is signed in
  await whenAuthKnown()

  const { firebaseUser } = useAuth()
  const { isSuperAdmin, canEditTricks, hasAnyAccess } = useGrants()

  // the sign in page is the one place a visitor without a session belongs
  if (to.meta.public) return true

  if (!firebaseUser.value) {
    return { path: '/auth', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
  }

  if (!hasAnyAccess.value) {
    return to.path === '/no-access' ? true : { path: '/no-access' }
  }

  if (to.meta.superAdmin && !isSuperAdmin.value) return { path: '/' }

  if (to.meta.trickEditor && !canEditTricks.value) return { path: '/' }

  return true
})

export default router
