<template>
  <form-field :id="`${idPrefix}-type`" label="Video type">
    <template #default="field">
      <select v-bind="field" v-model="type" class="w-full block rounded border-line">
        <option v-for="(label, value) of videoTypeNames" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
    </template>
  </form-field>

  <form-field
    v-if="type === VideoType.SlowMo"
    :id="`${idPrefix}-slow-mo-start`"
    label="Slow motion start (seconds)"
  >
    <template #default="field">
      <input
        v-bind="field"
        v-model="slowMoStart"
        type="number"
        min="0"
        step="0.1"
        class="w-full block rounded focus:border-b-ttred-900 border-line"
      >
    </template>
  </form-field>
</template>

<script setup lang="ts">
import FormField from './FormField.vue'
import { VideoType } from '../graphql/generated/graphql'
import { videoTypeNames } from '../helpers'

defineProps<{ idPrefix: string }>()

const type = defineModel<VideoType>('type', { required: true })
/** As the number input holds it, see `slowMoStartInput` */
const slowMoStart = defineModel<string | number>('slowMoStart', { required: true })
</script>
