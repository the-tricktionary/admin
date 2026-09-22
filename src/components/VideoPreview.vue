<template>
  <mux-player
    class="w-full h-full"
    :playback-id="playbackId"
    stream-type="on-demand"
    autoplay="muted"
    loop
    playsinline
    accent-color="#fe3500"
    :title="title"
  />
</template>

<script setup lang="ts">
import '@mux/mux-player'

const { playbackId, title } = defineProps<{
  playbackId: string
  title: string
}>()
</script>

<style scoped>
mux-player {
  --captions-button: none;
  --airplay-button: none;
  --cast-button: none;
  --pip-button: none;
}
</style>
