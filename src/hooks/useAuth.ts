import { setUser } from '@sentry/vue'
import { provideApolloClient } from '@vue/apollo-composable'
import { until } from '@vueuse/core'
import { getAuth } from 'firebase/auth'
import { computed, effectScope, ref } from 'vue'
import { apolloClient } from '../apollo'
import { useMeQuery } from '../graphql/generated/graphql'

import type { User } from 'firebase/auth'

/** The firebase session, `undefined` until firebase has restored it */
const firebaseUser = ref<User | null>()
/** Whether firebase has restored, or ruled out, a persisted session */
const authKnown = ref(false)
/** Whether the Me query has answered for the token we currently hold */
const meKnown = ref(false)

/**
 * The components and the router guard all look at the same auth state, so the
 * Me query and the token listener are created once, in a detached scope,
 * instead of per caller.
 */
const scope = effectScope(true)
let state: ReturnType<typeof createState> | undefined

function createState () {
  // the guard uses this outside of a component setup
  provideApolloClient(apolloClient)

  // waiting for firebase keeps the query from asking once without a token and
  // then again with one
  const userQuery = useMeQuery(() => ({
    fetchPolicy: 'cache-and-network',
    enabled: authKnown.value
  }))

  userQuery.onResult(() => { meKnown.value = true })
  userQuery.onError(() => { meKnown.value = true })

  getAuth().onIdTokenChanged(user => {
    // set the ref to get the firebase user
    firebaseUser.value = user
    // whatever the query knows was fetched for the previous token
    meKnown.value = false
    // refetch the user document from the db
    void userQuery.refetch()
    // set the user id for error reporting
    setUser(user ? { id: user.uid } : null)
  })

  void getAuth().authStateReady().then(() => {
    authKnown.value = true
  })

  const user = computed(() => userQuery.result.value?.me ?? null)
  /** Whether the signed in user, and so their grants, are still unknown */
  const loading = computed(() => !authKnown.value || !meKnown.value)

  return { user, loading }
}

export default function useAuth () {
  state ??= scope.run(createState)!
  return { ...state, firebaseUser }
}

/**
 * Resolves once firebase has restored any persisted session and the API has
 * answered for the token that came with it, which is what the router guard
 * needs before it can tell a signed out visitor from one without grants.
 */
export async function whenAuthKnown () {
  const { loading } = useAuth()
  await until(loading).toBe(false)
}
