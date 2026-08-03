<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { User, Settings, FolderOpen, ShieldCheck } from 'lucide-vue-next'
import PageHeader from './PageHeader.vue'

// Каркас личных страниц аккаунта (профиль/настройки) - по мотивам настроек GitHub:
// шапка приложения, под ней центрированная колонка фиксированной ширины,
// внутри - «шапка аккаунта» (аватар + имя) и два столбца: вкладки слева, контент справа.
// Вкладки - обычные RouterLink'и (активный подсвечивается классом router-link-active),
// а не локальный стейт: профиль и настройки это разные маршруты, каждый со своим URL.
//
// shared остаётся листом графа: данные пользователя приходят пропами, а UserMenu
// (живёт в modules/auth) - слотом #user, который пробрасывается в PageHeader.
const props = defineProps({
  // Заголовок текущей страницы (над контентом)
  title: { type: String, required: true },
  username: { type: String, default: '' },
  avatarUrl: { type: String, default: null },
  // Пункт «Администрирование» показывается только администратору -
  // решение принимает страница (shared не знает про auth-стор)
  showAdmin: { type: Boolean, default: false },
})

// Аватар - presigned-ссылка MinIO с TTL 15 мин: если она протухла, страница
// сама решает, что делать (обычно authStore.refreshAvatarOnError).
defineEmits(['avatar-error'])

// Первая группа - про сам аккаунт, вторая - разделы, куда чаще всего уходят
// с этих страниц. Растёт добавлением пунктов, новых уровней навигации не нужно.
const groups = computed(() => [
  {
    items: [
      { to: '/profile', label: 'Профиль', icon: User },
      { to: '/settings', label: 'Настройки', icon: Settings },
    ],
  },
  {
    label: 'Разделы',
    items: [
      { to: '/projects', label: 'Проекты', icon: FolderOpen },
      ...(props.showAdmin
        ? [{ to: '/admin', label: 'Администрирование', icon: ShieldCheck }]
        : []),
    ],
  },
])
</script>

<template>
  <div class="account-layout">
    <PageHeader>
      <template #user><slot name="user" /></template>
    </PageHeader>

    <div class="account-shell">
      <header class="account-id">
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          alt=""
          class="account-id__avatar"
          @error="$emit('avatar-error')"
        />
        <span v-else class="account-id__avatar account-id__avatar--placeholder">
          <User :size="24" />
        </span>

        <div class="account-id__text">
          <p class="account-id__name">{{ username }}</p>
          <p class="account-id__note">Личный аккаунт</p>
        </div>
      </header>

      <div class="account-body">
        <nav class="account-nav">
          <div v-for="(group, i) in groups" :key="i" class="account-nav__group">
            <p v-if="group.label" class="account-nav__title">{{ group.label }}</p>
            <RouterLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="account-nav__item"
            >
              <component :is="item.icon" :size="16" />
              {{ item.label }}
            </RouterLink>
          </div>
        </nav>

        <main class="account-main">
          <h1 class="account-main__title">{{ title }}</h1>
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.account-layout {
  min-height: 100vh;
  background-color: var(--color-bg-1);
  display: flex;
  flex-direction: column;
}

// Центрированная колонка: сама страница остаётся во всю ширину экрана,
// содержимое прижато к центру и ограничено по ширине (как настройки GitHub).
.account-shell {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-6) var(--space-12);
}

.account-id {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.account-id__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--color-border-strong);
  flex-shrink: 0;

  &--placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-3);
    color: var(--color-text-3);
  }
}

.account-id__text {
  min-width: 0;
}

.account-id__name {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-id__note {
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.account-body {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: var(--space-8);
  padding-top: var(--space-6);
}

// Вкладки не уезжают при длинном контенте - прилипают к верху окна.
.account-nav {
  position: sticky;
  top: var(--space-6);
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.account-nav__group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.account-nav__title {
  padding: 0 var(--space-3) var(--space-1);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-3);
}

.account-nav__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-2);
  font-size: var(--text-sm);
  text-decoration: none;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);

  &:hover {
    background-color: var(--color-bg-3);
    color: var(--color-text-1);
  }

  // Активная вкладка - заливка + акцентная полоска слева (как в настройках GitHub)
  &.router-link-active {
    background-color: var(--color-accent-muted);
    color: var(--color-accent);
    font-weight: var(--weight-medium);

    &::before {
      content: '';
      position: absolute;
      left: -1px;
      top: 20%;
      bottom: 20%;
      width: 2px;
      border-radius: 1px;
      background-color: var(--color-accent);
    }
  }
}

.account-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.account-main__title {
  font-size: var(--text-xl);
  font-weight: var(--weight-semibold);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

// Узкий экран: вкладки становятся горизонтальным рядом над контентом.
@media (max-width: 860px) {
  .account-body {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }

  .account-nav {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .account-nav__group {
    flex-direction: row;
    gap: var(--space-2);
  }

  .account-nav__title {
    display: none;
  }
}
</style>
