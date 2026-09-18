<template>
  <div class="w-full border-b border-line flex justify-center overflow-x-auto" role="group" aria-label="Discipline">
    <button
      v-for="(name, dOpt) in disciplineNames"
      :key="dOpt"
      type="button"
      :aria-pressed="discipline === dOpt"
      :class="{
        'border-ttred-900': discipline === dOpt,
        'border-b-2': discipline === dOpt,
        'mb-0': discipline === dOpt,
        'mb-2px': discipline !== dOpt
      }"
      class="hover:bg-elevated hover:border-ttred-900 hover:border-b-2 hover:mb-0 py-2 px-8 whitespace-nowrap"
      @click="$emit('update:discipline', dOpt)"
    >
      {{ name }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { Discipline } from '../graphql/generated/graphql'
import { disciplineNames } from '../helpers'

const { discipline = Discipline.SingleRope } = defineProps<{ discipline?: Discipline }>()

defineEmits<{
  'update:discipline': [discipline: Discipline]
}>()
</script>
