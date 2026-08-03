<template>
  <AuthPageBackground>
    <!-- Письмо запрошено: ответ ВСЕГДА 202 (анти-enumeration), поэтому текст
         нейтральный - «если аккаунт существует», без «email найден/не найден». -->
    <div v-if="sent" class="auth-card auth-card--centered">
      <div class="auth-card__logo">
        <MailCheck :size="56" class="auth-card__logo-icon" />
      </div>

      <h1 class="auth-card__title">Проверьте почту</h1>

      <p class="auth-card__text">
        Если аккаунт с адресом <strong>{{ email }}</strong> существует, мы отправили на него
        письмо со ссылкой для смены пароля.
      </p>

      <p class="auth-card__hint">
        Ссылка действует 1 час и работает один раз. Не пришло письмо? Проверьте папку «Спам»
        или отправьте его повторно.
      </p>

      <BaseButton variant="accent" full-width :disabled="loading || cooldown > 0" @click="send">
        {{ resendLabel }}
      </BaseButton>

      <p class="auth-card__footer">
        <RouterLink to="/login">Вернуться ко входу</RouterLink>
      </p>
    </div>

    <div v-else class="auth-card">
      <div class="auth-card__logo">
        <LogoIcon :size="72" class="auth-card__logo-icon" />
      </div>

      <h1 class="auth-card__title">Сброс пароля</h1>

      <p class="auth-card__text">
        Укажите email аккаунта — пришлём письмо со ссылкой для установки нового пароля.
      </p>

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

        <p v-if="error" class="auth-form__error">{{ error }}</p>

        <BaseButton type="submit" variant="accent" full-width :disabled="loading">
          {{ loading ? 'Отправляем...' : 'Отправить письмо' }}
        </BaseButton>
      </form>

      <p class="auth-card__footer">
        Вспомнили пароль?
        <RouterLink to="/login">Войти</RouterLink>
      </p>
    </div>
  </AuthPageBackground>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { MailCheck } from 'lucide-vue-next'
import { useAuthStore } from '@/modules/auth'
import { useToast } from '@/shared/composables/useToast'
import BaseButton from '@/shared/components/BaseButton.vue'
import AuthPageBackground from '@/shared/components/AuthPageBackground.vue'
import LogoIcon from '@/shared/components/LogoIcon.vue'

const auth = useAuthStore()
const route = useRoute()
const toast = useToast()

// Со страницы входа можем прийти с уже введённым адресом (?email=…)
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const error = ref('')
const loading = ref(false)
const sent = ref(false)

// Cooldown на повторную отправку: у бэка свой лимит ~60с (общий с повторной
// верификацией), дублируем таймером - кнопка гаснет сразу после клика.
const COOLDOWN_SECONDS = 60
const cooldown = ref(0)
let cooldownTimer = null

function startCooldown() {
  clearInterval(cooldownTimer)
  cooldown.value = COOLDOWN_SECONDS
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearInterval(cooldownTimer)
  }, 1000)
}

onUnmounted(() => clearInterval(cooldownTimer))

const resendLabel = computed(() => {
  if (loading.value) return 'Отправляем...'
  if (cooldown.value > 0) return `Отправить повторно (${cooldown.value} с)`
  return 'Отправить письмо повторно'
})

async function send() {
  error.value = ''
  loading.value = true
  const isResend = sent.value
  try {
    await auth.forgotPassword(email.value)
    sent.value = true
    startCooldown()
    // Первую отправку объясняет сам экран; повтор кнопкой ничего на экране
    // не меняет - без тоста было бы непонятно, случилось ли что-нибудь.
    if (isResend) toast.success('Если аккаунт существует, письмо отправлено повторно')
  } catch (e) {
    // На форме ошибку показываем прямо под полем, на экране «письмо отправлено»
    // формы уже нет - там сообщаем тостом.
    if (isResend) toast.error(e.message)
    else error.value = e.message
  } finally {
    loading.value = false
  }
}

function handleSubmit() {
  return send()
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

    strong {
      color: var(--color-accent);
    }
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
