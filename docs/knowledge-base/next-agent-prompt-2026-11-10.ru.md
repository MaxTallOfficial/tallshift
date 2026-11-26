# Промпт следующему агенту Tallshift · 10.11.2026

Продолжай разработку Tallshift, не начинай сделанное заново. Репозиторий https://github.com/MaxTallOfficial/tallshift теперь публичный, ветка main, последний отправленный коммит 0c4d7c06a5cae3e3a3c97c33d2887c023eeed394. Рабочая папка: `/Users/maxtall/Documents/ChatGPT/Vibelock (временное название) 2`. Приложение и npm-команды — в `prototype`. Сначала проверь Git и текущий код.

Прочитай AGENTS.md, design.md и документы в docs/knowledge-base:
- handoff-2026-11-06.ru.md;
- cloudflare-activation-2026-11-10.ru.md;
- cloudflare-local-migration-2026-11-10.ru.md;
- payments-integration-2026-11-10.ru.md;
- ton-payments-handoff-2026-11-07.ru.md;
- domain-mailboxes-2026-11-10.ru.md;
- hallmark-workflow.ru.md, hallmark-security-2026-11-05.ru.md, copy-review.ru.md.

Дополнительно prototype/CLOUDFLARE-LOCAL.md. Старые отчёты содержат устаревшие «нет авторизации/деплоя» и «5 готовых примеров»: учитывай дату и новые документы.

## Текущее состояние

1. Главная, каталог, материал, тарифы, расчёт покупки, кабинет, справка и auth UI на RU/EN/VI. Реальное избранное в localStorage. Девять Free-примеров: A001, C001, C002, E001, S003, S001, S002, A003, A006. Остальные 23 paid planned. Не выдавай их за готовые.
2. Основной сайт https://tallshift.com, тестовый https://preview.tallshift.com опубликованы в Cloudflare Workers через OpenNext. Workers tallshift/tallshift-staging, отдельные D1 tallshift-db-prod/tallshift-db-staging. Используй реальные wrangler.production.jsonc / wrangler.staging.jsonc, локальный wrangler.jsonc не деплой. Next16.4.2, React19.3.1, OpenNext1.20.15, Wrangler4.158.0; версии не обновлять автоматически. Node proxy в OpenNext экспериментальный; CSP/nonces прошли live smoke, защиту не ослаблять.
3. Production AUTH_ENABLED=true, Better Auth/Drizzle/D1, отзываемые сессии, CSRF, лимиты, подтверждение email и сброс реализованы. Resend Free настроен, tallshift.com Verified, отправитель Tallshift <no-reply@tallshift.com>. AUTH_SECRET и ограниченный Sending API key — зашифрованные runtime secrets Cloudflare; Hugeicons key — отдельный encrypted build secret. Не читать/выводить значения без необходимости. Тестовое письмо реально пришло в Gmail INBOX. Readiness enabled=true,emailReady=true; реальный CSRF200 и ошибочный вход401 проверены. Полная регистрация→письмо→подтверждение→вход→сброс→отзыв ещё не проверена.
4. Email Routing: support@tallshift.com, tallback@tallshift.com, mt@tallshift.com → mtalldesign@gmail.com, все Active, destination Verified. По последнему решению пользователя это пересылка, не отдельные ящики. Zoho не подключать. Отправка из Gmail от этих адресов не настроена; доставка каждого forwarding отдельно не проверена.
5. TON и USDT только в сети TON. Модуль проверки переводов, D1 invoices/events/outbox, inbox worker, finality/deduplication готов локально. В новом src/server/orders — immutable server quotes, atomic idempotent pending orders, реальные auth/CSRF/rate helpers и связь с TON. paid не означает delivered. publishedPaidReleases пустой. Публичные payment/order маршруты и checkout UI не подключены. COMMERCE_ENABLED=false и TON_PAYMENTS_ENABLED=false. Миграции0001/0002 применены к обеим облачным базам; 0003_commerce.sql только локальная, НЕ применять автоматически к production.
6. Подтверждённый публичный TON-адрес: UQAwPV9w4h7ZP0CVe3QoJoJfVaYjrxp9Eqc3TSl6nENDaq2i. Не использовать временный TRON bridge-адрес, seed/private key не нужны. Bybit отложен.
7. Последние локальные проверки:270/270 npm test, TypeScript next и diff-check pass.82 focused=10commerce+67TON+5auth. Workers builds и HTTPS EN/RU/VI/nonces проверены на этапе публикации; автоматические сборки после последнего0c4d7c0 отдельно ещё не проверены. Не называй SQLite fixtures реальной покупкой.

## Приоритет продолжения

Составь короткий план и работай в несколько агентов с непересекающимися файлами.

1. Проверить последние облачные сборки и завершить отдельный публичный сервер интерактивных демо. Сейчас на живой главной честная заглушка «сервер превью не настроен». Уже есть Vite preview, строгий postMessage bridge и deployment-policy. Нужен другой registrable domain, без auth/DB/payment secrets; подходящий workers.dev можно проверить. Настроить оба origin и CSP, проверить девять Free-примеров, RU/EN/VI, desktop/mobile. Не переписывать готовый bridge.
2. Пройти настоящий auth E2E с контролируемым пользователем/почтой, проверить ошибки, single/all logout и reset revocation. Пароль пользователя не придумывать и не выводить; при обязательном личном шаге передать управление. Не обходить верификацию письма.
3. Продолжить коммерческий запуск по payments-integration: реальные paid release ZIP/hash/private storage, server ownership/grants/receipts, seller/terms/tax, настоящий FX для TON и USDT, staging0003, host/routes, webhook+cron/backfill, private idempotent fulfillment. Не предполагать USDT=$1. Затем E2E всей цепочки и RU/EN/VI checkout. До готовых платных файлов принимать деньги нельзя. Цены из существующего контракта: Product$16, All packs$39, eligible upgrade$23; клиент не authority цены/оплаты.
4. Закрыть оставшуюся визуальную/редакторскую проверку S001/S002/A003/A006 и упаковки CSS Modules: исторические recipes check:design56FAIL/4REFLEX/2WARN не объявлять исправленными. Immutable publisher/registry и production delivery gates ещё требуют проверки. Затем развивать23paid позиции по ТЗ; выбрать первый законченный платный набор, не имитировать весь каталог.

## Правила

Сохраняй Manrope/Saffron и общие компоненты. Hugeicons Duotone Rounded через SystemIcon/SystemDisclosureIcon; Pro paths и ключи в экспорт не копировать. Для новых страниц подключай копирайтера, журнал copy-review; после текстов реальная вёрстка всех3языков. Hallmark только внутри утверждённой системы: читать установленный SKILL.md, запускать только защищённый локальный npm run check:design; ничего владельцу Hallmark/Together AI не отправлять.

Доступ к Chrome/GitHub/Cloudflare пользователь разрешил для Tallshift. Внутренний AI Cloudflare не умеет читать GitHub по одному подключению: при необходимости давать конкретный публичный текст, без секретов; не слать ему старые небезопасные auth-шаблоны. Не покупать тарифы и не создавать новый доступ без необходимых подтверждений. Основные проверки локально, изменения объединять, лишние push/workflow не делать. Ручные GitHub Actions не запускать. Сохранять решения в KB, различать реализовано/проверено/утверждено. Экономить токены, давать короткие обновления и доводить выбранный этап до проверяемого результата.
