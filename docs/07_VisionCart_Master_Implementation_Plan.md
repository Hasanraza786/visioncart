# VisionCart Master Implementation Plan

## Purpose

Ye repository-level master plan hai. New chat ya context reset ke baad pehle ye file read ki jaye, phir detailed configuration ke liye `06_VisionCart_Monorepo_Implementation_Blueprint.md` dekhi jaye.

## Context recall order

1. `docs/07_VisionCart_Master_Implementation_Plan.md` — current plan, phases aur progress.
2. `docs/06_VisionCart_Monorepo_Implementation_Blueprint.md` — locked technical configuration.
3. `docs/01_VisionCart_MVP_Product_Requirements_Document.docx` — product requirements.
4. `docs/02_VisionCart_MVP_Scope_User_Flows_and_Acceptance_Criteria.docx` — scope and acceptance criteria.
5. `docs/03_VisionCart_Technical_Architecture_and_Technology_Decisions.docx` — architecture.
6. `docs/04_VisionCart_Native_TryOn_SDK_Specification.docx` — native SDK.
7. `docs/05_VisionCart_3D_Asset_Specification_QA_and_Roadmap.docx` — 3D assets and QA.

## Project summary

VisionCart ek privacy-first mobile virtual try-on application hai. User glasses, watches, rings, earrings aur nose pins catalog se select karke live camera par preview karega. Camera frames, face/hand meshes aur biometric geometry device par process honge aur default flow mein upload nahi honge.

MVP includes:

- Guest access and optional Firebase authentication.
- Categories, catalog, search and basic filters.
- Product details and approved try-on assets.
- Native live try-on.
- Tracking guidance and bounded manual adjustments.
- Capture, local save and platform share.
- Favorites and recently tried products.
- External seller handoff.
- Unsupported-device fallback.
- Privacy-safe analytics.

MVP excludes:

- Native checkout and order management.
- Guaranteed sizing or medical measurements.
- Per-frame cloud inference.
- Automatic production-ready 3D product scanning.
- Perfect hair occlusion or realistic watch-strap deformation.

## Locked architecture

- One Git monorepo for all project code and documentation.
- Yarn 4 workspaces with `nodeLinker: node-modules`.
- Turborepo for root task orchestration.
- `apps/mobile`: React Native 0.86, React 19, TypeScript, Hermes and New Architecture.
- `apps/api`: FastAPI modular monolith, PostgreSQL, SQLAlchemy and Alembic.
- `packages/contracts`: OpenAPI, JSON Schemas and generated TypeScript types.
- `packages/tryon-sdk`: React Native Codegen bridge plus Swift/Kotlin native engines.
- `packages/design-system`: shared UI primitives and tokens.
- `packages/analytics`: privacy-safe analytics contracts.
- `tooling/assets`: Python/Blender based 3D validation and conversion CLI.
- `infra`: local Docker Compose and environment deployment definitions.
- iOS: Swift, RealityKit, ARKit/MediaPipe.
- Android: Kotlin, CameraX, MediaPipe and Filament.
- Object storage plus CDN for immutable versioned assets.

## Important implementation defaults

- iOS minimum: 16.0.
- Android minimum: API 29 / Android 10.
- Guest try-on is P0.
- P0 filters: category, brand and color.
- In-session product switching is P1.
- Protected API plus CLI asset import is P0; full admin portal is P1.
- Full-screen native try-on modal is P0.
- Glasses are the first production category.
- Backend remains a modular monolith for MVP.
- Redis, queues, Kubernetes and microservices are deferred until measured need.

## Implementation phases

### Phase 0 — Decisions, contracts and feasibility

Target: weeks 1–2.

- Freeze OpenAPI, asset schemas, native Codegen contract and analytics event schemas.
- Resolve `asset`/`platformAsset`, dimensions, anchor profiles and SDK terminal-event inconsistencies.
- Define device tiers, asset budgets and measurable performance/tracking gates.
- Benchmark MediaPipe, ARKit, RealityKit and Filament on representative physical devices.
- Prove one placeholder asset can open, render, capture, close and release resources repeatedly on both platforms.

