<template>
  <h1 class="mx-auto text-center mt-8">
    Sign in
  </h1>
  <div class="mx-auto container mt-2 px-2 flex flex-col md:flex-row justify-center items-center">
    <form class="w-full md:max-w-80 mb-4" @submit.prevent="logInWithProvider('google.com')">
      <h2 class="text-lg font-semibold">
        Sign in with an external account
      </h2>
      <input type="submit" value="Sign in with Google" class="btn">
      <p v-if="socialErr" class="text-ttred-900">
        Failed to log in with error: "{{ socialErr }}". Please try again,
        if this error persists please <a href="mailto:contact@the-tricktionary.com">contact us</a>
      </p>
    </form>
    <div class="hidden md:block w-full md:w-0 md:h-48 md:border-b-0 md:border-r border-line m-4" />
    <div class="w-full md:max-w-80">
      <form class="mb-4" @submit.prevent="sendEmailLink()">
        <h2 class="text-lg font-semibold">
          Sign in with email
        </h2>
        <input
          v-model="email.email"
          type="email"
          :disabled="email.linkSent"
          aria-label="Email"
          :required="true"
          placeholder="Email"
          class="w-full block rounded focus:border-b-ttred-900 border-line disabled:bg-sunken"
        >
        <input type="submit" :disabled="email.linkSent" value="Send magic link" class="btn mt-2">
        <p v-if="email.error" class="text-ttred-900">
          Failed to log in with error: "{{ email.error }}". Please try again,
          if this error persists please <a href="mailto:contact@the-tricktionary.com">contact us</a>
        </p>
        <p v-if="email.linkSent">
          An email with a link to login has been sent to your email.
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { getAuth, GoogleAuthProvider, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, signInWithPopup } from 'firebase/auth'
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import useAuth from '../hooks/useAuth'

import type { FirebaseError } from 'firebase/app'

const auth = getAuth()
const { firebaseUser: user } = useAuth()
const router = useRouter()
const route = useRoute()

const email = reactive({
  email: '',
  linkSent: false,
  error: null as string | null
})

const socialErr = ref<string | null>(null)

/** Where the guard wanted to send the visitor before it asked them to sign in */
function target () {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/'
}

watch(user, newUser => {
  if (newUser) {
    void router.replace(target())
  }
}, { immediate: true })

const providers = {
  // https://firebase.google.com/docs/reference/js/v9/auth.md#signinmethod
  'google.com': new GoogleAuthProvider()
}

async function logInWithProvider (providerId: keyof typeof providers) {
  try {
    socialErr.value = null
    await signInWithPopup(auth, providers[providerId])
  } catch (err) {
    socialErr.value = (err as FirebaseError).code
    throw err
  }
}

async function sendEmailLink () {
  try {
    email.error = null
    await sendSignInLinkToEmail(auth, email.email, {
      url: `${window.location.origin}/auth?email=${email.email}`,
      handleCodeInApp: true
    })
    email.linkSent = true
  } catch (err) {
    email.error = (err as FirebaseError).code
    throw err
  }
}

onMounted(async () => {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    const params = new URLSearchParams(window.location.search)
    const emailParam = params.get('email')
    try {
      if (!emailParam) throw new Error('No email provided in magic link')
      await signInWithEmailLink(auth, emailParam, window.location.href)
    } catch (err) {
      email.error = (err as FirebaseError).code ?? (err as Error).message
      throw err
    }
  }
})

useHead({ title: 'Sign in' })
</script>
