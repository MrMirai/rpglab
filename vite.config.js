import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Дев-прокси на /api больше не нужен — бэк сам настроил CORS для
  // http://localhost:5176 (см. API.md), фронт ходит напрямую через
  // API_BASE_URL в shared/composables/useApi.js.
  server: {
    port: 5176,
    strictPort: true,
  },
})
