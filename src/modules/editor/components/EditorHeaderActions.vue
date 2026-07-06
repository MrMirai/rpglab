<script setup>
import { Download } from 'lucide-vue-next'
import { useEditorStore } from '../store'
import BaseButton from '@/shared/components/BaseButton.vue'

const store = useEditorStore()
</script>

<template>
  <BaseButton
    size="sm"
    class="header-btn"
    :disabled="!store.isReady"
    @click="store.openExportModal()"
  >
    <Download :size="16" />
    <span>Экспорт</span>
  </BaseButton>
</template>

<style lang="scss" scoped>
// Компактная высота (size=sm), но читаемый текст шапки — крупнее чем в панелях свойств
.header-btn {
  font-size: var(--text-sm);
}
</style>
