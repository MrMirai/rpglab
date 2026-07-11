<script setup>
import { RouterLink } from 'vue-router'
import { Layers, FileText, ArrowRight } from 'lucide-vue-next'
import { UserMenu, useAuthStore } from '@/modules/auth'

// Главная страница: рассказывает о сервисе и ведёт в редакторы.
// Собственная лёгкая шапка (не AppLayout — тот заточен под canvas-редактор
// с сайдбаром/properties-панелью, тут обычный лендинг).
const auth = useAuthStore()

const EDITORS = [
  {
    path: '/editor/token',
    icon: Layers,
    title: 'Редактор токенов',
    description:
      'Создавайте токены персонажей для НРИ с эффектом "вылезания" за рамку — персонаж выходит за пределы токена, создавая объёмный портретный эффект.',
    status: 'available',
  },
  {
    path: '/editor/handout',
    icon: FileText,
    title: 'Редактор раздаток',
    description:
      'Собирайте раздаточные материалы для игроков: текст, изображения и фигуры на документе произвольного размера с полным контролем оформления.',
    status: 'available',
  },
]
</script>

<template>
  <div class="home">
    <header class="home-header">
      <div class="home-header__logo">
        <span class="logo-icon">◎</span>
        <span class="logo-text">RPGLab</span>
      </div>
      <UserMenu />
    </header>

    <main class="home-content">
      <section class="hero">
        <h1>Набор редакторов для настольных ролевых игр</h1>
        <p class="hero-subtitle">
          RPGLab — инструменты для создания материалов к вашим НРИ-партиям: токены персонажей
          с эффектом объёма и раздаточные материалы для игроков. Работает прямо в браузере,
          без установки.
        </p>
      </section>

      <section class="editors">
        <RouterLink
          v-for="editor in EDITORS"
          :key="editor.path"
          :to="editor.path"
          class="editor-card"
        >
          <div class="editor-card__icon">
            <component :is="editor.icon" :size="28" />
          </div>
          <h2>{{ editor.title }}</h2>
          <p>{{ editor.description }}</p>
          <span class="editor-card__cta">
            Открыть редактор
            <ArrowRight :size="16" />
          </span>
        </RouterLink>
      </section>

      <section v-if="!auth.isAuthenticated" class="account-note">
        <p>
          Редакторы доступны без регистрации. Аккаунт понадобится только для сохранения
          проектов и загрузки собственных рамок —
          <RouterLink to="/register">зарегистрируйтесь</RouterLink>
          или
          <RouterLink to="/login">войдите</RouterLink>, если он уже есть.
        </p>
      </section>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-1);
}

.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  flex-shrink: 0;
  padding: 0 var(--space-8);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-2);
}

.home-header__logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);

  .logo-icon {
    font-size: 22px;
    color: var(--color-accent);
    line-height: 1;
  }

  .logo-text {
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
    color: var(--color-accent);
  }
}

.home-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-12);
  padding: var(--space-16) var(--space-8);
}

.hero {
  max-width: 640px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  h1 {
    font-size: 32px;
  }
}

.hero-subtitle {
  font-size: var(--text-md);
}

.editors {
  width: 100%;
  max-width: 960px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-6);
}

.editor-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-6);
  background-color: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition:
    border-color var(--transition-normal),
    transform var(--transition-normal);

  &:hover {
    border-color: var(--color-accent);
    transform: translateY(-2px);

    .editor-card__cta {
      color: var(--color-accent-hover);
    }
  }

  h2 {
    color: var(--color-text-1);
  }

  p {
    flex: 1;
  }
}

.editor-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background-color: var(--color-accent-muted);
  color: var(--color-accent);
}

.editor-card__cta {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-accent);
  transition: color var(--transition-fast);
}

.account-note {
  max-width: 640px;
  text-align: center;

  p {
    font-size: var(--text-sm);
  }
}
</style>
