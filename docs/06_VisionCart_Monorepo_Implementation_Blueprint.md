# VisionCart Monorepo Implementation Blueprint

## Purpose

Ye document VisionCart MVP ko default React Native repository se production-ready monorepo mein convert karne ki locked technical configuration aur phase-by-phase execution guide hai. Iska maqsad implementation ke waqt architecture, folders, tooling, contracts, environments, testing aur release gates dobara decide karne ki zarurat ko minimum karna hai.

Source documents:

- `01_VisionCart_MVP_Product_Requirements_Document.docx`
- `02_VisionCart_MVP_Scope_User_Flows_and_Acceptance_Criteria.docx`
- `03_VisionCart_Technical_Architecture_and_Technology_Decisions.docx`
- `04_VisionCart_Native_TryOn_SDK_Specification.docx`
- `05_VisionCart_3D_Asset_Specification_QA_and_Roadmap.docx`

## 1. Locked baseline decisions

### Repository and package management

- Ek hi Git repository mein mobile app, backend, shared contracts, native try-on package, asset tooling, infrastructure aur documentation rahenge.
- JavaScript/TypeScript package manager: Yarn 4.
- Yarn mode: `nodeLinker: node-modules`. Plug'n'Play use nahi hoga kyun ke React Native CLI, CocoaPods aur native autolinking ke saath `node_modules` mode zyada predictable hai.
- Yarn ka exact version bootstrap ke waqt Corepack se activate karke root `package.json` ke `packageManager` field mein pin hoga.
- JavaScript task orchestration: Turborepo.
- Python package management: `uv`; backend aur asset tools alag Python projects honge, lekin isi repository mein.
- Node baseline: repository ki current requirement `>=22.11.0`.
- Python baseline: 3.12.
- Lockfiles commit honge:
  - Root `yarn.lock`
  - `apps/api/uv.lock`
  - `tooling/assets/uv.lock`
  - `apps/mobile/ios/Podfile.lock`
- Existing `package-lock.json` monorepo migration verify hone ke baad remove hoga. npm aur Yarn lockfiles parallel maintain nahi honge.

### Product scope defaults

- Guest browsing aur guest try-on P0 hain.
- Optional Firebase sign-in P0 hai; social providers ko feature flags se enable kiya jayega.
- P0 filters: category, brand aur color.
- In-session product switching P1 hai.
- Full admin web portal P1 hai; P0 import protected API plus CLI se hoga.
- Native try-on full-screen modal hoga. Embedded Fabric view MVP mein nahi hoga.
- Glasses first production vertical slice hai.
- Raw camera frames, face/hand meshes aur biometric geometry device se upload nahi honge.
- Native checkout nahi hoga; seller handoff validated external URL/deep link se hoga.

### Platform baseline

- React Native New Architecture aur Hermes enabled rahenge.
- iOS minimum target: 16.0.
- Android minimum target: API 29, Android 10.
- iOS native language: Swift.
- Android native language: Kotlin.
- iOS renderer: RealityKit.
- Android renderer: Filament.
- Primary cross-platform landmark engine: MediaPipe.
- ARKit face tracking supported iOS devices par benchmarked/selected engine ho sakta hai.
- ARCore/Vision fallback sirf benchmark evidence aur device-tier rules ke mutabiq enable honge.

### Backend and data baseline

- Backend: FastAPI modular monolith.
- Database: PostgreSQL 16.
- ORM/migrations: SQLAlchemy 2 plus Alembic.
- Validation/settings: Pydantic 2 plus `pydantic-settings`.
- Authentication: Firebase ID tokens; backend token signature, issuer, audience, expiry aur revocation policy verify karega.
- Local object storage: MinIO.
- Production object storage: S3-compatible bucket plus CDN.
- Redis/queue Phase 0–MVP mein nahi; sirf measured asynchronous workload par add hoga.
- API prefix: `/v1`.
- API schema OpenAPI source of truth hoga.

## 2. Target monorepo structure

