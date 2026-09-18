<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="bg-surface text-content rounded border border-line p-0 m-auto w-full max-w-sm"
    @close="emit('close')"
  >
    <form class="p-4 flex flex-col gap-3" @submit.prevent="save()">
      <h2 :id="titleId">
        New language
      </h2>

      <div class="flex flex-col gap-1">
        <label for="language-tag">Tag</label>
        <input
          id="language-tag"
          v-model="tag"
          type="text"
          required
          pattern="[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*"
          placeholder="pt-br"
          aria-describedby="language-name"
          class="rounded"
        >
        <p id="language-name" class="text-muted text-sm">
          {{ tag ? languageName(tag) : 'The tag of the language to add' }}
        </p>
      </div>

      <p v-if="error" role="alert" class="text-ttred-900">
        {{ error }}
      </p>

      <div class="flex justify-end gap-2">
        <button type="button" class="btn w-max" @click="dialog?.close()">
          Cancel
        </button>
        <button type="submit" class="btn-primary w-max" :disabled="saving">
          Create
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, useId, useTemplateRef } from 'vue'
import { useCreateLanguageMutation } from '../graphql/generated/graphql'
import { languageName } from '../helpers'

const emit = defineEmits<{
  close: []
}>()

const dialog = useTemplateRef('dialog')
const titleId = useId()

const tag = ref('')
const error = ref<string | null>(null)
const saving = ref(false)

const { mutate: createLanguage } = useCreateLanguageMutation({ refetchQueries: ['Languages'] })

async function save () {
  error.value = null
  saving.value = true
  try {
    await createLanguage({ lang: tag.value })
    dialog.value?.close()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong, please try again'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  dialog.value?.showModal()
})
</script>
