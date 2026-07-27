<template>
  <div class="auth-card">
    <div class="auth-card__logo">
      <MailCheck :size="56" class="auth-card__logo-icon" />
    </div>

    <h1 class="auth-card__title">Проверьте почту</h1>

    <p class="auth-card__text">
      Мы отправили письмо со ссылкой подтверждения на
      <strong>{{ email }}</strong
      >. Откройте его и перейдите по ссылке, чтобы завершить вход.
    </p>

    <p class="auth-card__hint">
      Не пришло письмо? Проверьте папку «Спам» или отправьте его повторно.
    </p>

    <BaseButton
      variant="accent"
      full-width
      :disabled="resending || cooldown > 0"
      @click="handleResend"
    >
      {{ resendLabel }}
    </BaseButton>

    <p class="auth-card__footer">
      <RouterLink to="/login">Вернуться ко входу</RouterLink>
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { MailCheck } from 'lucide-vue-next'
import { useAuthStore } from '@/modules/auth'
import { useToast } from '@/shared/composables/useToast'
import BaseButton from '@/shared/components/BaseButton.vue'

const props = defineProps({
  email: { type: String, required: true },
})

const auth = useAuthStore()
const toast = useToast()

const resending = ref(false)

// Cooldown на повторную отправку: у бэка свой лимит ~60с, дублируем таймером,
// чтобы кнопка гасла сразу после клика и пользователь не спамил письмами.
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
  if (resending.value) return 'Отправляем...'
  if (cooldown.value > 0) return `Отправить повторно (${cooldown.value} с)`
  return 'Отправить письмо повторно'
})

async function handleResend() {
  resending.value = true
  try {
    await auth.resendVerification(props.email)
    // Ответ всегда 202 (анти-enumeration) — не сообщаем «найден/не найден»,
    // просто нейтральное «письмо отправлено» и запускаем cooldown.
    toast.success('Если аккаунт существует, письмо отправлено повторно')
    startCooldown()
  } catch (e) {
    toast.error(e.message)
  } finally {
    resending.value = false
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
  text-align: center;

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

    a {
      color: var(--color-accent);
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>
