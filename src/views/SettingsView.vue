<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { User, Trash2, KeyRound } from 'lucide-vue-next'
import { useAuthStore, UserMenu } from '@/modules/auth'
import { useToast } from '@/shared/composables/useToast'
import PageHeader from '@/shared/components/layout/PageHeader.vue'
import ImageDropzone from '@/shared/components/ImageDropzone.vue'
import BaseButton from '@/shared/components/BaseButton.vue'

// Настройки аккаунта: аватар и смена пароля (смена username/email backend'ом
// не поддерживается). Отдельного эндпоинта «сменить пароль изнутри аккаунта» у
// бэка нет — пароль меняется тем же флоу, что и забытый: письмо со ссылкой на
// /reset-password. Владение почтой подтверждается письмом, поэтому текущий
// пароль тут не спрашиваем.
const auth = useAuthStore()
const toast = useToast()

const uploading = ref(false)
const removing = ref(false)

async function onSelectAvatar(file) {
  uploading.value = true
  try {
    await auth.uploadAvatar(file)
    toast.success('Аватар обновлён')
  } catch (e) {
    toast.error(e.message)
  } finally {
    uploading.value = false
  }
}

async function onRemoveAvatar() {
  removing.value = true
  try {
    await auth.removeAvatar()
    toast.success('Аватар убран')
  } catch (e) {
    toast.error(e.message)
  } finally {
    removing.value = false
  }
}

// --- Смена пароля: письмо со ссылкой сброса на email аккаунта ---
const passwordSending = ref(false)
const passwordSent = ref(false)

// Тот же cooldown ~60с, что и у бэка между письмами — гасим кнопку сразу
// после клика, чтобы пользователь не спамил.
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

const passwordButtonLabel = computed(() => {
  if (passwordSending.value) return 'Отправляем...'
  if (cooldown.value > 0) return `Отправить повторно (${cooldown.value} с)`
  if (passwordSent.value) return 'Отправить письмо ещё раз'
  return 'Отправить письмо для смены пароля'
})

async function onRequestPasswordChange() {
  passwordSending.value = true
  try {
    await auth.forgotPassword(auth.user.email)
    passwordSent.value = true
    startCooldown()
    toast.success(`Письмо отправлено на ${auth.user.email}`)
  } catch (e) {
    toast.error(e.message)
  } finally {
    passwordSending.value = false
  }
}
</script>

<template>
  <div class="settings-view">
    <PageHeader>
      <template #user><UserMenu /></template>
    </PageHeader>

    <main class="settings-content">
      <h1 class="settings-title">Настройки</h1>

      <section class="settings-section">
        <h2>Аватар</h2>

        <div class="avatar-row">
          <img
            v-if="auth.user?.avatarUrl"
            :src="auth.user.avatarUrl"
            alt=""
            class="avatar-preview"
            @error="auth.refreshAvatarOnError"
          />
          <span v-else class="avatar-preview avatar-preview--placeholder">
            <User :size="28" />
          </span>

          <div class="avatar-actions">
            <ImageDropzone
              label="Загрузить аватар"
              hint="PNG/JPG, до 60 МБ"
              @select="onSelectAvatar"
            />
            <BaseButton
              v-if="auth.user?.avatarUrl"
              size="sm"
              danger-hover
              :disabled="removing"
              @click="onRemoveAvatar"
            >
              <Trash2 :size="14" /> {{ removing ? 'Удаление...' : 'Убрать аватар' }}
            </BaseButton>
          </div>
        </div>

        <p v-if="uploading" class="settings-hint">Загрузка...</p>
      </section>

      <section class="settings-section">
        <h2>Пароль</h2>

        <p class="settings-text">
          Мы отправим на <strong>{{ auth.user?.email }}</strong> письмо со ссылкой для установки
          нового пароля. Ссылка действует 1 час.
        </p>

        <BaseButton
          variant="accent"
          :disabled="passwordSending || cooldown > 0"
          @click="onRequestPasswordChange"
        >
          <KeyRound :size="14" /> {{ passwordButtonLabel }}
        </BaseButton>

        <p v-if="passwordSent" class="settings-hint">
          Письмо отправлено. После смены пароля сессии на всех устройствах будут завершены —
          войти снова придётся с новым паролем.
        </p>
      </section>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.settings-view {
  min-height: 100vh;
  background-color: var(--color-bg-1);
  display: flex;
  flex-direction: column;
}

.settings-content {
  padding: var(--space-8);
  max-width: 480px;
}

.settings-title {
  font-size: var(--text-xl);
  margin-bottom: var(--space-6);
}

.settings-section {
  padding: var(--space-6);
  background-color: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);

  h2 {
    font-size: var(--text-md);
    font-weight: var(--weight-semibold);
    color: var(--color-text-1);
    margin-bottom: var(--space-4);
  }

  & + & {
    margin-top: var(--space-4);
  }
}

.avatar-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}

.avatar-preview {
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

.avatar-actions {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.settings-text {
  font-size: var(--text-sm);
  color: var(--color-text-2);
  line-height: 1.5;
  margin-bottom: var(--space-4);

  strong {
    color: var(--color-text-1);
  }
}

.settings-hint {
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

</style>
