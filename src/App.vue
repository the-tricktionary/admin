<template>
  <nav-header />
  <main>
    <router-view />
  </main>
  <div id="bottom-bars" class="fixed bottom-0 right-0 left-0 flex flex-col" />
</template>

<script setup lang="ts">
import { provide } from 'vue'
import { DefaultApolloClient } from '@vue/apollo-composable'
import { apolloClient } from './apollo'
import NavHeader from './components/NavHeader.vue'

provide(DefaultApolloClient, apolloClient)
</script>
