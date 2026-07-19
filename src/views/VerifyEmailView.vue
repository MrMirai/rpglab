<template>
  <AuthPageBackground>
    <div class="auth-card">
      <div class="auth-card__logo">
        <LoaderCircle v-if="status === 'verifying'" :size="56" class="auth-card__logo-icon auth-card__logo-icon--spin" />
        <CircleCheck v-else-if="status === 'success'" :size="56" class="auth-card__logo-icon auth-card__logo-icon--ok" />
        <CircleAlert v-else :size="56" class="auth-card__logo-icon auth-card__logo-icon--error" />
      </div>

      <template v-if="status === 'verifying'">
        <h1 class="auth-card__title">Подтверждаем email…</h1>
        <p class="auth-card__text">Секунду, проверяем ссылку из письма.</p>
      </template>

      <template v-else-if="status === 'success'">
        <h1 class="auth-card__title">Email подтверждён</h1>
        <p class="auth-card__text">Вы вошли в аккаунт.</p>
        <BaseButton variant="accent" full-width @click="goHome">
          Перейти в приложение
        </BaseButton>
      </template>

      <template v-else>
        <h1 class="auth-card__title">Ссылка недействительна</h1>
        <p class="auth-card__text">{{ error }}</p>
        <p class="auth-card__hint">
          Ссылка одноразовая и действует 24 часа. Запросите новое письмо на странице входа.
        </p>
        <BaseButton variant="accent" full-width @click="goToLogin">
          Перейти ко входу
        </BaseButton>
      </template>
    </div>
  </AuthPageBackground>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { CircleCheck, CircleAlert, LoaderCircle } from 'lucide-vue-next'
import { useAuthStore } from '@/modules/auth'
import BaseButton from '@/shared/components/BaseButton.vue'
import AuthPageBackground from '@/shared/components/AuthPageBackground.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const status = ref('verifying') // 'verifying' | 'success' | 'error'
const error = ref('')

function goToLogin() {
  router.push('/login')
}

function goHome() {
  router.push('/')
}

onMounted(async () => {
  const token = route.query.token
  if (!token || typeof token !== 'string') {
    status.value = 'error'
    error.value = 'Ссылка не содержит токен подтверждения.'
    return
  }

  // Токен ОДНОРАЗОВЫЙ: verifyEmail зовётся ровно один раз (onMounted без ретраев),
  // повторный вызов вернул бы 401 и напугал бы пользователя, хотя первый прошёл.
  try {
    await auth.verifyEmail(token)
    status.value = 'success'
    // verifyEmail уже сохранил пару токенов и подтянул профиль (auto-login).
    // Автоматически НЕ редиректим — пользователь сам жмёт «Перейти в приложение».
  } catch (e) {
    status.value = 'error'
    error.value = e.message
  }
})
</script>

<style lang="scss" scoped>
.auth-card {
  width: 380px;
  max-width: 100%;
  padding: var(--space-8);
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  text-align: center;

  &__logo {
    display: flex;
    justify-content: center;
    margin-bottom: var(--space-6);
  }

  &__logo-icon {
    color: var(--color-accent);

    &--ok {
      color: var(--color-success, #5a8c5a);
    }
    &--error {
      color: var(--color-danger);
    }
    &--spin {
      animation: verify-spin 1s linear infinite;
    }
  }

  &__title {
    font-size: var(--text-xl);
    font-weight: var(--weight-semibold);
    color: var(--color-text-1);
    margin-bottom: var(--space-4);
  }

  &__text {
    font-size: var(--text-md);
    color: var(--color-text-1);
    line-height: 1.5;
    margin-bottom: var(--space-3);
  }

  &__hint {
    font-size: var(--text-sm);
    color: var(--color-text-2);
    margin-bottom: var(--space-6);
  }
}

@keyframes verify-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
