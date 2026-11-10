# Отдельные Workers демо · подготовка 10.11.2026

Добавлен `prototype/scripts/prepare-preview-worker.mjs`. Использует существующую deployment-policy (HTTPS, другой registrable domain), проверяет совпадение parent origin со скомпилированным JS, пишет CSP/защитные headers и отдельный assets-only Wrangler config без bindings/secrets. Bridge не менялся. Нужны два Worker и две сборки: bridge доверяет ровно одному parent origin.

Из prototype, после определения настоящего account workers.dev subdomain:

```sh
VITE_PREVIEW_PARENT_ORIGIN=https://tallshift.com npm run build:preview
PREVIEW_PARENT_ORIGIN=https://tallshift.com PREVIEW_ORIGIN=https://tallshift-demo.ACCOUNT.workers.dev PREVIEW_WORKER_NAME=tallshift-demo node scripts/prepare-preview-worker.mjs
WRANGLER_SEND_METRICS=false npx wrangler deploy --config wrangler.preview.generated.json
```

Для staging повторить сборку с `VITE_PREVIEW_PARENT_ORIGIN=https://preview.tallshift.com`, затем генерацию с `PREVIEW_PARENT_ORIGIN=https://preview.tallshift.com`, `PREVIEW_ORIGIN=https://tallshift-demo-staging.ACCOUNT.workers.dev`, `PREVIEW_WORKER_NAME=tallshift-demo-staging`. Не загружать production bundle в staging: parent зафиксирован в JS.

Проверено локально: Vite preview build pass; генерация с синтетическим workers.dev origin pass; Wrangler deploy --dry-run pass, 6 assets, no bindings. Настоящий subdomain не установлен, публикация не выполнялась. CLI Wrangler не авторизован; использовать существующую Cloudflare-сессию без поиска токенов. После публикации отдельно подключить NEXT_PUBLIC_PREVIEW_ORIGIN и main CSP, проверить девять демо RU/EN/VI desktop/mobile. Эта подготовка не означает живой проверки демо.

## Подключение к живому сайту

По запросу Max Tall начато развёртывание всех девяти готовых демо. Настоящий account subdomain — mtalldesign.workers.dev (подтверждён панелью Workers Domains). Подготовлены build:demo:production/staging и NEXT_PUBLIC_PREVIEW_ORIGIN для соответствующих основных сборок. Production demo — tallshift-demo.mtalldesign.workers.dev, staging — tallshift-demo-staging.mtalldesign.workers.dev. Каждая сборка доверяет ровно своему parent origin.

До отправки изменений проверено: обе Vite demo build, обе Wrangler deploy --dry-run (6 assets, no bindings), Next/OpenNext production build и270/270 Node tests. В момент записи публичные demo Workers ещё создаются; локальные результаты не считать live QA.
