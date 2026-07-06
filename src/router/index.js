import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/modules/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Редактор — публичный, доступен без авторизации
    {
      path: '/',
      component: () => import('@/views/EditorView.vue'),
    },
    // Проекты — требуют аккаунта
    {
      path: '/projects',
      component: () => import('@/views/ProjectsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/register',
      component: () => import('@/views/RegisterView.vue'),
    },
  ],
})

// Защита роутов: закрытые страницы требуют авторизации,
// авторизованного не пускаем обратно на login/register.
router.beforeEach((to) => {
  const auth = useAuthStore()
  // Защищённые страницы — на логин, запомнив куда шёл пользователь
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  // Авторизованного не пускаем обратно на login/register
  if ((to.path === '/login' || to.path === '/register') && auth.isAuthenticated) {
    return '/'
  }
})

export default router
