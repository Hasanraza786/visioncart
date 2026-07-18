# VisionCart Phase 1 Status

## Status

Phase 1 engineering foundation is implemented and builds successfully. The
production A0 asset gate is not complete because real licensed representative
assets, real GLB-to-USDZ/Android optimization, renderer integration, and
physical-device QA are not yet available.

Synthetic fixtures are deliberately marked `synthetic-draft`; they must not be
treated as production assets.

## Completed

### Monorepo foundation

- React Native app moved to `apps/mobile`.
- Yarn 4.17.1 workspaces and Turborepo configured.
- FastAPI and Python asset-tooling workspaces established with locked `uv`
  environments.
- Shared contracts, analytics, design-system, TypeScript, ESLint, and try-on
  SDK packages established.

### Mobile foundation

- Typed React Navigation native-stack foundation.
- TanStack Query provider and AppState/NetInfo lifecycle integration.
- Zustand local app-state foundation.
- Development, staging, and production build-time environment selection.
- Accessible boot and foundation screens.
- Manual native placeholder launcher available from the foundation screen.
- Mobile `src/` reorganized to match the dole layer-based architecture:
  `screens/`, `navigation/`, `components/`, `api_services/`, `constants/`,
  `store/`, `utils/`, `validations_schemas/`, and `assets/`. See
  `apps/mobile/ARCHITECTURE.md`.
- Optimized ingest-draft try-on GLBs wired under `src/assets/models/` with
  Metro `glb` asset support.

### Canonical contracts

- Shared try-on categories, outcomes, error taxonomy, dimensions, anchor
  profile, and adjustment limits.
- React Native Codegen contract for capability, open-session, and cache-clear
  operations.
- Draft 2020-12 JSON Schemas for product, anchors, license, and asset package
  metadata.
- Asset schema version fixed at `1.0.0`.
- Package status enum includes `ingest-draft` for real GLBs with pending USDZ.

### Native placeholder SDK

- Android autolinked TurboModule, full-screen Activity, single-session guard,
  typed cancellation result, invalidation cleanup, and SDK-owned cache cleanup.
- iOS autolinked TurboModule, full-screen view controller, single-session
  guard, typed cancellation result, invalidation cleanup, and SDK-owned cache
  cleanup.
- Concurrent session attempts are rejected.
- Android and iOS native builds compile with generated Codegen contracts.

### Synthetic asset-contract pipeline

- Streaming SHA-256 verification.
- Structural GLB parsing.
- Category-specific byte and triangle budgets.
- Category-specific required anchor validation aligned with the asset
  specification.
- Package discovery, inspection, reporting, validation, and checksum commands.
- Explicit dry-run conversion and optimization adapters that never claim work
  was executed.
- Deterministic synthetic fixtures for glasses, watch, ring, earring, and
  nose-pin categories.
- Synthetic metadata prevents fixtures from claiming production-candidate
  status.
- Ingest-draft packaging for real Sketchfab-exported GLBs for all five
  categories under `tooling/assets/packages/` (optimized GLB + preview +
  anchors + license; USDZ still an honest placeholder).
- Raw source GLBs preserved under `tooling/assets/sources/raw/`.

### CI

- Immutable Yarn installation.
- Locked Python environments.
- Lint, strict type-check, and test jobs.
- Synthetic asset fixture validation.
- Ingest-draft package validation.
- Android debug native build.
- iOS simulator native build.

## Verified locally

- `yarn install --immutable`
- `yarn check`
  - Mobile: 11 tests passed.
  - Asset tooling: 19 tests passed.
  - API: 1 test passed.
  - All lint and strict type-check tasks passed.
- All five synthetic asset packages validated with zero issues.
- Five ingest-draft packages validated with zero issues across all try-on
  categories (`glasses`, `ring`, `watch`, `earring`, `nose_pin`).
- Android `assembleDebug` succeeded with the generated try-on TurboModule.
- iOS simulator `xcodebuild` succeeded with the generated try-on TurboModule.
- IDE diagnostics report no errors.

## Remaining production A0 blockers

1. SPDX license verification against original Sketchfab source pages for all
   five ingested models.
2. A pinned real Android GLB optimizer must be formalized as a reproducible
   pipeline step (current optimization used `@gltf-transform/cli` ad hoc).
3. A pinned real GLB-to-USDZ conversion toolchain must generate valid USDZ
   derivatives (currently honest placeholders only).
4. RealityKit and Filament asset loading/rendering prototypes must replace the
   placeholder-only native views.
5. Anchors, dimensions, materials, load time, FPS, memory, and visual placement
   must pass on the approved physical-device matrix.
6. Repeated open/close behavior must be exercised on real devices; successful
   compilation and JavaScript mocks do not prove runtime lifecycle stability.

## Completion rule

Phase 1 may be marked fully complete only when the six production A0 blockers
above pass. Accepting ingest-draft packages as equivalent to production-
candidate A0 assets would weaken the original specification and is not
recommended.

