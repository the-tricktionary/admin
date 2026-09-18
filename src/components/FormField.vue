<template>
  <div class="mb-4">
    <label :for="id" class="block mb-1">{{ label }}</label>
    <slot :id="id" :aria-describedby="error ? errorId : undefined" />
    <p v-if="error" :id="errorId" class="text-ttred-900 mt-1">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { id, label, error = null } = defineProps<{
  id: string
  label: string
  error?: string | null
}>()

const errorId = computed(() => `${id}-error`)
</script>
