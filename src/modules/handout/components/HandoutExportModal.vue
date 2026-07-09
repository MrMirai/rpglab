<script setup>
import { ref } from 'vue'
import { X, Download } from 'lucide-vue-next'
import BaseButton from '@/shared/components/BaseButton.vue'
import { useHandoutStore } from '../store'
import { useHandoutBridge } from '../composables/useHandoutBridge'
import { useHandoutExport } from '../composables/useHandoutExport'

// Модалка экспорта раздатки: PNG / WebP / PDF, пресеты разрешения.
const store = useHandoutStore()
const bridge = useHandoutBridge()
const { exportPng, exportWebp, exportPdf } = useHandoutExport()

const DPI_PRESETS = [
  { value: 72, label: '72 dpi — экран' },
  { value: 150, label: '150 dpi' },
  { value: 300, label: '300 dpi — печать' },
]

const dpi = ref(150)
const filename = ref('handout')
const isExporting = ref(false)
const error = ref('')

async function doExport(format) {
  if (isExporting.value) return
  const { stage, uiLayer } = bridge.getStageForExport() || {}
  if (!stage) return
  isExporting.value = true
  error.value = ''
  try {
    const name = filename.value.trim() || 'handout'
    if (format === 'png') exportPng(stage, uiLayer, store.document, dpi.value, name)
    else if (format === 'webp') exportWebp(stage, uiLayer, store.document, dpi.value, name)
    else if (format === 'pdf') await exportPdf(stage, uiLayer, store.document, dpi.value, name)
  } catch (e) {
    error.value = e.message || 'Не удалось экспортировать'
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
          <span class="modal__title">Экспорт раздатки</span>
          <BaseButton square danger-hover @click="store.closeExportModal()">
            <X :size="18" />
          </BaseButton>
        </div>

        <div class="modal__body">
          <div class="modal__section">
            <label class="modal__label">Название файла</label>
            <input v-model="filename" type="text" class="name-input" placeholder="handout" />
          </div>

          <div class="modal__section">
            <div class="modal__label">Разрешение</div>
            <div class="dpi-row">
              <BaseButton
                v-for="p in DPI_PRESETS"
                :key="p.value"
                size="sm" full-width
                :active="dpi === p.value"
                @click="dpi = p.value"
              >
                {{ p.label }}
              </BaseButton>
            </div>
          </div>

          <div class="modal__section">
            <div class="modal__label">Формат</div>
            <div class="modal__actions">
              <BaseButton full-width :disabled="isExporting" @click="doExport('png')">
                <Download :size="14" /> PNG
              </BaseButton>
              <BaseButton full-width :disabled="isExporting" @click="doExport('webp')">
                <Download :size="14" /> WebP
              </BaseButton>
              <BaseButton full-width :disabled="isExporting" @click="doExport('pdf')">
                <Download :size="14" /> PDF
              </BaseButton>
            </div>
          </div>

          <p class="modal__hint">
            Итоговый размер: {{ Math.round(store.document.width * dpi / 96) }}×{{ Math.round(store.document.height * dpi / 96) }}px
          </p>
          <p v-if="error" class="modal__error">{{ error }}</p>
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
  width: 400px;
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

  &__actions {
    display: flex;
    gap: var(--space-2);
  }

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-3);
  }

  &__error {
    font-size: var(--text-xs);
    color: var(--color-danger);
  }

  &__status {
    font-size: var(--text-xs);
    color: var(--color-accent);
    text-align: center;
  }
}

.dpi-row {
  display: flex;
  gap: var(--space-1);
}

.name-input {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-1);
  color: var(--color-text-1);
  font-family: inherit;
  outline: none;
  transition: border-color var(--transition-fast);

  &:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px var(--color-accent-muted);
  }
}
</style>
