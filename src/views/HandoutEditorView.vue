<script setup>
import AppLayout from '@/shared/components/layout/AppLayout.vue'
import EditorSwitcher from '@/shared/components/layout/EditorSwitcher.vue'
import {
  HandoutCanvas,
  HandoutSidebar,
  HandoutToolbar,
  HandoutHeaderActions,
  HandoutPropertiesPanel,
  HandoutExportModal,
} from '@/modules/handout'
import { UserMenu, useAuthStore } from '@/modules/auth'
import { useToast } from '@/shared/composables/useToast'

const auth = useAuthStore()
const toast = useToast()

// Сохранение раздаток пока не реализовано: формат проекта (configuration) описан
// только для токенов - schema/tokenProject.js. Кнопка в шапке общая для всех
// редакторов, поэтому честно говорим, а не молчим в ответ на клик.
function onSave() {
  toast.info('Сохранение раздаток появится позже - пока доступен экспорт в PNG/PDF')
}
</script>

<template>
  <AppLayout :is-authenticated="auth.isAuthenticated" @save="onSave">
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
</template>
