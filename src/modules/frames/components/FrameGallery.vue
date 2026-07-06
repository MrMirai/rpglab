<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Save, Trash2 } from 'lucide-vue-next'
import { useEditorStore, useImageLoader } from '@/modules/editor'
import { useAuthStore } from '@/modules/auth'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import { useFramesStore } from '../store.js'

// Галерея сохранённых пресетов рамок.
// Выбор пресета — подгружает его ассеты (рамка + фон) в редактор.
// «Сохранить рамку» — сохраняет текущие ассеты редактора (рамка + фон, если задан) как новый пресет.
const framesStore = useFramesStore()
const editorStore = useEditorStore()
const auth = useAuthStore()
const { loadFromUrl } = useImageLoader()

const selectedFrameId = ref(null)

// Форма сохранения пресета
const showSaveForm = ref(false)
const presetName = ref('')
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

onMounted(() => framesStore.fetchFrames())

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

// Открыть форму сохранения, подставив имя по имени файла рамки
function openSaveForm() {
  presetName.value = editorStore.frameFileName.replace(/\.[^./\\]+$/, '') || 'Рамка'
  saveError.value = ''
  showSaveForm.value = true
}

function cancelSave() {
  showSaveForm.value = false
  saveError.value = ''
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

    await framesStore.createFrame({ name, frameFile, backgroundFile })
    showSaveForm.value = false
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

    <div v-else class="frames-grid">
      <div v-for="frame in framesStore.frames" :key="frame.id" class="frame-card-wrap">
        <button
          class="frame-card"
          :class="{ active: selectedFrameId === frame.id }"
          :title="frame.name"
          @click="selectFrame(frame)"
        >
          <img :src="frame.frameAssetUrl" :alt="frame.name" class="frame-card__img" />
        </button>
        <button
          v-if="frame.ownerId === auth.user?.id"
          class="frame-card__delete"
          title="Удалить рамку"
          @click.stop="askDelete(frame)"
        >
          <Trash2 :size="14" />
        </button>
      </div>
    </div>

    <div class="sidebar-footer">
      <!-- Сохранение пресета доступно только авторизованным -->
      <template v-if="auth.isAuthenticated">
        <!-- Форма ввода имени пресета -->
        <div v-if="showSaveForm" class="save-form">
          <input
            v-model="presetName"
            type="text"
            class="save-form__input"
            placeholder="Название рамки"
            maxlength="64"
            @keyup.enter="saveFrame"
            @keyup.esc="cancelSave"
          />
          <p v-if="duplicate && !framesStore.saving" class="save-form__warning">
            Рамка «{{ duplicate.name }}» уже существует — сохранение заменит её
          </p>
          <p v-if="saveError" class="save-form__error">{{ saveError }}</p>
          <div class="save-form__actions">
            <button
              class="save-form__btn save-form__btn--accent"
              :disabled="framesStore.saving || !presetName.trim()"
              @click="saveFrame"
            >
              {{ framesStore.saving ? 'Сохранение...' : duplicate ? 'Заменить' : 'Сохранить' }}
            </button>
            <button class="save-form__btn" :disabled="framesStore.saving" @click="cancelSave">
              Отмена
            </button>
          </div>
        </div>

        <!-- Кнопка открытия формы: активна только когда в редакторе есть рамка -->
        <button
          v-else
          class="save-btn"
          :disabled="!editorStore.hasFrame"
          :title="
            editorStore.hasFrame
              ? 'Сохранить текущую рамку как пресет'
              : 'Сначала загрузите рамку в редактор'
          "
          @click="openSaveForm"
        >
          <Save :size="14" /> Сохранить рамку
        </button>
      </template>

      <p v-else class="upload-hint">
        <RouterLink to="/login">Войдите</RouterLink>, чтобы сохранять свои рамки
      </p>
    </div>

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

.frames-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding: var(--space-3);
  align-content: start;
  flex: 1;
  overflow-y: auto;
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

  &__delete {
    position: absolute;
    top: var(--space-1);
    right: var(--space-1);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    background: var(--color-bg-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-2);
    cursor: pointer;
    opacity: 0;
    transition:
      opacity var(--transition-fast),
      border-color var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      border-color: var(--color-danger);
      color: var(--color-danger);
    }
  }
}

.sidebar-footer {
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-2);
  font-size: var(--text-sm);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);

  &:hover:not(:disabled) {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.save-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  &__input {
    width: 100%;
    padding: var(--space-2);
    background: var(--color-bg-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-1);
    font-size: var(--text-sm);
    outline: none;
    transition: border-color var(--transition-fast);

    &:focus {
      border-color: var(--color-accent);
    }
  }

  &__error {
    font-size: var(--text-xs);
    color: var(--color-danger);
  }

  &__warning {
    font-size: var(--text-xs);
    color: var(--color-accent);
    line-height: var(--leading-normal);
  }

  &__actions {
    display: flex;
    gap: var(--space-2);
  }

  &__btn {
    flex: 1;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: none;
    color: var(--color-text-2);
    font-size: var(--text-xs);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover:not(:disabled) {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &--accent {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: var(--color-bg-1);
      font-weight: var(--weight-medium);

      &:hover:not(:disabled) {
        opacity: 0.9;
        color: var(--color-bg-1);
      }
    }
  }
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
