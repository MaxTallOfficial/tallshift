# Панели и тарифы: четыре финальных правки

26 октября 2026. Реализованы замечания Max Tall из browser comments. Служебный статус стенда отделён от законченной подачи тарифов для будущего сайта.

## Результат

1. Очистка полей использует Hugeicons Duotone Rounded `trash` вместо replay. Сохранены доступное название, tooltip, очистка локальной формы и общая высота ряда действий.
2. Меню действий с файлом и нижний контейнер списка теперь совпадают по наружным левой/правой границам: снят второй горизонтальный padding toolbar. На 768/968/1440 px разница левых границ = 0.
3. Для панелей введён общий CSS-источник system-layout-metrics.css. Большие панели — 32/24/16 px; карточки — 24/20/16 px; диапазоны ≥1024 / 768–1023 / ≤767. Workbench header/toolbar/content/settings, формы и их side panels, action/feedback/progress/floating/modal/configuration specimens используют одну роль. Native dialog/side-sheet синхронизирует header/body/footer. Компактные меню/tooltip/popover и внутренние строки списков сохраняют отдельную плотность.
4. Тарифы оформлены как законченный интерфейс: Starter $0, Product $16, All packs $39. Удалены видимые технические пометки из карточек, сохранена служебная review-пометка вне них. Выбор открывает сводку состава, лицензии, обновлений и разовой суммы. Product остаётся единственным акцентным предложением. Подписи под CTA резервируют одинаковые две строки.

## Логика тарифов

[Финальный рабочий контракт](../spec-v1.0/pricing-final-contract.ru.md) определяет состав 9/6/23, лицензии/обновления, точные minor-unit цены, выбор, ownership/partial/upgrade/owned, возвраты и неизменяемые snapshots.

Reference-функция pricing-quote.ts считает best-eligible quote: минимум пропорционального missing-состава и допустимого перехода из Product. При Product, купленном за $16, сумма перехода = $23 до налогов. При дополнительных покупках сумма не увеличивается. При полном владении — Downloads с нулём оплаты и без новой выдачи. Новая положительная покупка выдаёт только missing IDs; прежние окна обновлений не продлеваются молча.

AccessStatesLab принимает optional ownership и onOpenDownloads для будущего аккаунтного окружения. Эти параметры в production должны приходить из подтверждённых серверных данных; клиентский reference-расчёт не выдаёт права. Текущий stand показывает нового покупателя. Обычный SystemOffer.action сохраняет запрет покупки planned-offer; selectionAction — отдельный просмотр/выбор, не checkout.

Реальные платежи, аккаунт, серверная выдача и готовность 32 материалов не создаются оформлением карточек. commerce_enabled=false и data-availability сохранены. В сводке стенда переход к оплате отключён; Starter открывает реально существующее демо A001.

## Проверка

- 119/119 тестов: цены синхронизированы с catalog.json; новые/полные/частичные покупки, Product-upgrade, cap старой цены, discounted receipt, invalid minor units, монотонность quote и отсутствие бесплатных новых paid-ID при missing>0. Отдельный SSR-тест различает просмотр planned-offer и покупку.
- Сборка стенда, пересборка tgz и независимые Next/Vite production-сборки установленного пакета прошли. Предупреждение JS-чанка >500 kB сохраняется.
- 8 схем / 59 проверок planned fixtures прошли; это не release verification.
- Browser: EN/RU/VI × 320/768/1440; Product summary содержит 6 материалов и $16, header/body/footer имеют 16/24/32 px соответственно, оплата disabled, переполнения страницы нет. All packs summary — 23 и $39; Starter — 9 и $0. Закрытие возвращает фокус к кнопке выбора.
- Панельные направляющие дополнительно проверены на 968 px. В девяти выбранных крупных панелях одинаковое значение отступов на каждой ширине. Корзина подтверждена по semantic icon key. Карточки не содержат видимых planned/hypothesis/«в подготовке» пометок.

Evidence: [карточки](evidence/panels-pricing-2026-10-26/pricing-cards.png), [сводка выбора](evidence/panels-pricing-2026-10-26/selection-summary.png), [workbench](evidence/panels-pricing-2026-10-26/workbench-rails.png), [очистка](evidence/panels-pricing-2026-10-26/clear-fields-trash.png), [замеры](evidence/panels-pricing-2026-10-26/browser-checks.json).
