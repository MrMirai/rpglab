<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Save } from 'lucide-vue-next'
import { useEditorStore, useImageLoader } from '@/modules/editor'
import { useAuthStore } from '@/modules/auth'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import TagBadgeList from '@/shared/components/TagBadgeList.vue'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
import FrameSaveModal from './FrameSaveModal.vue'
import FrameCard from './FrameCard.vue'
import { useFramesStore, SYSTEM_OWNER_ID } from '../store.js'

// Галерея сохранённых пресетов рамок, разделена на секции «Общедоступные»
// (системные, ownerId === SYSTEM_OWNER_ID) и «Свои» (ownerId === текущий юзер).
// Выбор пресета — подгружает его ассеты (рамка + фон) в редактор.
// «Сохранить рамку» — сохраняет текущие ассеты редактора (рамка + фон, если задан) как новый пресет,
// с названием и тегами через FrameSaveModal.
const framesStore = useFramesStore()
const editorStore = useEditorStore()
const auth = useAuthStore()
const { loadFromUrl } = useImageLoader()

const selectedFrameId = ref(null)
const sectionsOpen = ref({ public: true, own: true })

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
  return [...names].sort().map((name) => ({ id: name, label: name }))
})

const filteredFrames = computed(() => {
  if (!activeTagFilters.value.length) return framesStore.frames
  return framesStore.frames.filter((f) =>
    activeTagFilters.value.every((tag) => (f.tags || []).includes(tag)),
  )
})

const publicFrames = computed(() => filteredFrames.value.filter((f) => f.ownerId === SYSTEM_OWNER_ID))
const ownFrames = computed(() =>
  filteredFrames.value.filter((f) => f.ownerId === auth.user?.id),
)

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
      <!-- Фильтр по тегам — мультивыбор, сужает списки в обеих секциях ниже -->
      <TagBadgeList
        v-if="availableFilterTags.length"
        class="tag-filter"
        :tags="availableFilterTags"
        :active-ids="activeTagFilters"
        @toggle="toggleTagFilter"
      />

      <div class="frame-sections">
        <CollapsibleSection
          v-model:open="sectionsOpen.public"
          :label="`Общедоступные (${publicFrames.length})`"
        >
          <div v-if="publicFrames.length" class="frames-grid">
            <FrameCard
              v-for="frame in publicFrames"
              :key="frame.id"
              :frame="frame"
              :active="selectedFrameId === frame.id"
              @select="selectFrame"
            />
          </div>
          <p v-else class="sidebar-empty">Нет рамок с выбранными тегами</p>
        </CollapsibleSection>

        <CollapsibleSection
          v-if="auth.isAuthenticated"
          v-model:open="sectionsOpen.own"
          :label="`Свои (${ownFrames.length})`"
        >
          <div v-if="ownFrames.length" class="frames-grid">
            <FrameCard
              v-for="frame in ownFrames"
              :key="frame.id"
              :frame="frame"
              deletable
              :active="selectedFrameId === frame.id"
              @select="selectFrame"
              @delete="askDelete"
            />
          </div>
          <p v-else class="sidebar-empty">Пока нет сохранённых рамок</p>
        </CollapsibleSection>
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
.sidebar-error {
  padding: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.sidebar-error {
  color: var(--color-danger);
}

.tag-filter {
  padding: var(--space-3) var(--space-3) 0;
  flex-shrink: 0;
}

.frame-sections {
  flex: 1;
  overflow-y: auto;
}

.frames-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3) var(--space-2);
  padding: 0 var(--space-3) var(--space-3);
  align-content: start;
}

.sidebar-empty {
  padding: 0 var(--space-3) var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-3);
  text-align: center;
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
