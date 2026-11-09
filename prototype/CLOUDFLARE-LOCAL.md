# Tallshift: local Cloudflare integration

Use Node 24 and run these commands from `prototype`. Existing Vite and Next commands remain intact.

```sh
npm ci --ignore-scripts
npm run db:migrate:local
npm run build:cf
npm run dev:cf
```

The default configuration is **local only**: database ID is a local placeholder; auth, commerce and TON sales are disabled. No cloud account is needed for this local sequence. `wrangler.staging.example.jsonc` and `wrangler.production.example.jsonc` are separate templates with deliberately invalid database-ID placeholders. Do not deploy the local config. Do not rewrite migrations already applied elsewhere.

After starting the local Worker:

```sh
node scripts/smoke-cf.mjs
node --test tests/auth.test.ts
npm run test:ton
```

The OpenNext adapter is pinned at 1.20.15 because it accepts the existing Next16.4.2. Its handling of the Node proxy is experimental. Local checks cover CSP nonces and headers, but are not a production-support guarantee. Do not remove the proxy/CSP or weaken headers to silence adapter warnings.

## Enabling authentication later

Copy `.dev.vars.example` to ignored `.dev.vars` and configure actual bindings/secrets outside Git. Auth requires D1, `AUTH_ENABLED=true`, a random `AUTH_SECRET` of at least32characters and an exact HTTPS `APP_URL`. Use local HTTPS when testing real browser sessions. Cookies are Secure/HttpOnly/host-only. `AUTH_LOCAL_MAIL` is reserved and does not currently implement delivery; setting it does not activate email.

Registration/recovery additionally require a reviewed HTTPS mail endpoint accepting `{from,to,subject,text}`, `AUTH_EMAIL_API_KEY` and `AUTH_EMAIL_FROM`. Without delivery configuration those operations fail closed; messages and tokens are not printed to logs. Existing sign-in and already issued verification/reset tokens do not depend on mail-service availability.

Auth pages: `/{en|ru|vi}/auth/login`, `register`, `forgot-password`, `reset-password`, `verify-email`. Mutation API is under `/api/auth`; it requires a CSRF challenge from POST `/api/auth/csrf`, exact Origin, same-origin JSON and `x-csrf-token`. The browser never stores auth credentials in localStorage. D1 primary reads, hashed session tokens, atomic action tokens and reset/session revocation are implemented. Routes do not expose the general Better Auth handler.

## What is still separate

The TON module is prepared but has no live public payment routes, scheduler, FX provider or fulfillment adapter. Account authentication does not grant purchases. Server quotes, real order/grant history, published paid assets, legal/tax settings, private delivery and the live checkout remain unfinished; sales stay disabled. Free downloads and browser-local favorites remain available without signing in.

Production preparation still needs real Cloudflare DB identifiers, secrets, a configured sender, supported/accepted proxy-adapter strategy, device/security/load/restore checks and an explicit deploy step. Staging main-site auth is distinct from the cookie-free demo service on a different registrable domain. No production resources or remote migrations were created by the local work.
