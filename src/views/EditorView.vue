<script setup>
import AppLayout from '@/shared/components/layout/AppLayout.vue'
import EditorSwitcher from '@/shared/components/layout/EditorSwitcher.vue'
import {
  EditorCanvas,
  EditorToolbar,
  EditorHeaderActions,
  EditorProperties,
  ExportModal,
  PreviewWindow,
} from '@/modules/editor'
import { FrameGallery } from '@/modules/frames'
import { UserMenu, useAuthStore } from '@/modules/auth'

const auth = useAuthStore()
</script>

<template>
  <AppLayout :is-authenticated="auth.isAuthenticated">
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
</template>
