# VisionCart Mobile Source Architecture

This app follows the same layer-based React Native structure used in the
`dole` mobile project, adapted for VisionCart TypeScript and monorepo packages.

```text
src/
├── api_services/          # HTTP client and endpoint handlers (Phase 2)
├── assets/                # Icons and static media
├── components/            # Shared reusable UI
├── config/                # Runtime/build environment
├── constants/             # Theme tokens and app constants
├── navigation/            # MainNavigator, types, navigation helpers
├── query/                 # TanStack Query client and lifecycle
├── screens/               # PascalCase screen folders
│   ├── Boot/
│   │   ├── index.tsx
│   │   └── styles.ts
│   ├── Foundation/
│   │   ├── index.tsx
│   │   └── styles.ts
│   └── index.ts
├── store/                 # Zustand app state (dole uses redux/)
├── test/                  # Test helpers
├── utils/                 # Shared helpers
└── validations_schemas/   # Yup/Zod form schemas (Phase 2)
```

## Conventions

- Layer-based top-level folders, matching dole.
- Screens use PascalCase folders with colocated `index.tsx` and `styles.ts`.
- Screen-private UI lives under `screens/<Screen>/components`.
- Shared UI lives under `components/`.
- Navigation is centralized under `navigation/MainNavigator.tsx`.
- VisionCart keeps Zustand + TanStack Query instead of Redux Toolkit.
- Shared cross-app tokens remain in `@visioncart/design-system`; mobile-only
  theme mapping lives in `constants/theme.ts`.
