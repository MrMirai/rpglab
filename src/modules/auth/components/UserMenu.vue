<script setup>
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { LogOut } from 'lucide-vue-next'
import { useAuthStore } from '../store.js'

// Блок пользователя в шапке. Два состояния:
// гость — кнопки «Войти»/«Регистрация»; авторизован — имя + выход.
// Живёт в модуле auth и вставляется в editor-агностичную шапку через слот.
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

async function handleLogout() {
  await auth.logout()
  // Если текущая страница требует авторизации — уводим на логин,
  // с публичной (редактор) остаёмся на месте.
  if (route.meta.requiresAuth) router.push('/login')
}
</script>

<template>
  <div class="user-menu">
    <!-- Гость -->
    <template v-if="!auth.isAuthenticated">
      <RouterLink to="/login" class="user-menu__btn">Войти</RouterLink>
      <RouterLink to="/register" class="user-menu__btn user-menu__btn--accent">
        Регистрация
      </RouterLink>
    </template>

    <!-- Авторизован -->
    <template v-else>
      <span class="user-menu__name">{{ auth.user?.username }}</span>
      <button class="user-menu__logout" title="Выйти" @click="handleLogout">
        <LogOut :size="16" />
      </button>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.user-menu {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-left: var(--space-2);
  border-left: 1px solid var(--color-border);
  margin-left: var(--space-2);

  &__btn {
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-sm);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    color: var(--color-text-2);
    text-decoration: none;
    transition: all var(--transition-fast);
    white-space: nowrap;

    &:hover {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    &--accent {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: var(--color-bg-1);
      font-weight: var(--weight-medium);

      &:hover {
        opacity: 0.9;
        color: var(--color-bg-1);
      }
    }
  }

  &__name {
    font-size: var(--text-sm);
    color: var(--color-text-2);
  }

  &__logout {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-3);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      border-color: var(--color-danger);
      color: var(--color-danger);
    }
  }
}
</style>
