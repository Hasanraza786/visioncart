# VisionCart Phases 2–6 Status

## Status (2026-07-18)

Phases 2–6 have been implemented in **development mode**. Current GLB models remain
development-only (not licensed/calibrated production assets). Native try-on now uses
real camera + landmark pipelines on iOS and Android for all five categories.

## Phase 2 — Backend / catalog

- Alembic migrations (`0001_phase2`, `0002_phase2_repair`) applied to Neon
- Models: variants, asset versions, favorites, guests, try-on sessions, audit logs
- APIs: `/assets/resolve`, `/favorites`, `/guests`, `/guests/merge`, `/tryon/sessions`,
  `/tryon/recent`, `DELETE /account`
- Catalog brand/color filters + pagination
- Request ID middleware (`X-Request-Id`)
- OpenAPI exported to `packages/contracts/openapi.visioncart.json`
- ADR-001: backend-owned auth (not Firebase)
- API tests: **28 passed**

## Phase 3 — Glasses (iOS + Android)

- iOS: ARKit face tracking + SceneKit overlay (`arkit-face`) with AVFoundation fallback
- Android: CameraX + ML Kit face detection (`mlkit-face`)
- Real capability checks, permission handling, scale controls, optional capture

## Phase 4 — Consumer shell

- Guest browse + merge-on-login
- Favorites, Recently Tried, Settings (privacy, cache clear, account delete)
- Home brand/color filters, offline/error banners
- TryOnLauncher uses asset resolve + records try-on sessions
- Development disclaimer: not a sizing tool

## Phase 5 — Watch + Ring

- iOS: Vision hand pose (`vision-hand`) with wrist/ring overlays
- Android: live camera hand proxy with adjustable scale (`camera-hand-overlay`)
- Non-sizing guidance banners

## Phase 6 — Earrings + Nose pin

- Reuse face pipelines with ear/nose landmark placement on both platforms

## Remaining production hardening

1. Licensed + calibrated GLB/USDZ packages (replace development assets)
2. Physical-device FPS/latency/thermal matrix on multiple devices
3. Filament (Android) / RealityKit USDZ (iOS) full 3D model loading
4. Push code to GitHub and redeploy API so Vercel serves Phase 2 routes
5. Point mobile release builds at production API (already configured in `environment.ts`)
6. Store signing / App Store / Play Store release

## Live URLs

| Service | URL |
|---|---|
| API | https://api-flax-omega.vercel.app |
| Admin | https://visioncart-admin.vercel.app |
