<script setup>
import { ref, computed } from 'vue'
import {
  Type, Image as ImageIcon, Square, Circle,
  Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown,
} from 'lucide-vue-next'
import BaseButton from '@/shared/components/BaseButton.vue'
import { useHandoutStore } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'

// Левый сайдбар редактора раздаток: таб «Шаблоны» (пока заглушки)
// и таб «Элементы» (кнопки добавления + упрощённый список слоёв).
const store = useHandoutStore()
const history = useHandoutHistory()

const activeTab = ref('elements') // templates | elements

// --- Шаблоны (заглушки до готовности API) ---
const categories = [
  { id: 'all', label: 'Все' },
  { id: 'notes', label: 'Записки' },
  { id: 'news', label: 'Газеты' },
  { id: 'grimoire', label: 'Гримуары' },
  { id: 'maps', label: 'Карты' },
  { id: 'official', label: 'Официальные' },
  { id: 'other', label: 'Без категории' },
]
const activeCategory = ref('all')
const templateStubs = Array.from({ length: 6 }, (_, i) => ({ id: i + 1 }))

// --- Добавление элементов ---
const imageInputRef = ref(null)

function addText() {
  history.record(store)
  store.addElement('TEXT')
}

function addImageClick() {
  imageInputRef.value?.click()
}

function onImageFile(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  history.record(store)
  store.addElement('IMAGE', { url: URL.createObjectURL(file) })
}

function addRect() {
  history.record(store)
  store.addElement('SHAPE', { shapeType: 'rect' })
}

function addEllipse() {
  history.record(store)
  store.addElement('SHAPE', { shapeType: 'ellipse' })
}

// --- Список слоёв: верхний по z — первым в списке ---
const layers = computed(() => [...store.elements].reverse())

function layerName(el) {
  if (el.type === 'TEXT') return el.content.split('\n')[0].slice(0, 24) || 'Текст'
  if (el.type === 'IMAGE') return 'Картинка'
  return el.shapeType === 'ellipse' ? 'Эллипс' : 'Прямоугольник'
}

function layerIcon(el) {
  if (el.type === 'TEXT') return Type
  if (el.type === 'IMAGE') return ImageIcon
  return el.shapeType === 'ellipse' ? Circle : Square
}

function toggleVisible(el) {
  history.record(store, 'layer-visible:' + el.id)
  store.updateElement(el.id, { visible: !el.visible })
}

function toggleLocked(el) {
  history.record(store, 'layer-locked:' + el.id)
  store.updateElement(el.id, { locked: !el.locked })
}

function moveLayer(el, dir) {
  history.record(store, 'layer-move:' + el.id)
  store.reorderElement(el.id, dir)
}
</script>

<template>
  <div class="handout-sidebar">
    <div class="tabs">
      <BaseButton size="sm" full-width :active="activeTab === 'templates'" @click="activeTab = 'templates'">
        Шаблоны
      </BaseButton>
      <BaseButton size="sm" full-width :active="activeTab === 'elements'" @click="activeTab = 'elements'">
        Элементы
      </BaseButton>
    </div>

    <!-- Таб «Шаблоны» -->
    <div v-if="activeTab === 'templates'" class="tab-body">
      <div class="categories">
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          class="category-badge"
          :class="{ active: activeCategory === cat.id }"
          @click="activeCategory = cat.id"
        >
          {{ cat.label }}
        </button>
      </div>

      <div class="templates-grid">
        <div v-for="stub in templateStubs" :key="stub.id" class="template-stub">
          <span>Скоро</span>
        </div>
      </div>
    </div>

    <!-- Таб «Элементы» -->
    <div v-else class="tab-body">
      <div class="add-grid">
        <button type="button" class="add-btn" @click="addText">
          <Type :size="18" /> Текст
        </button>
        <button type="button" class="add-btn" @click="addImageClick">
          <ImageIcon :size="18" /> Картинка
        </button>
        <button type="button" class="add-btn" @click="addRect">
          <Square :size="18" /> Прямоугольник
        </button>
        <button type="button" class="add-btn" @click="addEllipse">
          <Circle :size="18" /> Эллипс
        </button>
      </div>
      <input ref="imageInputRef" type="file" accept="image/*" style="display: none" @change="onImageFile" />

      <div class="layers-header">Слои</div>
      <p v-if="!layers.length" class="layers-empty">Пока пусто — добавь элемент</p>

      <ul v-else class="layers-list">
        <li
          v-for="el in layers"
          :key="el.id"
          class="layer-row"
          :class="{ active: store.selectedIds.includes(el.id) }"
          @click="store.setSelected([el.id])"
        >
          <component :is="layerIcon(el)" :size="14" class="layer-row__type" />
          <span class="layer-row__name">{{ layerName(el) }}</span>
          <span class="layer-row__actions" @click.stop>
            <button type="button" class="icon-btn" title="Выше" @click="moveLayer(el, 'up')">
              <ChevronUp :size="13" />
            </button>
            <button type="button" class="icon-btn" title="Ниже" @click="moveLayer(el, 'down')">
              <ChevronDown :size="13" />
            </button>
            <button type="button" class="icon-btn" :title="el.visible ? 'Скрыть' : 'Показать'" @click="toggleVisible(el)">
              <Eye v-if="el.visible" :size="13" />
              <EyeOff v-else :size="13" />
            </button>
            <button type="button" class="icon-btn" :title="el.locked ? 'Разблокировать' : 'Заблокировать'" @click="toggleLocked(el)">
              <Lock v-if="el.locked" :size="13" />
              <Unlock v-else :size="13" />
            </button>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.handout-sidebar {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.tabs {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.tab-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
}

.categories {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

.category-badge {
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

.templates-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.template-stub {
  aspect-ratio: 3 / 4;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-3);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  color: var(--color-text-3);
  font-size: var(--text-xs);
}

.add-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.add-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-2);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
}

.layers-header {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: var(--space-2);
}

.layers-empty {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.layers-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.layer-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);

  &:hover {
    background: var(--color-bg-3);
  }

  &.active {
    background: var(--color-accent-muted);

    .layer-row__name { color: var(--color-accent); }
  }

  &__type {
    color: var(--color-text-3);
    flex-shrink: 0;
  }

  &__name {
    flex: 1;
    font-size: var(--text-xs);
    color: var(--color-text-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  &:hover &__actions,
  &.active &__actions {
    opacity: 1;
  }
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-3);
  cursor: pointer;
  transition: color var(--transition-fast);

  &:hover {
    color: var(--color-accent);
  }
}
</style>
