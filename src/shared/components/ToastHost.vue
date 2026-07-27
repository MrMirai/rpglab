<script setup>
import { useToast } from '@/shared/composables/useToast'
import ToastItem from './ToastItem.vue'

// Единственная точка рендера очереди уведомлений — монтируется один раз в App.vue.
// Teleport to body: хост не должен зависеть от того, в каком лэйауте сейчас
// приложение (у редакторов свои overflow/transform-контексты, которые сломали бы
// position: fixed вложенного элемента).
// Разбираем на переменные: toasts — ref, в шаблоне он автоматически разворачивается
// только как биндинг верхнего уровня (через toast.toasts пришлось бы писать .value).
const { toasts, dismiss, pause, resume } = useToast()
</script>

<template>
  <Teleport to="body">
    <!-- Контейнер прозрачен для мыши, чтобы не перехватывать клики по холсту;
         клики ловят сами карточки (pointer-events: auto в ToastItem). -->
    <TransitionGroup name="toast" tag="div" class="toast-host">
      <ToastItem
        v-for="item in toasts"
        :key="item.id"
        :type="item.type"
        :title="item.title"
        :message="item.message"
        :duration="item.duration"
        :paused="item.paused"
        @close="dismiss(item.id)"
        @mouseenter="pause(item.id)"
        @mouseleave="resume(item.id)"
      />
    </TransitionGroup>
  </Teleport>
</template>

<style lang="scss" scoped>
.toast-host {
  position: fixed;
  left: 50%;
  // Отступ сверху = высота самой высокой шапки (PageHeader 64px; у редакторов
  // AppHeader 48px) + зазор: уведомление не должно накрывать шапку — в редакторе
  // по её центру стоит тулбар, и кликать по нему нужно в том числе с тостом на экране.
  top: calc(64px + var(--space-3));
  transform: translateX(-50%);
  z-index: 2000; // выше модалок (1000) — уведомление об ошибке нужно видеть и поверх них
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  pointer-events: none;
}

// Появление сверху вниз; move подтягивает соседей, когда карточка уходит
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--transition-normal),
    transform var(--transition-normal);
}

.toast-move {
  transition: transform var(--transition-normal);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
