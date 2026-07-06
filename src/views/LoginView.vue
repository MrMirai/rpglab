<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-card__logo">
        <span class="auth-card__logo-icon">◎</span>
        <span class="auth-card__logo-text">RPGLab</span>
      </div>

      <h1 class="auth-card__title">Войти в аккаунт</h1>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="auth-form__field">
          <label>Email</label>
          <input
            v-model="email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            required
          />
        </div>
        <div class="auth-form__field">
          <label>Пароль</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            required
          />
        </div>

        <p v-if="error" class="auth-form__error">{{ error }}</p>

        <BaseButton type="submit" variant="accent" full-width :disabled="loading || retryIn > 0">
          {{ submitLabel }}
        </BaseButton>
      </form>

      <p class="auth-card__footer">
        Нет аккаунта?
        <RouterLink to="/register">Зарегистрироваться</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/modules/auth'
import BaseButton from '@/shared/components/BaseButton.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

// Обратный отсчёт после 429 (rate limit) — блокирует кнопку до конца Retry-After.
const retryIn = ref(0)
let retryTimer = null

function startRetryCountdown(seconds) {
  clearInterval(retryTimer)
  retryIn.value = seconds
  retryTimer = setInterval(() => {
    retryIn.value -= 1
    if (retryIn.value <= 0) clearInterval(retryTimer)
  }, 1000)
}

onUnmounted(() => clearInterval(retryTimer))

const submitLabel = computed(() => {
  if (loading.value) return 'Входим...'
  if (retryIn.value > 0) return `Подождите ${retryIn.value} с`
  return 'Войти'
})

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    // Возвращаемся туда, откуда пришли (если был редирект с защищённой страницы)
    router.push(route.query.redirect || '/')
  } catch (e) {
    error.value = e.message
    if (e.retryAfterSeconds) startRetryCountdown(e.retryAfterSeconds)
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-1);
}

.auth-card {
  width: 100%;
  max-width: 380px;
  padding: var(--space-8);
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);

  &__logo {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-6);
  }

  &__logo-icon {
    font-size: 24px;
    color: var(--color-accent);
  }

  &__logo-text {
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
    color: var(--color-accent);
  }

  &__title {
    font-size: var(--text-xl);
    font-weight: var(--weight-semibold);
    color: var(--color-text-1);
    margin-bottom: var(--space-6);
  }

  &__footer {
    margin-top: var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-text-2);
    text-align: center;

    a {
      color: var(--color-accent);
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);

    label {
      font-size: var(--text-sm);
      color: var(--color-text-2);
    }

    input {
      padding: var(--space-2) var(--space-3);
      background: var(--color-bg-1);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text-1);
      font-size: var(--text-md);
      outline: none;
      transition: border-color var(--transition-fast);

      &:focus {
        border-color: var(--color-accent);
      }
      &::placeholder {
        color: var(--color-text-3);
      }
    }
  }

  &__error {
    font-size: var(--text-sm);
    color: var(--color-danger);
    padding: var(--space-2) var(--space-3);
    background: rgba(192, 84, 74, 0.1);
    border-radius: var(--radius-md);
    border: 1px solid rgba(192, 84, 74, 0.3);
  }

}
</style>
