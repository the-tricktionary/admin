import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Unfonts from 'unplugin-fonts/vite'
import Unocss from 'unocss/vite'
import Icons from 'unplugin-icons/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Icons({
      compiler: 'vue3'
    }),
    Unocss(),
    Unfonts({
      google: {
        preconnect: true,
        display: 'swap',
        families: ['PT Sans']
      },
    })
  ],
  server: {
    port: 3003
  },
  build: {
    sourcemap: true
  }
})
