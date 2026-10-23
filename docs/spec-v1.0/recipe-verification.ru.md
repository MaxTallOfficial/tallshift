# A001 State Relay — проверка переносимого примера

Дата: 22 октября 2026, Asia/Ho_Chi_Minh. Объект проверки — **экспортируемый исходный каталог** `prototype/recipe-exports/state-relay`, версия `0.1.0-prototype`. Это проверка одного рабочего примера; она не подтверждает готовность остальных 31 материала, платного запуска или всей матрицы совместимости продукта.

## Фактически выполнено

| Проверка | Результат | Область доказательства |
|---|---|---|
| Контроллер, исходный комплект | 4/4 passed | Синхронный pending; успех после реальной Promise; поздний ответ; rejection; cancel; независимость экземпляров; destroy |
| Контроллер, расширенный набор прототипа | 6/6 passed | Те же четыре теста + синхронное исключение с повторной попыткой + устаревший settle из abort-handler |
| Отдельное приложение Vite | passed | Копия всего экспортного каталога; strict TypeScript; production build |
| Отдельное приложение Next.js App Router | passed | Копия того же каталога; Server Component page импортирует client example; strict TypeScript; production build / prerender |
| HTML, сгенерированный Next.js | passed | Idle-разметка содержит доступную кнопку, `aria-busy="false"`, `role="status"`; браузерные API не вызываются при prerender |

Окружение: macOS arm64, Node.js **24.19.0**, npm **11.17.0**, React/React DOM **19.3.1**, TypeScript **7.0.2**; Vite **8.3.5**; Next.js **16.4.2** (Turbopack). Это точные проверенные версии, а не обещание поддержки всех более старых и будущих версий.

Vite выводит предупреждения `MODULE_LEVEL_DIRECTIVE` для `'use client'` в переносимых файлах. Production build завершился успешно. Эти директивы нужны для границы client/server в Next.js; Vite использует весь пример как браузерный код. В Next fixture явно задан `turbopack.root`, чтобы не наследовать неоднозначный workspace root при вложенных lock-файлах.

## Воспроизведение

Из корня репозитория:

```sh
node --test prototype/tests/state-relay.test.ts
python3 prototype/tests/prepare-recipe-fixtures.py
```

После установки зависимостей основного прототипа (`npm ci` в `prototype`), из `prototype/.qa/vite`:

```sh
../../node_modules/.bin/tsc --noEmit
../../node_modules/.bin/vite build
```

Из `prototype/.qa/next`:

```sh
npm install --no-audit --no-fund
NEXT_TELEMETRY_DISABLED=1 npm run build
```

`prepare-recipe-fixtures.py` копирует настоящий экспорт, не использует `?raw`-импорты оболочки Studio и не меняет исходный рецепт. Fixture-каталоги локальные и игнорируются Git. Скрипт подготовки сохранён в репозитории; lock-файл Next fixture создаётся при установке. Для полностью фиксируемого CI этот lock-файл нужно перенести в постоянный fixture-каталог отдельным изменением.

## Отпечатки проверенного кода

SHA-256, рассчитанные по настоящим файлам:

| Путь внутри комплекта | SHA-256 |
|---|---|
| `Example.tsx` | `dfe133f3dee761eecb67b1ac9c8a6d1e665feb4b8846a5545cf4a89a61a420e9` |
| `SelectedExample.tsx` | `83275ef18627334047489cc5405c5dfd50c2a4668f9ba1994fad40fca5bf23a1` |
| `src/createStateRelay.ts` | `62ae58d9ae02c36f3c3e6298a4764413565c6fd3a37baae8bd5f0fdb60f26539` |
| `src/useStateRelay.ts` | `7d96c14cb0e6754f2eec228d36a42e7f6af8adcd224b2137c9e3078ddebc87a1` |
| `src/StateRelay.module.css` | `11e2bf521b97568cb015d0dbb98ad24ee93ea294eb748359096a9f7f5231505e` |

Изменение этих файлов требует соответствующего повторного прогона. Настраиваемый `SelectedExample` из ZIP может отличаться от дефолтного; произвольные конфигурации этим отчётом не сертифицируются.

## Границы проверки

В этом прогоне **не выполнялись** браузерные проверки Clipboard permissions, hydration в браузере, клавиатуры/скринридера, touch, 200% zoom, responsive, reduced-motion и визуальной стабильности. Их выполняет отдельная проверка интерфейса прототипа; результаты должны быть записаны отдельно и не выводятся из успешной сборки.

Также не проверены здесь загрузка ZIP через UI, корректность динамически сформированного архива, шаблоны prompt для всех вариантов и соответствие JSON Schema. Сборки и unit-тесты не заменяют security review, проверку отдельного preview origin и production E2E. Никакие провайдеры оплаты, публичный хостинг или сторонние аккаунты в этой проверке не использовались.