```text
visioncart/
├── apps/
│   ├── mobile/
│   │   ├── android/
│   │   ├── ios/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── features/
│   │   │   ├── navigation/
│   │   │   ├── services/
│   │   │   ├── state/
│   │   │   ├── storage/
│   │   │   └── testing/
│   │   ├── App.tsx
│   │   ├── index.js
│   │   ├── metro.config.js
│   │   └── package.json
│   └── api/
│       ├── src/visioncart_api/
│       │   ├── api/
│       │   ├── auth/
│       │   ├── catalog/
│       │   ├── assets/
│       │   ├── favorites/
│       │   ├── tryon/
│       │   ├── users/
│       │   ├── audit/
│       │   └── core/
│       ├── migrations/
│       ├── tests/
│       ├── pyproject.toml
│       ├── uv.lock
│       └── package.json
├── packages/
│   ├── contracts/
│   │   ├── openapi/
│   │   ├── schemas/
│   │   ├── generated/
│   │   └── package.json
│   ├── tryon-sdk/
│   │   ├── src/
│   │   ├── ios/
│   │   ├── android/
│   │   ├── specs/
│   │   └── package.json
│   ├── design-system/
│   ├── analytics/
│   ├── config-eslint/
│   └── config-typescript/
├── tooling/
│   └── assets/
│       ├── src/visioncart_assets/
│       ├── schemas/
│       ├── blender/
│       ├── tests/
│       ├── fixtures/
│       ├── pyproject.toml
│       ├── uv.lock
│       └── package.json
├── assets/
│   ├── source/
│   ├── runtime/
│   ├── metadata/
│   ├── previews/
│   └── fixtures/
├── infra/
│   ├── local/
│   │   └── docker-compose.yml
│   ├── environments/
│   │   ├── staging/
│   │   └── production/
│   └── monitoring/
├── docs/
├── scripts/
├── .github/workflows/
├── .yarnrc.yml
├── package.json
├── turbo.json
├── yarn.lock
└── README.md
```

### Workspace boundaries

- `apps/mobile` sirf product UI, navigation, app state, API calls aur native SDK invocation own karega.
- `apps/api` business data, auth verification, asset resolution, favorites, session summaries aur admin import own karega.
- `packages/contracts` OpenAPI, JSON Schemas aur generated TypeScript models ka source hoga.
- `packages/tryon-sdk` React Native Codegen contract aur dono native engines ka package hoga.
- `packages/design-system` reusable UI primitives/tokens own karega; feature business logic nahi.
- `packages/analytics` privacy-safe event names, payload types aur validation own karega.
- `tooling/assets` validation/conversion/publishing CLI own karega.
- `assets` source/runtime files ka development fixture area hoga. Production binaries object storage mein honge; large licensed production assets ko normal Git history mein commit nahi kiya jayega.
- `infra` local services aur deployment definitions own karega.

## 3. Root monorepo configuration

### Root `package.json`

Bootstrap ke waqt root package ko app package se workspace orchestrator mein convert karna hai:

```json
{
  "name": "visioncart",
  "private": true,
  "packageManager": "yarn@4.17.1",
  "workspaces": [
    "apps/*",
    "packages/*",
    "tooling/*"
  ],
  "engines": {
    "node": ">=22.11.0"
  },
  "scripts": {
    "dev": "turbo run dev --parallel",
    "mobile:start": "yarn workspace @visioncart/mobile start",
    "mobile:ios": "yarn workspace @visioncart/mobile ios",
    "mobile:android": "yarn workspace @visioncart/mobile android",
    "api:dev": "yarn workspace @visioncart/api dev",
    "infra:up": "docker compose -f infra/local/docker-compose.yml up -d",
    "infra:down": "docker compose -f infra/local/docker-compose.yml down",
    "generate": "turbo run generate",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "build": "turbo run build",
    "check": "yarn lint && yarn typecheck && yarn test"
  }
}
```

Yarn `4.17.1` repository ke `.yarn/releases` folder mein vendored aur `yarnPath` se locked hai; bina deliberate dependency upgrade ke ye version change nahi hoga.

### `.yarnrc.yml`

```yaml
nodeLinker: node-modules
enableGlobalCache: false
compressionLevel: mixed
```

