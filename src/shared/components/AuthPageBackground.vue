<script setup>
import { RouterLink } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

// Общий фон для страниц логина/регистрации: сплошной тёмный фон +
// декоративный контур d20 (икосаэдр) тонкими янтарными линиями по центру —
// тематика НРИ вместо логотипа соцсети.
// Контент (карточка формы) приходит через default-слот.
// Ссылка «На главную» — единственный способ вернуться со страниц логина/
// регистрации (у них нет своей шапки).
</script>

<template>
  <div class="auth-bg">
    <!--
      d20 (икосаэдр остриём вверх): внешний шестиугольник + центральная
      грань-треугольник, от углов которого линии расходятся к вершинам
      шестиугольника. Координаты вокруг центра 256,256.
    -->
    <svg class="auth-bg__d20" viewBox="0 0 512 512" aria-hidden="true">
      <g fill="none" stroke="currentColor" stroke-width="0.75" stroke-linecap="round" stroke-linejoin="round">
        <!-- Внешний шестиугольник (вершина сверху) -->
        <polygon points="256,28 453,142 453,370 256,484 59,370 59,142" />

        <!-- Центральная грань-треугольник -->
        <polygon points="256,164 336,302 176,302" />

        <!-- Рёбра от углов центральной грани к вершинам шестиугольника -->
        <line x1="256" y1="28" x2="256" y2="164" />
        <line x1="453" y1="370" x2="336" y2="302" />
        <line x1="59" y1="370" x2="176" y2="302" />
        <line x1="453" y1="142" x2="256" y2="164" />
        <line x1="453" y1="142" x2="336" y2="302" />
        <line x1="59" y1="142" x2="256" y2="164" />
        <line x1="59" y1="142" x2="176" y2="302" />
        <line x1="256" y1="484" x2="336" y2="302" />
        <line x1="256" y1="484" x2="176" y2="302" />
      </g>
    </svg>

    <RouterLink to="/" class="auth-bg__back">
      <ArrowLeft :size="16" />
      <span>На главную</span>
    </RouterLink>

    <div class="auth-bg__content">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.auth-bg {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-1);
  overflow: hidden;
}

// Крупный d20 по центру — настолько большой, что сверху и снизу выходит
// за границы экрана (как декоративный узор выходит за края у VK ID).
.auth-bg__d20 {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 130vh;
  height: 130vh;
  transform: translate(-50%, -50%);
  color: var(--color-accent);
  opacity: 0.16;
  pointer-events: none;
}

.auth-bg__content {
  position: relative;
  z-index: 1;
  max-height: 100%;
  overflow-y: auto;
}

.auth-bg__back {
  position: absolute;
  top: var(--space-6);
  left: var(--space-6);
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-2);
  text-decoration: none;
  transition: color var(--transition-fast);

  &:hover {
    color: var(--color-accent);
  }
}
</style>