Exit gate:

- At least 24 FPS on supported test tiers.
- Target 30 FPS.
- Warm preview below 1.5 seconds.
- Cached asset ready below 2.5 seconds.
- Stable tracking below 1 second in normal lighting.
- No uncontrolled movement when tracking confidence drops.

### Phase 1 — Monorepo foundation and asset A0

Target: weeks 3–5.

- Move the current React Native scaffold into `apps/mobile`.
- Configure Yarn workspaces, Turborepo, Metro, Jest, TypeScript, CocoaPods and Gradle paths.
- Add `apps/api`, shared packages and `tooling/assets`.
- Establish mobile feature architecture, navigation, state/query layers and environment variants.
- Implement typed TurboModule and full-screen native session container.
- Add versioned asset schemas, checksums, GLB validation, USDZ conversion and Android GLB optimization.
- Process one representative asset per category.
- Add CI checks for code, contracts, native builds and sample assets.

Exit gate:

- Root Yarn install succeeds.
- Default app runs on iOS and Android from monorepo.
- Shared workspace import resolves through Metro.
- API health test and asset CLI smoke test pass.
- Native placeholder session works repeatedly.

### Phase 2 — Backend and minimal catalog

Target: weeks 4–7, parallel with Phase 1 where safe.

- Implement categories, products, variants, asset versions and anchor profiles.
- Add signed asset resolution, favorites and try-on session summaries.
- Add Firebase token verification, guest identities and role-based admin endpoints.
- Add PostgreSQL migrations, audit logs, rate limiting and request IDs.
- Build home, product list, search, P0 filters and product details.
- Validate seller URLs and provide unsupported-device browsing fallback.
- Use protected API plus CLI for P0 catalog import.

Exit gate:

- Only approved assets are exposed.
- Product detail can resolve a valid platform asset.
- Guest and authenticated catalog flows pass.
- API authorization and migration tests pass.

### Phase 3 — Glasses end-to-end vertical slice

Target: weeks 6–9.

- Connect product detail to capability, permission and native try-on flow.
- Implement face tracking, smoothing, quality scoring and glasses anchor solving.
- Add bounded scale/position/depth controls and reset.
- Freeze or fade the product during low-confidence tracking.
- Add native composited capture, local save and system sharing.
- Return typed session result and record privacy-safe analytics.

Exit gate:

- Complete product-to-try-on-to-capture-to-seller flow works on both platforms.
- Performance and tracking budgets pass on the supported test matrix.
- No raw frames, meshes or biometric geometry leave the device.

### Phase 4 — Consumer MVP shell

Target: weeks 8–11.

- Complete guest/sign-in experience.
- Add favorites, recently tried, settings, privacy links and account deletion.
- Implement guest-to-account data merge.
- Define metadata and asset caching/offline behavior.
- Handle denied permissions, broken seller links, storage failures and interrupted sessions.
- Complete accessibility baseline for app screens and native controls.

Exit gate:

- Primary consumer flows and documented error paths pass.
- Guest data survives restart and merges idempotently after sign-in.
- Unsupported devices can still browse, favorite and open sellers.

### Phase 5 — Watch and ring

Target: weeks 10–14.

- Build shared normalized hand-landmark pipeline.
- Implement handedness, mirroring, smoothing, occlusion and reacquisition.
- Add watch wrist selection and bounded placement controls.
- Add ring hand/finger selection and bounded scale/rotation/depth.
- Show clear non-sizing limitations.

Exit gate:

- Watch and ring placement meet defined stability and performance thresholds.
- Left/right and mirrored camera behavior pass cross-platform fixtures.

### Phase 6 — Earrings and nose pin

Target: weeks 13–17.

