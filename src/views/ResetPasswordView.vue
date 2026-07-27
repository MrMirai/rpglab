<template>
  <AuthPageBackground>
    <!-- Пароль изменён. Пары токенов бэк тут НЕ выдаёт (в отличие от verify-email),
         к тому же все сессии отозваны — ведём на вход с новым паролем. -->
    <div v-if="status === 'success'" class="auth-card auth-card--centered">
      <div class="auth-card__logo">
        <CircleCheck :size="56" class="auth-card__logo-icon auth-card__logo-icon--ok" />
      </div>

      <h1 class="auth-card__title">Пароль изменён</h1>
      <p class="auth-card__text">Войдите в аккаунт с новым паролем.</p>
      <p class="auth-card__hint">
        В целях безопасности мы завершили сессии на всех устройствах.
      </p>

      <BaseButton variant="accent" full-width @click="goToLogin">Перейти ко входу</BaseButton>
    </div>

    <!-- Токена нет в ссылке или бэк ответил 401 (неизвестен/использован/просрочен) -->
    <div v-else-if="status === 'invalid'" class="auth-card auth-card--centered">
      <div class="auth-card__logo">
        <CircleAlert :size="56" class="auth-card__logo-icon auth-card__logo-icon--error" />
      </div>

      <h1 class="auth-card__title">Ссылка недействительна</h1>
      <p class="auth-card__text">{{ error }}</p>
      <p class="auth-card__hint">
        Ссылка одноразовая и действует 1 час. Запросите новое письмо для сброса пароля.
      </p>

      <BaseButton variant="accent" full-width @click="goToForgot">Запросить письмо</BaseButton>

      <p class="auth-card__footer">
        <RouterLink to="/login">Вернуться ко входу</RouterLink>
      </p>
    </div>

    <div v-else class="auth-card">
      <div class="auth-card__logo">
        <LogoIcon :size="72" class="auth-card__logo-icon" />
      </div>

      <h1 class="auth-card__title">Новый пароль</h1>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="auth-form__field">
          <label>Новый пароль</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="new-password"
            required
          />
        </div>
        <div class="auth-form__field">
          <label>Повторите пароль</label>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="••••••••"
            autocomplete="new-password"
            required
          />
        </div>

        <p v-if="error" class="auth-form__error">{{ error }}</p>

        <BaseButton type="submit" variant="accent" full-width :disabled="loading">
          {{ loading ? 'Сохраняем...' : 'Сохранить пароль' }}
        </BaseButton>
      </form>

      <p class="auth-card__footer">
        <RouterLink to="/login">Вернуться ко входу</RouterLink>
      </p>
    </div>
  </AuthPageBackground>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { CircleCheck, CircleAlert } from 'lucide-vue-next'
import { useAuthStore } from '@/modules/auth'
import { useToast } from '@/shared/composables/useToast'
import BaseButton from '@/shared/components/BaseButton.vue'
import AuthPageBackground from '@/shared/components/AuthPageBackground.vue'
import LogoIcon from '@/shared/components/LogoIcon.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const token = typeof route.query.token === 'string' ? route.query.token : ''

// 'form' | 'success' | 'invalid'. Без токена в ссылке форму показывать бессмысленно.
const status = ref(token ? 'form' : 'invalid')
const error = ref(token ? '' : 'Ссылка не содержит токен сброса пароля.')

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

function goToLogin() {
  router.push('/login')
}

function goToForgot() {
  router.push('/forgot-password')
}

// Клиентская валидация до отправки — те же границы, что у бэка (400 иначе)
function validate() {
  if (password.value.length < 8 || password.value.length > 128) {
    return 'Пароль должен быть от 8 до 128 символов'
  }
  if (password.value !== confirmPassword.value) {
    return 'Пароли не совпадают'
  }
  return null
}

async function handleSubmit() {
  error.value = ''
  const invalid = validate()
  if (invalid) {
    error.value = invalid
    return
  }

  loading.value = true
  try {
    // Токен ОДНОРАЗОВЫЙ: при успехе форму больше не показываем (повторная отправка
    // вернула бы 401 и напугала бы пользователя, хотя пароль уже сменён).
    await auth.resetPassword(token, password.value)
    status.value = 'success'
    toast.success('Пароль изменён')
  } catch (e) {
    // 401 — ссылка мёртвая: чинится только новым письмом, а не повтором формы
    if (e.invalidToken) {
      status.value = 'invalid'
    }
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.auth-card {
  width: 380px;
  max-width: 100%;
  padding: var(--space-8);
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);

  &--centered {
    text-align: center;
  }

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