- Local project cache reproducible installs ke liye use hogi.
- Zero-install initially use nahi hoga; `.yarn/cache` CI cache ho sakti hai, Git artifact nahi.
- Internal dependencies `workspace:*` protocol use karengi.

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "generate": {
      "outputs": ["generated/**", "src/generated/**"]
    },
    "lint": {
      "dependsOn": ["^generate"],
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^generate"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^generate"],
      "outputs": ["coverage/**"]
    },
    "build": {
      "dependsOn": ["^build", "generate"],
      "outputs": ["dist/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

Native iOS/Android builds remote-cache nahi honge jab tak deterministic native cache strategy prove na ho. Secrets ya signed artifacts Turbo cache mein nahi jayenge.

### Mobile Metro configuration

`apps/mobile/metro.config.js` workspace root watch karega aur hoisted modules resolve karega:

```js
const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

module.exports = mergeConfig(getDefaultConfig(projectRoot), {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
  },
});
```

- Symlink/workspace resolution dono iOS aur Android par smoke-test hogi.
- Metro config mein duplicate React copies allow nahi hongi.
- React, React Native aur native peer dependencies mobile workspace provide karega.

### TypeScript and linting

- Root shared configs `packages/config-typescript` aur `packages/config-eslint` se publish honge.
- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` enable honge.
- Generated contract files lint se exclude, lekin compile/typecheck mein include honge.
- Mobile path alias sirf stable package imports ke liye:
  - `@visioncart/contracts`
  - `@visioncart/design-system`
  - `@visioncart/analytics`
  - `@visioncart/tryon-sdk`
- App-internal deep aliases avoid honge taa ke refactors aur Jest/Metro mapping simple rahe.

## 4. Environment and secrets configuration

### Environments

- `local`: developer machine, local PostgreSQL/MinIO, Firebase emulator ya dedicated dev project.
- `test`: isolated test database and fake storage.
- `staging`: production-like cloud services, non-production Firebase project.
- `production`: separate accounts/projects/buckets/databases and restricted access.

### Files

- `.env.example` files commit honge.
- `.env`, service-account JSON, signing keys, certificates, API tokens aur private Firebase credentials commit nahi honge.
- Mobile public config build variants se inject hoga:
  - API base URL
  - Firebase public app config
  - environment name
  - analytics enabled flag
- Backend secrets environment/secret manager se:
  - database URL
  - Firebase project/audience
  - object-storage credentials
  - signed URL secret/policy
  - observability DSN
- Runtime config startup par validate hogi; missing required variable ke saath service fail-fast karegi.

### Mobile variants

- iOS schemes: `VisionCartDev`, `VisionCartStaging`, `VisionCart`.
- Android build types/flavors: `devDebug`, `stagingRelease`, `productionRelease`.
- Har environment ka unique bundle/application ID hoga.
- Production builds debug signing key use nahi karengi.
- Camera permission copy aur privacy manifests release review ka hissa honge.

## 5. Phase 0 configuration — Decisions, contracts and feasibility

### 5.1 Canonical contract rules

- OpenAPI backend endpoints ka source of truth.
- JSON Schema asset metadata, anchors, validation output aur license evidence ka source of truth.
- React Native Codegen spec native SDK bridge ka source of truth.
- Generated files manually edit nahi honge.
- Schema version fields mandatory:
  - `apiVersion`
  - `contractVersion`
  - `assetSchemaVersion`
  - `anchorProfileVersion`
  - `sdkVersion`

### 5.2 SDK public contract

Methods:

- `isSupported(category): Promise<CapabilityResult>`
- `preload(asset): Promise<PreloadResult>`
- `open(config): Promise<TryOnResult>`
- `clearCache(criteria): Promise<void>`

Session constraints:

- Ek waqt mein ek active try-on session.
- Concurrent `open` call typed `SESSION_ALREADY_ACTIVE` error return kare.
- `onClosed` single terminal event hoga.
- `onError` diagnostic/non-terminal hoga; fatal error ke baad exactly one `onClosed` result aayega.
- Cancellation app close/background policy se typed outcome return karegi.
- Temporary capture URI app cache directory mein hogi aur explicit TTL/cleanup policy follow karegi.

Lifecycle:

```text
idle -> preparing -> tracking -> rendering
rendering -> paused -> tracking
rendering -> captured -> rendering
preparing|tracking|rendering|paused -> failed -> closed -> idle
preparing|tracking|rendering|paused|captured -> closed -> idle
```

### 5.3 Typed error taxonomy

- `PERMISSION_DENIED`
- `PERMISSION_RESTRICTED`
- `DEVICE_UNSUPPORTED`
- `CATEGORY_UNSUPPORTED`
- `CAMERA_UNAVAILABLE`
- `ASSET_DOWNLOAD_FAILED`
- `ASSET_CHECKSUM_MISMATCH`
- `ASSET_FORMAT_UNSUPPORTED`
- `ASSET_METADATA_INVALID`
- `MODEL_LOAD_FAILED`
- `TRACKING_INITIALIZATION_FAILED`
- `TRACKING_LOST`
- `CAPTURE_FAILED`
- `SESSION_ALREADY_ACTIVE`
- `SESSION_INTERRUPTED`
- `THERMAL_LIMIT`
- `OUT_OF_MEMORY`
- `INTERNAL_ERROR`

Har error mein `code`, safe user message key, retryability, session ID aur privacy-safe diagnostics honge.

### 5.4 Initial measurable gates

Ye values first benchmark ke baad tighten ho sakti hain, magar Phase 0 spike ke liye baseline hain:

- Supported tier minimum: 24 FPS sustained.
- Target: 30 FPS.
- Warm camera preview: under 1.5 seconds.
- Cached asset ready: under 2.5 seconds.
- Stable tracking in normal lighting: under 1 second.
- Uncontrolled jump: zero acceptable.
- Low confidence: product freeze ya fade; random movement nahi.
- Ten repeated open/close cycles: camera lock, crash aur continuously growing memory nahi.
- Raw frame/network dependency: zero.

### 5.5 Feasibility spike outputs

- One simple GLB and matching USDZ fixture.
- iOS RealityKit loader prototype.
- Android Filament loader prototype.
- MediaPipe face and hand benchmark.
- ARKit face benchmark on supported iOS hardware.
- Device report containing FPS, load time, memory, thermal state, tracking recovery and failure reason.
- Decision record per category/engine/device tier.

## 6. Phase 1 configuration — Foundation and asset A0

### 6.1 Mobile application layers

- `src/app`: providers, boot sequence, environment and feature flags.
- `src/navigation`: typed root/catalog/try-on/settings navigators.
- `src/features/<feature>`: screens, hooks, queries, local components and tests.
- `src/services`: generated API client adapters, Firebase and linking.
- `src/state`: small cross-feature state only; server data query cache mein.
- `src/storage`: typed key-value abstraction and migrations.
- `src/testing`: render helpers, fixtures and mocks.

Rules:

- Server state TanStack Query mein.
- Small client state Zustand ya equivalent focused store mein.
- Secrets/state logs mein print nahi honge.
- Native try-on state JavaScript frame loop mein mirror nahi hoga.
- Features direct native internals import nahi karengi; sirf `@visioncart/tryon-sdk`.

### 6.2 Asset package contract

Per product variant:

```text
<product-id>/<variant-id>/<asset-version>/
├── source/model.glb
├── runtime/ios/model.usdz
├── runtime/android/model.glb
├── metadata/product.json
├── metadata/anchors.json
├── metadata/validation.json
├── metadata/license.json
└── previews/thumbnail.webp
```

Mandatory automated checks:

- Format and supported extension validation.
- SHA-256 checksum.
- Triangle, file-size and texture budgets by category.
- Unit meters, `+Y` up, `+Z` forward.
- Frozen scale `1,1,1` and identity rotation.
- Physical dimensions versus metadata tolerance.
- Mandatory anchor names by category.
- Missing/external textures.
- License and commercial-use evidence.
- Runtime derivative presence.
- Immutable version identifier.

Status transitions:

```text
draft -> technical_review -> device_qa -> approved -> published -> deprecated
```

Sirf `approved` asset publish ho sakta hai. Published binary overwrite nahi hogi; correction new asset version hogi.

### 6.3 Asset tooling commands

`tooling/assets` CLI ka stable interface:

```text
asset-cli inspect <package>
asset-cli validate <package>
asset-cli convert <package> --platform ios
asset-cli optimize <package> --platform android
asset-cli checksum <package>
asset-cli report <package> --format json
asset-cli publish <package> --environment staging
```

- Conversion tool versions lockfile/container image mein pin honge.
- Blender automation headless mode mein run hogi.
- Khronos glTF validator automated gate hoga.
- `publish` validation failure par hard stop karega.
- Production publish restricted CI/manual approval se hoga.

### 6.4 CI foundation

Pull request jobs:

- Yarn immutable install.
- Python `uv sync --locked`.
- Lint and formatting checks.
- TypeScript and Python type checks.
- Unit tests.
- OpenAPI/Codegen generation diff check.
- React Native Codegen diff check.
- Sample asset validation.
- Android debug compile.
- iOS compile macOS runner par.

Main branch:

- Same checks plus test reports/artifacts.
- Unsigned internal builds where appropriate.
- Staging deploy/publish explicit protected workflow se.

## 7. Phase 2 configuration — Backend and catalog

### 7.1 Backend modules

- `catalog`: categories, products and variants.
- `assets`: versions, anchors, licenses, validation status and signed resolution.
- `users`: Firebase user/guest mapping and deletion.
- `favorites`: local/account synchronization semantics.
- `tryon`: session start/summary and feedback.
- `auth`: Firebase verification and roles.
- `audit`: privileged action records.
- `core`: settings, database, errors, logging, request IDs and health.

### 7.2 Core database entities

- `users`
- `guest_identities`
- `products`
- `product_variants`
- `asset_versions`
- `anchor_profiles`
- `asset_licenses`
- `favorites`
- `tryon_sessions`
- `tryon_feedback`
- `audit_logs`

Requirements:

- UUID primary keys.
- UTC timestamps.
- Explicit foreign keys and deletion behavior.
- Published asset rows immutable except deprecation metadata.
- Unique checksum/version constraints.
- Seller URLs validated and normalized before approval.
- Raw captures/landmarks database mein nahi.
- Session telemetry privacy-safe aggregates only.

### 7.3 API conventions

- JSON uses camelCase externally; Python models snake_case internally.
- Standard error envelope:

```json
{
  "error": {
    "code": "ASSET_NOT_AVAILABLE",
    "message": "Safe user-facing message",
    "requestId": "uuid",
    "details": {}
  }
}
```

- Cursor pagination for product lists.
- Explicit filter allowlist.
- Request ID response header.
- Idempotency key admin imports aur session summary writes par.
- OpenAPI CI mein generated TypeScript client ko update karega.
- Public catalog APIs sirf approved/published assets return karengi.

### 7.4 Local infrastructure

Docker Compose services:

- PostgreSQL.
- MinIO.
- MinIO bucket bootstrap.
- API optional container.

Local ports `.env.example` mein documented honge. Health checks mandatory. Persistent volumes developer command se explicitly destroy honge; normal `infra:down` data delete nahi karega.

### 7.5 Authentication and authorization

- Guest ID random, non-biometric identifier hoga aur secure local storage mein rahega.
- Firebase ID token verification issuer, audience, signature and expiry validate karegi.
- Roles: `user`, `catalog_editor`, `asset_reviewer`, `admin`.
- Asset publish requires reviewer/admin permission.
- Admin actions audit log create karengi.
- Guest-to-user merge idempotent transaction hoga.
- Rate limits auth state and endpoint risk ke mutabiq honge.

## 8. Phase 3 configuration — Glasses vertical slice

### 8.1 End-to-end flow

```text
product detail
-> try-on request
-> capability check
-> permission education
-> camera permission
-> signed asset resolve
-> checksum verification
-> native session prepare
-> tracking stable
-> render and adjust
-> capture/save/share
-> close result
-> privacy-safe session summary
```

### 8.2 iOS engine

- ARKit face tracking supported devices par benchmarked path.
- MediaPipe/AVFoundation fallback only if approved by capability matrix.
- RealityKit scene and USDZ loader.
- Native composited capture.
- App lifecycle, interruption, thermal and memory callbacks.
- Main thread sirf UI/required rendering work; inference/render scheduling controlled queues par.

### 8.3 Android engine

- CameraX Preview plus ImageAnalysis.
- Backpressure: keep only latest frame.
- MediaPipe face landmarker.
- Filament/gltfio GLB loading.
- Render and inference threads bounded.
- Native composited capture.
- Activity/background/camera interruption cleanup.

### 8.4 Glasses placement

- Required anchors: `frame_root`, `bridge_anchor`, `left_temple`, `right_temple`.
- Scale calibrated real frame width and face-width estimate se.
- Bounded controls: scale, vertical offset and depth.
- Reset calibrated defaults restore kare.
- Low confidence par freeze/fade and guidance.
- Transparent lenses both renderers par approved material fixtures se compare hon.

### 8.5 Analytics

Allowed events:

- `product_viewed`
- `tryon_requested`
- `tryon_ready`
- `tracking_stable`
- `manual_adjustment`
- `tryon_captured`
- `tryon_shared`
- `seller_opened`
- `tryon_failed`
- `tryon_closed`

Allowed dimensions include product/category, device tier, engine, asset version, load time, time to stable, FPS bucket, quality bucket, adjustment type, duration, outcome and typed error.

Prohibited:

- Raw image.
- Face/hand mesh.
- Exact biometric measurements.
- Share destination app.

## 9. Phase 4 configuration — Consumer MVP shell

### Screens

- Launch/bootstrap.
- Guest/sign-in entry.
- Home/categories.
- Product list.
- Search.
- P0 filters.
- Product detail.
- Favorites.
- Recently tried.
- Settings/privacy.
- Unsupported-device explanation.

### Persistence

- Guest favorites/recent items local database or typed storage mein.
- Storage schema versioned and migrated.
- Sign-in par merge API local IDs ko idempotently reconcile kare.
- Account deletion local auth/session data clear kare aur server deletion request status show kare.
- Cache expiry product metadata aur assets ke liye separately define hoga.
- Capture app-owned cache mein temporary; explicit save ke baad photo library responsibility platform ki.

### Error and fallback behavior

- Camera denied: settings link plus browse fallback.
- Unsupported device: catalog/favorite/seller flows remain usable.
- Asset unavailable/corrupt: Try On disabled, product detail usable.
- Offline cached asset: allowed only after checksum validation.
- Seller app absent: HTTPS browser fallback.
- Invalid/unapproved seller domain: open block and safe message.
- Share canceled: error event nahi.
- Save denied/failed: share and session remain usable.

### Accessibility

- Dynamic type, contrast, labels and screen reader support non-camera screens par.
- Native camera controls labeled.
- Tracking quality sirf color se communicate nahi hogi; text/haptic where appropriate.
- Motion-sensitive guidance concise and dismissible.

## 10. Phase 5 configuration — Watch and ring

### Shared hand pipeline

- MediaPipe landmarks normalized into platform-independent coordinate model.
- Handedness and mirrored-camera behavior explicit fixtures se test.
- Temporal filter and jump rejection shared behavior spec follow kare.
- Tracking-loss timeout ke baad freeze/fade plus guidance.
- Cross-platform transform parity fixtures commit honge.

### Watch

- Anchors: `watch_root`, `dial_center`, `strap_axis`, optional `clasp`.
- Controls: left/right wrist, scale, rotation, vertical offset.
- Rigid/mildly approximated strap only.
- No guaranteed fit claim.

### Ring

- Anchors: `ring_root`, `ring_center`, `band_axis`, optional `gem_center`.
- Controls: hand, finger, scale, finger-axis slide, rotation, depth.
- Small-object smoothing stricter than watch.
- Product copy explicitly states visual preview, not ring-size measurement.

## 11. Phase 6 configuration — Earrings and nose pin

### Earrings

- Anchors: left/right root or mirror-safe root plus hook/post.
- Controls: left, right, both; scale and vertical offset.
- Face-derived estimated ear positions.
- Hair occlusion limitation guidance.
- Rigid earrings P0; dangling physics deferred.

### Nose pin

- Anchors: `nose_pin_root`, `attachment_point`, `gem_center`.
- Left/right selection.
- Fine bounded X/Y/Z micro-adjustment.
- Strong smoothing and strict confidence threshold.
- Tracking uncertainty par fade/freeze mandatory.

### Rollout

- Category and device-tier feature flags.
- Internal QA -> limited beta -> wider beta -> production.
- Asset version and engine combination allowlist.
- Remote denylist for device/OS regressions.

## 12. Phase 7 configuration — Hardening and release

### Asset catalog gate

- Minimum three approved assets per category.
- License evidence complete.
- Dimensions and anchors verified.
- iOS and Android visual QA passed.
- Performance budget passed on supported device tiers.
- Published immutable URLs and rollback version available.

### Test matrix

- Unit: transforms, smoothing, limits, schemas, auth and business rules.
- Contract: OpenAPI, Codegen, event order and exactly-one terminal result.
- Integration: database, signed URLs, guest merge and asset resolution.
- Native device: permissions, interruptions, rotation policy, repeated sessions, capture and cleanup.
- Performance: FPS, load time, memory, thermal and battery.
- Visual: categories, lighting, motion, skin tones, hair/accessories and device tiers.
- Security: authorization, URL validation, rate limits, upload validation and log redaction.
- Accessibility/localization: mobile screens and native session controls.

### Observability

- Correlation ID mobile request -> backend session -> native summary.
- Crash reports tagged by app version, SDK version, engine, category, asset version and device tier.
- Backend structured JSON logs with request IDs.
- Dashboards:
  - crash-free try-on sessions
  - try-on readiness/load latency
  - stable tracking rate/time
  - FPS and thermal failures
  - category/device/asset failure rate
  - seller click-through
- Alerts numeric thresholds benchmark/beta data ke baad lock honge.
- No sensitive image/geometry in logs, traces or crash breadcrumbs.

### Release process

- Protected main branch and required checks.
- Staging mobile builds and backend deploy first.
- Database migration forward/rollback rehearsal.
- Asset promotion independent and reversible.
- Category/device feature flags default-off until QA approval.
- Mobile phased rollout.
- Crash/performance watch window before expansion.
- Rollback options:
  - backend previous image
  - asset previous approved version
  - category disable
  - device denylist
  - mobile store rollback/hotfix path

## 13. Migration sequence from current React Native scaffold

1. Create monorepo folders without changing app behavior.
2. Move current React Native files into `apps/mobile`, including `android`, `ios`, app code and configs.
3. Convert root package to Yarn workspaces and pin Yarn through Corepack.
4. Remove npm lockfile only after Yarn install and native resolution pass.
5. Update Metro, Babel, Jest, TypeScript, Android Gradle and iOS Pod paths for new location.
6. Run default app on iOS and Android before adding product dependencies.
7. Add shared config packages.
8. Add empty API and asset-tool Python workspaces with health/test commands.
9. Add Turborepo tasks and CI.
10. Commit migration as an isolated reviewable change before feature work.

Migration acceptance:

- `yarn install` succeeds from root.
- `yarn mobile:start` starts Metro.
- iOS simulator build succeeds.
- Android emulator build succeeds.
- Jest, lint and TypeScript checks pass.
- CocoaPods resolves from `apps/mobile/ios`.
- One internal workspace TypeScript package imports correctly in mobile.
- API health test and asset CLI smoke test run from root scripts.

## 14. Dependency and change policy

- New dependency add karne se pehle owner workspace, purpose aur native impact identify hoga.
- Exact dependency versions lockfile mein; manual guessed versions docs/code mein nahi.
- Native dependency dono platforms aur New Architecture compatibility verify karegi.
- Shared packages React/React Native ko peer dependencies rakhenge where appropriate.
- Generated code source schemas ke saath same PR mein update hoga.
- Database schema changes Alembic migration ke baghair merge nahi hongi.
- Published asset mutate nahi hoga.
- Architecture deviations short ADR file under `docs/adr/` mein record hongi.
- Scope-expanding P1 features Phase 7 release gate se pehle P0 branch mein enter nahi hongi.

## 15. Overall MVP definition of done

- Five categories approved rollout rules ke mutabiq available.
- At least three approved assets per category.
- Supported devices minimum 24 FPS aur agreed load/tracking budgets meet karte hon.
- Low-confidence behavior stable freeze/fade and actionable guidance de.
- Capture local, explicit aur privacy-safe ho.
- Catalog, search, P0 filters, favorites, recently tried, settings and seller handoff complete hon.
- Guest and optional sign-in flows tested hon.
- Raw frames/biometric geometry upload ya analytics mein na hon.
- Contract, unit, integration, native device, performance, visual, security and accessibility gates pass hon.
- Dashboards, alerts, backups, rollback and staged-release controls active hon.
- Privacy/legal/store reviews complete hon.