- Add face-derived ear and nose anchors.
- Add side selection and bounded micro-adjustments.
- Apply stricter confidence thresholds and stronger smoothing.
- Add hair/depth limitation guidance.
- Release behind category and device-tier feature flags.

Exit gate:

- Both categories pass visual QA without unacceptable jitter.
- Unsupported device/engine combinations remain remotely disabled.

### Phase 7 — Catalog completion, hardening and release

Target: weeks 16–20.

- Complete at least three approved assets per category.
- Enforce legal, file, geometry, dimensions, anchors, materials, performance and visual gates.
- Run full physical-device, memory, thermal, interruption and repeated-session testing.
- Complete security, privacy, accessibility and store-permission reviews.
- Configure dashboards, alerts, backups, asset rollback and device denylist.
- Deploy staging, beta and phased production releases.

Exit gate:

- No blocker defects.
- Required quality and privacy gates pass.
- Dashboards and alerts are active.
- Backend, database, asset and mobile rollback procedures are rehearsed.

## Work order

Implementation ka strict order:

1. Monorepo migration.
2. Contracts and native feasibility.
3. Asset A0 pipeline.
4. Minimal backend/catalog.
5. Glasses vertical slice.
6. Consumer shell completion.
7. Watch and ring.
8. Earrings and nose pin.
9. Production hardening and release.

UI feature expansion native feasibility aur asset-contract proof se pehle start nahi hogi.

## Current progress

- [x] Product and technical documents reviewed.
- [x] Main implementation roadmap prepared.
- [x] Monorepo architecture selected.
- [x] Yarn selected as JavaScript package manager.
- [x] Detailed monorepo/configuration blueprint written.
- [x] Monorepo migration implemented and verified on iOS/Android.
- [x] Yarn/Turborepo, shared TypeScript packages, FastAPI health service and asset CLI skeleton established.
- [x] Phase 1 mobile architecture, query/state lifecycle and build-time environments implemented.
- [x] Mobile `src/` aligned to dole layer-based folder conventions.
- [x] Canonical TypeScript, Codegen and JSON Schema contracts frozen at their initial versions.
- [x] Native placeholder TurboModule implemented and compiled on iOS/Android.
- [x] Synthetic A0 contract fixtures and validation pipeline completed for all five categories.
- [x] CI configured for quality, assets and both native platform builds.
- [~] Real representative Asset A0 ingest-draft packages built for all five categories; USDZ, license verification, and physical-device renderer QA still open.
- [x] Commerce MVP backend (auth JWT, catalog, cart, COD orders, admin APIs) + seed.
- [x] Admin web app (`apps/admin`) for categories, products, orders.
- [x] Mobile consumer shell: auth, home, detail, try-on launch, cart, COD checkout.
- [x] Vercel production deploy for API + admin (Neon Postgres).
- [x] Phase 2 catalog assets, guests, favorites, try-on summaries, Alembic migrations.
- [x] Development-mode glasses/watch/ring/earring/nose_pin try-on on iOS and Android.
- [x] Phase 4 guest, favorites, recent, settings, account deletion flows.
- [ ] Production-licensed/calibrated assets + Filament/RealityKit full 3D loading.
- [ ] Full physical-device performance matrix and store release.

## Next implementation task

See `10_VisionCart_Phases_2_6_Status.md`. Redeploy API after pushing Phase 2 code,
then run physical-device QA across all five categories. Production assets and store
release remain open.

## Documentation maintenance rule

Har meaningful architecture, scope ya implementation decision par:

1. Is master plan ka relevant phase/progress update hoga.
2. `06_VisionCart_Monorepo_Implementation_Blueprint.md` mein technical configuration update hogi.
3. Agar original product requirement change ho to relevant source DOCX ya uske replacement Markdown specification ko update kiya jayega.
4. Major architecture deviation ke liye `docs/adr/` mein ADR add hoga.
5. Code aur documentation same change/PR mein sync rakhe jayenge.

