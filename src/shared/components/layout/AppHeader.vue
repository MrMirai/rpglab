<script setup>
import { useRouter, useRoute } from 'vue-router'
import { Save } from 'lucide-vue-next'
import BaseButton from '@/shared/components/BaseButton.vue'
import LogoIcon from '@/shared/components/LogoIcon.vue'

// Общий каркас шапки: логотип + постоянное действие «Сохранить».
// «Проекты» переехали в дропдаун аватара (UserMenu, слот user).
// Специфичный для редактора инструментарий и действия приходят через слоты,
// чтобы шапку могли переиспользовать разные редакторы (токены, раздатки).
// Флаг авторизации приходит пропом (а не импортом модуля auth), чтобы
// shared-оболочка оставалась листом графа зависимостей.
const props = defineProps({
  isAuthenticated: { type: Boolean, default: false },
  // Сохранение идёт прямо сейчас (заливка ассетов + запрос) - кнопка блокируется.
  saving: { type: Boolean, default: false },
  // Есть несохранённые изменения - помечаем точкой у названия действия.
  dirty: { type: Boolean, default: false },
})

// Что именно значит «сохранить», знает вид конкретного редактора: у токенов и
// раздаток разный формат проекта. Оболочка только даёт кнопку и берёт на себя
// общую для всех редакторов часть - гостя без аккаунта сохранять не пускаем.
const emit = defineEmits(['save'])

const router = useRouter()
const route = useRoute()

// Сохранение проектов требует аккаунта: гостя ведём на логин,
// запомнив текущую страницу для возврата после входа.
function onSave() {
  if (!props.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  emit('save')
}
</script>

<template>
  <header class="app-header">
    <div class="logo">
      <!-- Слот под переключатель редакторов (планируется выпадающий список) -->
      <slot name="logo">
        <LogoIcon :size="22" class="logo-icon" />
        <span class="logo-text">RPGLab</span>
      </slot>
    </div>

    <nav class="toolbar">
      <slot name="toolbar" />
    </nav>

    <div class="actions">
      <!-- Действия конкретного редактора (например, Экспорт) -->
      <slot name="actions" />
      <BaseButton
        variant="accent"
        size="sm"
        class="header-btn"
        :disabled="saving"
        :title="isAuthenticated ? 'Сохранить проект' : 'Войдите, чтобы сохранять проекты'"
        @click="onSave"
      >
        <Save :size="16" />
        <span>{{ saving ? 'Сохранение...' : 'Сохранить' }}</span>
        <span v-if="dirty && !saving" class="dirty-dot" title="Есть несохранённые изменения" />
      </BaseButton>
      <!-- Блок пользователя (модуль auth даёт содержимое через слот) -->
      <slot name="user" />
    </div>
  </header>
</template>

<style lang="scss" scoped>
.app-header {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  gap: var(--space-4);
  background-color: var(--color-bg-2);
  border-bottom: 1px solid var(--color-border);
  user-select: none;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;

  &-icon {
    color: var(--color-accent);
  }

  &-text {
    font-size: var(--text-md);
    font-weight: var(--weight-semibold);
    color: var(--color-accent);
  }
}

// Контейнер под инструментарий редактора (наполняется через слот toolbar)
.toolbar {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-shrink: 0;
}

// Компактная высота (size=sm), но читаемый текст шапки - крупнее чем в панелях свойств
.header-btn {
  font-size: var(--text-sm);
}

// Точка «есть несохранённые изменения» - у текста кнопки, без сдвига раскладки.
.dirty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.7;
}
</style>
