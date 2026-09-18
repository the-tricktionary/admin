<template>
  <div class="flex flex-col items-center justify-center">
    <h1 class="mt-10">
      Not found
    </h1>
    <p>
      <router-link to="/">
        Go home
      </router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

useHead({ title: 'Not found' })
</script>
