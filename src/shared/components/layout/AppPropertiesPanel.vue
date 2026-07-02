<script setup>
// Общий контейнер правой панели свойств.
// Конкретное содержимое (секции редактора) приходит через слот по умолчанию,
// чтобы панель могли переиспользовать разные редакторы.
</script>

<template>
  <aside class="app-properties">
    <slot />
  </aside>
</template>

<style lang="scss" scoped>
.app-properties {
  width: 260px;
  background-color: var(--color-bg-2);
  border-left: 1px solid var(--color-border);
}
</style>
