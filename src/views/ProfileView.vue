<script setup>
import { computed } from 'vue'
import { ShieldCheck } from 'lucide-vue-next'
import { useAuthStore, UserMenu } from '@/modules/auth'
import AccountLayout from '@/shared/components/layout/AccountLayout.vue'
import AccountCard from '@/shared/components/AccountCard.vue'

// Профиль - только чтение: сменить username/email бэкенд не поддерживает,
// изменяемое (аватар, пароль) живёт во вкладке «Настройки».
const auth = useAuthStore()

const planLabels = {
  free: 'Бесплатный',
  monthly: 'Помесячная подписка',
  yearly: 'Годовая подписка',
}

const periodLabels = {
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
}

const planLabel = computed(
  () => planLabels[auth.user?.planCode] || auth.user?.planCode || '—',
)

// Даты приходят в ISO (UTC) - показываем в локали пользователя без времени.
function formatDate(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <AccountLayout
    title="Профиль"
    :username="auth.user?.username"
    :avatar-url="auth.user?.avatarUrl"
    :show-admin="auth.isAdmin"
    @avatar-error="auth.refreshAvatarOnError"
  >
    <template #user><UserMenu /></template>

    <AccountCard
      title="Основное"
      description="Имя пользователя меняется во вкладке «Настройки». Email задан при регистрации и не меняется."
    >
      <dl class="profile-fields">
        <div class="profile-field">
          <dt>Имя пользователя</dt>
          <dd>{{ auth.user?.username || '—' }}</dd>
        </div>
        <div class="profile-field">
          <dt>Email</dt>
          <dd>{{ auth.user?.email || '—' }}</dd>
        </div>
        <div class="profile-field">
          <dt>Аккаунт создан</dt>
          <dd>{{ formatDate(auth.user?.createdAt) }}</dd>
        </div>
        <div v-if="auth.isAdmin" class="profile-field">
          <dt>Роль</dt>
          <dd>
            <span class="profile-badge"><ShieldCheck :size="13" /> Администратор</span>
          </dd>
        </div>
      </dl>
    </AccountCard>

    <AccountCard title="Подписка">
      <dl class="profile-fields">
        <div class="profile-field">
          <dt>Тариф</dt>
          <dd>{{ planLabel }}</dd>
        </div>
        <!-- Период и дата окончания есть только у платных тарифов (у free - null) -->
        <div v-if="auth.user?.billingPeriod" class="profile-field">
          <dt>Период оплаты</dt>
          <dd>{{ periodLabels[auth.user.billingPeriod] || auth.user.billingPeriod }}</dd>
        </div>
        <div v-if="auth.user?.subscriptionExpiresAt" class="profile-field">
          <dt>Действует до</dt>
          <dd>{{ formatDate(auth.user.subscriptionExpiresAt) }}</dd>
        </div>
      </dl>
    </AccountCard>
  </AccountLayout>
</template>

<style lang="scss" scoped>
.profile-fields {
  display: flex;
  flex-direction: column;
}

// Строка «подпись - значение»: подпись фиксированной ширины слева,
// разделители между строками (кроме последней).
.profile-field {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);

  &:first-child {
    padding-top: 0;
  }

  &:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }

  dt {
    font-size: var(--text-sm);
    color: var(--color-text-3);
  }

  dd {
    font-size: var(--text-sm);
    color: var(--color-text-1);
    min-width: 0;
    overflow-wrap: anywhere;
  }
}

.profile-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-accent);
  background: var(--color-accent-muted);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
}

@media (max-width: 640px) {
  .profile-field {
    grid-template-columns: 1fr;
    gap: var(--space-1);
  }
}
</style>
