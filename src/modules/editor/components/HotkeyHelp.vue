<script setup>
import { ref, computed } from 'vue'
import { Keyboard, ChevronDown, MouseLeft, Mouse } from 'lucide-vue-next'

const props = defineProps({
  tool: { type: String, default: 'move' },
})

const open = ref(false)

// Заголовок активного инструмента
const toolLabel = computed(() => {
  switch (props.tool) {
    case 'move': return 'Двигать'
    case 'erase': return 'Стереть'
    case 'restore': return 'Восстановить'
    case 'hand': return 'Рука'
    default: return ''
  }
})

// Токены-действия. type: 'key' — клавиша (текст в <kbd>),
// 'drag' — перетаскивание (ЛКМ), 'wheel' — колёсико мыши.
const DRAG = { type: 'drag' }
const WHEEL = { type: 'wheel' }
const key = (label) => ({ type: 'key', label })

// Подсказки, специфичные для активного инструмента
const toolHints = computed(() => {
  switch (props.tool) {
    case 'move':
      return [
        { tokens: [DRAG], desc: 'двигать персонажа' },
        { tokens: [WHEEL], desc: 'масштаб персонажа' },
        { tokens: [key('Ctrl'), WHEEL], desc: 'зум вьюпорта' },
      ]
    case 'erase':
    case 'restore':
      return [
        { tokens: [DRAG], desc: 'рисовать кистью' },
        { tokens: [key('Ctrl'), WHEEL], desc: 'размер кисти' },
        { tokens: [key('Shift'), WHEEL], desc: 'жёсткость кисти' },
      ]
    case 'hand':
      return [
        { tokens: [DRAG], desc: 'панорама холста' },
        { tokens: [WHEEL], desc: 'зум вьюпорта' },
      ]
    default:
      return []
  }
})

// Общие подсказки, работающие при любом инструменте
const globalHints = [
  { tokens: [key('Пробел'), DRAG], desc: 'панорама холста' },
  { tokens: [key('Пробел'), WHEEL], desc: 'зум вьюпорта' },
  { tokens: [key('Ctrl'), key('Z')], desc: 'отменить' },
  { tokens: [key('Ctrl'), key('Y')], desc: 'повторить' },
]
</script>

<template>
  <div :class="['hotkey-help', { 'hotkey-help--open': open }]">
    <button class="hotkey-help__toggle" @click="open = !open">
      <Keyboard :size="14" />
      <span class="hotkey-help__toggle-label">Горячие клавиши</span>
      <ChevronDown :size="14" class="hotkey-help__chevron" />
    </button>

    <div v-if="open" class="hotkey-help__panel">
      <div
        v-for="(group, gi) in [{ title: toolLabel, hints: toolHints }, { title: 'Общие', hints: globalHints }]"
        :key="gi"
        class="hotkey-help__group"
      >
        <div class="hotkey-help__group-title">{{ group.title }}</div>
        <div v-for="(hint, i) in group.hints" :key="i" class="hotkey-help__row">
          <span class="hotkey-help__keys">
            <template v-for="(t, ti) in hint.tokens" :key="ti">
              <kbd v-if="t.type === 'key'" class="hotkey-help__key">{{ t.label }}</kbd>
              <span v-else class="hotkey-help__mouse">
                <MouseLeft v-if="t.type === 'drag'" :size="15" />
                <Mouse v-else-if="t.type === 'wheel'" :size="15" />
              </span>
              <span v-if="ti < hint.tokens.length - 1" class="hotkey-help__plus">+</span>
            </template>
          </span>
          <span class="hotkey-help__desc">{{ hint.desc }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.hotkey-help {
  position: absolute;
  left: var(--space-3);
  bottom: var(--space-3);
  z-index: 10;
  user-select: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);

  &__toggle {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg-2);
    color: var(--color-text-2);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }
  }

  // Панель раскрыта — стрелка повёрнута
  &--open &__chevron {
    transform: rotate(180deg);
  }

  &__chevron {
    transition: transform var(--transition-fast);
    color: var(--color-text-3);
  }

  &__panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--color-bg-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    min-width: 220px;
  }

  &__group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  &__group-title {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-accent);
    margin-bottom: var(--space-1);
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  &__keys {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  &__key {
    display: inline-block;
    padding: 2px 6px;
    font-size: 11px;
    font-family: inherit;
    line-height: 1.2;
    color: var(--color-text-1);
    background: var(--color-bg-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    white-space: nowrap;
  }

  // Иконка мыши — выровнена по центру строки клавиш
  &__mouse {
    display: inline-flex;
    align-items: center;
    color: var(--color-text-1);
  }

  &__plus {
    font-size: 10px;
    color: var(--color-text-3);
  }

  &__desc {
    font-size: var(--text-xs);
    color: var(--color-text-3);
    text-align: right;
  }
}
</style>
