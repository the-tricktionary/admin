<template>
  <dl v-if="readonly" class="mb-4">
    <dt class="mb-1">
      Name
    </dt>
    <dd class="mb-3">
      {{ model.name || '–' }}
    </dd>
    <dt class="mb-1">
      Alternative names
    </dt>
    <dd class="mb-3">
      {{ model.alternativeNames.filter(alternative => alternative !== '').join(', ') || '–' }}
    </dd>
    <dt class="mb-1">
      Description
    </dt>
    <dd class="whitespace-pre-line">
      {{ model.description || '–' }}
    </dd>
  </dl>

  <template v-else>
    <form-field :id="`${idPrefix}-name`" label="Name">
      <template #default="field">
        <input
          v-bind="field"
          :value="model.name"
          type="text"
          required
          class="w-full block rounded focus:border-b-ttred-900 border-line"
          @input="patch({ name: inputValue($event) })"
        >
      </template>
    </form-field>

    <fieldset class="mb-4">
      <legend class="mb-1">
        Alternative names
      </legend>
      <div v-for="(alternativeName, index) of model.alternativeNames" :key="index" class="flex gap-2 mb-2">
        <label :for="`${idPrefix}-alternative-name-${index}`" class="sr-only">
          Alternative name {{ index + 1 }}
        </label>
        <input
          :id="`${idPrefix}-alternative-name-${index}`"
          :value="alternativeName"
          type="text"
          class="w-full block rounded focus:border-b-ttred-900 border-line"
          @input="setAlternativeName(index, inputValue($event))"
        >
        <button
          type="button"
          class="btn w-max"
          :aria-label="`Remove alternative name ${index + 1}`"
          @click="removeAlternativeName(index)"
        >
          <icon-delete aria-hidden="true" />
        </button>
      </div>
      <button type="button" class="btn w-max" @click="patch({ alternativeNames: [...model.alternativeNames, ''] })">
        Add alternative name
      </button>
    </fieldset>

    <form-field :id="`${idPrefix}-description`" label="Description">
      <template #default="field">
        <textarea
          v-bind="field"
          :value="model.description"
          rows="4"
          class="w-full block rounded focus:border-b-ttred-900 border-line"
          @input="patch({ description: inputValue($event) })"
        />
      </template>
    </form-field>
  </template>
</template>

<script setup lang="ts">
import FormField from './FormField.vue'

import IconDelete from '~icons/mdi/delete-outline'

import type { LocalisationValue } from '../helpers'

const model = defineModel<LocalisationValue>({ required: true })

const { readonly, idPrefix } = defineProps<{
  readonly?: boolean
  /** Makes the field ids unique when several field sets share a page */
  idPrefix: string
}>()

function inputValue (event: Event) {
  return (event.target as HTMLInputElement | HTMLTextAreaElement).value
}

function patch (changes: Partial<LocalisationValue>) {
  model.value = { ...model.value, ...changes }
}

function setAlternativeName (index: number, value: string) {
  patch({
    alternativeNames: model.value.alternativeNames.map((alternative, other) => other === index ? value : alternative)
  })
}

function removeAlternativeName (index: number) {
  patch({ alternativeNames: model.value.alternativeNames.filter((_, other) => other !== index) })
}
</script>
