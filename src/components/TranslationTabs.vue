<template>
  <nav aria-label="What to translate" class="flex flex-wrap gap-4 mt-2">
    <router-link
      :to="{ name: 'translations' }"
      exact-active-class="font-semibold no-underline text-content"
      class="text-link hover:text-link-hover underline"
    >
      Site messages
    </router-link>
    <router-link
      :to="{ name: 'tag-translations' }"
      exact-active-class="font-semibold no-underline text-content"
      class="text-link hover:text-link-hover underline"
    >
      Tag names
    </router-link>
  </nav>
</template>
