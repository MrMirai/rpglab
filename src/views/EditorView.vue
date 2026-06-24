<script setup>
import AppLayout from '@/shared/components/layout/AppLayout.vue'
import ExportModal from '@/shared/components/ExportModal.vue'
import PreviewWindow from '@/modules/editor/components/PreviewWindow.vue'
import { EditorCanvas } from '@/modules/editor'
</script>

<template>
  <AppLayout>
    <EditorCanvas />
  </AppLayout>
  <ExportModal />
  <PreviewWindow />
</template>
