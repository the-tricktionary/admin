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

        <h2 class="mb-2">
          Tags
        </h2>
        <trick-tags-editor v-model="tags" :discipline="discipline" class="mb-4" />

        <h2 class="mb-2">
          English
        </h2>
        <localisation-fields v-model="localisation" id-prefix="en" lang="en" />

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
import { useHead } from '@unhead/vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormField from '../components/FormField.vue'
import LocalisationFields from '../components/LocalisationFields.vue'
import TrickTagsEditor from '../components/TrickTagsEditor.vue'
import { useCreateTrickMutation } from '../graphql/generated/graphql'
import { disciplineNames, localisationInput, queryDiscipline, slugFromName, toLocalisationValue } from '../helpers'
import useTags from '../hooks/useTags'

import type { TagRow } from '../helpers'

const route = useRoute()
const router = useRouter()
const { tagInputs } = useTags()

const discipline = ref(queryDiscipline(route.query.discipline))
const tags = ref<TagRow[]>([])
const localisation = ref(toLocalisationValue(null))
const slug = ref('')
const slugEdited = ref(false)

watch(() => localisation.value.name, name => {
  if (slugEdited.value) return
  slug.value = slugFromName(name)
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
      slug: slug.value,
      localisation: localisationInput(localisation.value),
      tags: tagInputs(tags.value, discipline.value)
    }
  })

  const id = result?.data?.createTrick.id
  if (id != null) await router.push({ name: 'trick', params: { id } })
}

useHead({ title: 'New trick' })
</script>
