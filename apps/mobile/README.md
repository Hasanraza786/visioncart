# VisionCart Mobile

VisionCart is a React Native commerce app with live virtual try-on. The app
talks to the VisionCart FastAPI backend (`apps/api`) for auth, catalog, cart,
and orders, and to the native `@visioncart/tryon-sdk` for try-on sessions.

## Screens & flow

- **Boot** – waits for persisted auth to hydrate, then routes to the app or Welcome.
- **Welcome / Login / Register** – email + password auth (Google/Apple buttons included, see below).
- **Home** – category chips, search, and a products grid.
- **ProductDetail** – price, details, **Add to cart**, and **Try on**.
- **TryOnLauncher** – opens the native try-on session for the product's category.
- **Cart** – quantity controls, remove, subtotal, free delivery.
- **Checkout** – global shipping address, cash on delivery, USD total.
- **OrderConfirmation** – order summary after placing an order.
- **Account** – profile, order history, logout, and a Developer link (dev builds).

## Connecting to the API

The dev API base URL lives in `src/config/environment.ts`:

- iOS simulator: `http://127.0.0.1:8000` (default).
- Android emulator: use `http://10.0.2.2:8000`.
- Real device: use your Mac's LAN IP, e.g. `http://192.168.1.20:8000`.

Development allows `http://`; staging and production require `https://`.
To point at a LAN IP without editing checked-in config, set
`globalThis.APP_API_BASE_URL` early at startup (development only), or edit
`DEV_API_BASE_URL` in `src/config/environment.ts`.

Start the API and seed data from `apps/api` before running the app.

## Google & Apple Sign-In (manual setup)

Email/password auth works out of the box. The Google/Apple buttons currently
call `src/api_services/social-auth.ts`, which throws a "not configured" error
until you wire the native SDKs. The backend already accepts provider tokens at
`POST /auth/google` and `POST /auth/apple`.

To enable them:

1. Install the native SDKs:

```sh
yarn workspace @visioncart/mobile add \
  @react-native-google-signin/google-signin \
  @invertase/react-native-apple-authentication
cd apps/mobile/ios && bundle exec pod install
```

2. Add config files (already present under `docs/` / `apps/mobile`):
   - iOS: `GoogleService-Info.plist`, add the reversed client ID URL scheme.
   - Android: `google-services.json` + the Google Services Gradle plugin.
   - Apple: enable "Sign In with Apple" capability for the `com.visioncart` bundle.

3. Implement `getGoogleIdToken` / `getAppleIdentityToken` in
   `src/api_services/social-auth.ts` and flip `SOCIAL_AUTH_CONFIGURED` to `true`.
   Use these client IDs (from `apps/api/.env.example`):
   - Google web/iOS/Android clients under `VISIONCART_GOOGLE_CLIENT_IDS`.
   - Apple audience `com.visioncart`.

## Camera permission

Try-on needs camera access. This is declared in
`ios/visioncart/Info.plist` (`NSCameraUsageDescription`) and
`android/app/src/main/AndroidManifest.xml` (`android.permission.CAMERA`).

---

This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
