<script setup>
import { RouterLink } from 'vue-router'
import {
  FileText,
  ArrowRight,
  Sparkles,
  Wand2,
  Layers,
  Download,
  MousePointerClick,
  ShieldCheck,
} from 'lucide-vue-next'
import { UserMenu, useAuthStore } from '@/modules/auth'
import PageHeader from '@/shared/components/layout/PageHeader.vue'
import LogoIcon from '@/shared/components/LogoIcon.vue'
import tokenExample from '@/shared/assets/previews/token-example.png'
import handoutExample from '@/shared/assets/previews/handout-example.png'

// Главная страница: рассказывает о сервисе и ведёт в редакторы.
// Собственная лёгкая шапка (не AppLayout - тот заточен под canvas-редактор
// с сайдбаром/properties-панелью, тут обычный лендинг).
const auth = useAuthStore()

// Карточки редакторов. В превью - скриншоты самих редакторов с реальной
// работой внутри (а не абстрактные иконки): видно и результат, и интерфейс.
// Снимок показывается целиком, стили общие на обе карточки (.editor-card__art).
const EDITORS = [
  {
    path: '/editor/token',
    image: tokenExample,
    imageAlt: 'Редактор токенов: гоблин, вылезающий из круглой рамки',
    iconChar: '◎',
    title: 'Редактор токенов',
    description: 'Мощный и функциональный редактор токенов для VTT и печати.',
    points: ['Библиотека рамок', 'Тени и освещение', '3D-эффект'],
  },
  {
    path: '/editor/handout',
    image: handoutExample,
    imageAlt: 'Редактор раздаток: письмо на состаренной бумаге',
    icon: FileText,
    title: 'Редактор раздаток',
    description: 'Редактор любых писем, объявлений и документов для игроков.',
    points: ['Большая база шаблонов', 'Эффект чернил', 'Удобный экспорт'],
  },
]

// Короткий блок «почему так»: три опоры, а не список фич - длинные перечисления
// на лендинге не читают.
const FEATURES = [
  {
    icon: MousePointerClick,
    title: 'Прямо в браузере',
    text: 'Ничего не нужно устанавливать: открыл вкладку - и работаешь. Изображения обрабатываются на вашем устройстве.',
  },
  {
    icon: Wand2,
    title: 'Эффекты вместо возни',
    text: 'Вылезание из рамки, тени, цветокоррекция и фактура бумаги — то, на что в обычных редакторах уходит вечер.',
  },
  {
    icon: Download,
    title: 'Готово к столу',
    text: 'Экспорт в размерах под VTT и печать: PNG с прозрачностью, WebP и PDF в миллиметрах.',
  },
]

// Три шага «как это работает» - снимают вопрос «а что мне вообще делать».
const STEPS = [
  { icon: Layers, title: 'Возьмите рамку', text: 'Готовый пресет из галереи или свой файл.' },
  { icon: Sparkles, title: 'Соберите сцену', text: 'Персонаж, фон, маски, фильтры — всё вживую.' },
  { icon: ShieldCheck, title: 'Заберите файл', text: 'Экспорт в нужном размере и формате.' },
]
</script>

