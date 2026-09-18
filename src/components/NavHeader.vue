<template>
  <header ref="header" class="border-b-ttred-900 bg-ttred-500 border-b sticky top-0 left-0 right-0 flex justify-between items-center py-1 px-2 whitespace-nowrap z-1000">
    <router-link to="/" class="inline-flex justify-start items-center text-white text-xl">
      Tricktionary Admin
    </router-link>

    <button
      type="button"
      class="nav-link sm:hidden inline-flex items-center justify-center min-h-8 cursor-pointer"
      :aria-expanded="showNav"
      aria-controls="main-nav"
      aria-label="Toggle menu"
      @click="showNav = !showNav"
    >
      <icon-close v-if="showNav" aria-hidden="true" />
      <icon-menu v-else aria-hidden="true" />
    </button>

    <nav
      id="main-nav"
      class="flex items-center max-sm:absolute max-sm:top-full max-sm:inset-x-0 max-sm:flex-col max-sm:items-stretch max-sm:bg-ttred-500 max-sm:border-b max-sm:border-ttred-900"
      :class="{ 'max-sm:hidden': !showNav }"
      aria-label="Main"
      @click="showNav = false"
    >
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
import { ref, useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { getAuth, signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'
import useAuth from '../hooks/useAuth'
import useGrants from '../hooks/useGrants'

import IconMenu from '~icons/mdi/menu'
import IconClose from '~icons/mdi/close'

const { firebaseUser: user } = useAuth()
const { isSuperAdmin } = useGrants()
const router = useRouter()

const showNav = ref(false)
const header = useTemplateRef('header')

onClickOutside(header, () => {
  showNav.value = false
})

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
  @apply text-white;
}

/* Stacked full-width entries in the dropdown on narrow screens */
@media (max-width: 639.9px) {
  nav .nav-link {
    @apply rounded-none;
    @apply m-0;
    @apply py-4;
    @apply px-4;
    @apply border-t;
    @apply border-ttred-900;
  }
}

.nav-link:hover,
.nav-link.active {
  @apply bg-ttyellow-500;
  @apply text-black;
}
</style>
