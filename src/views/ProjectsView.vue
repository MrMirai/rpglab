<script setup>
import { RouterLink } from 'vue-router'

const projects = Array.from({ length: 4 }, (_, i) => ({
  id: i + 1,
  name: `Токен #${i + 1}`,
  date: '23 июня 2026',
}))
</script>

<template>
  <div class="projects-view">
    <header class="projects-header">
      <RouterLink to="/" class="back-link">← Назад в редактор</RouterLink>
      <h1>Мои проекты</h1>
    </header>

    <main class="projects-content">
      <div class="projects-grid">
        <div v-for="project in projects" :key="project.id" class="project-card">
          <div class="card-preview" />
          <div class="card-info">
            <p class="card-name">{{ project.name }}</p>
            <p class="card-date">{{ project.date }}</p>
          </div>
          <div class="card-actions">
            <button class="btn btn-primary">Открыть</button>
            <button class="btn btn-danger">Удалить</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.projects-view {
  min-height: 100vh;
  background-color: var(--color-bg-1);
  display: flex;
  flex-direction: column;
}

.projects-header {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-4) var(--space-8);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-2);
}

.back-link {
  font-size: var(--text-sm);
  color: var(--color-text-2);
  transition: color var(--transition-fast);
  flex-shrink: 0;

  &:hover {
    color: var(--color-accent);
  }
}

.projects-content {
  padding: var(--space-8);
  flex: 1;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-4);
  max-width: 900px;
}

.project-card {
  background-color: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color var(--transition-fast);

  &:hover {
    border-color: var(--color-border-strong);
  }
}

.card-preview {
  aspect-ratio: 1;
  background-color: var(--color-bg-3);
  width: 100%;
}

.card-info {
  padding: var(--space-3);
}

.card-name {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-1);
  line-height: var(--leading-tight);
}

.card-date {
  font-size: var(--text-xs);
  color: var(--color-text-3);
  margin-top: var(--space-1);
  line-height: var(--leading-tight);
}

.card-actions {
  display: flex;
  gap: var(--space-2);
  padding: 0 var(--space-3) var(--space-3);
}

.btn {
  flex: 1;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast),
    background-color var(--transition-fast);

  &-primary {
    color: var(--color-accent);
    border-color: var(--color-accent);
    background: none;

    &:hover {
      background-color: var(--color-accent-muted);
    }
  }

  &-danger {
    color: var(--color-text-3);
    background: none;

    &:hover {
      color: var(--color-danger);
      border-color: var(--color-danger);
    }
  }
}
</style>
