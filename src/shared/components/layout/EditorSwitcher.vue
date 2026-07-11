<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ChevronDown, Layers, FileText, Home } from 'lucide-vue-next'

// Логотип-дропдаун: переключение между редакторами (токены/раздатки) и главной.
// Живёт в shared/ (каркас шапки), но ссылается только на пути роутера —
// не импортирует ничего из modules/, поэтому не нарушает архитектурное правило
// «shared — лист графа зависимостей».
const EDITORS = [
  { path: '/editor/token', label: 'Редактор токенов', icon: Layers },
  { path: '/editor/handout', label: 'Редактор раздаток', icon: FileText },
]

const route = useRoute()
const isOpen = ref(false)
const triggerRef = ref(null)
const popupRef = ref(null)

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

function onClickOutside(e) {
  if (!isOpen.value) return
  if (triggerRef.value?.contains(e.target)) return
  if (popupRef.value?.contains(e.target)) return
  close()
}
onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div class="editor-switcher">
    <button ref="triggerRef" class="editor-switcher__trigger" @click="toggle">
      <span class="editor-switcher__icon">◎</span>
      <span class="editor-switcher__text">RPGLab</span>
      <ChevronDown :size="14" class="editor-switcher__chevron" :class="{ 'is-open': isOpen }" />
    </button>

    <div v-if="isOpen" ref="popupRef" class="editor-switcher__popup">
      <RouterLink to="/" class="editor-switcher__item" @click="close">
        <Home :size="15" />
        <span>Главная</span>
      </RouterLink>
      <div class="editor-switcher__divider" />
      <RouterLink
        v-for="editor in EDITORS"
        :key="editor.path"
        :to="editor.path"
        class="editor-switcher__item"
        :class="{ 'is-active': route.path === editor.path }"
        @click="close"
      >
        <component :is="editor.icon" :size="15" />
        <span>{{ editor.label }}</span>
      </RouterLink>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.editor-switcher {
  position: relative;
}

.editor-switcher__trigger {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  margin: 0 calc(var(--space-2) * -1);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: var(--color-bg-3);
  }
}

.editor-switcher__icon {
  font-size: 20px;
  color: var(--color-accent);
  line-height: 1;
}

.editor-switcher__text {
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  color: var(--color-accent);
}

.editor-switcher__chevron {
  color: var(--color-text-3);
  transition: transform var(--transition-fast);

  &.is-open {
    transform: rotate(180deg);
  }
}

.editor-switcher__popup {
  position: absolute;
  top: calc(100% + var(--space-2));
  left: calc(var(--space-2) * -1);
  z-index: 2000;
  width: 220px;
  padding: var(--space-2);
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-popup);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.editor-switcher__divider {
  height: 1px;
  background: var(--color-border);
  margin: var(--space-1) 0;
}

.editor-switcher__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-2);
  font-size: var(--text-sm);
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);

  &:hover {
    background-color: var(--color-bg-3);
    color: var(--color-text-1);
  }

  &.is-active {
    background-color: var(--color-accent-muted);
    color: var(--color-accent);
  }
}
</style>
