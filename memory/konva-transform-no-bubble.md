---
name: konva-transform-no-bubble
description: Konva Transformer 'transform' event does NOT bubble to the layer — subscribe on the transformer node
metadata:
  type: project
---

В HandoutCanvas (handout-редактор) живой ресайз элементов сделан через живую мутацию Konva-узла в событии `transform` (бейкаем scaleX/scaleY → width/height, scale возвращаем в знак flip ±1, store трогаем только на `transformend`).

**Грабли:** Konva.Transformer эмитит `transform`/`transformstart`/`transformend` через `_fire` на СЕБЕ, БЕЗ всплытия (см. `node_modules/konva/lib/shapes/Transformer.js` ~строка 834: `this._fire('transform', { target: node })`). Drag-события (`dragstart`/`dragend`) наоборот идут через `fire(..., true)` и всплывают.

**Поэтому:** `transform` нужно вешать на `transformerRef.getNode()`, а НЕ на `elementsLayer`. Подписка на слой не сработает вообще — узел стягивается scale-ом и не сбрасывается. Это уже приводило к багу «текст растягивается и не сбрасывается после ресайза». `e.target` в обработчике = конкретный изменяемый узел (при мультивыделении событие эмитится по узлу на каждый).

**Why:** легко скопировать паттерн делегирования с drag на layer и предположить, что transform тоже всплывает — не всплывает.
**How to apply:** любые transform-обработчики в этом проекте вешать на сам transformer, не на слой элементов.

**Вторые грабли (IMAGE):** Konva.Group своего измеряемого размера не имеет — `getClientRect` (по нему Transformer считает жест) = объединение clientRect'ов ДЕТЕЙ, а НЕ атрибуты width/height группы. Поэтому при живом ресайзе картинки мало впечь scale в width/height группы — надо синхронно догнать размеры детей (внутренняя картинка `img-inner` + хит-rect `img-hit`) через `node.findOne('.name').setAttrs`. Плюс у sceneFunc-шейпа (img-inner) должны быть выставлены свои width/height, иначе `getSelfRect` = 0 и он не измеряется. Симптом при поломке: картинку раздувает/уносит в сторону при ресайзе (особенно contain/«Вписать»).
