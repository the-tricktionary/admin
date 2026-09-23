<template>
  <nav-header />
  <main>
    <router-view />
  </main>
  <div id="bottom-bars" class="fixed bottom-0 right-0 left-0 flex flex-col" />
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
