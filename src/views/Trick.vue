<template>
  <div class="container mx-auto pt-4 px-2">
    <h1>{{ isNew ? 'New trick' : 'Trick' }}</h1>
    <p v-if="!isNew">
      Editing <code>{{ route.params.id }}</code>.
    </p>
    <p>
      The trick editor, with its localisations and levels, arrives in a later
      issue.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const isNew = computed(() => route.name === 'trick-new')
</script>
