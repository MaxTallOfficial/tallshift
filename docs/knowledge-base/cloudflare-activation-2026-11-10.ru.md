# Подключение Cloudflare, 10.11.2026

По поручению Max Tall начато подключение существующего проекта через Chrome. Репозиторий публичный по прямому решению пользователя.

Реально создана отдельная D1 `tallshift-db-staging`, ID `4bb5fab5-5ec7-4e39-b5ba-9f662ba014be`. Подготовлен `prototype/wrangler.staging.jsonc`; домен staging — `preview.tallshift.com`, авторизация и продажи выключены до настройки и проверок. Production не менялся.

В форме Workers выбран GitHub MaxTallOfficial/tallshift, Worker tallshift-staging, каталог prototype. Дополнительные Preview builds выключены. Для staging использовать build `npm run build:cf:staging` и deploy `npx wrangler deploy --config wrangler.staging.jsonc`.

На момент записи деплой и удалённые миграции ещё не выполнены. Создание служебного токена сборки и передача ключа Hugeicons в зашифрованные build secrets запрошены отдельно; согласие не предполагается. Почтовый провайдер ещё не проверен.

Проверено: локальная Workers/OpenNext сборка с реальным staging-конфигом завершилась успешно; `git diff --check` чистый. SQL-запрос к новой облачной базе подтвердил отсутствие пользовательских таблиц (только системная `_cf_KV`).
