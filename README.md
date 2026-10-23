# Tallshift

**by Max Tall** · [Naming and brand conventions (RU)](docs/branding.ru.md)

Repository: [MaxTallOfficial/tallshift](https://github.com/MaxTallOfficial/tallshift).

Work in progress: an original UI and motion library for developers and AI-assisted builders. Materials combine React + TypeScript source, an adaptation prompt, and integration instructions for Next.js and Vite.

This repository preserves the current project snapshot: product specifications, research, prototypes, design studies, historical iterations, source code, screenshots, and verification evidence.

## Current status

- **Afterlight Instrument**, **Manrope**, and **Saffron Lighter `#EBD183`** form the chosen visual foundation.
- **Foundations / 10** completes the v1 implementation: 44 shared API families, 228 tokens, a local typed package and passing Next.js/Vite consumer builds. Visual approval and broader browser/assistive-technology release acceptance remain pending.
- English is the default language; Russian and Vietnamese are supported.
- **A001 State Relay** is the working material. Other catalog entries remain planned unless their implementation status says otherwise.
- Account, checkout, paid delivery, and server-side entitlements are not implemented in the review stand.

## Start here

| Area | Entry point |
| --- | --- |
| Latest design-system review | [Foundations / 10](art-direction/foundations/review.html) |
| Latest implementation and verification report | [Foundations / 10 report (RU)](docs/art-direction-2026/foundations-10.ru.md) |
| Design-system contract | [Contract (RU)](docs/art-direction-2026/design-system-contract.ru.md) |
| New component APIs | [Catalog](docs/art-direction-2026/catalog-compositions-10.ru.md), [shell + offers](docs/art-direction-2026/shell-offer-compositions-10.ru.md), [workbench](docs/art-direction-2026/workbench-compositions-10.ru.md), [Modals](docs/art-direction-2026/modal-primitives-09.ru.md), [floating surfaces](docs/art-direction-2026/floating-primitives-09.ru.md), [feedback](docs/art-direction-2026/feedback-primitives-09.ru.md), [Forms](docs/art-direction-2026/form-primitives-08.ru.md), [actions + tabs](docs/art-direction-2026/action-primitives-08.ru.md), [existing /07 APIs](docs/art-direction-2026/component-api-07.ru.md) |
| Product specification | [Product specification v1.0 (RU)](docs/product-spec-v1.0.ru.md) |
| Catalog and planned delivery | [Canonical catalog](docs/spec-v1.0/catalog.json) |
| Engineering and security | [Engineering and security specification (RU)](docs/spec-v1.0/engineering-and-security.ru.md) |

GitHub displays HTML as source. Serve `art-direction` locally to use the interactive stand.

## Install the local UI package

[Package archive](packages/tallshift-ui/tallshift-ui-0.1.0.tgz) · [Instructions](packages/tallshift-ui/README.md). It is private and not published to npm.

## Run the saved stand

Requires Python 3:

```sh
python3 -m http.server 4181 --bind 127.0.0.1 --directory art-direction
```

Open `http://127.0.0.1:4181/foundations/review.html`. The packaged stand includes its styles, scripts, and fonts.

## Work on the source

Requires Node.js 24 or newer and npm:

```sh
npm --prefix prototype ci
npm --prefix prototype run dev
```

Build the standalone Foundations stand:

```sh
npm --prefix prototype run build:foundations
```

This regenerates `art-direction/foundations/review.html` and the companion built assets. Archived standalone studies are kept separately in `art-direction/`.

## Verification

```sh
npm --prefix prototype test
npm --prefix prototype run test:study
```

The /10 suite passes 99 tests and 12 source/prompt/ZIP cases. Installed local package builds pass in Next.js 16.4.3 and Vite 8.3.5; browser checks cover consumer interactions and EN/RU/VI at 320/768/1440 px. See [the /10 report](docs/art-direction-2026/foundations-10.ru.md).

The recorded / 07 results include 36 system tests, 108 export configurations, ZIP checksum verification, and EN/RU/VI browser checks at 320/390/768/1024/1440 px. See [the evidence directory](docs/art-direction-2026/evidence/foundations-07/) for exact scopes and limitations. These checks do not establish complete production, accessibility, or target-framework acceptance.

## Repository layout

```text
art-direction/                 Standalone review pages, assets, historical studies
docs/                          Product specifications, contracts, research, reports
docs/art-direction-2026/        Design-system documentation, screenshots, evidence
prototype/src/                 React + TypeScript application and design-system source
prototype/recipe-exports/      State Relay recipe implementation
prototype/scripts/             Packaging and verification helpers
prototype/tests/               Automated checks
```

Dependencies, transient build caches, local QA scratch files, and environment credentials are excluded from Git. Product documentation and retained review artifacts are included.
