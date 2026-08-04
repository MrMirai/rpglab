<script setup>
import { ref, computed } from 'vue'
import { Pencil, Trash2, Check, X, ImageOff } from 'lucide-vue-next'

// Локальная директива автофокуса на input при inline-переименовании.
const vFocus = { mounted: (el) => el.focus() }

// Карточка сохранённого проекта рядом с папками: превью, название, дата.
// Drag-источник (проект можно перетащить в папку), drop-целью НЕ является -
// вкладывать проект в проект некуда. Без бизнес-логики: открыть / переименовать /
// удалить / переместить решает родитель через события.
const props = defineProps({
  project: { type: Object, required: true },
})

const emit = defineEmits(['open', 'rename', 'delete', 'dragstart', 'dragend'])

const editing = ref(false)
const draftName = ref('')

function startRename() {
  draftName.value = props.project.name
  editing.value = true
}

function submitRename() {
  const name = draftName.value.trim()
  if (name && name !== props.project.name) emit('rename', props.project.id, name)
  editing.value = false
}

function activate() {
  if (!editing.value) emit('open', props.project.id)
}

// Дата последнего изменения - короткой строкой под названием.
const updatedLabel = computed(() => {
  const raw = props.project.updatedAt || props.project.createdAt
  if (!raw) return ''
  const date = new Date(raw)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
})

function onDragStart(e) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', props.project.id)
  emit('dragstart', props.project.id)
}
</script>

<template>
  <div
    class="project"
    draggable="true"
    role="button"
    tabindex="0"
    @dblclick="activate"
    @keydown.enter="activate"
    @dragstart="onDragStart"
    @dragend="$emit('dragend')"
  >
    <div class="project__thumb" @click="activate">
      <!-- previewUrl - presigned-ссылка бэка; пока превью никто не формирует
           (в справочнике типов ассетов нет preview-типа), поэтому обычно null
           и показывается заглушка. Разметка готова к появлению превью. -->
      <img v-if="project.previewUrl" :src="project.previewUrl" alt="" class="project__img" />
      <div v-else class="project__placeholder">
        <ImageOff :size="28" />
      </div>

      <div class="project__actions">
        <button class="project__act" title="Переименовать" @click.stop="startRename">
          <Pencil :size="14" />
        </button>
        <button
          class="project__act project__act--danger"
          title="Удалить"
          @click.stop="$emit('delete', project)"
        >
          <Trash2 :size="14" />
        </button>
      </div>
    </div>

    <div class="project__info">
      <div v-if="editing" class="project__edit">
        <input
          v-model="draftName"
          v-focus
          class="project__input"
          type="text"
          maxlength="255"
          @keydown.enter="submitRename"
          @keydown.esc="editing = false"
          @click.stop
        />
        <button class="project__act" title="Сохранить" @click.stop="submitRename">
          <Check :size="14" />
        </button>
        <button class="project__act" title="Отмена" @click.stop="editing = false">
          <X :size="14" />
        </button>
      </div>
      <template v-else>
        <span class="project__name" :title="project.name">{{ project.name }}</span>
        <span v-if="updatedLabel" class="project__date">{{ updatedLabel }}</span>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.project {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-2);
  min-width: 0;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

// Превью само по себе и есть карточка - без плашки с фоном и рамкой (как у
// FolderCard, где карточкой служит иконка папки). В рамке токен занимал едва
// половину плитки и выглядел крошечным.
// Размер совпадает с иконкой папки, чтобы в общей сетке ряды были ровными.
.project__thumb {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 80px;
  transition: transform var(--transition-fast);
}

.project:hover .project__thumb {
  transform: translateY(-1px);
}

// Токен вписывается целиком: превью уже обрезано по содержимому, поэтому
// contain не оставляет пустоты - только компенсирует неквадратные пропорции.
.project__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

// Заглушка (превью ещё не снято) - вот ей плашка нужна, иначе иконка висит
// в пустоте и карточка не читается как элемент списка.
.project__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--color-text-3);
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.project__actions {
  position: absolute;
  top: -4px;
  right: -8px;
  display: flex;
  gap: 2px;
  padding: 2px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-fast);
}

.project:hover .project__actions {
  opacity: 1;
  pointer-events: auto;
}

.project__info {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-width: 0;
}

.project__name {
  max-width: 100%;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-1);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project__date {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.project__edit {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  width: 100%;
  min-width: 0;
}

.project__input {
  flex: 1;
  min-width: 0;
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-sm);
  font-family: inherit;
  color: var(--color-text-1);
  background: var(--color-bg-1);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  outline: none;
}

.project__act {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  color: var(--color-text-2);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background var(--transition-fast);

  &:hover {
    color: var(--color-accent);
    background: var(--color-bg-3);
  }

  &--danger:hover {
    color: var(--color-danger);
  }
}
</style>
