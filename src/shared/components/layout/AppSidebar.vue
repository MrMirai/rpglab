<script setup>
// Editor-агностичная оболочка левой панели: только контейнер + скролл.
// Конкретное содержимое (галерея рамок) приходит через слот по умолчанию,
// чтобы панель могли переиспользовать разные редакторы.
</script>

<template>
  <aside class="app-sidebar">
    <slot />
  </aside>
</template>

<style lang="scss" scoped>
.app-sidebar {
  width: 240px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background-color: var(--color-bg-2);
  border-right: 1px solid var(--color-border);
}
</style>
