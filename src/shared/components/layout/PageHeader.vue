<script setup>
import { RouterLink } from 'vue-router'
import LogoIcon from '@/shared/components/LogoIcon.vue'

// Единая шапка для НЕ-редакторных страниц (профиль, настройки, проекты, админка) —
// той же высоты, что на главной: логотип-ссылка на главную слева, действия по центру
// и блок пользователя (аватар-меню) справа.
// shared остаётся листом графа: UserMenu живёт в modules/auth, поэтому приходит
// сюда через слот #user (страница сама кладёт <UserMenu />), а не импортом.
// Слот по умолчанию — произвольные действия/кнопки между лого и пользователем.
</script>

<template>
  <header class="page-header">
    <RouterLink to="/" class="page-header__logo">
      <LogoIcon :size="26" class="page-header__logo-icon" />
      <span class="page-header__logo-text">RPGLab</span>
    </RouterLink>

    <div class="page-header__actions">
      <slot />
      <slot name="user" />
    </div>
  </header>
</template>

<style lang="scss" scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  flex-shrink: 0;
  padding: 0 var(--space-8);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-2);
}

.page-header__logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;

  .page-header__logo-icon {
    color: var(--color-accent);
  }

  .page-header__logo-text {
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
    color: var(--color-accent);
  }
}

.page-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
</style>
