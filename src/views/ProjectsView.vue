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
  ProjectCard,
} from '@/modules/projects'
import { UserMenu } from '@/modules/auth'
import PageHeader from '@/shared/components/layout/PageHeader.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'

const router = useRouter()
const store = useProjectsStore()
const { folders, breadcrumbs, currentFolderId, parentFolderId, foldersLoading, foldersError } =
  storeToRefs(store)
const { projects, projectsLoading, projectsError } = storeToRefs(store)

// Папки и лежащие в них проекты - два независимых запроса, показываются одной
// сеткой: сначала папки, затем проекты (как в файловых менеджерах).
function loadFolder(folderId) {
  store.fetchFolders(folderId)
  store.fetchProjects(folderId)
}

onMounted(() => loadFolder(null))

// Кнопки шапки ведут в соответствующие редакторы. ?new=1 - явно начать с
// чистого холста: без него редактор сохранил бы состояние прошлого проекта
// и «Сохранить» перезаписало бы уже открытый проект.
function createToken() {
  router.push({ path: '/editor/token', query: { new: 1 } })
}

function createHandout() {
  router.push('/editor/handout')
}

// Лимит проектов по тарифу - пока заглушка (бэк квот не готов, см. API.md
// «Ещё не реализовано»). Значения статические, шкала не функциональна.
const projectLimit = { used: 5, total: 10 }
const limitRatio = computed(() =>
  projectLimit.total ? Math.min(1, projectLimit.used / projectLimit.total) : 0,
)

// ── Drag & drop состояние ──────────────────────────────────────────────────
// id перетаскиваемой сейчас папки (null - ничего не тащим) и id папки-цели
// под курсором (для подсветки drop-цели).
const draggingId = ref(null)
const dropTargetId = ref(null)
// Подсветка элемента «на уровень выше» как drop-цели.
const upDropActive = ref(false)
// Что именно тащим: у папки и проекта разные эндпоинты перемещения, а
// dataTransfer несёт только id. Тип держим здесь - источник и цель в одном виде.
const draggingKind = ref(null)

function onDragStart(id) {
  draggingId.value = id
  draggingKind.value = 'folder'
}

function onProjectDragStart(id) {
  draggingId.value = id
  draggingKind.value = 'project'
}

function onDragEnd() {
  draggingId.value = null
  draggingKind.value = null
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

// Переместить перетаскиваемый элемент в папку targetId (общий обработчик для
// карточек, крошек и элемента «вверх»). Папка и проект переезжают разными
// эндпоинтами, поэтому смотрим на тип источника.
async function moveInto(draggedId, targetId) {
  const kind = draggingKind.value
  onDragEnd()
  if (!draggedId || draggedId === targetId) return
  try {
    if (kind === 'project') {
      await store.moveProject(draggedId, targetId)
    } else {
      await store.moveFolder(draggedId, targetId)
      // Перечитываем текущую папку, чтобы обновился счётчик вложенных у цели.
      await store.fetchFolders(currentFolderId.value)
    }
  } catch (e) {
    foldersError.value = e.message
  }
}

function onDropOnCard({ draggedId, targetId }) {
  moveInto(draggedId, targetId)
}

// ── Навигация ──
function openFolder(id) {
  loadFolder(id)
}

function goUp() {
  loadFolder(parentFolderId.value)
}

// ── Проекты ──
// Открытие проекта - переход в редактор его типа с ?project=<id>: сам проект
// подтягивает EditorView, чтобы ссылка работала и при прямом заходе/перезагрузке.
function openProject(id) {
  const project = projects.value.find((p) => p.id === id)
  const path = project?.projectType === 'handout' ? '/editor/handout' : '/editor/token'
  router.push({ path, query: { project: id } })
}

async function renameProject(id, name) {
  try {
    await store.renameProject(id, name)
  } catch (e) {
    projectsError.value = e.message
  }
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
// Один диалог на папки и проекты: kind решает, что удалять и каким текстом
// предупреждать (у папки уносится всё содержимое, у проекта - его файлы).
const deleteTarget = ref(null)
const deleting = ref(false)
const deleteError = ref('')

function askDelete(folder) {
  deleteTarget.value = { kind: 'folder', item: folder }
  deleteError.value = ''
}

function askDeleteProject(project) {
  deleteTarget.value = { kind: 'project', item: project }
  deleteError.value = ''
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const { kind, item } = deleteTarget.value
  deleting.value = true
  deleteError.value = ''
  try {
    if (kind === 'project') await store.deleteProject(item.id)
    else await store.deleteFolder(item.id)
    deleteTarget.value = null
  } catch (e) {
    deleteError.value = e.message
  } finally {
    deleting.value = false
  }
}

const deleteTitle = computed(() =>
  deleteTarget.value?.kind === 'project' ? 'Удалить проект?' : 'Удалить папку?',
)

const deleteMessage = computed(() => {
  const target = deleteTarget.value
  if (!target) return ''
  if (target.kind === 'project') {
    return `Проект «${target.item.name}» и его файлы будут удалены безвозвратно.`
  }
  return `Папка «${target.item.name}»${
    target.item.childCount > 0 ? ' и всё её содержимое' : ''
  } будет удалена безвозвратно.`
})

const isEmpty = computed(
  () =>
    !foldersLoading.value &&
    !projectsLoading.value &&
    folders.value.length === 0 &&
    projects.value.length === 0,
)
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

      <!-- Лимит проектов по тарифу - заглушка (шкала не функциональна) -->
      <div class="project-limit">
        <span class="project-limit__label">Лимит проектов</span>
        <div class="project-limit__bar">
          <div class="project-limit__fill" :style="{ width: `${limitRatio * 100}%` }" />
          <span class="project-limit__value">{{ projectLimit.used }}/{{ projectLimit.total }}</span>
        </div>
      </div>
    </div>

    <main class="projects-content">
      <p v-if="foldersError || projectsError" class="projects-error">
        {{ foldersError || projectsError }}
      </p>

      <div class="projects-grid">
        <!-- Элемент «на уровень выше» - не папка, а возврат вверх по вложенности.
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

        <!-- Проекты идут после папок, как в файловых менеджерах. Drop-целью не
             являются: вложить проект в проект некуда. -->
        <ProjectCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
          @open="openProject"
          @rename="renameProject"
          @delete="askDeleteProject"
          @dragstart="onProjectDragStart"
          @dragend="onDragEnd"
        />
      </div>

      <!-- Подсказку показываем только в корне (у нового пользователя пусто);
           внутри открытой папки пустоту не подписываем. -->
      <p v-if="isEmpty && currentFolderId === null" class="projects-empty">
        У вас пока нет проектов и папок
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
      :title="deleteTitle"
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

// Символ токена ◎ (как на главной) - крупнее lucide-иконок, чтобы внутренний
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

// Фиксированная ширина ячеек (не 1fr) - иначе auto-fill растягивает колонки и
// центрированные папки «разъезжаются», давая неровные промежутки между ними и
// кнопкой «Наверх». Теперь каждая ячейка ровно по ширине папки → одинаковый шаг.
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 120px);
  gap: var(--space-3);
  justify-content: start;
}

// Элемент «на уровень выше» - только стрелка и подпись, без рамки.
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
