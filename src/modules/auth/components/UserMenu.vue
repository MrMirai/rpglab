<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { User, FolderOpen, Settings, ShieldCheck, LogOut } from 'lucide-vue-next'
import { useAuthStore } from '../store.js'

// Блок пользователя в шапке. Два состояния:
// гость — кнопки «Войти»/«Регистрация»;
// авторизован — кружок с аватаром/плейсхолдером, по клику дропдаун
// (Профиль / Проекты / Настройки / [Администрирование, если admin] / Выход).
// Живёт в модуле auth и вставляется в editor-агностичную шапку через слот.
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const isOpen = ref(false)
const buttonRef = ref(null)
const popupRef = ref(null)
const popupStyle = ref({})

const POPUP_W = 200

function toggle() {
  isOpen.value = !isOpen.value
  if (!isOpen.value) return

  const rect = buttonRef.value.getBoundingClientRect()
  const viewW = window.innerWidth
  const margin = 8

  let left = rect.right - POPUP_W
  if (left < margin) left = margin
  if (left + POPUP_W > viewW - margin) left = viewW - POPUP_W - margin

  popupStyle.value = {
    position: 'fixed',
    top: Math.round(rect.bottom + margin) + 'px',
    left: Math.round(left) + 'px',
    zIndex: 2000,
  }
}

function close() {
  isOpen.value = false
}

function onClickOutside(e) {
  if (!isOpen.value) return
  if (buttonRef.value?.contains(e.target)) return
  if (popupRef.value?.contains(e.target)) return
  close()
}
onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))

async function handleLogout() {
  close()
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
      <button
        ref="buttonRef"
        class="user-menu__avatar-btn"
        :title="auth.user?.username"
        @click="toggle"
      >
        <img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" alt="" class="user-menu__avatar" />
        <span v-else class="user-menu__avatar user-menu__avatar--placeholder">
          <User :size="16" />
        </span>
      </button>

      <Teleport to="body">
        <div v-if="isOpen" ref="popupRef" class="user-menu__popup" :style="popupStyle">
          <p class="user-menu__popup-name">{{ auth.user?.username }}</p>
          <RouterLink to="/profile" class="user-menu__item" @click="close">
            <User :size="15" /> Профиль
          </RouterLink>
          <RouterLink to="/projects" class="user-menu__item" @click="close">
            <FolderOpen :size="15" /> Проекты
          </RouterLink>
          <RouterLink to="/settings" class="user-menu__item" @click="close">
            <Settings :size="15" /> Настройки
          </RouterLink>
          <RouterLink v-if="auth.isAdmin" to="/admin" class="user-menu__item" @click="close">
            <ShieldCheck :size="15" /> Администрирование
          </RouterLink>
          <button class="user-menu__item user-menu__item--danger" @click="handleLogout">
            <LogOut :size="15" /> Выход
          </button>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.user-menu {
  display: flex;
  align-items: center;
  gap: var(--space-2);

  &::before {
    content: '';
    width: 1px;
    height: 24px;
    background-color: var(--color-border-strong);
    margin-right: var(--space-3);
    flex-shrink: 0;
  }

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

  &__avatar-btn {
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 50%;
    line-height: 0;
  }

  &__avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--color-border-strong);
    transition: border-color var(--transition-fast);

    .user-menu__avatar-btn:hover & {
      border-color: var(--color-accent);
    }

    &--placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg-3);
      color: var(--color-text-3);
    }
  }
}

.user-menu__popup {
  width: 200px;
  padding: var(--space-2);
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-popup);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-menu__popup-name {
  padding: var(--space-1) var(--space-2) var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-1);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-2);
  font-size: var(--text-sm);
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);

  &:hover {
    background-color: var(--color-bg-3);
    color: var(--color-text-1);
  }

  &--danger:hover {
    background-color: rgba(192, 84, 74, 0.1);
    color: var(--color-danger);
  }
}
</style>
