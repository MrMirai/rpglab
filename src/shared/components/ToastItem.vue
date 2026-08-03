<script setup>
import { computed } from 'vue'
import { CircleCheck, Info, TriangleAlert, CircleAlert, X } from 'lucide-vue-next'

// Одно уведомление - чистая презентация: иконка по типу, текст, крестик.
// Ни таймеров, ни очереди: этим заведует useToast, сюда приходят готовые props.
const props = defineProps({
  type: { type: String, default: 'info' }, // success | info | warning | error
  title: { type: String, default: '' },
  message: { type: String, required: true },
  // Сколько уведомление проживёт (мс); 0 - до закрытия крестиком
  duration: { type: Number, default: 0 },
  // Отсчёт на паузе (курсор над карточкой) - замирает и полоса
  paused: { type: Boolean, default: false },
})

defineEmits(['close'])

const ICONS = {
  success: CircleCheck,
  info: Info,
  warning: TriangleAlert,
  error: CircleAlert,
}

const icon = computed(() => ICONS[props.type] || Info)

// Ошибку читалки экрана должны объявить немедленно, остальное - не перебивая
// пользователя (это же различие даёт роль alert против status).
const isAlert = computed(() => props.type === 'error' || props.type === 'warning')

// Длительность угасания полосы = времени жизни уведомления, поэтому задаётся
// инлайном (в CSS его знать неоткуда). Пауза - тем же play-state, что и таймер.
const stripeStyle = computed(() =>
  props.duration > 0
    ? {
        animationDuration: `${props.duration}ms`,
        animationPlayState: props.paused ? 'paused' : 'running',
      }
    : null,
)
</script>

<template>
  <div
    class="toast"
    :class="`toast--${type}`"
    :role="isAlert ? 'alert' : 'status'"
    :aria-live="isAlert ? 'assertive' : 'polite'"
  >
    <!-- Полоса по верхнему краю: пока идёт отсчёт, гаснет с обоих концов к центру.
         Без таймера (duration: 0) просто висит на всю ширину. -->
    <span
      class="toast__stripe"
      :class="{ 'toast__stripe--static': duration <= 0 }"
      :style="stripeStyle"
    />

    <component :is="icon" :size="18" class="toast__icon" />

    <div class="toast__body">
      <span v-if="title" class="toast__title">{{ title }}</span>
      <span class="toast__message">{{ message }}</span>
    </div>

    <button class="toast__close" type="button" aria-label="Закрыть" @click="$emit('close')">
      <X :size="16" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  min-width: 280px;
  max-width: 440px;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-popup);
  overflow: hidden;
  pointer-events: auto;

  &--success {
    --toast-color: var(--color-success);
  }
  &--info {
    --toast-color: var(--color-info);
  }
  &--warning {
    --toast-color: var(--color-warning);
  }
  &--error {
    --toast-color: var(--color-danger);
  }

  // Цветная полоса по верхнему краю - маркер типа уведомления и одновременно
  // индикатор оставшегося времени. Цвет даёт модификатор через --toast-color.
  // Мягкие концы - в самом градиенте фона (полоса всегда «утекает» в углы),
  // а угасание к центру делает маска: её прозрачные края съезжают от углов
  // к середине, поэтому полоса не «уползает» и не сжимается, а именно гаснет
  // с обоих концов. Ширина/позиция при этом не трогаются вовсе.
  &__stripe {
    position: absolute;
    inset: 0 0 auto 0;
    height: 2px;
    background: linear-gradient(
      to right,
      transparent 0%,
      var(--toast-color) 14%,
      var(--toast-color) 86%,
      transparent 100%
    );
    // -webkit-префикс вручную: автопрефиксера в проекте нет, а Safari до 15.4
    // и старые Chromium знают маску только под ним
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0%,
      #000 var(--toast-fade),
      #000 calc(100% - var(--toast-fade)),
      transparent 100%
    );
    mask-image: linear-gradient(
      to right,
      transparent 0%,
      #000 var(--toast-fade),
      #000 calc(100% - var(--toast-fade)),
      transparent 100%
    );
    animation-name: toast-stripe-fade;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
  }

  // Уведомление без автозакрытия: отсчитывать нечего - полоса просто на месте
  &__stripe--static {
    -webkit-mask-image: none;
    mask-image: none;
    animation: none;
  }

  &__icon {
    flex-shrink: 0;
    margin-top: 1px;
    color: var(--toast-color);
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-1);
  }

  &__message {
    font-size: var(--text-sm);
    line-height: var(--leading-normal);
    color: var(--color-text-1);
    overflow-wrap: anywhere;
  }

  &__close {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    margin: -2px -4px 0 0;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-3);
    cursor: pointer;
    transition:
      color var(--transition-fast),
      background-color var(--transition-fast);

    &:hover {
      color: var(--color-text-1);
      background: rgba(255, 255, 255, 0.06);
    }
  }
}

// Процент в маске нужно анимировать, а обычные кастомные свойства не
// интерполируются - регистрируем тип через @property (это глобальное правило,
// scoped-стиль его не ограничивает, поэтому имя специфичное).
@property --toast-fade {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 0%;
}

@keyframes toast-stripe-fade {
  0% {
    --toast-fade: 0%;
    opacity: 1;
  }
  // Хвост угасания: остаток полосы у центра уходит в ноль к концу отсчёта,
  // иначе на середине маски навсегда оставался бы светлый клочок.
  70% {
    opacity: 1;
  }
  100% {
    --toast-fade: 50%;
    opacity: 0;
  }
}
</style>
