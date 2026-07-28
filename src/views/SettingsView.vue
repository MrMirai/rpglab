<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { User, Trash2, KeyRound, Check, UserX } from 'lucide-vue-next'
import { useAuthStore, UserMenu, DeleteAccountModal } from '@/modules/auth'
import { useToast } from '@/shared/composables/useToast'
import AccountLayout from '@/shared/components/layout/AccountLayout.vue'
import AccountCard from '@/shared/components/AccountCard.vue'
import ImageDropzone from '@/shared/components/ImageDropzone.vue'
import BaseButton from '@/shared/components/BaseButton.vue'

// Настройки аккаунта: имя пользователя, аватар и смена пароля (смену email
// backend не поддерживает). Отдельного эндпоинта «сменить пароль изнутри
// аккаунта» у бэка нет — пароль меняется тем же флоу, что и забытый: письмо со
// ссылкой на /reset-password. Владение почтой подтверждается письмом, поэтому
// текущий пароль тут не спрашиваем.
const auth = useAuthStore()
const toast = useToast()
const router = useRouter()

// --- Имя пользователя ---
const username = ref('')
const usernameError = ref('')
const usernameSaving = ref(false)

// Профиль может подъехать позже монтирования (restoreSession) или обновиться
// извне (refreshProfileIfStale) — держим поле в синхроне с сохранённым именем.
watch(
  () => auth.user?.username,
  (value) => {
    username.value = value || ''
    usernameError.value = ''
  },
  { immediate: true },
)

const trimmedUsername = computed(() => username.value.trim())

// Кнопка активна, только когда есть что сохранять: имя изменилось и валидно.
// Бэк на отправку текущего имени ответил бы 200 без изменений, но дёргать
// его вхолостую незачем.
const usernameChanged = computed(() => trimmedUsername.value !== (auth.user?.username || ''))
const usernameValid = computed(
  () => trimmedUsername.value.length >= 3 && trimmedUsername.value.length <= 32,
)

async function onSaveUsername() {
  // Те же границы, что и при регистрации (бэк: @NotBlank @Size(3, 32)).
  if (!usernameValid.value) {
    usernameError.value = 'Имя должно быть от 3 до 32 символов'
    return
  }
  usernameError.value = ''
  usernameSaving.value = true
  try {
    await auth.updateUsername(trimmedUsername.value)
    toast.success('Имя пользователя обновлено')
  } catch (e) {
    // Ошибка относится к полю формы — показываем инлайном под ним, а не тостом
    usernameError.value = e.message
  } finally {
    usernameSaving.value = false
  }
}

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

// Куда и зачем уходит письмо, объясняет текст над кнопкой — на самой кнопке
// хватает короткого действия, иначе она разъезжается на пол-карточки.
const passwordButtonLabel = computed(() => {
  if (passwordSending.value) return 'Отправляем...'
  if (cooldown.value > 0) return `Отправить ещё раз (${cooldown.value} с)`
  if (passwordSent.value) return 'Отправить ещё раз'
  return 'Отправить письмо'
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

// --- Удаление аккаунта ---
// Необратимо и подтверждается текущим паролем (требование бэка), поэтому идёт
// через отдельную модалку с полем ввода. Email запоминаем ДО удаления — после
// clearSession() в сторе профиля уже нет, а сообщение про него ещё показываем.
const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')

function openDelete() {
  deleteError.value = ''
  deleteOpen.value = true
}

async function onConfirmDelete(password) {
  deleting.value = true
  deleteError.value = ''
  const email = auth.user?.email
  try {
    await auth.deleteAccount(password)
    deleteOpen.value = false
    // Уходим на публичную главную: страница настроек требует авторизации,
    // а пользователя уже нет — оставаться тут нельзя.
    router.push('/')
    toast.success(`Аккаунт ${email} удалён`)
  } catch (e) {
    // Ошибка (в т.ч. неверный пароль) остаётся в модалке рядом с полем
    deleteError.value = e.message
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <AccountLayout
    title="Настройки"
    :username="auth.user?.username"
    :avatar-url="auth.user?.avatarUrl"
    :show-admin="auth.isAdmin"
    @avatar-error="auth.refreshAvatarOnError"
  >
    <template #user><UserMenu /></template>

    <AccountCard
      title="Имя пользователя"
      description="Отображается в шапке и профиле. От 3 до 32 символов, должно быть уникальным."
    >
      <form class="username-form" @submit.prevent="onSaveUsername">
        <input
          v-model="username"
          type="text"
          class="username-input"
          autocomplete="username"
          maxlength="32"
          :aria-invalid="!!usernameError"
          :disabled="usernameSaving"
        />
        <BaseButton
          type="submit"
          variant="accent"
          :disabled="usernameSaving || !usernameChanged || !usernameValid"
        >
          <Check :size="14" /> {{ usernameSaving ? 'Сохраняем...' : 'Сохранить' }}
        </BaseButton>
      </form>

      <p v-if="usernameError" class="username-error">{{ usernameError }}</p>
      <p v-else class="settings-hint">
        Email изменить нельзя — вход в аккаунт идёт по нему.
      </p>
    </AccountCard>

    <AccountCard title="Аватар" description="Показывается в шапке и на странице профиля.">
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
    </AccountCard>

    <AccountCard title="Пароль">
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
        Письмо отправлено. После смены пароля сессии на всех устройствах будут завершены — войти
        снова придётся с новым паролем.
      </p>
    </AccountCard>

    <AccountCard
      danger
      title="Удаление аккаунта"
      description="Аккаунт удаляется вместе с рамками, проектами, папками и загруженными файлами. Действие необратимо."
    >
      <BaseButton variant="danger" @click="openDelete">
        <UserX :size="14" /> Удалить аккаунт
      </BaseButton>
    </AccountCard>

    <DeleteAccountModal
      :open="deleteOpen"
      :email="auth.user?.email"
      :pending="deleting"
      :error="deleteError"
      @confirm="onConfirmDelete"
      @cancel="deleteOpen = false"
    />
  </AccountLayout>
</template>

<style lang="scss" scoped>
// Поле имени: инпут ограничен по ширине (карточка занимает всю колонку контента,
// растянутый на неё инпут выглядел бы полем ввода абзаца), кнопка рядом.
.username-form {
  display: flex;
  // stretch, а не center: кнопка тянется ровно по высоте поля — при разных
  // паддингах инпута и кнопки они иначе расходятся на пару пикселей
  align-items: stretch;
  gap: var(--space-2);
}

.username-input {
  flex: 1;
  max-width: 320px;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-1);
  font-family: inherit;
  font-size: var(--text-sm);
  outline: none;
  transition: border-color var(--transition-fast);

  &:focus {
    border-color: var(--color-accent);
  }

  &[aria-invalid='true'] {
    border-color: var(--color-danger);
  }

  &:disabled {
    opacity: 0.6;
  }
}

.username-error {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-danger);
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

// Ограничиваем ширину: карточка теперь во всю колонку контента, растянутая
// на неё dropzone выглядела бы непропорционально большой.
.avatar-actions {
  flex: 1;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.settings-text {
  max-width: 62ch;
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
