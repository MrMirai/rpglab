<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/shared/components/layout/AppLayout.vue'
import EditorSwitcher from '@/shared/components/layout/EditorSwitcher.vue'
import {
  EditorCanvas,
  EditorToolbar,
  EditorHeaderActions,
  EditorProperties,
  ExportModal,
  PreviewWindow,
  useEditorStore,
  useBrushMask,
} from '@/modules/editor'
import { FrameGallery } from '@/modules/frames'
import { useProjectsStore, SaveProjectModal } from '@/modules/projects'
import { UserMenu, useAuthStore } from '@/modules/auth'
import { useToast } from '@/shared/composables/useToast'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const editor = useEditorStore()
const projects = useProjectsStore()
const toast = useToast()
const { brushVersion } = useBrushMask()

const loading = ref(false)

// ── Отметка несохранённых изменений ────────────────────────────────────────
// Следим за подписью состояния, а не за всем стором: картинки - это
// HTMLImageElement, глубокий watch по ним бессмысленно дорог. Кисть даёт
// монотонный brushVersion, изображения сравниваем по ссылке.
const dirty = ref(false)

// Сбрасывать флаг нужно ПОСЛЕ nextTick: watch по умолчанию отложенный, и
// изменения, внесённые загрузкой проекта, дойдут до обработчика уже после
// возврата из await - синхронный сброс они бы тут же перебили.
async function markClean() {
  await nextTick()
  dirty.value = false
}

watch(
  () => [
    editor.charImage,
    editor.frameImage,
    editor.bgImage,
    brushVersion.value,
    editor.charX,
    editor.charY,
    editor.charScale,
    editor.canvasSize,
    editor.overflowY,
    editor.overflowSoft,
    editor.bgType,
    editor.bgColor,
    JSON.stringify(editor.lights),
    JSON.stringify([
      editor.charHue,
      editor.charSaturation,
      editor.charBrightness,
      editor.charContrast,
      editor.charLuminosity,
      editor.charShadowEnabled,
      editor.charShadowColor,
      editor.charShadowBlur,
      editor.charShadowOffsetX,
      editor.charShadowOffsetY,
      editor.charShadowOpacity,
      editor.bgAutoColor,
      editor.bgCenterLight,
      editor.bgEdgeLight,
      editor.bgNoiseStrength,
      editor.bgGrain,
      editor.bgNoiseType,
    ]),
  ],
  () => {
    if (!loading.value) dirty.value = true
  },
)

// ── Открытие проекта ───────────────────────────────────────────────────────
// ?project=<id> - постоянная ссылка на сохранённый проект: состояние редактора
// живёт только в памяти, поэтому после F5 проект нужно перечитать с сервера.
// ?new=1 - явно начать с чистого холста; параметр сразу убирается из адреса,
// иначе перезагрузка страницы стёрла бы уже начатую работу.
onMounted(async () => {
  const projectId = route.query.project
  if (route.query.new) {
    projects.newTokenProject()
    router.replace({ path: route.path })
    markClean()
    return
  }
  // Тот же проект уже открыт (возврат со страницы проектов) - перечитывать
  // нельзя: потеряются несохранённые правки.
  if (!projectId || projectId === projects.currentProjectId) return

  loading.value = true
  try {
    const { project, missingAssets } = await projects.openTokenProject(projectId)
    if (missingAssets.length) {
      toast.warning(
        `Не удалось загрузить изображения: ${missingAssets.join(', ')}. Остальное открылось.`,
        { title: 'Часть файлов потеряна' },
      )
    }
    toast.success(`Проект «${project.name}» открыт`)
  } catch (e) {
    toast.error(e.message || 'Не удалось открыть проект')
  } finally {
    loading.value = false
    markClean()
  }
})

// ── Сохранение ─────────────────────────────────────────────────────────────
const saveModalOpen = ref(false)
const saveError = ref('')

// Первое сохранение спрашивает название и папку, дальше «Сохранить» пишет молча
// в уже созданный проект (PUT).
async function onSave() {
  if (projects.currentProjectId) {
    await runSave()
    return
  }
  saveError.value = ''
  // Список папок нужен для выбора в модалке; на странице редактора его ещё нет.
  projects.fetchAllFolders()
  saveModalOpen.value = true
}

async function confirmSave({ name, folderId }) {
  await runSave({ name, folderId })
}

async function runSave(options) {
  saveError.value = ''
  try {
    const saved = await projects.saveTokenProject(options)
    saveModalOpen.value = false
    markClean()
    // Адрес становится ссылкой на сохранённый проект: после F5 откроется он же.
    if (route.query.project !== saved.id) {
      router.replace({ path: route.path, query: { project: saved.id } })
    }
    toast.success(`Проект «${saved.name}» сохранён`)
  } catch (e) {
    const message = e.message || 'Не удалось сохранить проект'
    // Пока открыта модалка - ошибку показываем в ней (имя-дубль правится тут же),
    // иначе тостом: пользователь смотрит на холст, а не на форму.
    if (saveModalOpen.value) saveError.value = message
    else toast.error(message)
  }
}
</script>

<template>
  <AppLayout
    :is-authenticated="auth.isAuthenticated"
    :saving="projects.isSaving"
    :dirty="dirty"
    @save="onSave"
  >
    <template #header-logo>
      <EditorSwitcher />
    </template>
    <template #header-toolbar>
      <EditorToolbar />
    </template>
    <template #header-actions>
      <EditorHeaderActions />
    </template>
    <template #header-user>
      <UserMenu />
    </template>
    <template #sidebar>
      <FrameGallery />
    </template>
    <template #properties>
      <EditorProperties />
    </template>

    <EditorCanvas />
  </AppLayout>
  <ExportModal />
  <PreviewWindow />

  <SaveProjectModal
    :open="saveModalOpen"
    :saving="projects.isSaving"
    :error="saveError"
    :default-name="editor.frameFileName.replace(/\.[^./\\]+$/, '') || 'Новый токен'"
    :folders="projects.allFolders"
    @confirm="confirmSave"
    @cancel="saveModalOpen = false"
  />
</template>
