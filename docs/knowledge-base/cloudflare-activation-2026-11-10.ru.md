# Подключение Cloudflare, 10.11.2026

По поручению Max Tall начато подключение существующего проекта через Chrome. Репозиторий публичный по прямому решению пользователя.

Реально создана отдельная D1 `tallshift-db-staging`, ID `4bb5fab5-5ec7-4e39-b5ba-9f662ba014be`. Подготовлен `prototype/wrangler.staging.jsonc`; домен staging — `preview.tallshift.com`, авторизация и продажи выключены до настройки и проверок. Production не менялся.

В форме Workers выбран GitHub MaxTallOfficial/tallshift, Worker tallshift-staging, каталог prototype. Дополнительные Preview builds выключены. Для staging использовать build `npm run build:cf:staging` и deploy `npx wrangler deploy --config wrangler.staging.jsonc`.

На момент записи деплой и удалённые миграции ещё не выполнены. Создание служебного токена сборки и передача ключа Hugeicons в зашифрованные build secrets запрошены отдельно; согласие не предполагается. Почтовый провайдер ещё не проверен.

Проверено: локальная Workers/OpenNext сборка с реальным staging-конфигом завершилась успешно; `git diff --check` чистый. SQL-запрос к новой облачной базе подтвердил отсутствие пользовательских таблиц (только системная `_cf_KV`).

## Фактическая публикация

Пользователь отдельно разрешил служебный токен сборки и зашифрованный секрет Hugeicons для Tallshift. Создан Workers Builds проект `tallshift-staging`, подключён GitHub main, root prototype, NODE_VERSION=24; значение Hugeicons сохранено как encrypted build secret. Дополнительные preview builds выключены.

Cloudflare build `51aecfc5-541e-4488-ac4e-0157754dea65` завершился успешно (3m59s), опубликован https://preview.tallshift.com/ru. Production tallshift.com не менялся. Стандартный адрес workers.dev у staging выключен.

Обе миграции применены через D1 SQL Console к новой пустой staging-базе. Проверены 7 auth-таблиц, 4 TON-таблицы и 3 защитных триггера; добавлена стандартная таблица Wrangler d1_migrations с обеими записями, затем выполнено контрольное чтение.

Проверено по HTTPS: EN/RU/VI возвращают 200, html lang соответствует языку, 11 script nonce совпадают с CSP, unsafe-eval отсутствует, frame-ancestors none. Браузер Chrome показал существующий интерфейс и иконки. API readiness честно возвращает enabled=false,emailReady=false.

Не включено: авторизация (не настроена отправка писем), продажи, отдельный публичный сервер интерактивных примеров. На главной показано честное сообщение о недоступном сервере превью. Панель Email Sending требует Workers Paid; покупка не выполнялась. Пользователю предложен выбор почтового сервиса. Включение GitHub Actions и ручные запуски не выполнялись.

Доказательства: локальные `/tmp/tallshift-staging-live-checks.json` и `/tmp/tallshift-staging-live.png`. Эти результаты не означают проверки реальной регистрации/почтовой доставки или пользовательского утверждения UI.

## Production и Resend: подключение в работе

Пользователь выбрал бесплатный Resend, самостоятельно зарегистрировался и подтвердил вход; отдельно разрешил DNS и Sending API key только для Tallshift. Создан Resend domain tallshift.com в Tokyo. Добавлены TXT resend._domainkey и DNS-only CNAME rsend/send по данным интерфейса Resend; публичный DNS подтвердил значения. Входящие MX/SPF Cloudflare Email Routing не менялись.

Создана отдельная D1 tallshift-db-prod, ID e33e431b-18cc-4dc4-9ff0-3227b8511d1e. Обе SQL-миграции применены, схема проверена. Подготовлен production конфиг и build:cf:production, локальная OpenNext сборка успешна. AUTH_ENABLED=true в конфиге требует настоящих runtime AUTH_SECRET и почтового ключа; без них readiness не должна объявлять готовность. COMMERCE/TON false. На момент этой записи основной сайт ещё не опубликован.
