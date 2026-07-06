<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Save, Trash2 } from 'lucide-vue-next'
import { useEditorStore, useImageLoader } from '@/modules/editor'
import { useAuthStore } from '@/modules/auth'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import FrameSaveModal from './FrameSaveModal.vue'
import { useFramesStore } from '../store.js'

// Галерея сохранённых пресетов рамок.
// Выбор пресета — подгружает его ассеты (рамка + фон) в редактор.
// «Сохранить рамку» — сохраняет текущие ассеты редактора (рамка + фон, если задан) как новый пресет,
// с названием и тегами через FrameSaveModal.
const framesStore = useFramesStore()
const editorStore = useEditorStore()
const auth = useAuthStore()
const { loadFromUrl } = useImageLoader()

const selectedFrameId = ref(null)

// Фильтр по тегам галереи — мультивыбор бейджей над списком.
// tags в GET /api/frames — массив ИМЁН (не id), фильтруем по имени напрямую.
const activeTagFilters = ref([])

function toggleTagFilter(name) {
  const i = activeTagFilters.value.indexOf(name)
  if (i === -1) activeTagFilters.value.push(name)
  else activeTagFilters.value.splice(i, 1)
}

// Теги, реально встречающиеся среди загруженных рамок (не весь справочник —
// нет смысла показывать фильтр по тегу, которым ничего не помечено).
const availableFilterTags = computed(() => {
  const names = new Set()
  framesStore.frames.forEach((f) => (f.tags || []).forEach((t) => names.add(t)))
  return [...names].sort()
})

const filteredFrames = computed(() => {
  if (!activeTagFilters.value.length) return framesStore.frames
  return framesStore.frames.filter((f) =>
    activeTagFilters.value.every((tag) => (f.tags || []).includes(tag)),
  )
})

// Форма сохранения пресета (модалка)
const showSaveModal = ref(false)
const presetName = ref('')
const selectedTagIds = ref([])
const saveError = ref('')

// Удаление рамки — подтверждение через ConfirmDialog. Кнопка удаления видна
// только для frame.ownerId === auth.user.id (см. шаблон), поэтому запрос на
// чужую/системную рамку в норме не должен уйти. Обработка ошибки остаётся
// как подстраховка на случай гонки данных (например, владение сменилось,
// пока список рамок ещё не перезапросили) — бэк всё равно перепроверяет
// владение в frameService.deleteFrame(id, userId).
const frameToDelete = ref(null)
const deleteError = ref('')
const deleting = ref(false)

function askDelete(frame) {
  frameToDelete.value = frame
  deleteError.value = ''
}

function cancelDelete() {
  frameToDelete.value = null
  deleteError.value = ''
}

async function confirmDelete() {
  const frame = frameToDelete.value
  if (!frame) return
  deleting.value = true
  deleteError.value = ''
  try {
    await framesStore.deleteFrame(frame.id)
    if (selectedFrameId.value === frame.id) selectedFrameId.value = null
    frameToDelete.value = null
  } catch (e) {
    deleteError.value = e.message
  } finally {
    deleting.value = false
  }
}

// Бэк не дедупит рамки — POST с тем же именем создаёт дубликат. Ищем существующий
// пресет с таким же именем, чтобы вместо дубля предложить замену.
const duplicate = computed(() => {
  const name = presetName.value.trim().toLowerCase()
  if (!name) return null
  return framesStore.frames.find((f) => f.name.trim().toLowerCase() === name) || null
})

onMounted(() => {
  framesStore.fetchFrames()
  framesStore.fetchTags()
})

// Выбор пресета из галереи: грузим рамку и фон-компаньон (если есть) в редактор.
async function selectFrame(frame) {
  selectedFrameId.value = frame.id

  const img = await loadFromUrl(frame.frameAssetUrl)
  editorStore.loadFrameImage(img, frame.frameAssetUrl)
  editorStore.frameFileName = frame.name
  // Новая рамка → сбрасываем маску на авто
  editorStore.loadMaskImage(null)
  editorStore.useCustomMask = false

  // Фон-компаньон рамки, если он задан в пресете
  if (frame.backgroundAssetUrl) {
    const bgImg = await loadFromUrl(frame.backgroundAssetUrl)
    editorStore.loadBgImage(bgImg, frame.backgroundAssetUrl)
  }
}

// Открыть модалку сохранения, подставив имя по имени файла рамки
function openSaveModal() {
  presetName.value = editorStore.frameFileName.replace(/\.[^./\\]+$/, '') || 'Рамка'
  selectedTagIds.value = []
  saveError.value = ''
  showSaveModal.value = true
}

function cancelSave() {
  showSaveModal.value = false
  saveError.value = ''
}

function toggleSaveTag(id) {
  const i = selectedTagIds.value.indexOf(id)
  if (i === -1) selectedTagIds.value.push(id)
  else selectedTagIds.value.splice(i, 1)
}

// Достаём исходный файл ассета из его preview-URL (object URL или presigned)
async function urlToFile(url, filename) {
  const res = await fetch(url)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || 'image/png' })
}