<template>
  <div class="home">
    <PageHeader>
      <template #user><UserMenu /></template>
    </PageHeader>

    <main class="home-content">
      <!-- ─── Первый экран ─── -->
      <section class="hero">
        <div class="hero__glow" aria-hidden="true" />

        <span class="hero__badge">
          <Sparkles :size="13" />
          Выведи подготовку к игре на новый уровень
        </span>

        <h1 class="hero__title">
          Материалы для ваших партий —<br />
          <span class="hero__title-accent">за пару минут</span>
        </h1>

        <p class="hero__subtitle">RPGLab — набор Web редакторов для настольных ролевых игр.</p>

        <div class="hero__actions">
          <RouterLink to="/editor/token" class="hero__cta hero__cta--primary">
            Создать токен
            <ArrowRight :size="16" />
          </RouterLink>
          <RouterLink to="/editor/handout" class="hero__cta hero__cta--ghost">
            Собрать раздатку
          </RouterLink>
        </div>
      </section>

      <!-- ─── Редакторы ─── -->
      <section class="editors">
        <RouterLink
          v-for="editor in EDITORS"
          :key="editor.path"
          :to="editor.path"
          class="editor-card"
        >
          <!-- Превью: скриншот самого редактора с реальной работой в нём -->
          <div class="editor-card__preview">
            <img
              :src="editor.image"
              :alt="editor.imageAlt"
              class="editor-card__art"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div class="editor-card__body">
            <div class="editor-card__head">
              <span class="editor-card__icon">
                <span v-if="editor.iconChar" class="editor-card__icon-char">{{
                  editor.iconChar
                }}</span>
                <component :is="editor.icon" v-else :size="22" />
              </span>
              <h2>{{ editor.title }}</h2>
            </div>

            <p class="editor-card__text">{{ editor.description }}</p>

            <ul class="editor-card__points">
              <li v-for="point in editor.points" :key="point">{{ point }}</li>
            </ul>

            <span class="editor-card__cta">
              Открыть редактор
              <ArrowRight :size="16" class="editor-card__cta-arrow" />
            </span>
          </div>
        </RouterLink>
      </section>

      <!-- ─── Почему RPGLab ─── -->
      <section class="features">
        <article v-for="feature in FEATURES" :key="feature.title" class="feature">
          <span class="feature__icon"><component :is="feature.icon" :size="20" /></span>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.text }}</p>
        </article>
      </section>

      <!-- ─── Как это работает ─── -->
      <section class="steps">
        <h2 class="section-title">Как это работает</h2>
        <ol class="steps__list">
          <li v-for="(step, i) in STEPS" :key="step.title" class="step">
            <span class="step__num">{{ i + 1 }}</span>
            <span class="step__icon"><component :is="step.icon" :size="18" /></span>
            <h3>{{ step.title }}</h3>
            <p>{{ step.text }}</p>
          </li>
        </ol>
      </section>

      <!-- ─── Приглашение завести аккаунт (только гостю) ─── -->
      <section v-if="!auth.isAuthenticated" class="account-note">
        <LogoIcon :size="34" :stroke-width="1.4" class="account-note__logo" />
        <h2>Редакторы доступны без регистрации</h2>
        <p>
          Аккаунт понадобится только для сохранения проектов и загрузки собственных рамок — всё
          остальное работает сразу.
        </p>
        <div class="account-note__actions">
          <RouterLink to="/register" class="hero__cta hero__cta--primary">
            Создать аккаунт
          </RouterLink>
          <RouterLink to="/login" class="hero__cta hero__cta--ghost">Войти</RouterLink>
        </div>
      </section>
    </main>

    <footer class="home-footer">
      <span>RPGLab — редакторы для настольных ролевых игр</span>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-1);
}

.home-content {
  flex: 1;
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-16);
  padding: var(--space-16) var(--space-8) var(--space-16);
}

// ─── Первый экран ───────────────────────────────────────────────────────────

.hero {
  position: relative;
  max-width: 720px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
}

// Тёплое янтарное свечение за заголовком - «лаборатория/свеча», а не плоский фон.
// Лежит под контентом и не ловит клики.
.hero__glow {
  position: absolute;
  top: -180px;
  left: 50%;
  width: 720px;
  height: 420px;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(
    ellipse at center,
    rgba(196, 149, 74, 0.16) 0%,
    rgba(196, 149, 74, 0.05) 40%,
    transparent 70%
  );
}

.hero > *:not(.hero__glow) {
  position: relative;
  z-index: 1;
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background-color: var(--color-bg-2);
  color: var(--color-text-2);
  font-size: var(--text-xs);
  letter-spacing: 0.04em;
  text-transform: uppercase;

  svg {
    color: var(--color-accent);
  }
}

.hero__title {
  font-size: 44px;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.hero__title-accent {
  color: var(--color-accent);
}

.hero__subtitle {
  max-width: 620px;
  font-size: var(--text-md);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

// Крупные CTA лендинга - намеренно больше BaseButton (тот заточен под
// плотные панели редактора, тут нужен «первый экран»-масштаб).
.hero__cta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  text-decoration: none;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);

  &:hover {
    transform: translateY(-1px);
  }

  &--primary {
    background-color: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-bg-1);

    &:hover {
      background-color: var(--color-accent-hover);
      border-color: var(--color-accent-hover);
      color: var(--color-bg-1);
    }
  }

  &--ghost {
    border-color: var(--color-border-strong);
    color: var(--color-text-1);

    &:hover {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }
  }
}

