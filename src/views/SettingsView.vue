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

// Настройки аккаунта: имя пользователя, аватар, смена пароля и удаление аккаунта
// (смену email backend не поддерживает - вход идёт по нему).
const auth = useAuthStore()
const toast = useToast()
const router = useRouter()

// --- Имя пользователя ---
const username = ref('')
const usernameError = ref('')
const usernameSaving = ref(false)

// Профиль может подъехать позже монтирования (restoreSession) или обновиться
// извне (refreshProfileIfStale) - держим поле в синхроне с сохранённым именем.
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
    // Ошибка относится к полю формы - показываем инлайном под ним, а не тостом
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

// --- Смена пароля ---
// Основной путь - форма с текущим паролем (PUT /api/auth/me/password): бэк гасит
// все refresh-токены, но текущему устройству выдаёт новую пару, так что из своей
// же вкладки пользователя не выбрасывает. Письмо со ссылкой сброса остаётся
// запасным путём для тех, кто текущий пароль не помнит (сессия живёт 30 дней -
// забыть пароль, оставаясь залогиненным, вполне реально).
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const passwordSaving = ref(false)

const passwordFilled = computed(
  () => !!currentPassword.value && !!newPassword.value && !!confirmPassword.value,
)

// Те же границы, что при регистрации (бэк: @NotBlank @Size(8, 128))
function validatePassword() {
  if (newPassword.value.length < 8 || newPassword.value.length > 128) {
    return 'Новый пароль должен быть от 8 до 128 символов'
  }
  if (newPassword.value !== confirmPassword.value) {
    return 'Пароли не совпадают'
  }
  if (newPassword.value === currentPassword.value) {
    return 'Новый пароль должен отличаться от текущего'
  }
  return null
}

async function onChangePassword() {
  const invalid = validatePassword()
  if (invalid) {
    passwordError.value = invalid
    return
  }
  passwordError.value = ''
  passwordSaving.value = true
  try {
    await auth.changePassword(currentPassword.value, newPassword.value)
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    toast.success('Сессии на других устройствах завершены', { title: 'Пароль изменён' })
  } catch (e) {
    // Ошибка формы (в т.ч. неверный текущий пароль) - инлайном под полями
    passwordError.value = e.message
  } finally {
    passwordSaving.value = false
  }
}

// --- Запасной путь: письмо со ссылкой сброса на email аккаунта ---
const passwordSending = ref(false)
const passwordSent = ref(false)

// Тот же cooldown ~60с, что и у бэка между письмами - гасим кнопку сразу
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

// Куда и зачем уходит письмо, объясняет текст над кнопкой - на самой кнопке
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
// через отдельную модалку с полем ввода. Email запоминаем ДО удаления - после
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
    // а пользователя уже нет - оставаться тут нельзя.
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

    <AccountCard
      title="Пароль"
      description="После смены сессии на других устройствах завершатся, текущая останется активной."
    >
      <form class="password-form" @submit.prevent="onChangePassword">
        <label class="password-field">
          <span>Текущий пароль</span>
          <input
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            :aria-invalid="!!passwordError"
            :disabled="passwordSaving"
          />
        </label>

        <label class="password-field">
          <span>Новый пароль</span>
          <input
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            :disabled="passwordSaving"
          />
        </label>

        <label class="password-field">
          <span>Повторите новый пароль</span>
          <input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            :disabled="passwordSaving"
          />
        </label>

        <p v-if="passwordError" class="password-error">{{ passwordError }}</p>
        <p v-else class="settings-hint">От 8 до 128 символов.</p>

        <div class="password-actions">
          <BaseButton type="submit" variant="accent" :disabled="passwordSaving || !passwordFilled">
            <KeyRound :size="14" /> {{ passwordSaving ? 'Меняем...' : 'Сменить пароль' }}
          </BaseButton>
        </div>
      </form>

      <!-- Запасной путь для тех, кто текущий пароль не помнит: то же письмо, что
           и при «Забыли пароль?» на входе. Ссылка живёт 1 час и гасит ВСЕ сессии,
           включая эту, - поэтому она не основной сценарий, а мелкая строка внизу. -->
      <div class="password-forgot">
        <span>Не помните текущий пароль?</span>
        <button
          type="button"
          class="password-forgot__link"
          :disabled="passwordSending || cooldown > 0"
          @click="onRequestPasswordChange"
        >
          {{ passwordButtonLabel }}
        </button>
      </div>

      <p v-if="passwordSent" class="settings-hint">
        Письмо отправлено на {{ auth.user?.email }}. Ссылка действует 1 час; после смены пароля
        по ней сессии завершатся на всех устройствах, включая это.
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
  // stretch, а не center: кнопка тянется ровно по высоте поля - при разных
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

// Поля пароля - узкой колонкой: карточка занимает всю ширину контента, но поле
// на 700px выглядело бы полем ввода абзаца (та же логика, что у имени).
.password-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 320px;
}

.password-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);

  span {
    font-size: var(--text-sm);
    color: var(--color-text-2);
  }

  input {
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
}

.password-error {
  font-size: var(--text-sm);
  color: var(--color-danger);
}

// Кнопка не должна растягиваться на всю ширину колонки полей
.password-actions {
  display: flex;
}

.password-forgot {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-sm);
  color: var(--color-text-3);

  &__link {
    padding: 0;
    background: none;
    border: none;
    color: var(--color-accent);
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;

    &:hover:not(:disabled) {
      text-decoration: underline;
    }

    &:disabled {
      color: var(--color-text-3);
      cursor: default;
    }
  }
}

.settings-hint {
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

</style>
