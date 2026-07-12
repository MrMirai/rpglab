<script setup>
import { RouterLink } from 'vue-router'
import { User } from 'lucide-vue-next'
import { useAuthStore } from '@/modules/auth'

const auth = useAuthStore()

const planLabels = {
  free: 'Бесплатный',
  monthly: 'Помесячная подписка',
  yearly: 'Годовая подписка',
}
</script>

<template>
  <div class="profile-view">
    <header class="profile-header">
      <RouterLink to="/" class="back-link">← Назад в редактор</RouterLink>
      <h1>Профиль</h1>
    </header>

    <main class="profile-content">
      <div class="profile-card">
        <img
          v-if="auth.user?.avatarUrl"
          :src="auth.user.avatarUrl"
          alt=""
          class="profile-avatar"
          @error="auth.refreshAvatarOnError"
        />
        <span v-else class="profile-avatar profile-avatar--placeholder">
          <User :size="32" />
        </span>

        <div class="profile-fields">
          <div class="profile-field">
            <span class="profile-field__label">Имя пользователя</span>
            <span class="profile-field__value">{{ auth.user?.username }}</span>
          </div>
          <div class="profile-field">
            <span class="profile-field__label">Email</span>
            <span class="profile-field__value">{{ auth.user?.email }}</span>
          </div>
          <div class="profile-field">
            <span class="profile-field__label">Тариф</span>
            <span class="profile-field__value">
              {{ planLabels[auth.user?.planCode] || auth.user?.planCode }}
            </span>
          </div>
        </div>
      </div>

      <RouterLink to="/settings" class="settings-link">Настройки аккаунта →</RouterLink>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.profile-view {
  min-height: 100vh;
  background-color: var(--color-bg-1);
  display: flex;
  flex-direction: column;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-4) var(--space-8);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-2);
}

.back-link {
  font-size: var(--text-sm);
  color: var(--color-text-2);
  transition: color var(--transition-fast);
  flex-shrink: 0;

  &:hover {
    color: var(--color-accent);
  }
}

.profile-content {
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 480px;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-6);
  background-color: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--color-border-strong);
  flex-shrink: 0;

  &--placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-3);
    color: var(--color-text-3);
  }
}

.profile-fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.profile-field {
  display: flex;
  flex-direction: column;

  &__label {
    font-size: var(--text-xs);
    color: var(--color-text-3);
  }

  &__value {
    font-size: var(--text-sm);
    color: var(--color-text-1);
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.settings-link {
  align-self: flex-start;
  font-size: var(--text-sm);
  color: var(--color-accent);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
