<script setup>
import { ref } from 'vue'
import { AdminNav, AdminSystemFrames } from '@/modules/admin'
import { UserMenu } from '@/modules/auth'
import PageHeader from '@/shared/components/layout/PageHeader.vue'

// Простой собственный layout админ-секции (не AppLayout — тот заточен под
// редактор с canvas/properties-панелью). Задел на рост: activeSection
// переключает содержимое, следующие разделы (раздатки, тарифы) добавятся сюда же.
const activeSection = ref('frames')
</script>

<template>
  <div class="admin-view">
    <PageHeader>
      <template #user><UserMenu /></template>
    </PageHeader>

    <div class="admin-body">
      <AdminNav :active="activeSection" @select="activeSection = $event" />

      <main class="admin-content">
        <AdminSystemFrames v-if="activeSection === 'frames'" />
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.admin-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-1);
}

.admin-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.admin-content {
  flex: 1;
  overflow-y: auto;
}
</style>
