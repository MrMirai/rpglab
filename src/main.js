import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueKonva from 'vue-konva'
import '@/shared/assets/styles/main.scss'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/modules/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueKonva)

// Пробуем восстановить сессию из refreshToken до монтирования,
// чтобы beforeEach-гард уже видел актуальный isAuthenticated.
const auth = useAuthStore(pinia)
await auth.restoreSession()

app.mount('#app')
