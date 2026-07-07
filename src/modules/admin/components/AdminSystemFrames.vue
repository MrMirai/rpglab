<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-vue-next'
import { useFramesStore, SYSTEM_OWNER_ID } from '@/modules/frames'
import BaseButton from '@/shared/components/BaseButton.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
import { useAdminStore } from '../store.js'
import AdminFrameCreateModal from './AdminFrameCreateModal.vue'

// Экран «Системные рамки»: список встроенных рамок (видны всем без токена)
// + форма создания новой через POST /api/admin/frames + управление
// справочником тегов (сворачиваемый блок сверху — теги относятся к рамкам,
// отдельная вкладка под них была избыточна).
const framesStore = useFramesStore()
const adminStore = useAdminStore()

const showCreateModal = ref(false)
const createModalRef = ref(null)

const systemFrames = computed(() =>
  framesStore.frames.filter((f) => f.ownerId === SYSTEM_OWNER_ID),
)

onMounted(() => {
  framesStore.fetchFrames()
  framesStore.fetchTags()
})

function openCreateModal() {
  adminStore.error = null
  showCreateModal.value = true
}

function cancelCreate() {
  showCreateModal.value = false
}

async function handleCreate(payload) {
  try {
    await adminStore.createSystemFrame(payload)
    await framesStore.fetchFrames()
    showCreateModal.value = false
    createModalRef.value?.reset()
  } catch {
    // Ошибка уже сохранена в adminStore.error и показана в модалке — здесь просто не закрываем её
  }
}

// --- Управление тегами ---
const tagsOpen = ref(false)

const newTagName = ref('')
const createTagError = ref('')

async function submitCreateTag() {
  const name = newTagName.value.trim()
  if (!name) return
  createTagError.value = ''
  try {
    await adminStore.createTag(name)
    newTagName.value = ''
    await framesStore.fetchTags()
  } catch (e) {
    createTagError.value = e.message
  }
}

const editingTagId = ref(null)
const editingTagName = ref('')
const renameTagError = ref('')

function startRenameTag(tag) {
  editingTagId.value = tag.id
  editingTagName.value = tag.name
  renameTagError.value = ''
}

function cancelRenameTag() {
  editingTagId.value = null
  renameTagError.value = ''
}

async function submitRenameTag(tag) {
  const name = editingTagName.value.trim()
  if (!name || name === tag.name) {
    cancelRenameTag()
    return
  }
  renameTagError.value = ''
  try {
    await adminStore.renameTag(tag.id, name)
    editingTagId.value = null
    await framesStore.fetchTags()
  } catch (e) {
    renameTagError.value = e.message
  }
}

const tagToDelete = ref(null)
const deleteTagError = ref('')

function askDeleteTag(tag) {
  tagToDelete.value = tag
  deleteTagError.value = ''
}

function cancelDeleteTag() {
  tagToDelete.value = null
  deleteTagError.value = ''
}

async function confirmDeleteTag() {
  const tag = tagToDelete.value
  if (!tag) return
  deleteTagError.value = ''
  try {
    await adminStore.deleteTag(tag.id)
    tagToDelete.value = null
    await framesStore.fetchTags()
  } catch (e) {
    deleteTagError.value = e.message
  }
}
</script>

