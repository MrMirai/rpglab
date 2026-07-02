<script setup>
import { ref } from 'vue'
import { useEditorStore } from '../store'
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

function toggle(section) {
  section.open = !section.open
}
</script>

<template>
  <div class="editor-properties">
    <div
      v-for="section in sections"
      :key="section.id"
      class="section"
    >
      <div class="section-header" @click="toggle(section)">
        <span class="section-label">{{ section.label }}</span>
        <button class="toggle-btn" @click.stop="toggle(section)">
          {{ section.open ? '▾' : '▸' }}
        </button>
      </div>
      <div class="section-content" :class="{ collapsed: !section.open }">
        <div>
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
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.editor-properties {
  width: 100%;
}

.section {
  border-bottom: 1px solid var(--color-border);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;

  &:hover .section-label {
    color: var(--color-text-1);
  }
}

.section-label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  transition: color var(--transition-fast);
}

.toggle-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--color-text-3);
  cursor: pointer;
  font-size: var(--text-sm);
  line-height: 1;
  padding: 0;
}

.section-content {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
  transition: grid-template-rows var(--transition-normal);

  &.collapsed {
    grid-template-rows: 0fr;
  }

  & > div {
    min-height: 0;
    overflow: hidden;
  }
}

.placeholder-hint {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-xs);
  color: var(--color-text-3);
}
</style>
