<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { FolderPlus, CornerLeftUp, FileText } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import {
  useProjectsStore,
  FolderCard,
  FolderBreadcrumbs,
  CreateFolderModal,
} from '@/modules/projects'
import { UserMenu } from '@/modules/auth'
import PageHeader from '@/shared/components/layout/PageHeader.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'

const router = useRouter()
const store = useProjectsStore()
const { folders, breadcrumbs, currentFolderId, parentFolderId, foldersLoading, foldersError } =
  storeToRefs(store)

// Проекты внутри папок пока не реализованы (бэк проектов не готов) — показываем
// только папки. Карточки проектов появятся здесь же, рядом с папками.

onMounted(() => store.fetchFolders(null))

// Кнопки шапки ведут в соответствующие редакторы.
function createToken() {
  router.push('/editor/token')
}

function createHandout() {
  router.push('/editor/handout')
}

// Лимит проектов по тарифу — пока заглушка (бэк квот не готов, см. API.md
// «Ещё не реализовано»). Значения статические, шкала не функциональна.
const projectLimit = { used: 5, total: 10 }
const limitRatio = computed(() =>
  projectLimit.total ? Math.min(1, projectLimit.used / projectLimit.total) : 0,
)

// ── Drag & drop состояние ──────────────────────────────────────────────────
// id перетаскиваемой сейчас папки (null — ничего не тащим) и id папки-цели
// под курсором (для подсветки drop-цели).
const draggingId = ref(null)
const dropTargetId = ref(null)
// Подсветка элемента «на уровень выше» как drop-цели.
const upDropActive = ref(false)

function onDragStart(id) {
  draggingId.value = id
}

function onDragEnd() {
  draggingId.value = null
  dropTargetId.value = null
  upDropActive.value = false
}

function onCardDragOver(id) {
  // Нельзя бросить папку саму на себя.
  if (draggingId.value && draggingId.value !== id) dropTargetId.value = id
}

function onCardDragLeave(id) {
  if (dropTargetId.value === id) dropTargetId.value = null
}

// Переместить папку draggedId в папку targetId (общий обработчик для карточек,
// крошек и элемента «вверх»).
async function moveInto(draggedId, targetId) {
  onDragEnd()
  if (!draggedId || draggedId === targetId) return
  try {
    await store.moveFolder(draggedId, targetId)
    // Перечитываем текущую папку, чтобы обновился счётчик вложенных у цели.
    await store.fetchFolders(currentFolderId.value)
  } catch (e) {
    foldersError.value = e.message
  }
}

function onDropOnCard({ draggedId, targetId }) {
  moveInto(draggedId, targetId)
}

// ── Навигация ──
function openFolder(id) {
  store.openFolder(id)
}

function goUp() {
  store.openFolder(parentFolderId.value)
}

// ── Создание папки ──
const createOpen = ref(false)
const createSaving = ref(false)
const createError = ref('')

function openCreate() {
  createError.value = ''
  createOpen.value = true
}

async function confirmCreate(name) {
  createSaving.value = true
  createError.value = ''
  try {
    await store.createFolder(name)
    createOpen.value = false
  } catch (e) {
    createError.value = e.message
  } finally {
    createSaving.value = false
  }
}

// ── Переименование ──
async function renameFolder(id, name) {
  try {
    await store.renameFolder(id, name)
  } catch (e) {
    foldersError.value = e.message
  }
}

// ── Удаление ──
const deleteTarget = ref(null)
const deleting = ref(false)
const deleteError = ref('')

function askDelete(folder) {
  deleteTarget.value = folder
  deleteError.value = ''
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await store.deleteFolder(deleteTarget.value.id)
    deleteTarget.value = null
  } catch (e) {
    deleteError.value = e.message
  } finally {
    deleting.value = false
  }
}

const deleteMessage = computed(() =>
  deleteTarget.value
    ? `Папка «${deleteTarget.value.name}»${
        deleteTarget.value.childCount > 0 ? ' и всё её содержимое' : ''
      } будет удалена безвозвратно.`
    : '',
)

const isEmpty = computed(() => !foldersLoading.value && folders.value.length === 0)
</script>