<template>
  <div class="admin-frames">
    <CollapsibleSection v-model:open="tagsOpen" label="Управление тегами" class="tags-section">
      <form class="create-form" @submit.prevent="submitCreateTag">
        <input
          v-model="newTagName"
          type="text"
          class="create-form__input"
          placeholder="Новый тег"
          maxlength="50"
        />
        <BaseButton type="submit" variant="accent" :disabled="!newTagName.trim()">
          <Plus :size="14" /> Добавить
        </BaseButton>
      </form>
      <p v-if="createTagError" class="admin-frames__error">{{ createTagError }}</p>

      <div v-if="framesStore.tagsLoading" class="admin-frames__status">Загрузка...</div>
      <p v-else-if="!framesStore.tags.length" class="admin-frames__status">Тегов пока нет</p>

      <ul v-else class="tag-list">
        <li v-for="tag in framesStore.tags" :key="tag.id" class="tag-row">
          <template v-if="editingTagId === tag.id">
            <input
              v-model="editingTagName"
              type="text"
              class="tag-row__input"
              maxlength="50"
              autofocus
              @keyup.enter="submitRenameTag(tag)"
              @keyup.esc="cancelRenameTag"
            />
            <BaseButton square @click="submitRenameTag(tag)">
              <Check :size="14" />
            </BaseButton>
            <BaseButton square danger-hover @click="cancelRenameTag">
              <X :size="14" />
            </BaseButton>
          </template>

          <template v-else>
            <span class="tag-row__name">{{ tag.name }}</span>
            <BaseButton square title="Переименовать" @click="startRenameTag(tag)">
              <Pencil :size="14" />
            </BaseButton>
            <BaseButton square danger-hover title="Удалить" @click="askDeleteTag(tag)">
              <Trash2 :size="14" />
            </BaseButton>
          </template>
        </li>
      </ul>
      <p v-if="renameTagError" class="admin-frames__error">{{ renameTagError }}</p>
    </CollapsibleSection>

    <div class="admin-frames__header">
      <h2>Системные рамки</h2>
      <BaseButton variant="accent" @click="openCreateModal">
        <Plus :size="16" /> Новая рамка
      </BaseButton>
    </div>

    <div v-if="framesStore.loading" class="admin-frames__status">Загрузка...</div>
    <p v-else-if="framesStore.error" class="admin-frames__status admin-frames__status--error">
      {{ framesStore.error }}
    </p>
    <p v-else-if="!systemFrames.length" class="admin-frames__status">
      Системных рамок пока нет
    </p>

    <div v-else class="frames-grid">
      <div v-for="frame in systemFrames" :key="frame.id" class="frame-card">
        <div class="frame-card__thumb">
          <img :src="frame.frameAssetUrl" :alt="frame.name" />
        </div>
        <p class="frame-card__name">{{ frame.name }}</p>
        <img
          v-if="frame.backgroundAssetUrl"
          :src="frame.backgroundAssetUrl"
          :alt="`${frame.name} — фон`"
          class="frame-card__bg-thumb"
          title="Фон-компаньон"
        />
        <div v-if="frame.tags?.length" class="frame-card__tags">
          <span v-for="tag in frame.tags" :key="tag" class="frame-card__tag">{{ tag }}</span>
        </div>
      </div>
    </div>

    <AdminFrameCreateModal
      ref="createModalRef"
      :open="showCreateModal"
      :tags="framesStore.tags"
      :creating="adminStore.creating"
      :error="adminStore.error"
      @confirm="handleCreate"
      @cancel="cancelCreate"
    />

    <ConfirmDialog
      :open="!!tagToDelete"
      title="Удалить тег"
      :message="
        tagToDelete
          ? `Удалить тег «${tagToDelete.name}»? Он будет снят со всех рамок, которые его используют.`
          : ''
      "
      :error="deleteTagError"
      :pending="adminStore.tagActionPending"
      @confirm="confirmDeleteTag"
      @cancel="cancelDeleteTag"
    />
  </div>
</template>

<style lang="scss" scoped>
.admin-frames {
  padding: var(--space-6);
}

.tags-section {
  max-width: 480px;
  margin-bottom: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.admin-frames__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-5);

  h2 {
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
    color: var(--color-text-1);
  }
}

.admin-frames__status {
  font-size: var(--text-sm);
  color: var(--color-text-3);

  &--error {
    color: var(--color-danger);
  }
}

.admin-frames__error {
  margin: var(--space-2) var(--space-4) 0;
  font-size: var(--text-xs);
  color: var(--color-danger);
}

.create-form {
  display: flex;
  gap: var(--space-2);
  padding: 0 var(--space-4) var(--space-3);

  &__input {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-1);
    color: var(--color-text-1);
    font-family: inherit;
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

.tag-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: 0 var(--space-4) var(--space-4);
}

.tag-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-bg-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);

  &__name {
    flex: 1;
    font-size: var(--text-sm);
    color: var(--color-text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__input {
    flex: 1;
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-sm);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-sm);
    background: var(--color-bg-1);
    color: var(--color-text-1);
    font-family: inherit;
    outline: none;
  }
}

.frames-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-4);
}

.frame-card {
  background-color: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.frame-card__thumb {
  aspect-ratio: 1;
  background-color: var(--color-bg-3);
  border-radius: var(--radius-md);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.frame-card__name {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.frame-card__bg-thumb {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  object-fit: cover;
}

.frame-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.frame-card__tag {
  padding: 2px var(--space-2);
  font-size: var(--text-xs);
  background: var(--color-accent-muted);
  color: var(--color-accent);
  border-radius: var(--radius-lg);
}
</style>
