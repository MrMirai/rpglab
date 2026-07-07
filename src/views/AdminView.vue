<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { AdminNav, AdminSystemFrames } from '@/modules/admin'

// Простой собственный layout админ-секции (не AppLayout — тот заточен под
// редактор с canvas/properties-панелью). Задел на рост: activeSection
// переключает содержимое, следующие разделы (раздатки, тарифы) добавятся сюда же.
const activeSection = ref('frames')
</script>

<template>
  <div class="admin-view">
    <header class="admin-header">
      <RouterLink to="/" class="back-link">← Назад в редактор</RouterLink>
      <h1>Администрирование</h1>
    </header>

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

.admin-header {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-4) var(--space-8);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-2);
  flex-shrink: 0;

  h1 {
    font-size: var(--text-xl);
    font-weight: var(--weight-semibold);
    color: var(--color-text-1);
  }
}

.back-link {
  font-size: var(--text-sm);
  color: var(--color-text-2);
  transition: color var(--transition-fast);
  flex-shrink: 0;

  &:hover {
    color: var(--color-accent);
  }
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