<template>
  <div class="projects-view">
    <PageHeader>
      <BaseButton @click="createToken">
        <!-- Тот же символ ◎, что и на главной для редактора токенов -->
        <span class="token-glyph">◎</span>
        Создать токен
      </BaseButton>
      <BaseButton @click="createHandout">
        <FileText :size="16" />
        Создать раздатку
      </BaseButton>
      <BaseButton variant="accent" @click="openCreate">
        <FolderPlus :size="16" />
        Новая папка
      </BaseButton>
      <template #user><UserMenu /></template>
    </PageHeader>

    <div class="projects-subbar">
      <FolderBreadcrumbs
        class="projects-subbar__crumbs"
        :trail="breadcrumbs"
        @navigate="openFolder"
        @drop-to="onDropOnCard"
      />

      <!-- Лимит проектов по тарифу — заглушка (шкала не функциональна) -->
      <div class="project-limit">
        <span class="project-limit__label">Лимит проектов</span>
        <div class="project-limit__bar">
          <div class="project-limit__fill" :style="{ width: `${limitRatio * 100}%` }" />
          <span class="project-limit__value">{{ projectLimit.used }}/{{ projectLimit.total }}</span>
        </div>
      </div>
    </div>

    <main class="projects-content">
      <p v-if="foldersError" class="projects-error">{{ foldersError }}</p>

      <div class="projects-grid">
        <!-- Элемент «на уровень выше» — не папка, а возврат вверх по вложенности.
             Нет в корне. Тоже drop-цель: бросок папки → переместить к родителю. -->
        <button
          v-if="currentFolderId !== null"
          class="up-item"
          :class="{ 'is-drop-active': upDropActive }"
          @click="goUp"
          @dragover.prevent="draggingId && (upDropActive = true)"
          @dragleave="upDropActive = false"
          @drop.prevent="
            moveInto($event.dataTransfer.getData('text/plain'), parentFolderId)
          "
        >
          <span class="up-item__arrow"><CornerLeftUp :size="32" /></span>
          <span class="up-item__label">Наверх</span>
        </button>

        <FolderCard
          v-for="folder in folders"
          :key="folder.id"
          :folder="folder"
          :drop-active="dropTargetId === folder.id"
          @open="openFolder"
          @rename="renameFolder"
          @delete="askDelete"
          @dragstart="onDragStart"
          @dragend="onDragEnd"
          @drag-over="onCardDragOver"
          @drag-leave="onCardDragLeave"
          @drop-folder="onDropOnCard"
        />
      </div>

      <!-- Подсказку показываем только в корне (у нового пользователя нет папок);
           внутри открытой папки пустоту не подписываем. -->
      <p v-if="isEmpty && currentFolderId === null" class="projects-empty">
        У вас пока нет папок
      </p>
    </main>

    <CreateFolderModal
      :open="createOpen"
      :saving="createSaving"
      :error="createError"
      @confirm="confirmCreate"
      @cancel="createOpen = false"
    />

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Удалить папку?"
      :message="deleteMessage"
      :pending="deleting"
      :error="deleteError"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>

<style lang="scss" scoped>
.projects-view {
  min-height: 100vh;
  background-color: var(--color-bg-1);
  display: flex;
  flex-direction: column;
}

// Символ токена ◎ (как на главной) — крупнее lucide-иконок, чтобы внутренний
// круг читался; выравниваем по базовой линии текста кнопки.
.token-glyph {
  font-size: 17px;
  line-height: 1;
}

// Подшапка: хлебные крошки слева, шкала лимита проектов справа.
.projects-subbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  padding: var(--space-3) var(--space-8);
  border-bottom: 1px solid var(--color-border);
}

.projects-subbar__crumbs {
  min-width: 0;
}

.project-limit {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.project-limit__label {
  font-size: var(--text-sm);
  color: var(--color-text-2);
}

.project-limit__bar {
  position: relative;
  width: 200px;
  height: 20px;
  background: var(--color-bg-3);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.project-limit__fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--color-accent);
  border-radius: var(--radius-sm);
  transition: width var(--transition-normal);
}

.project-limit__value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: var(--color-text-1);
}

.projects-content {
  padding: var(--space-6) var(--space-8);
  flex: 1;
  width: 100%;
}

.projects-error {
  margin-bottom: var(--space-4);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-danger);
  background: rgba(192, 84, 74, 0.12);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
}

// Фиксированная ширина ячеек (не 1fr) — иначе auto-fill растягивает колонки и
// центрированные папки «разъезжаются», давая неровные промежутки между ними и
// кнопкой «Наверх». Теперь каждая ячейка ровно по ширине папки → одинаковый шаг.
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 120px);
  gap: var(--space-3);
  justify-content: start;
}

// Элемент «на уровень выше» — только стрелка и подпись, без рамки.
// Структура повторяет .folder (те же паддинги/gap + иконка-зона 80px), поэтому
// высота совпадает с папкой; align-self: start не даёт растягиваться на высоту
// ряда (иначе при появлении первой папки кнопка меняла размер).
.up-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  align-self: start;
  padding: var(--space-3) var(--space-2);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-2);
  cursor: pointer;
  font-family: inherit;
  transition:
    color var(--transition-fast),
    background var(--transition-fast);

  &:hover {
    color: var(--color-accent);
  }

  &.is-drop-active {
    background: var(--color-accent-muted);
    outline: 1px dashed var(--color-accent);
    color: var(--color-accent);
  }
}

// Стрелка отцентрирована в зоне высотой с иконку папки (80px), чтобы подписи
// оказались на одной линии и высота элемента совпала с папкой.
.up-item__arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  color: inherit;
}

.up-item__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}

.projects-empty {
  margin-top: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-3);
}
</style>
