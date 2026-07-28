<script setup>
// Карточка-секция страниц аккаунта (профиль/настройки): заголовок, необязательное
// пояснение и содержимое. Чистая презентация — вся логика у родителя.
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  // «Опасная зона» — необратимые действия (удаление аккаунта): красная рамка
  // и красный заголовок, чтобы секция читалась иначе, чем обычные настройки.
  danger: { type: Boolean, default: false },
})
</script>

<template>
  <section class="account-card" :class="{ 'account-card--danger': danger }">
    <header class="account-card__head">
      <h2 class="account-card__title">{{ title }}</h2>
      <p v-if="description" class="account-card__desc">{{ description }}</p>
    </header>

    <slot />
  </section>
</template>

<style lang="scss" scoped>
.account-card {
  padding: var(--space-5) var(--space-6) var(--space-6);
  background-color: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);

  &--danger {
    border-color: var(--color-danger);

    .account-card__title {
      color: var(--color-danger);
    }
  }
}

.account-card__head {
  margin-bottom: var(--space-4);
}

.account-card__title {
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-1);
}

.account-card__desc {
  margin-top: var(--space-1);
  font-size: var(--text-sm);
  color: var(--color-text-3);
  line-height: var(--leading-normal);
}
</style>
