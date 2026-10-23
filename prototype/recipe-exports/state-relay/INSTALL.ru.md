# A001 — установка / React + TypeScript

Версия исходника: 0.1.0-prototype. Это локальный рабочий образец, а не опубликованный production-релиз всей библиотеки. Код этого рецепта распространяется по MIT; другие материалы продукта этим разрешением не охватываются.

## Файлы и зависимости

Нужны React с `useSyncExternalStore` (React 18+) и TypeScript. Новых runtime-пакетов, motion-библиотек, сетевых скриптов и изображений нет. CSS Modules поддерживаются стандартными конфигурациями Vite React/TS и Next.js. Конкретные проверенные версии и результаты сборок указываются в отчёте прототипа; наличие исходника не означает проверку всех версий React/Next/Vite.

Скопируйте папку целиком в `src/recipes/state-relay/` (или в каталог компонентов проекта), сохранив пути:

```text
state-relay/
  Example.tsx
  SelectedExample.tsx
  config.json
  src/createStateRelay.ts
  src/useStateRelay.ts
  src/StateRelay.module.css
```

Все локальные helpers включены. `SelectedExample.tsx` — пример с выбранными параметрами; `Example.tsx` — полноценный переиспользуемый пример с собственными значениями по умолчанию. Контроллер импортируется независимо от UI.

## Vite

В существующем React/TS проекте импортируйте компонент в нужный маршрут:

```tsx
import SelectedExample from './recipes/state-relay/SelectedExample';
export default function Screen() {
  return <SelectedExample />;
}
```

При другом расположении файла поменяйте только путь импорта. Не переустанавливайте React и не обновляйте проект до latest ради этого рецепта.

## Next.js App Router

Импортируйте тот же `SelectedExample` в страницу или другой компонент. У примерного компонента и хука уже есть `'use client'`; страницу делать клиентской не обязательно. Browser API используется только внутри обработчика нажатия. SSR выводит обычную семантическую кнопку в `idle`; состояние сервера и первой гидратации совпадает. Без JavaScript операция Clipboard недоступна: компонент не должен считаться единственным способом получить критически важные данные.

## Собственная операция

```tsx
'use client';
import { useStateRelay } from './src/useStateRelay';

export function SaveButton() {
  const { state, statusMessage, controller } = useStateRelay('Готово к сохранению');
  async function save() {
    if (state === 'pending') return;
    await controller.run(async (signal) => {
      const response = await fetch('/api/save', { method: 'POST', signal });
      if (!response.ok) throw new Error('Сервер отклонил сохранение');
    }, { pending: 'Сохраняем', success: 'Сохранено', error: 'Не удалось сохранить' });
  }
  return <>
    <button type="button" aria-disabled={state === 'pending'} aria-busy={state === 'pending'} onClick={() => void save()}>Сохранить</button>
    <p role="status" aria-live="polite" aria-atomic="true">{statusMessage}</p>
  </>;
}
```

Этот пример показывает API операции. Для визуальной анимации используйте разметку слоёв и импорт CSS из полного `Example.tsx`. `run()` начинает работу сразу, без задержки для эффекта. Он переводит состояние в `success` только после разрешения переданного Promise. HTTP 4xx/5xx сами не отклоняют `fetch`: host обязан проверить `response.ok`.

## Контракт и управление

- `begin(message?)` возвращает ticket с `requestId` и `AbortSignal`, сразу публикует `pending`.
- `settle(ticket, 'success' | 'error', message?)` принимает только результат актуального ticket. Повторный/старый результат игнорируется, метод возвращает `false`.
- `run(operation, messages?)` — удобный Promise-адаптер. Возвращает `{status:'success',value}`, `{status:'error',error}` или `{status:'stale'}`; ошибка операции обработана. Не создаёт сервер, права доступа или бизнес-логику.
- `reset(message?)` / `cancel(message?)` отменяет актуальный ticket и возвращает `idle`. `AbortSignal` реально останавливает только API, которые его поддерживают. Clipboard API не поддерживает отмену: поздний результат игнорируется, запись могла произойти.
- `destroy()` используется для самостоятельного контроллера при окончательном удалении. После него создайте новый экземпляр. React hook сам делает reusable cancel при cleanup и удаляет подписку через React, что совместимо с повторным setup в Strict Mode.
- `subscribe`, `getSnapshot`, `getServerSnapshot` — внешний store без DOM-сканирования. Нет RAF, таймеров, observers и глобальных event listeners.
- Replay, scrub, pause и reverse не применимы: это переход состояния, а не видеоклип. Сброс выполняется явным действием; автоматического исчезновения ошибок нет.

## Настройки и доступность

`locale`: `en`, `ru` или `vi`, по умолчанию `en`; `accent`: только `#RRGGBB`; `motion`: `off`, `subtle`, `expressive`. По умолчанию переходы 120ms / 180ms; индикатор настоящего pending вращается до результата, без выдуманного процента. Смена системного `prefers-reduced-motion` применяется CSS немедленно. При reduce/off остаётся статичная иконка pending, текст и результат; переходы и вращение отключены.

В `Example` кнопка имеет неизменную область и все подписи резервируют общий размер через grid. `aria-disabled` сохраняет фокус; обработчик блокирует повторный запуск в pending. Статус сообщает результат через `aria-live`, декоративные копии скрыты от accessibility tree. Tab/Space/Enter и touch используют одну и ту же native-кнопку. Ни фокус, ни операция не ждут завершения CSS.

Для собственного текста сохраняйте резервирование высоты и проверяйте длинные EN/RU/VI подписи при zoom 200%. Локализация не требует измерений/resize listeners. CSS Modules изолируют классы. Не применяйте reset, который убирает `:focus-visible`; не ставьте свой transform на декоративные icon/label слои.

## Проверка

1. На HTTPS или localhost выберите Clipboard и нажмите кнопку: успех возможен только после `writeText`. В браузере с отказом разрешения должен появиться error.
2. Выберите «Ошибка · симуляция»: появится явно обозначенная локальная ошибка. Серверных запросов нет.
3. Проверьте два экземпляра, быстрый повтор, переключение сценария во время pending, сброс и удаление компонента. Поздний success старой операции не должен затереть новый error.
4. Измените motion на off и настройку ОС reduce во время pending; проверьте клавиатуру, touch, размеры 320–1440px и EN/RU/VI.
5. Запустите обычные typecheck/build проекта в Next.js и Vite. Не называйте target проверенным без фактического отчёта.
6. Тесты чистого контроллера: Node 24+ `node --test controller.test.mjs` из корня комплекта. Это тест гонок и cleanup, не замена браузерной проверки.

Ограничение: Clipboard может завершаться настолько быстро, что pending не попадёт в кадр. Искусственная минимальная задержка специально отсутствует.
