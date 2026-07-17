<script setup>
import { ref } from 'vue'
import { User, Trash2 } from 'lucide-vue-next'
import { useAuthStore, UserMenu } from '@/modules/auth'
import PageHeader from '@/shared/components/layout/PageHeader.vue'
import ImageDropzone from '@/shared/components/ImageDropzone.vue'
import BaseButton from '@/shared/components/BaseButton.vue'

// Настройки аккаунта. Пока доступна только смена аватара —
// смена username/email/пароля backend'ом не поддерживается.
const auth = useAuthStore()

const uploading = ref(false)
const removing = ref(false)
const error = ref('')

async function onSelectAvatar(file) {
  error.value = ''
  uploading.value = true
  try {
    await auth.uploadAvatar(file)
  } catch (e) {
    error.value = e.message
  } finally {
    uploading.value = false
  }
}

async function onRemoveAvatar() {
  error.value = ''
  removing.value = true
  try {
    await auth.removeAvatar()
  } catch (e) {
    error.value = e.message
  } finally {
    removing.value = false
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
        <p v-if="error" class="settings-error">{{ error }}</p>
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

.settings-hint {
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.settings-error {
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-danger);
}
</style>
