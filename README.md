# VisionCart

VisionCart is a privacy-first mobile virtual try-on platform for glasses, watches,
rings, earrings, and nose pins.

## Repository layout

- `apps/mobile` — React Native iOS and Android application
- `apps/api` — FastAPI backend
- `packages/contracts` — shared API and domain contracts
- `packages/tryon-sdk` — native try-on SDK contract and platform engines
- `packages/design-system` — shared UI tokens and components
- `packages/analytics` — privacy-safe analytics contracts
- `tooling/assets` — 3D asset validation and conversion tooling
- `infra/local` — local PostgreSQL and object storage
- `docs` — product, architecture, and implementation documentation

## Prerequisites

- Node.js 22.11 or newer
- Corepack
- Yarn 4.17.1
- Python 3.12 and `uv`
- Ruby/CocoaPods for iOS
- Android Studio/JDK for Android
- Docker for local backend services

## Setup

```sh
corepack enable
yarn install
uv sync --project apps/api
uv sync --project tooling/assets
```

If Corepack cannot download Yarn from `repo.yarnpkg.com`, the equivalent npm
distribution can run it:

```sh
npx -y @yarnpkg/cli-dist@4.17.1 install
```

## Common commands

```sh
yarn mobile:start
yarn mobile:ios
yarn mobile:android
yarn api:dev
yarn infra:up
yarn check
```

## Planning documents

Start with:

1. `docs/07_VisionCart_Master_Implementation_Plan.md`
2. `docs/06_VisionCart_Monorepo_Implementation_Blueprint.md`

Never commit secrets, signing credentials, raw camera data, or licensed
production assets without an approved repository policy.
