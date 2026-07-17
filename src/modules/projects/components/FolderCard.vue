<script setup>
import { ref } from 'vue'
import { Pencil, Trash2, Check, X } from 'lucide-vue-next'

// Локальная директива автофокуса на input при inline-переименовании.
const vFocus = { mounted: (el) => el.focus() }

// Папка проекта: фирменная иконка-папка (SVG в акцентных цветах) + название под ней.
// Без фона/рамки карточки — только иконка и подпись. Drag-источник (можно перетащить
// папку) и drop-цель (бросить другую папку сюда → переместить внутрь). Без
// бизнес-логики — политику (открыть / переименовать / удалить / переместить) задаёт
// родитель через события.
const props = defineProps({
  folder: { type: Object, required: true },
  // Подсветка при наведении перетаскиваемой папки (управляется родителем).
  dropActive: { type: Boolean, default: false },
})

const emit = defineEmits([
  'open',
  'rename',
  'delete',
  'dragstart',
  'dragend',
  'drop-folder',
  'drag-over',
  'drag-leave',
])

// Инлайн-редактирование имени (карандаш → input, как переименование тегов в админке).
const editing = ref(false)
const draftName = ref('')

function startRename() {
  draftName.value = props.folder.name
  editing.value = true
}

function submitRename() {
  const name = draftName.value.trim()
  if (name && name !== props.folder.name) emit('rename', props.folder.id, name)
  editing.value = false
}

function cancelRename() {
  editing.value = false
}

function activate() {
  if (!editing.value) emit('open', props.folder.id)
}

// ── Drag & drop ──
function onDragStart(e) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', props.folder.id)
  emit('dragstart', props.folder.id)
}

function onDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  emit('drag-over', props.folder.id)
}

function onDrop(e) {
  e.preventDefault()
  const draggedId = e.dataTransfer.getData('text/plain')
  emit('drop-folder', { draggedId, targetId: props.folder.id })
}
</script>

<template>
  <div
    class="folder"
    :class="{ 'is-drop-active': dropActive }"
    draggable="true"
    role="button"
    tabindex="0"
    @dblclick="activate"
    @keydown.enter="activate"
    @dragstart="onDragStart"
    @dragend="$emit('dragend')"
    @dragover="onDragOver"
    @dragleave="$emit('drag-leave', folder.id)"
    @drop="onDrop"
  >
    <div class="folder__icon" @click="activate">
      <!-- Фирменная папка (дизайн-ассеты Folder_close/Folder_open). Закрытая —
           по умолчанию, открытая — на hover. Цвета совпадают с токенами акцента
           (#C4954A / #D4A85E). Тень внутренней створки открытой папки — через CSS
           drop-shadow (а не встроенный <filter>), чтобы не плодить одинаковые
           filter-id при нескольких папках на странице. -->
      <svg
        class="folder__svg folder__svg--closed"
        viewBox="0 0 220 200"
        width="88"
        height="80"
        aria-hidden="true"
      >
        <path
          d="M2 22C2 13.7157 8.70013 7 16.9844 7C37.1115 7 71.204 7 78.5 7C89 7 102 26.0229 111.5 26.0229C118.652 26.0229 175.402 26.0229 203.013 26.0229C211.297 26.0229 218 32.7386 218 41.0229V178C218 186.284 211.284 193 203 193H17C8.71572 193 2 186.284 2 178V22Z"
          fill="#C4954A"
        />
        <rect x="2" y="26" width="216" height="167" rx="15" fill="#D4A85E" />
      </svg>
      <svg
        class="folder__svg folder__svg--open"
        viewBox="0 0 220 200"
        width="88"
        height="80"
        aria-hidden="true"
      >
        <path
          d="M2 22C2 13.7157 8.70013 7 16.9844 7C37.1115 7 71.204 7 78.5 7C89 7 102 26.0229 111.5 26.0229C118.652 26.0229 175.402 26.0229 203.013 26.0229C211.297 26.0229 218 32.7386 218 41.0229V178C218 186.284 211.284 193 203 193H17C8.71572 193 2 186.284 2 178V22Z"
          fill="#C4954A"
        />
        <rect
          class="folder__flap"
          x="2"
          y="51"
          width="216"
          height="142"
          rx="15"
          fill="#D4A85E"
        />
      </svg>
      <!-- Действия — оверлеем в углу иконки, чтобы подпись оставалась по центру -->
      <div class="folder__actions">
        <button class="folder__act" title="Переименовать" @click.stop="startRename">
          <Pencil :size="14" />
        </button>
        <button
          class="folder__act folder__act--danger"
          title="Удалить"
          @click.stop="$emit('delete', folder)"
        >
          <Trash2 :size="14" />
        </button>
      </div>
    </div>

    <div class="folder__info">
      <div v-if="editing" class="folder__edit">
        <input
          v-model="draftName"
          class="folder__input"
          type="text"
          maxlength="255"
          v-focus
          @keydown.enter="submitRename"
          @keydown.esc="cancelRename"
          @click.stop
        />
        <button class="folder__act" title="Сохранить" @click.stop="submitRename">
          <Check :size="14" />
        </button>
        <button class="folder__act" title="Отмена" @click.stop="cancelRename">
          <X :size="14" />
        </button>
      </div>
      <span v-else class="folder__name" :title="folder.name">{{ folder.name }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.folder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-2);
  min-width: 0;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);

  // Подсветка, когда над папкой тащат другую папку (без сплошной рамки-карточки).
  &.is-drop-active {
    background: var(--color-accent-muted);
    outline: 1px dashed var(--color-accent);
  }
}

.folder__icon {
  position: relative;
  line-height: 0;
  transition: transform var(--transition-fast);
}

// Закрытая/открытая створки лежат друг на друге; на hover меняем видимость.
.folder__svg {
  display: block;
}

.folder__svg--open {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

// Тень приподнятой створки открытой папки (замена встроенного SVG <filter>).
.folder__flap {
  filter: drop-shadow(0 -8px 6px rgba(108, 73, 15, 0.25));
}

.folder:hover .folder__icon {
  transform: translateY(-1px);
}

// Открытая створка просто проявляется ПОВЕРХ закрытой (та же фоновая форма),
// закрытую не гасим — иначе в середине кроссфейда сквозит фон и папка «моргает».
.folder:hover .folder__svg--open {
  opacity: 1;
}

// Действия — оверлей в правом-верхнем углу иконки, вне потока подписи.
.folder__actions {
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

.folder:hover .folder__actions {
  opacity: 1;
  pointer-events: auto;
}

.folder__info {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
}

.folder__name {
  max-width: 100%;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-1);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// Режим переименования — input с галочкой/крестиком (подпись временно заменяется).
.folder__edit {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  width: 100%;
  min-width: 0;
}

.folder__input {
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

.folder__act {
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
