# Tallshift UI — техническая v1 / Foundations 10

Техническая сборка первой версии завершена: **44 из 44 семейств имеют общий экспортируемый API**, подключены к стенду, собраны в устанавливаемый локальный пакет и задокументированы. Это implementation candidate для визуальной приёмки, а не утверждение production-ready или полного соответствия всем браузерам/AT. Направление Afterlight, Manrope и Saffron Lighter остаются ранее утверждёнными.

## Состав и результат

- [Каталог](catalog-compositions-10.ru.md): ContentTile, CollectionTile, CatalogToolbar, Pagination. Мигрированы Discovery и LibraryStates с каноническими данными, корректными количествами и локальными фильтрами. Отдельные действия карточки не вложены в другие интерактивные элементы.
- [Оболочка и предложения](shell-offer-compositions-10.ru.md): BrandMark, Typography, LocaleControl, NavigationShell, Offer, EntitlementState. В мобильной навигации Escape возвращает trigger, выбор пункта фокусирует заголовок назначения; переход на desktop закрывает disclosure. Состояния прав — только представление серверного результата, не источник авторизации.
- [Рабочая область](workbench-compositions-10.ru.md): CodePanel, PromptPanel, CopyFallback, DownloadAction. Исходники экранируются как React text, копирование сохраняет точный payload; ошибка архива видна рядом с действием, повторная активация защищена.
- Завершены заявленные пробелы контролов: prefix/suffix с aria-describedby и неизменным value, группированные option в select, loading/error/retry поиска, checkbox/radio menu items с checked-состоянием. Рабочие примеры EN/RU/VI находятся в раскрываемом блоке `#completion-states`.
- Добавлен SystemTheme: изолирует переменные и шрифт, не меняет body. Portal остаётся внутри theme root или текущего native dialog; это устраняет потерю цветов при использовании компонента вне стенда.
- Полный [реестр API](evidence/foundations-10/component-inventory.json). Тест проверяет наличие каждого API и в исходниках, и в entry point пакета. Визуальное утверждение и release verification не подменены наличием API.

Агенты подготовили композиции и часть проверок; после остановки их выполнения по лимиту основной агент завершил интеграцию, пограничные состояния, пакетирование и проверку. Незаконченная работа агентов не отмечалась как готовая автоматически.

## Локальный пакет и подключение

[Пакет @tallshift/ui](../../packages/tallshift-ui/tallshift-ui-0.1.0.tgz), [инструкция](../../packages/tallshift-ui/README.md). Архив **159 743 байта**, содержит ES module с client boundary, TypeScript declarations, CSS с Manrope и OFL шрифта. Пакет private, в npm не публиковался. Права на продуктовый код не выводятся из OFL шрифта.

```sh
npm install /absolute/path/to/tallshift-ui-0.1.0.tgz
```

```tsx
'use client';
import '@tallshift/ui/styles.css';
import { SystemTheme, SystemButton } from '@tallshift/ui';

export function Example() {
  return <SystemTheme locale="en"><SystemButton variant="primary">Continue</SystemButton></SystemTheme>;
}
```

Для Next.js CSS импортируется один раз в app layout, интерактивные потребители располагаются в client boundary. Хост управляет данными, маршрутизацией, валидацией, асинхронными действиями и серверной проверкой доступа. Компоненты не отправляют контекст промпта на сторонний сервис.

## Проверка завершённой сборки

- `npm --prefix prototype test`: **99/99** unit/reducer/SSR. `test:system` теперь запускает полный набор, а не старый укороченный список.
- `npm --prefix prototype run test:study`: **12/12** source/prompt/ZIP fidelity. A001 не изменён и остаётся единственным готовым материалом продуктовой библиотеки.
- `build:foundations`: TypeScript и сборка проходят. Standalone HTML **1 256 684 байта**. Предупреждение JS chunk >500 kB относится к стенду со всеми образцами и исходниками.
- `test:consumers`: локальный архив установлен в отдельный fixture. Production build и TypeScript проходят в **Next.js 16.4.3 / React 19.3.1** и **Vite 8.3.5**. Сверяются SHA-256 собранного и установленного bundle; результаты привязаны к текущему tarball. Vite предупреждает о директиве `use client` — в его browser build она не задаёт RSC boundary; это не скрытая ошибка сборки.
- IAB Chromium, оба независимых потребителя: редактируемое поле после hydration, открытие/закрытие dialog, keyboard menu и сохранение theme в portal. Цвет menu background `rgb(30, 29, 25)`.
- Стенд EN/RU/VI × **320/768/1440**: `scrollWidth === viewport width`; Demo/Code/Prompt имеют **нулевое изменение высоты** внутри каждой комбинации.
- Группы Library/Framework доступны в listbox; error/retry поиска возвращает input focus и подсказку; menucheckbox меняет видимый локальный выбор. Mobile navigation возвращает фокус в заголовок Workbench после закрытия.
- Итоговый DOM: один H1 в документе, **нет дублирующихся ID и оборванных aria-labelledby/describedby/controls/activedescendant**. Документ iframe проверяется отдельно от родительского; независимые документы могут иметь свои heading и ID.

[Build evidence](evidence/foundations-10/consumer-builds.json), [browser evidence](evidence/foundations-10/browser-checks.json). Архив /09 сохранён в `art-direction/foundations-09.html`.

Повторить:

```sh
npm --prefix prototype test
npm --prefix prototype run test:study
npm --prefix prototype run build:foundations
npm --prefix prototype run test:consumers
```

Последняя команда устанавливает зависимости в игнорируемый `.qa/system-consumer`, собирает пакет, выполняет две независимые production-сборки и сохраняет доказательства. Исходники fixture и скрипт сохранены в репозитории.

## Граница завершения и приёмка

Закрыт инженерный состав v1: общие API всех семейств, заявленные выше состояния, документация, локальная поставка и проверенное подключение в Next/Vite. Это позволяет закончить разработку фундамента и перейти к визуальной приёмке; архитектурные композиции больше не оставлены локальной разметкой.

Не отмечены выполненными: пользовательское визуальное утверждение новых компонентов, реальные Safari/Firefox, VoiceOver/NVDA, touch-устройства и полная матрица zoom/forced-colors/reduced-motion/комбинаций вложенности. В доступной среде подтверждён Chromium; DOM и SSR не заменяют прослушивание скринридером. Эти acceptance gates остаются в реестре pending и должны быть закрыты до публичного production-релиза.

Разработка аккаунта, оплаты, серверной выдачи Pro, всего продуктового каталога и подробных продуктовых экранов не является завершением дизайн-системы и не выдана здесь за готовый сервис. Продуктовые экраны — следующий этап после визуального утверждения системы.
