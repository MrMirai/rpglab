<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/shared/components/layout/AppLayout.vue'
import EditorSwitcher from '@/shared/components/layout/EditorSwitcher.vue'
import {
  HandoutCanvas,
  HandoutSidebar,
  HandoutToolbar,
  HandoutHeaderActions,
  HandoutPropertiesPanel,
  HandoutExportModal,
  useHandoutStore,
} from '@/modules/handout'
import { useProjectsStore, SaveProjectModal } from '@/modules/projects'
import { UserMenu, useAuthStore } from '@/modules/auth'
import { useToast } from '@/shared/composables/useToast'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const handout = useHandoutStore()
const projects = useProjectsStore()
const toast = useToast()

const loading = ref(false)

// ── Отметка несохранённых изменений ────────────────────────────────────────
// Состояние раздатки - чистый JSON, поэтому следим глубоко: отдельные поля
// правятся у вложенных элементов, и подписью по ссылкам тут не обойтись.
const dirty = ref(false)

// Сбрасывать флаг нужно ПОСЛЕ nextTick: watch отложенный, и изменения от
// загрузки проекта дошли бы до обработчика уже после синхронного сброса.
async function markClean() {
  await nextTick()
  dirty.value = false
}

watch(
  () => [handout.document, handout.elements],
  () => {
    if (!loading.value) dirty.value = true
  },
  { deep: true },
)

// ── Открытие проекта ───────────────────────────────────────────────────────
// ?project=<id> - постоянная ссылка: состояние редактора живёт только в памяти,
// после F5 раздатку нужно перечитать с сервера. ?new=1 - чистый лист; параметр
// сразу убирается из адреса, иначе перезагрузка стёрла бы начатую работу.
onMounted(async () => {
  const projectId = route.query.project
  if (route.query.new) {
    projects.newHandoutProject()
    router.replace({ path: route.path })
    markClean()
    return
  }
  // Тот же проект уже открыт (возврат со страницы проектов) - перечитывать
  // нельзя: потеряются несохранённые правки.
  if (!projectId || projectId === projects.currentProjectId) return

  loading.value = true
  try {
    const { project, missingAssets } = await projects.openHandoutProject(projectId)
    if (missingAssets.length) {
      toast.warning(
        `Не удалось загрузить изображения: ${missingAssets.join(', ')}. Остальное открылось.`,
        { title: 'Часть файлов потеряна' },
      )
    }
    toast.success(`Раздатка «${project.name}» открыта`)
  } catch (e) {
    toast.error(e.message || 'Не удалось открыть раздатку')
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
function onSave() {
  if (projects.currentProjectId && projects.currentProjectType === 'handout') {
    runSave()
    return
  }
  saveError.value = ''
  // Список папок нужен для выбора в модалке; на странице редактора его ещё нет.
  projects.fetchAllFolders()
  saveModalOpen.value = true
}

function confirmSave({ name, folderId }) {
  runSave({ name, folderId })
}

async function runSave(options) {
  saveError.value = ''
  try {
    const saved = await projects.saveHandoutProject(options)
    saveModalOpen.value = false
    markClean()
    // Адрес становится ссылкой на сохранённый проект: после F5 откроется он же.
    if (route.query.project !== saved.id) {
      router.replace({ path: route.path, query: { project: saved.id } })
    }
    toast.success(`Раздатка «${saved.name}» сохранена`)
  } catch (e) {
    const message = e.message || 'Не удалось сохранить раздатку'
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
      <HandoutToolbar />
    </template>
    <template #header-actions>
      <HandoutHeaderActions />
    </template>
    <template #header-user>
      <UserMenu />
    </template>
    <template #sidebar>
      <HandoutSidebar />
    </template>
    <template #properties>
      <HandoutPropertiesPanel />
    </template>

    <HandoutCanvas />
  </AppLayout>
  <HandoutExportModal />

  <SaveProjectModal
    :open="saveModalOpen"
    :saving="projects.isSaving"
    :error="saveError"
    default-name="Новая раздатка"
    :folders="projects.allFolders"
    @confirm="confirmSave"
    @cancel="saveModalOpen = false"
  />
</template>
