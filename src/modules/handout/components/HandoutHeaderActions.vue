<script setup>
import { Download } from 'lucide-vue-next'
import BaseButton from '@/shared/components/BaseButton.vue'
import { useHandoutStore } from '../store'

const store = useHandoutStore()
</script>

<template>
  <BaseButton
    active
    size="sm"
    class="header-btn"
    @click="store.openExportModal()"
  >
    <Download :size="16" />
    <span>Экспорт</span>
  </BaseButton>
</template>

<style lang="scss" scoped>
// Компактная высота (size=sm), но читаемый текст шапки — как у редактора токенов
.header-btn {
  font-size: var(--text-sm);
}
</style>
