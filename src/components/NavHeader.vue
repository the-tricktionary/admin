<template>
  <header class="border-b-ttred-900 bg-ttred-500 border-b sticky top-0 left-0 right-0 flex justify-between items-center py-1 px-2 whitespace-nowrap z-1000">
    <router-link to="/" class="inline-flex justify-start items-center text-white text-xl">
      Tricktionary Admin
    </router-link>

    <nav class="flex items-center" aria-label="Main">
      <router-link exact-active-class="active" class="nav-link" to="/">
        Tricks
      </router-link>
      <router-link v-if="isSuperAdmin" active-class="active" class="nav-link" to="/users">
        Users
      </router-link>
      <router-link v-if="isSuperAdmin" active-class="active" class="nav-link" to="/rulesets">
        Rulesets
      </router-link>
      <button v-if="user" type="button" class="nav-link" @click="signOutAndLeave()">
        Sign out
      </button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { getAuth, signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'
import useAuth from '../hooks/useAuth'
import useGrants from '../hooks/useGrants'

const { firebaseUser: user } = useAuth()
const { isSuperAdmin } = useGrants()
const router = useRouter()

async function signOutAndLeave () {
  await signOut(getAuth())
  await router.push('/auth')
}
</script>

<style scoped>
.nav-link {
  @apply bg-ttred-900;
  @apply rounded;
  @apply m-1;
  @apply px-2;
  @apply py-1;
  color: white;
}

.nav-link:hover,
.nav-link.active {
  @apply bg-ttyellow-500;
  @apply text-black;
}
</style>
