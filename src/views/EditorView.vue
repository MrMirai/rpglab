<script setup>
import AppLayout from '@/shared/components/layout/AppLayout.vue'
import {
  EditorCanvas,
  EditorToolbar,
  EditorHeaderActions,
  EditorProperties,
  ExportModal,
  PreviewWindow,
} from '@/modules/editor'
</script>

<template>
  <AppLayout>
    <template #header-toolbar>
      <EditorToolbar />
    </template>
    <template #header-actions>
      <EditorHeaderActions />
    </template>
    <template #properties>
      <EditorProperties />
    </template>

    <EditorCanvas />
  </AppLayout>
  <ExportModal />
  <PreviewWindow />
</template>
