import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueKonva from 'vue-konva'
import '@/shared/assets/styles/main.scss'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/modules/auth'
import { setSessionExpiredHandler } from '@/shared/composables/useApi'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueKonva)

const auth = useAuthStore(pinia)

// Сессия умерла (401 от /api/auth/refresh: refresh протух, отозван или засчитан
// как реюз) — useApi уже стёр токены, здесь сбрасываем пользователя и, если он
// стоял на защищённой странице, уводим на вход с запоминанием куда шёл.
// На публичных страницах (редакторы) просто становимся гостем, не выкидывая с них.
setSessionExpiredHandler(() => {
  auth.clearSession()
  const current = router.currentRoute.value
  if (current.meta.requiresAuth) {
    router.push({ path: '/login', query: { redirect: current.fullPath } })
  }
})

// Пробуем восстановить сессию из refreshToken до монтирования,
// чтобы beforeEach-гард уже видел актуальный isAuthenticated.
await auth.restoreSession()

app.mount('#app')
