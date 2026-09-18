<template>
  <div class="container mx-auto pt-4 px-2 flex flex-col items-center">
    <h1 class="mt-10 text-center">
      You don't have access to the admin interface
    </h1>
    <p class="text-center">
      Ask someone who administrates the Tricktionary for the grants you need,
      then sign in again.
    </p>
    <button class="btn md:max-w-80 mt-4" @click="signOutAndLeave()">
      Sign out
    </button>
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { getAuth, signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'

const router = useRouter()

async function signOutAndLeave () {
  await signOut(getAuth())
  await router.push('/auth')
}

useHead({ title: 'No access' })
</script>
