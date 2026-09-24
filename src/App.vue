<template>
  <div class="min-h-dvh flex flex-col">
    <nav-header />
    <main class="flex-grow">
      <router-view />
    </main>
    <!--
      Sticky rather than fixed: the bars stay at the bottom of the screen but
      follow the page, so however tall they grow, e.g. the tricks list's
      filters wrapping on a phone, they end below its last row instead of
      covering it
    -->
    <div id="bottom-bars" class="sticky bottom-0 flex flex-col" />
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { computed, provide } from 'vue'
import { DefaultApolloClient } from '@vue/apollo-composable'
import { apolloClient } from './apollo'
import NavHeader from './components/NavHeader.vue'
import useAuth from './hooks/useAuth'

provide(DefaultApolloClient, apolloClient)

const { user } = useAuth()

// the theme is set in the public site's settings. null removes the attribute,
// leaving the scheme to the media query
const dataTheme = computed(() => user.value?.theme?.toLowerCase() ?? null)

useHead({
  htmlAttrs: { 'data-theme': dataTheme },
  titleTemplate: title => title ? `${title} | Tricktionary Admin` : 'Tricktionary Admin'
})
</script>