// ─── Карточки редакторов ────────────────────────────────────────────────────

.editors {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: var(--space-6);
}

.editor-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  text-decoration: none;
  transition:
    border-color var(--transition-normal),
    transform var(--transition-normal),
    box-shadow var(--transition-normal);

  &:hover {
    border-color: var(--color-accent);
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);

    .editor-card__cta {
      color: var(--color-accent-hover);
    }

    .editor-card__cta-arrow {
      transform: translateX(3px);
    }

    .editor-card__art {
      transform: scale(1.03);
    }
  }
}

// В превью - скриншоты редакторов (оба одного формата), стиль ОДИН на обе
// карточки. Область превью держит пропорции самого снимка (aspect-ratio, а не
// фиксированная высота): тогда кадр влезает целиком, без обрезки и без пустых
// полей по краям - виден весь интерфейс редактора.
.editor-card__preview {
  position: relative;
  aspect-ratio: 1914 / 964;
  overflow: hidden;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-3);
}

.editor-card__art {
  display: block;
  width: 100%;
  height: 100%;
  // contain: показываем снимок ЦЕЛИКОМ, ничего не срезая по краям
  object-fit: contain;
  transition: transform var(--transition-slow);
}

.editor-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-6);
}

.editor-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.editor-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background-color: var(--color-accent-muted);
  color: var(--color-accent);
}

.editor-card__icon-char {
  font-size: 22px;
  line-height: 1;
}

// Описания у карточек разной длины - тянем текст, чтобы чипы и «Открыть
// редактор» стояли на одной линии в обеих карточках соседнего грида
.editor-card__text {
  flex: 1;
  font-size: var(--text-sm);
}

.editor-card__points {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg-3);
    color: var(--color-text-2);
    font-size: var(--text-xs);
  }
}

.editor-card__cta {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: auto;
  padding-top: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-accent);
  transition: color var(--transition-fast);
}

.editor-card__cta-arrow {
  transition: transform var(--transition-normal);
}

// ─── Преимущества ───────────────────────────────────────────────────────────

.features {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-6);
}

.feature {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  p {
    font-size: var(--text-sm);
  }
}

.feature__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  margin-bottom: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-2);
  color: var(--color-accent);
}

// ─── Как это работает ───────────────────────────────────────────────────────

.section-title {
  margin-bottom: var(--space-6);
  text-align: center;
  font-size: var(--text-xl);
}

.steps {
  width: 100%;
}

.steps__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-4);
  list-style: none;
  padding: 0;
  margin: 0;
  counter-reset: step;
}

.step {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-2);

  p {
    font-size: var(--text-sm);
  }
}

.step__num {
  position: absolute;
  top: var(--space-4);
  right: var(--space-5);
  font-size: 34px;
  font-weight: var(--weight-bold);
  line-height: 1;
  color: var(--color-text-1);
  opacity: 0.07;
}

.step__icon {
  color: var(--color-accent);
}

// ─── Аккаунт ────────────────────────────────────────────────────────────────

.account-note {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-8);
  text-align: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background:
    radial-gradient(ellipse at top, rgba(196, 149, 74, 0.1), transparent 60%), var(--color-bg-2);

  p {
    max-width: 520px;
    font-size: var(--text-sm);
  }
}

.account-note__logo {
  color: var(--color-accent);
  opacity: 0.7;
}

.account-note__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

// ─── Подвал ─────────────────────────────────────────────────────────────────

.home-footer {
  padding: var(--space-6) var(--space-8);
  border-top: 1px solid var(--color-border);
  text-align: center;
  color: var(--color-text-3);
  font-size: var(--text-sm);
}

// ─── Адаптив ────────────────────────────────────────────────────────────────

@media (max-width: 720px) {
  .home-content {
    gap: var(--space-12);
    padding: var(--space-10) var(--space-5);
  }

  .hero__title {
    font-size: 32px;
  }

  .hero__cta {
    justify-content: center;
    width: 100%;
  }

  .hero__actions,
  .account-note__actions {
    width: 100%;
  }
}
</style>
