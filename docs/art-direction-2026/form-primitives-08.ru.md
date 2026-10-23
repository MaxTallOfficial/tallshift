# Tallshift UI: общие компоненты формы, итерация 08

Статус: реализованы общие React API и состояния на локальном стенде. Это не утверждение о готовности всего дизайн-системного пакета к production. Формы не отправляют данные на сервер.

## SystemTextInput и SystemTextarea

Источник: `prototype/src/foundations/SystemTextField.tsx`, оформление: `system-text-field.css`.

Оба компонента принимают `label`, `description`, `error`, `requirement`, `counter`, `announceError`, `className` и нативные атрибуты своего элемента. `ref` указывает на настоящий input/textarea. Управление значением и валидация остаются у вызывающего кода. `required`, `readOnly`, `disabled`, `autoComplete`, `maxLength` работают нативно.

- `label` обязателен. `requirement` — локализованная видимая подпись «Обязательно»/«Необязательно», не замена `required`.
- ID генерируется через `useId` или задаётся вызывающим кодом. Помощь, ошибка, счётчик и внешний `aria-describedby` объединяются, а не перезаписывают друг друга.
- Ошибка устанавливает `aria-invalid`. `announceError` включает `role=alert` только для сценария, где сообщение должно объявиться сразу. Не включать его одновременно с отдельным live-регионом той же ошибки.
- `counter` не вычисляет длину автоматически: продукт выбирает UTF-16 / кодовые точки / графемы. У существующей формы лимит и счётчик используют нативную длину JavaScript и `maxLength=160`.
- Textarea можно увеличивать по вертикали. Фокус нейтральный, цвет ошибки не заменяет текст причины. Префикс/суффикс и автоматическое маскирование пока не реализованы.

Форма сохранения локального пресета переведена на эти компоненты; её логика валидации, фокус на ошибочном поле, сброс и локальное состояние сохранены.

## SystemCheckbox

Источник: `SystemCheckbox.tsx` / `system-checkbox.css`.

API: `label`, `description`, `error`, `checked`, `indeterminate`, `onChange`, `disabled`, `readOnly`, `required`, `name`, `value`, `className`.

Используется настоящий `input[type=checkbox]`, поэтому участвует в форме и получает нативные действия Space/label. `indeterminate` синхронизируется с DOM-свойством input; это не третье отправляемое значение формы. Вызывающий код обязан снять `indeterminate` после выбора и решить значение `checked`. В примере «Выбрать все» это сделано явно.

Read-only остаётся в tab-порядке, помечен `aria-readonly`; изменение через мышь и Space блокируется. `disabled` использует нативное отключение. Ошибка связана с input через `aria-describedby`; описания ошибок сами не создают live-регион.

## SystemRadioGroup

Источник: `SystemRadioGroup.tsx` / `system-radio-group.css`.

API: generic string `value`, `options: { value, label, description?, disabled? }[]`, `onChange`, `label`, `name`, `description`, `error`, `required`, `disabled`, `layout: list | inline | cards`, `className`.

Использует fieldset/legend и общую группу нативных radio. Без `name` создаётся уникальное имя. Не добавляет кастомные обработчики стрелок поверх браузерного поведения. Отключённые варианты пропускаются нативной клавиатурной навигацией. Значения options должны быть уникальны; динамическое удаление выбранного варианта обязан обработать вызывающий код. Read-only намеренно не предложен: нативная radio-группа не поддерживает такое состояние.

## SystemSwitch

Источник: `SystemSwitch.tsx` / `system-switch.css`.

API: `label`, `description`, `error`, `checked`, `onChange`, `disabled`, `readOnly`, `pending`, `pendingLabel`, `className`.

Это немедленная настройка на `button[type=button][role=switch]`, не согласие с условиями. Space/Enter работают нативно. `checked` — подтверждённое значение. При `pending` повторные действия блокируются без потери фокуса; `pendingLabel` должен быть локализованным сообщением, объявляемым через status. Сеть и оптимистические изменения компонент не запускает. После ошибки вызывающий код сохраняет прежнее значение и передаёт причину в `error`.

## Стенд и границы проверки

В InteractionLab добавлен раздел состояний на EN/RU/VI: неверный email, required, read-only input, disabled input, смешанный checkbox, checkbox с ошибкой, radio с недоступным вариантом, pending switch и switch с ошибкой. Ожидание и сбой явно подписаны как локальные примеры. Главная форма использует общий Switch вместо локальной копии.

`tsc -b` выполнен без ошибок после миграции. Пять SSR-проверок `form-semantics-08.test.ts` проходят: связь label/help/error с контролом, native required/readOnly/disabled, атрибуты checkbox, независимые имена radio-групп и сохранение подтверждённого значения pending switch. SSR не проверяет DOM-свойство `indeterminate`, события или фокус. Визуальная проверка в браузере, проверка реального screen reader, iOS/Android и матрица браузеров требуют отдельного подтверждения; наличие ARIA-атрибутов не выдаётся за эти проверки.
