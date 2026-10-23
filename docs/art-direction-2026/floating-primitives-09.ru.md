# Tallshift UI /09 — плавающие поверхности

## Реализовано

Общие `SystemMenu`, `SystemPopover`, `SystemTooltip`, служебные portal/position/dismiss hooks. `SourceNavigator` использует общие меню действий и немодальное окно сведений; мобильный sheet этим изменением не затронут. `FloatingSpecimen` показывает три семейства на EN/RU/VI. Действия specimen выбирают видимый локальный файл AfterlightExample.tsx и очищают этот выбор; текущее значение показано под кнопками. Это состояние specimen, без изменений файловой системы.

### SystemMenu

- `label: string`, `items: readonly { id; label: ReactNode; disabled?; destructive?; onSelect(): void }[]`.
- `trigger(props: FloatingTriggerProps): ReactNode`: передать **все** props на настоящий `<button>` или совместимый `SystemButton`. Название и disabled задаёт потребитель.
- `open?: boolean`, `defaultOpen?: boolean`, `onOpenChange?(next, reason)`, `align?: 'start' | 'end'`.
- Контролируемый `open` имеет приоритет над `defaultOpen`. Родитель обязан применять `onOpenChange`; это обычный controlled contract.
- Click/Enter/Space открывают меню через native button; ↑ открывает на последнем доступном пункте, ↓ на первом. Внутри ↑/↓ цикличны, Home/End переходят к краям. Native Enter/Space активируют пункт.
- Недоступные пункты — native disabled; они пропускаются стрелками. Если доступны не все пункты, фокус получает первый/последний доступный. Если недоступны все, фокус получает контейнер меню.
- Escape и выполненное действие возвращают фокус к кнопке. Tab закрывает меню, возвращает фокус на кнопку перед стандартным переходом Tab. Outside pointer/focus закрывают без перехвата фокуса у нового элемента.
- Только плоское меню действий. Вложенные меню, menuitemradio, typeahead и интерактивные поля внутри меню не реализованы.

### SystemPopover

- `title`, `closeLabel`, `children`, `trigger`, controlled/uncontrolled параметры и align аналогичны меню.
- `role="dialog"`, `aria-modal="false"`, имя связано с заголовком.
- При открытии фокус на кнопке закрытия. Tab свободно выходит, focus-out закрывает поверхность. Escape/Close возвращают фокус к trigger; outside pointer не перехватывает новый фокус.
- Это информационная немодальная поверхность. Подтверждения, платежи и формы, которым требуется modal focus trap, должны использовать Dialog.

### SystemTooltip

- `content: string`, `trigger({ 'aria-describedby' }): ReactNode`.
- Передать `aria-describedby` на **сам фокусируемый элемент**, а не только на его обёртку. В specimen это именованная icon button. Для disabled native button потребитель должен выбрать другой доступный источник пояснения.
- Открывается по hover/focus, доступен при наведении на сам tooltip. Небольшая задержка закрытия позволяет пересечь зазор между кнопкой и подсказкой. Escape закрывает до следующего полного ухода указателя/фокуса.
- Внутри нет ссылок/кнопок. Существенные инструкции и ошибки должны оставаться в видимом тексте. На touch нет гарантированного способа вызвать hover — содержание всегда дополнительное.

## Позиционирование и native dialog

Поверхности находятся в portal. Для trigger внутри открытого native dialog portal помещается в этот dialog, чтобы не оказаться под его top layer; в остальных случаях — в body. Fixed позиционирование выбирает верх/низ по доступной высоте, ограничивает ширину и высоту видимым viewport, оставляет отступ 12px. Обновляется при resize/scroll, visualViewport resize/scroll и ResizeObserver trigger/panel.

Menu/Popover обрабатывают Escape только если событие пришло от их trigger/panel; фоновые экземпляры не отменяют Escape native dialog. Tooltip с фокусом на своём trigger/panel перехватывает первый Escape и закрывается; следующий Escape может закрыть native dialog. Фоновый tooltip вне активного modal не обрабатывает его Escape. Tooltip, открытый только наведением без фокуса, не блокирует Escape другого элемента. Не заявляется поддержка всех сочетаний transformed dialog ancestors, вложенных modal dialog, CSS writing-mode/RTL, browser zoom и IME/виртуальной клавиатуры без отдельных браузерных проверок.

## Проверки и пределы

`floating-semantics-09.test.ts`: 6 SSR-проверок — связи trigger/menu, controlled override, disabled/destructive состояния, nonmodal dialog/heading/close name, отсутствие dangling tooltip description и EN/RU/VI specimen. TypeScript compilation проходит.

SSR не доказывает клавиатурное поведение, возврат фокуса, top-layer совместимость, collision, screen reader announcements или hoverable hit area. Эти сценарии требуют проверки в браузере; результаты интеграционного прогона записывает основной отчёт /09. Это реализация API и структурно проверенные specimen, а не одобрение production-ready для всего семейства.

При интеграции исправлен initial focus первого открытия: menu/popover ждут расчёта позиции и видимости панели перед фокусировкой. Ранний focus на visibility:hidden не срабатывал в IAB Chromium.

Popover в portal явно обрабатывает границы Tab: Shift+Tab с первого контрола возвращает trigger, Tab с последнего закрывает панель и переводит фокус на следующую видимую цель после trigger. В native modal поиск следующей цели ограничен этим modal. Это исправляет уход в browser chrome с незакрытой панелью в IAB.
