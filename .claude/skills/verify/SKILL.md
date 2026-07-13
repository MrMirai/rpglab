---
name: verify
description: Как собрать/запустить/продрайвить RPGLab для верификации изменений (Vue 3 + Vite + Konva, GUI-поверхность в браузере).
---

# Верификация RPGLab

## Запуск

- `npm run dev` — Vite на порту **5176 strictPort** (`vite.config.js`). Если порт занят —
  dev-сервер пользователя уже запущен, изменения подхватываются HMR: просто используй
  `http://localhost:5176`. Роуты: `/` (главная), `/editor` (токены), `/editor/handout` (раздатки).
- Линт: `npx eslint <files>` (без `--fix`, быстрее чем `npm run lint`).

## Драйв GUI (работает, проверено)

Playwright-библиотека без загрузки браузеров: в скретчпаде `npm i playwright`, затем
`chromium.launch({ channel: 'chrome' })` (фолбэк `'msedge'`) — системный браузер, headless ок.

**Доступ к Pinia со страницы** (для сетапа сцены и чтения результатов; сами жесты — реальной мышью):

```js
const s = document.querySelector('#app').__vue_app__
  .config.globalProperties.$pinia._s.get('handout') // или 'editor', 'auth', ...
s.addElement('SHAPE', { x: 100, y: 100, width: 200, height: 140, shapeType: 'rect' })
```

**Док-координаты → экранные** (канвас-редакторы, стейдж несёт pan/zoom):

```js
const vp = s.viewport // { x, y, zoom } — синхронизируется из канваса
const r = document.querySelector('.handout-canvas').getBoundingClientRect()
const screen = { x: r.left + vp.x + docX * vp.zoom, y: r.top + vp.y + docY * vp.zoom }
```

Жесты: `page.mouse.move/down/move({steps:12})/up`; скриншот ДО `mouse.up()` ловит
mid-drag состояние (направляющие, рамку трансформера). Konva-канвас нормально принимает
CDP-события мыши. Ctrl+колёсико зумит вьюпорт (`page.keyboard.down('Control')` + `mouse.wheel`).

## Гочи

- Скриншот панели свойств mid-gesture показывает СТАРЫЕ значения — стор коммитится только
  на dragend/transformend; финальные значения читай из стора после `mouse.up()`.
- Мышиные координаты квантуются в экранные px: на зуме <1 позиции после драга могут
  отличаться на ±1-2 док-px от цели — в ассертах точных значений жди только снэпнутые.
- Элементы добавляй с явными x/y, иначе `addElement` центрирует по вьюпорту.
