# S001/S002 · реализация бесплатных секций · 07.11.2026

Статус этой записи: реализовано локально и проверено unit/SSR и защищённым статическим checker. Не пользовательское утверждение, не опубликованный production release. Общую интеграцию, выдачу, browser QA и фактические Next/Vite consumer builds фиксирует основной отчёт этапа после выполнения.

## Решение и состав

Продолжение пяти существующих примеров, без повторной разработки S003. Параллельная ветка работы по запросу Max Tall: S001 «Первый экран в две колонки» и S002 «Сетка преимуществ». Manrope, Saffron, общие токены и Hallmark в рамках design.md сохранены. Исторические eyebrow и SVG-assets из planning catalog не перенесены: locked design запрещает announcing eyebrows и самостоятельные интерфейсные иконки. Вместо декоративной абстракции S001 показывает три содержательных пояснения; метрики и отзывы не придуманы.

- S001: SplitHero с title/description, двумя нативными ссылками primaryAction/secondaryAction и тремя panelItems с уникальными id. Две колонки при доступной ширине 960 px, ниже текст перед пояснениями. Demo содержит два настоящих локальных раздела назначения; id уникальны между экземплярами. URL guard запрещает пустые адреса, executable protocols, protocol-relative URL, backslash и управляющие символы. Реальные внешние назначения остаются ответственностью host.
- S002: FeatureGrid с 3–6 элементами, уникальными id, полностью видимыми заголовками и описаниями. Не обрезает лишние элементы молча: неверный count/duplicate id вызывает RangeError. 1/2/3 колонки зависят от доступной ширины, высота от текста. Нет скрытых hover-пояснений или фиктивных действий. Декоративные иконки — только необязательный host React slot; демо работает без иконок.
- Обе секции: motion off/subtle/expressive, duration 0–480 ms, surface/radius/density в кодовом API. Surface HEX получает читаемый чёрный/белый текст. S001 accent меняет главную кнопку, S002 — декоративную линию над ячейкой. Редактор содержимого и surface/radius/density в Studio не заявлены готовыми.
- E001 переиспользуется как exact dependency: ContentReveal.tsx, ContentReveal.module.css, reveal-controller.ts; всё видимо в SSR/без эффектов, once=true, системное reduced motion, cleanup и focus-safe поведение унаследованы от существующего контроллера. S001 также использует C001 с его exact runtime/CSS/modality/contrast files. В выдаче меняются только пути facade reveal.ts и press-button.ts на локальный vendor. Новых runtime-пакетов и сетевых assets нет.
- Каждый комплект: Demo/copy RU/EN/VI, docs/rules RU/EN/VI, raw-source inventory и createExampleRecipe. Общий pipeline генерирует SelectedExample/config/schema/manifest, prompt, инструкции и ZIP; его фактическая проверка для новых IDs требуется до завершения этапа.

## Редакторская проверка

Агент copywriter_stage3 проверил copy.ts/docs.ts/rules обоих примеров 07.11. Исправил S001 setupText: тексты меняются в copy.ts, href — в Demo.tsx; уточнил технические обещания и условия коммерческого использования. Для S002 убраны ссылки и ожидание действия из правил статического списка. Проверка не заменяет свежую проверку длины текстов в браузере RU/EN/VI и не считается утверждением Max Tall.

## Выполненные проверки

`node --test tests/starter-sections-semantics.test.ts` из prototype: **8 passed, 0 failed**. Проверены две реальные ссылки и видимый SSR, guard URL,3/6feature preservation,invalidcounts/IDs,экранирование длинного текста,контраст поверхности,host slots,три языка и уникальные реальные якоря нескольких экземпляров.

`npm run check:design -- prototype/src/recipes/starter-split-hero`: **4 UI files,0 FAIL/0 REFLEX/0 WARN**.

`npm run check:design -- prototype/src/recipes/starter-feature-grid`: **4 UI files,0 FAIL/0 REFLEX/0 WARN**.

Проверки Hallmark выполнены только защищённой offline wrapper проекта. Ничего не отправлялось владельцу Hallmark или Together AI. Browser QA, визуальные адаптивы, independent consumer builds, реальный Next SSR/hydration и пользовательское исследование этой записью не подтверждаются.
