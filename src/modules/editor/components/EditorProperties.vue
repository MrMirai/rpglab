<script setup>
import { ref } from 'vue'
import { useEditorStore } from '../store'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
import CharacterUpload from './CharacterUpload.vue'
import CharacterControls from './CharacterControls.vue'
import CharacterFilters from './CharacterFilters.vue'
import MaskControls from './MaskControls.vue'
import BackgroundControls from './BackgroundControls.vue'
import BrushControls from './BrushControls.vue'
// Рамка живёт в отдельном модуле frames и подключается через его публичный API
import { FrameUpload } from '@/modules/frames'

const store = useEditorStore()

const sections = ref([
  { id: 'frame',       label: 'Рамка',      open: true  },
  { id: 'background',  label: 'Фон',        open: true  },
  { id: 'character',   label: 'Персонаж',   open: true  },
  { id: 'correction',  label: 'Коррекция',  open: false },
  { id: 'mask',        label: 'Маска',      open: true  },
  { id: 'brush',       label: 'Кисть',      open: true  },
])
</script>

<template>
  <div class="editor-properties">
    <CollapsibleSection
      v-for="section in sections"
      :key="section.id"
      v-model:open="section.open"
      :label="section.label"
    >
      <template v-if="section.id === 'frame'">
        <FrameUpload />
      </template>
      <template v-else-if="section.id === 'background'">
        <BackgroundControls v-if="store.hasFrame" />
        <p v-else class="placeholder-hint">Сначала загрузи рамку</p>
      </template>
      <template v-else-if="section.id === 'character'">
        <template v-if="store.hasFrame">
          <CharacterUpload />
          <CharacterControls v-if="store.hasChar" />
        </template>
        <p v-else class="placeholder-hint">Сначала загрузи рамку</p>
      </template>
      <template v-else-if="section.id === 'correction'">
        <CharacterFilters v-if="store.hasChar" />
        <p v-else class="placeholder-hint">Сначала загрузи персонажа</p>
      </template>
      <template v-else-if="section.id === 'mask'">
        <MaskControls v-if="store.hasFrame && store.hasChar" />
        <p v-else class="placeholder-hint">
          {{ !store.hasFrame ? 'Сначала загрузи рамку' : 'Сначала загрузи персонажа' }}
        </p>
      </template>
      <template v-else-if="section.id === 'brush'">
        <BrushControls v-if="store.hasFrame && store.hasChar" />
        <p v-else class="placeholder-hint">
          {{ !store.hasFrame ? 'Сначала загрузи рамку' : 'Сначала загрузи персонажа' }}
        </p>
      </template>
    </CollapsibleSection>
  </div>
</template>

<style lang="scss" scoped>
.editor-properties {
  width: 100%;
}

.placeholder-hint {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-xs);
  color: var(--color-text-3);
}
</style>
