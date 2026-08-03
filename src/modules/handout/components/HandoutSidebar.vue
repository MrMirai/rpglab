<script setup>
import { ref, computed } from 'vue'
import {
  Type, Image as ImageIcon, Square, Circle,
  ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Layers,
} from 'lucide-vue-next'
import SegmentedControl from '@/shared/components/SegmentedControl.vue'
import { useHandoutStore } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'
import LayerRow from './LayerRow.vue'

// Левый сайдбар редактора раздаток: таб «Шаблоны» (пока заглушки)
// и таб «Элементы» (кнопки добавления + список слоёв).
const store = useHandoutStore()
const history = useHandoutHistory()

const activeTab = ref('elements') // templates | elements

const tabOptions = [
  { value: 'templates', label: 'Шаблоны' },
  { value: 'elements', label: 'Элементы' },
]

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

const addButtons = [
  { id: 'text', label: 'Текст', icon: Type, action: addText },
  { id: 'image', label: 'Картинка', icon: ImageIcon, action: addImageClick },
  { id: 'rect', label: 'Прямоугольник', icon: Square, action: addRect },
  { id: 'ellipse', label: 'Эллипс', icon: Circle, action: addEllipse },
]

// --- Список слоёв: верхний по z - первым в списке ---
const layers = computed(() => [...store.elements].reverse())

// Якорь для Shift-диапазона - индекс последнего одиночного клика в layers.
let rangeAnchor = null

function onLayerClick(el, index, e) {
  if (e.shiftKey) {
    const anchor = rangeAnchor ?? index
    const [from, to] = anchor < index ? [anchor, index] : [index, anchor]
    store.setSelected(layers.value.slice(from, to + 1).map((l) => l.id))
    return
  }
  if (e.ctrlKey || e.metaKey) {
    store.toggleSelected(el.id)
    rangeAnchor = index
    return
  }
  store.setSelected([el.id])
  rangeAnchor = index
}

function toggleVisible(el) {
  history.record(store, 'layer-visible:' + el.id)
  store.updateElement(el.id, { visible: !el.visible })
}

function toggleLocked(el) {
  history.record(store, 'layer-locked:' + el.id)
  store.updateElement(el.id, { locked: !el.locked })
}

function duplicateLayer(el) {
  history.record(store)
  store.duplicateElement(el.id)
}

function removeLayer(el) {
  history.record(store)
  store.removeElement(el.id)
}

// --- Перестановка по z (действует на выделение) ---
const selectedLayers = computed(() =>
  store.elements.filter((e) => store.selectedIds.includes(e.id)),
)

// selectedLayers идёт снизу вверх по z. При сдвиге ГРУППЫ порядок обхода важен,
// иначе элементы перепрыгивают друг через друга: 'up' и 'bottom' кладут последний
// обработанный элемент туда, куда должен попасть первый, - их обходим с конца.
function moveSelection(dir) {
  const els = selectedLayers.value
  if (!els.length) return
  history.record(store)
  const reversed = dir === 'up' || dir === 'bottom'
  const ordered = reversed ? [...els].reverse() : els
  ordered.forEach((el) => store.reorderElement(el.id, dir))
}

const canReorder = computed(() => selectedLayers.value.length > 0)

const reorderButtons = [
  { dir: 'top', icon: ChevronsUp, title: 'На передний план' },
  { dir: 'up', icon: ChevronUp, title: 'Поднять на слой' },
  { dir: 'down', icon: ChevronDown, title: 'Опустить на слой' },
  { dir: 'bottom', icon: ChevronsDown, title: 'На задний план' },
]
</script>

<template>
  <div class="handout-sidebar">
    <SegmentedControl v-model="activeTab" class="tabs" :options="tabOptions" />

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

    <!-- Таб «Элементы»: скроллится только список слоёв, кнопки добавления
         зафиксированы сверху -->
    <div v-else class="tab-body tab-body--split">
      <div class="add-block">
        <p class="block-title">Добавить</p>
        <div class="add-grid">
          <button
            v-for="btn in addButtons"
            :key="btn.id"
            type="button"
            class="add-btn"
            @click="btn.action"
          >
            <component :is="btn.icon" :size="17" />
            <span>{{ btn.label }}</span>
          </button>
        </div>
        <input ref="imageInputRef" type="file" accept="image/*" style="display: none" @change="onImageFile" />
      </div>

      <div class="layers-block">
        <div class="layers-head">
          <p class="block-title">
            <Layers :size="12" />
            Слои
            <span class="block-title__count">{{ layers.length }}</span>
          </p>

          <div class="layers-head__actions">
            <button
              v-for="btn in reorderButtons"
              :key="btn.dir"
              type="button"
              class="reorder-btn"
              :disabled="!canReorder"
              :title="btn.title"
              @click="moveSelection(btn.dir)"
            >
              <component :is="btn.icon" :size="14" />
            </button>
          </div>
        </div>

        <p v-if="!layers.length" class="layers-empty">
          Слоёв пока нет.<br />
          Добавьте элемент кнопками выше.
        </p>

        <ul v-else class="layers-list">
          <LayerRow
            v-for="(el, index) in layers"
            :key="el.id"
            :element="el"
            :active="store.selectedIds.includes(el.id)"
            @select="onLayerClick(el, index, $event)"
            @toggle-visible="toggleVisible(el)"
            @toggle-locked="toggleLocked(el)"
            @duplicate="duplicateLayer(el)"
            @remove="removeLayer(el)"
          />
        </ul>
      </div>
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
  margin: var(--space-3);
  flex-shrink: 0;
}

.tab-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 var(--space-3) var(--space-3);
}

// Режим таба «Элементы»: внешнего скролла нет, прокручивается только список слоёв
.tab-body--split {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: 0;
}

// --- Общий заголовок блока ---
.block-title {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;

  &__count {
    padding: 0 5px;
    border-radius: var(--radius-lg);
    background: var(--color-bg-3);
    color: var(--color-text-2);
    font-size: 10px;
    font-weight: var(--weight-medium);
    letter-spacing: 0;
    font-variant-numeric: tabular-nums;
  }
}

// --- Шаблоны ---
.categories {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

.category-badge {
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
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

// --- Добавление элементов ---
.add-block {
  flex-shrink: 0;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

// Кнопки добавления - действия, а не переключатель (активной среди них нет),
// поэтому это не SegmentedControl. Вид держим общий: та же подложка-группа,
// сегменты подсвечиваются на наведении.
.add-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  margin-top: var(--space-2);
  padding: 2px;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.add-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  // Одинаковая высота независимо от того, переносится ли подпись
  height: 56px;
  padding: 0 var(--space-1);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-2);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  line-height: var(--leading-tight);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-fast);

  span {
    // Длинное «Прямоугольник» не должно распирать колонку
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    background: var(--color-bg-3);
    color: var(--color-accent);
  }
}

// --- Слои ---
.layers-block {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding-top: var(--space-3);
}

.layers-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  flex-shrink: 0;

  &__actions {
    display: flex;
    gap: 1px;
  }
}

.reorder-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-3);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover:not(:disabled) {
    background: var(--color-bg-3);
    color: var(--color-accent);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.layers-empty {
  padding: var(--space-4) var(--space-2);
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
  color: var(--color-text-3);
  text-align: center;
}

.layers-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  // Докрутив список слоёв, колёсико не должно прокручивать панель/страницу
  overscroll-behavior: contain;
  padding-bottom: var(--space-3);
}
</style>