async function saveFrame() {
  const name = presetName.value.trim()
  if (!name || !editorStore.hasFrame) return

  saveError.value = ''
  try {
    const frameFile = await urlToFile(editorStore.framePreviewUrl, 'frame.png')

    // В пресет уходит только фон-картинка (бэк хранит фон как изображение).
    // Процедурный авто-фон / цвет-заливка сюда не попадают.
    let backgroundFile = null
    if (editorStore.bgType === 'image' && editorStore.bgImage && editorStore.bgPreviewUrl) {
      backgroundFile = await urlToFile(editorStore.bgPreviewUrl, 'background.png')
    }

    // Пресет с таким именем уже есть → заменяем (удаляем старый, затем создаём),
    // чтобы не плодить дубликаты. Это осознанное действие — кнопка «Заменить».
    const existing = duplicate.value
    if (existing) {
      await framesStore.deleteFrame(existing.id)
    }

    await framesStore.createFrame({ name, frameFile, backgroundFile, tagIds: selectedTagIds.value })
    showSaveModal.value = false
    if (selectedFrameId.value === existing?.id) selectedFrameId.value = null
  } catch (e) {
    // Рейт-лимитер бэка (429, Retry-After) уже переживается ретраями
    // в useApi; если всё же не пробились — показываем понятную подсказку.
    saveError.value = /too many requests|rate.?limit/i.test(e.message)
      ? 'Слишком много запросов подряд. Подождите пару секунд и попробуйте снова.'
      : e.message
  }
}
</script>

<template>
  <div class="frame-gallery">
    <div class="sidebar-header">
      <h4>Рамки</h4>
    </div>

    <div v-if="framesStore.loading" class="sidebar-loading">Загрузка рамок...</div>

    <p v-else-if="framesStore.error" class="sidebar-error">
      {{ framesStore.error }}
    </p>

    <template v-else>
      <!-- Фильтр по тегам — мультивыбор, сужает список ниже -->
      <div v-if="availableFilterTags.length" class="tag-filter">
        <button
          v-for="tag in availableFilterTags"
          :key="tag"
          type="button"
          class="tag-filter__badge"
          :class="{ active: activeTagFilters.includes(tag) }"
          @click="toggleTagFilter(tag)"
        >
          {{ tag }}
        </button>
      </div>

      <div class="frames-grid">
        <div v-for="frame in filteredFrames" :key="frame.id" class="frame-card-wrap">
          <button
            class="frame-card"
            :class="{ active: selectedFrameId === frame.id }"
            :title="frame.name"
            @click="selectFrame(frame)"
          >
            <img :src="frame.frameAssetUrl" :alt="frame.name" class="frame-card__img" />
          </button>
          <p class="frame-card__name">{{ frame.name }}</p>
          <BaseButton
            v-if="frame.ownerId === auth.user?.id"
            square
            danger-hover
            class="frame-card__delete"
            title="Удалить рамку"
            @click.stop="askDelete(frame)"
          >
            <Trash2 :size="14" />
          </BaseButton>
        </div>

        <p v-if="!filteredFrames.length" class="sidebar-empty">Нет рамок с выбранными тегами</p>
      </div>
    </template>

    <div class="sidebar-footer">
      <!-- Сохранение пресета доступно только авторизованным -->
      <template v-if="auth.isAuthenticated">
        <BaseButton
          full-width
          :disabled="!editorStore.hasFrame"
          :title="
            editorStore.hasFrame
              ? 'Сохранить текущую рамку как пресет'
              : 'Сначала загрузите рамку в редактор'
          "
          @click="openSaveModal"
        >
          <Save :size="14" /> Сохранить рамку
        </BaseButton>
      </template>

      <p v-else class="upload-hint">
        <RouterLink to="/login">Войдите</RouterLink>, чтобы сохранять свои рамки
      </p>
    </div>

    <FrameSaveModal
      :open="showSaveModal"
      :name="presetName"
      :tags="framesStore.tags"
      :selected-tag-ids="selectedTagIds"
      :duplicate-name="duplicate?.name || ''"
      :saving="framesStore.saving"
      :error="saveError"
      @update:name="presetName = $event"
      @toggle-tag="toggleSaveTag"
      @confirm="saveFrame"
      @cancel="cancelSave"
    />

    <ConfirmDialog
      :open="!!frameToDelete"
      title="Удалить рамку"
      :message="frameToDelete ? `Удалить рамку «${frameToDelete.name}»? Это действие необратимо.` : ''"
      :pending="deleting"
      :error="deleteError"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style lang="scss" scoped>
.frame-gallery {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.sidebar-header {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;

  h4 {
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--color-text-3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
}

.sidebar-loading,
.sidebar-error,
.sidebar-empty {
  padding: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.sidebar-error {
  color: var(--color-danger);
}

.tag-filter {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-3) 0;
  flex-shrink: 0;

  &__badge {
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-xs);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: transparent;
    color: var(--color-text-2);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover:not(.active) {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    &.active {
      background: var(--color-accent-muted);
      border-color: var(--color-accent);
      color: var(--color-accent);
    }
  }
}

.frames-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3) var(--space-2);
  padding: var(--space-3);
  align-content: start;
  flex: 1;
  overflow-y: auto;
}

.sidebar-empty {
  grid-column: 1 / -1;
  padding: var(--space-4) 0;
  text-align: center;
}

.frame-card-wrap {
  position: relative;

  &:hover .frame-card__delete {
    opacity: 1;
  }
}

.frame-card {
  aspect-ratio: 1 / 1;
  width: 100%;
  padding: 0;
  background-color: var(--color-bg-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast);

  &:hover {
    border-color: var(--color-accent);
  }

  &.active {
    border-color: var(--color-accent);
    background-color: var(--color-accent-muted);
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  &__name {
    margin-top: var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-text-2);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__delete {
    position: absolute;
    top: var(--space-1);
    right: var(--space-1);
    background: var(--color-bg-1);
    opacity: 0;
    transition: opacity var(--transition-fast);
  }
}

.sidebar-footer {
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.upload-hint {
  font-size: var(--text-xs);
  color: var(--color-text-3);
  line-height: var(--leading-normal);

  a {
    color: var(--color-accent);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
