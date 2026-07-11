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

const auth = useAuthStore()
</script>

<template>
  <AppLayout :is-authenticated="auth.isAuthenticated">
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
