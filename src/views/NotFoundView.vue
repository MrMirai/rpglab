<script setup>
import { Compass } from 'lucide-vue-next'
import { UserMenu } from '@/modules/auth'
import PageHeader from '@/shared/components/layout/PageHeader.vue'

// Заглушка для несуществующих маршрутов (catch-all в router/index.js): без неё
// RouterView не рендерил ничего — пустой белый экран и варнинг «No match found».
// Экран чисто информационный, без действий: вернуться можно логотипом в шапке.
// Своя лёгкая шапка, как на главной (AppLayout заточен под canvas-редактор).
</script>

<template>
  <div class="not-found">
    <PageHeader>
      <template #user><UserMenu /></template>
    </PageHeader>

    <main class="not-found__content">
      <div class="not-found__icon">
        <Compass :size="40" />
      </div>
      <p class="not-found__code">404</p>
      <h1 class="not-found__title">Такой страницы нет</h1>
      <p class="not-found__text">Возможно, ссылка устарела или в ней опечатка.</p>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-1);
}

.not-found__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
  padding: var(--space-16) var(--space-8);
}

.not-found__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-lg);
  background-color: var(--color-accent-muted);
  color: var(--color-accent);
  margin-bottom: var(--space-2);
}

.not-found__code {
  font-size: var(--text-sm);
  font-family: var(--font-mono);
  letter-spacing: 0.2em;
  color: var(--color-text-3);
}

.not-found__title {
  font-size: 28px;
}

.not-found__text {
  max-width: 480px;
  font-size: var(--text-sm);
}
</style>
