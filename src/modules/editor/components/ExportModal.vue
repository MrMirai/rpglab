<script setup>
import { ref, computed } from 'vue'
import { X, Download, AlertTriangle } from 'lucide-vue-next'
import { useEditorStore } from '../store'
import { useExport } from '../composables/useExport'
import { useBrushMask } from '../composables/useBrushMask'
import BaseButton from '@/shared/components/BaseButton.vue'

const store = useEditorStore()
const { exportToken, downloadCanvas, calcExportSize } = useExport()
const { brushCanvas, brushVersion } = useBrushMask()

const sizes = [256, 512, 1024, 2048]
const exportSize = ref(512)
const tokenName = ref('token')
const isExporting = ref(false)

const exportInfo = computed(() => {
  if (!store.isReady) return null
  const pixelSize = calcExportSize(store, exportSize.value, brushCanvas, brushVersion.value)
  // Персонаж выходит за границу клетки рамки — итоговый размер больше выбранного
  const oversized = pixelSize > exportSize.value
  return { pixelSize, oversized }
})

async function doExport(mode, format = 'png') {
  if (isExporting.value) return
  isExporting.value = true
  try {
    const canvas = await exportToken(store, brushCanvas, {
      size: exportSize.value,
      mode,
      brushVersion: brushVersion.value,
    })
    const suffix = mode === 'char-only' ? 'char' : 'token'
    const filename = tokenName.value || 'token'
    downloadCanvas(canvas, `${filename}_${suffix}_${exportSize.value}`, format)
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="store.exportModalOpen" class="modal-overlay" @click.self="store.closeExportModal()">
      <div class="modal">
        <div class="modal__header">
          <span class="modal__title">Экспорт токена</span>
          <BaseButton square danger-hover @click="store.closeExportModal()">
            <X :size="18" />
          </BaseButton>
        </div>

        <div class="modal__body">
          <!-- Название токена -->
          <div class="modal__section">
            <label class="modal__label">Название</label>
            <input
              v-model="tokenName"
              type="text"
              class="token-name-input"
              placeholder="Введите название токена"
              @keydown.enter.prevent
            />
          </div>

          <!-- Размер -->
          <div class="modal__section">
            <div class="modal__label">Размер</div>
            <div class="size-grid">
              <BaseButton
                v-for="s in sizes"
                :key="s"
                size="sm"
                :active="exportSize === s"
                @click="exportSize = s"
              >
                {{ s }}×{{ s }}
              </BaseButton>
            </div>
          </div>

          <!-- Полный токен -->
          <div class="modal__section">
            <div class="modal__section-title">Полный токен</div>
            <p class="modal__hint">Полный токен с рамкой и фоном</p>
            <div class="modal__actions">
              <BaseButton full-width :disabled="isExporting" @click="doExport('full', 'png')">
                <Download :size="14" /> PNG
              </BaseButton>
              <BaseButton full-width :disabled="isExporting" @click="doExport('full', 'webp')">
                <Download :size="14" /> WebP
              </BaseButton>
            </div>
          </div>

          <!-- Персонаж без рамки -->
          <div class="modal__section">
            <div class="modal__section-title">Персонаж без рамки</div>
            <p class="modal__hint">
              Обрезан по форме токена, без рамки.<br />
              Подойдет для Foundry VTT с Динамическим кольцом.
            </p>
            <div class="modal__actions">
              <BaseButton full-width :disabled="isExporting" @click="doExport('char-only', 'png')">
                <Download :size="14" /> PNG
              </BaseButton>
              <BaseButton full-width :disabled="isExporting" @click="doExport('char-only', 'webp')">
                <Download :size="14" /> WebP
              </BaseButton>
            </div>
          </div>

          <div v-if="exportInfo?.oversized" class="modal__warning">
            <AlertTriangle :size="16" class="modal__warning-icon" />
            <span>
              Персонаж выходит за границу клетки — итоговое изображение будет больше выбранного
              размера ({{ exportInfo.pixelSize }}×{{ exportInfo.pixelSize }}px).
            </span>
          </div>

          <p v-if="isExporting" class="modal__status">Генерация…</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-xl);
  width: 420px;
  max-width: 90vw;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--color-border);
  }

  &__title {
    font-size: var(--text-md);
    font-weight: var(--weight-semibold);
    color: var(--color-text-1);
  }

  &__body {
    padding: var(--space-4) var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__label {
    font-size: var(--text-xs);
    color: var(--color-text-2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__section-title {
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--color-text-1);
  }

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-3);
    line-height: 1.6;
  }

  &__actions {
    display: flex;
    gap: var(--space-2);
  }

  &__status {
    font-size: var(--text-xs);
    color: var(--color-accent);
    text-align: center;
  }

  &__warning {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
    line-height: 1.5;
    color: var(--color-accent);
    background: var(--color-accent-muted);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-md);
  }

  &__warning-icon {
    flex-shrink: 0;
    margin-top: 1px;
  }
}

.size-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-1);
}

.token-name-input {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-1);
  color: var(--color-text-1);
  font-family: inherit;
  transition: all var(--transition-fast);

  &::placeholder {
    color: var(--color-text-3);
  }

  &:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px var(--color-accent-muted);
  }
}
</style>
