<template>
  <div class="container mx-auto pt-4 px-2 pb-8 max-w-2xl">
    <h1>New trick</h1>

    <form @submit.prevent="createTrick()">
      <fieldset :disabled="loading">
        <form-field id="discipline" label="Discipline">
          <template #default="field">
            <select v-bind="field" v-model="discipline" class="w-full block rounded border-line">
              <option v-for="(label, value) of disciplineNames" :key="value" :value="value">
                {{ label }}
              </option>
            </select>
          </template>
        </form-field>

        <form-field id="trick-type" label="Trick type">
          <template #default="field">
            <select v-bind="field" v-model="trickType" class="w-full block rounded border-line">
              <option v-for="type of trickTypes" :key="type" :value="type">
                {{ type }}
              </option>
            </select>
          </template>
        </form-field>

        <form-field id="name" label="English name">
          <template #default="field">
            <input
              v-bind="field"
              v-model="name"
              type="text"
              required
              class="w-full block rounded focus:border-b-ttred-900 border-line"
            >
          </template>
        </form-field>

        <fieldset class="mb-4">
          <legend class="mb-1">
            Alternative names
          </legend>
          <div v-for="(alternativeName, index) of alternativeNames" :key="index" class="flex gap-2 mb-2">
            <label :for="`alternative-name-${index}`" class="sr-only">
              Alternative name {{ index + 1 }}
            </label>
            <input
              :id="`alternative-name-${index}`"
              v-model="alternativeNames[index]"
              type="text"
              class="w-full block rounded focus:border-b-ttred-900 border-line"
            >
            <button
              type="button"
              class="btn w-max"
              :aria-label="`Remove alternative name ${index + 1}`"
              @click="alternativeNames.splice(index, 1)"
            >
              <icon-delete aria-hidden="true" />
            </button>
          </div>
          <button type="button" class="btn w-max" @click="alternativeNames.push('')">
            Add alternative name
          </button>
        </fieldset>

        <form-field id="description" label="Description">
          <template #default="field">
            <textarea
              v-bind="field"
              v-model="description"
              rows="4"
              class="w-full block rounded focus:border-b-ttred-900 border-line"
            />
          </template>
        </form-field>

        <form-field id="slug" label="Slug" :error="slugError">
          <template #default="field">
            <input
              v-bind="field"
              v-model="slug"
              type="text"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              class="w-full block rounded focus:border-b-ttred-900 border-line"
              @input="slugEdited = true"
            >
          </template>
        </form-field>

        <p v-if="submitError" class="text-ttred-900" role="alert">
          {{ submitError }}
        </p>

        <input type="submit" :value="loading ? 'Creating trick...' : 'Create trick'" class="btn">
      </fieldset>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormField from '../components/FormField.vue'
import { TrickType, useCreateTrickMutation } from '../graphql/generated/graphql'
import { disciplineNames, queryDiscipline } from '../helpers'

import IconDelete from '~icons/mdi/delete-outline'

const route = useRoute()
const router = useRouter()

const trickTypes = Object.values(TrickType).sort((a, b) => a.localeCompare(b))

const discipline = ref(queryDiscipline(route.query.discipline))
const trickType = ref(TrickType.Basic)
const name = ref('')
const alternativeNames = ref<string[]>([])
const description = ref('')
const slug = ref('')
const slugEdited = ref(false)

watch(name, value => {
  if (slugEdited.value) return
  slug.value = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
})

const { mutate, loading, error } = useCreateTrickMutation({
  refetchQueries: ['Tricks'],
  throws: 'never'
})

const slugTaken = computed(() => error.value?.graphQLErrors.some(err => err.extensions?.code === 'ENTITY_COLLISION') ?? false)
const slugError = computed(() => slugTaken.value ? 'A trick with this slug already exists in this discipline' : null)
const submitError = computed(() => slugTaken.value ? null : error.value?.message ?? null)

async function createTrick () {
  const result = await mutate({
    data: {
      discipline: discipline.value,
      trickType: trickType.value,
      slug: slug.value,
      localisation: {
        name: name.value,
        alternativeNames: alternativeNames.value.map(alternative => alternative.trim()).filter(alternative => alternative !== ''),
        description: description.value
      }
    }
  })

  const id = result?.data?.createTrick.id
  if (id != null) await router.push({ name: 'trick', params: { id } })
}
</script>
