import { useEventListener } from '@vueuse/core'
import { onBeforeRouteLeave } from 'vue-router'

import type { Ref } from 'vue'

/** Asks before leaving the page while `dirty`, `subject` is e.g. `This trick` */
export default function useUnsavedChanges (dirty: Readonly<Ref<boolean>>, subject: string) {
  /** `action` is e.g. `Switch language` */
  function confirmDiscard (action: string) {
    return !dirty.value || window.confirm(`${subject} has changes that have not been saved yet. ${action} anyway?`)
  }

  onBeforeRouteLeave(() => confirmDiscard('Leave the page'))

  useEventListener(window, 'beforeunload', (event: BeforeUnloadEvent) => {
    if (dirty.value) event.preventDefault()
  })

  return { confirmDiscard }
}
