<template>
  <div class="container mx-auto pt-4 px-2">
    <h1>Trick</h1>
    <p>
      Editing <code>{{ route.params.id }}</code>.
    </p>
    <p>
      The trick editor, with its localisations and levels, arrives in a later
      issue.
    </p>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
