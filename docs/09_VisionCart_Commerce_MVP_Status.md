# VisionCart Commerce MVP Status

## Scope (locked 2026-07-18)

Commerce MVP (payment excluded) with complete backend + admin + mobile:

- Auth: backend-owned JWT (email/password + Google ID token + Apple identity token)
- Catalog: categories + products (5 try-on models seeded)
- Cart + COD checkout (USD, free delivery, global address)
- Admin web app (separate): categories, products, orders
- Mobile: no admin screens; home → detail → try-on → cart → COD
- Package / bundle: `com.visioncart`
- Deploy target: Vercel (API + admin)

## What is running locally

| Service | URL / path |
|---|---|
| API | `http://192.168.100.7:8000` (also `127.0.0.1:8000`) — docs at `/docs` |
| Admin | `http://localhost:3000` |
| Metro | `http://localhost:8081` |
| Debug APK | `dist/VisionCart-debug.apk` |

Admin login: `visioncartadmin@yopmail.com` / `VisionCartAdmin!2026`

### Device status (while you slept)

- **iPhone “Hasan Raza”**: `com.visioncart` **installed + launched** (Debug build, team `VWT9PW2SMJ`).
- **Android**: no device on `adb` — USB debugging / authorize Mac, then `adb install -r dist/VisionCart-debug.apk`.
- Phone API base URL is `http://192.168.100.7:8000` (same Wi‑Fi as Mac required).

## Done

- [x] Rename `ar_ecommerce_app` → `visioncart` / `com.visioncart`
- [x] FastAPI auth, catalog, cart, COD orders, admin APIs + seed + tests
- [x] Next.js admin (`apps/admin`)
- [x] Mobile commerce screens + API client + AsyncStorage auth
- [x] Google + Apple native sign-in packages wired
- [x] Google service configs in Android/iOS app folders
- [x] Debug APK built
- [x] API bound to `0.0.0.0` for LAN devices
- [x] Vercel entry for API (`apps/api/vercel.json` + `api/index.py`)

## Still needs you when awake

1. **iOS signing** — team `VWT9PW2SMJ` set in Xcode project; open `apps/mobile/ios/visioncart.xcworkspace`, confirm Signing & Capabilities, enable **Sign in with Apple**, then:
   ```bash
   yarn workspace @visioncart/mobile ios --device "Hasan Raza"
   ```
2. **Android device** — not visible on `adb` yet. Enable USB debugging / file transfer, then:
   ```bash
   adb install -r dist/VisionCart-debug.apk
   ```
3. **Release keystore** — create when ready (passwords already sketched in `android/gradle.properties` as `MYAPP_UPLOAD_*`). File must exist as `android/app/visioncart.keystore` (or update the property).
4. **Apple Sign in with Apple** capability on App ID `com.visioncart` in Apple Developer portal.
5. **Vercel deploy** — connect GitHub repo, set env vars from `apps/api/.env.example` + Postgres (Neon), deploy `apps/api` and `apps/admin`.
6. **Real AR try-on** — native session opens (placeholder engine). Full MediaPipe/ARKit tracking is the next native vertical slice.

## Honest try-on note

Try-on launches the native full-screen SDK session with the product's category and bundled GLB. Camera permissions are declared. Live face/hand tracking + Filament/RealityKit rendering is still the Phase 3 native work — not claimed as production AR yet.
