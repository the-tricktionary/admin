<template>
  <header ref="header" class="border-b-ttred-900 bg-ttred-500 border-b sticky top-0 left-0 right-0 flex justify-between items-center py-1 px-2 whitespace-nowrap z-1000">
    <router-link ref="brand" to="/" class="inline-flex justify-start items-center text-white text-xl">
      Tricktionary Admin
    </router-link>

    <button
      v-if="collapsed || !ready"
      type="button"
      class="nav-link inline-flex items-center justify-center min-h-8 cursor-pointer"
      :class="{ invisible: !ready }"
      :aria-expanded="showNav"
      aria-controls="main-nav"
      aria-label="Toggle menu"
      @click="showNav = !showNav"
    >
      <icon-close v-if="showNav" aria-hidden="true" />
      <icon-menu v-else aria-hidden="true" />
    </button>

    <nav
      v-show="ready && (!collapsed || showNav)"
      id="main-nav"
      class="flex items-center"
      :class="{ menu: collapsed }"
      aria-label="Main"
      @click="showNav = false"
    >
      <router-link
        v-for="link of links"
        :key="link.to"
        :active-class="link.exact ? undefined : 'active'"
        :exact-active-class="link.exact ? 'active' : undefined"
        class="nav-link"
        :to="link.to"
      >
        {{ link.label }}
      </router-link>
      <button v-if="user" type="button" class="nav-link" @click="signOutAndLeave()">
        Sign out
      </button>
    </nav>

    <div aria-hidden="true" class="absolute inset-0 overflow-hidden invisible">
      <div ref="row" class="flex w-max">
        <span v-for="link of links" :key="link.to" class="nav-link">{{ link.label }}</span>
        <span v-if="user" class="nav-link">Sign out</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { onClickOutside, unrefElement, useResizeObserver } from '@vueuse/core'
import { getAuth, signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'
import useAuth, { whenAuthKnown } from '../hooks/useAuth'
import useGrants from '../hooks/useGrants'

import IconMenu from '~icons/mdi/menu'
import IconClose from '~icons/mdi/close'

import type { ComponentPublicInstance } from 'vue'

interface NavLink {
  to: string
  label: string
  /** Active only on this exact path, for the link to the root */
  exact?: boolean
  show: boolean
}

const { firebaseUser: user } = useAuth()
const { isSuperAdmin, canEditTricks, canEditEventDefinitions, canTranslate } = useGrants()
const router = useRouter()

const links = computed(() => ([
  { to: '/', label: 'Tricks', exact: true, show: true },
  { to: '/submissions', label: 'Submissions', show: canEditTricks.value },
  { to: '/users', label: 'Users', show: isSuperAdmin.value },
  { to: '/rulesets', label: 'Rulesets', show: isSuperAdmin.value },
  { to: '/languages', label: 'Languages', show: isSuperAdmin.value },
  { to: '/notices', label: 'Notices', show: isSuperAdmin.value },
  { to: '/event-definitions', label: 'Speed events', show: canEditEventDefinitions.value },
  { to: '/translations', label: 'Translations', show: canTranslate.value }
] satisfies NavLink[]).filter(link => link.show))

const showNav = ref(false)
/** Whether the links are behind the menu button */
const collapsed = ref(true)
/**
 * Whether the grants have loaded once and the row of links been measured for
 * them, until then neither the links nor the menu button show, or a narrow
 * screen would have the few links there are before the grants in a row, then
 * swap them for the menu button. The button still takes its room, so the
 * header keeps its height
 */
const ready = ref(false)
const authKnown = ref(false)

const header = useTemplateRef('header')
const brand = useTemplateRef<ComponentPublicInstance>('brand')
const row = useTemplateRef('row')

// how many links there are depends on the grants, and how wide they are on
// the font, so rather than below a fixed width the links go behind the menu
// button whenever the row of them, laid out unseen inside the header, is
// wider than the room the name leaves
function fit () {
  const headerEl = header.value
  const brandEl = unrefElement(brand)
  if (!headerEl || !brandEl || !row.value) return

  const style = window.getComputedStyle(headerEl)
  const room = headerEl.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight) - brandEl.getBoundingClientRect().width
  collapsed.value = row.value.getBoundingClientRect().width > room
  if (authKnown.value) ready.value = true
}

// the header resizes with the window, the row when links come and go or the font loads
useResizeObserver([header, row], fit)

// the links for the grants are rendered by the next tick, measure those
// rather than showing them before they are
void whenAuthKnown().then(async () => {
  authKnown.value = true
  await nextTick()
  fit()
})

watch(collapsed, () => {
  showNav.value = false
})

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

/* The links behind the menu button, stacked full-width below the header */
.menu {
  @apply absolute;
  @apply top-full;
  @apply inset-x-0;
  @apply flex-col;
  @apply items-stretch;
  @apply bg-ttred-500;
  @apply border-b;
  @apply border-ttred-900;
}

.menu .nav-link {
  @apply rounded-none;
  @apply m-0;
  @apply py-4;
  @apply px-4;
  @apply border-t;
  @apply border-ttred-900;
}

.nav-link:hover,
.nav-link.active {
  @apply bg-ttyellow-500;
  @apply text-black;
}
</style>
