import { setUser } from '@sentry/vue'
import { provideApolloClient } from '@vue/apollo-composable'
import { until } from '@vueuse/core'
import { getAuth } from 'firebase/auth'
import { computed, effectScope, ref } from 'vue'
import { apolloClient } from '../apollo'
import { useMeQuery } from '../graphql/generated/graphql'

import type { User } from 'firebase/auth'

/** `undefined` until firebase has restored, or ruled out, a persisted session */
const firebaseUser = ref<User | null>()
const authKnown = ref(false)
/** Whether the Me query has answered for the token we currently hold */
const meKnown = ref(false)

// The Me query is shared by every caller, the router guard included, so it
// lives in a detached scope rather than in the first component that asked
const scope = effectScope(true)
let state: ReturnType<typeof createState> | undefined

function createState () {
  // the router guard may be the first caller, and it runs outside of any component
  provideApolloClient(apolloClient)

  // waiting for firebase keeps the query from asking once without a token and
  // then again with one
  const userQuery = useMeQuery(() => ({
    fetchPolicy: 'cache-and-network',
    enabled: authKnown.value
  }))

  // on a cache miss the first result is a loading placeholder without data
  userQuery.onResult(result => { if (!result.loading) meKnown.value = true })
  userQuery.onError(() => { meKnown.value = true })

  getAuth().onIdTokenChanged(user => {
    firebaseUser.value = user
    // whatever the query knows was fetched for the previous token
    meKnown.value = false
    void userQuery.refetch()
    setUser(user ? { id: user.uid } : null)
  })

  void getAuth().authStateReady().then(() => {
    authKnown.value = true
  })

  const user = computed(() => userQuery.result.value?.me ?? null)
  const loading = computed(() => !authKnown.value || !meKnown.value)

  return { user, loading }
}

export default function useAuth () {
  state ??= scope.run(createState)!
  return { ...state, firebaseUser }
}

/** Resolves once the guard can tell a signed out visitor from one without grants */
export async function whenAuthKnown () {
  const { loading } = useAuth()
  await until(loading).toBe(false)
}
