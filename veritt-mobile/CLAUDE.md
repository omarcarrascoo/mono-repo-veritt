# Veritt Mobile — Expo React Native

## Stack

Expo SDK 52, Expo Router 6.x, React Native 0.81, NativeWind 4.x, Zustand 5.x, Axios, TypeScript

## Project Map

```
app/                        # Screens (Expo Router file-based)
├── index.tsx               # Auth bootstrap -> redirect
├── login.tsx, register.tsx # Auth screens
├── (tabs)/                 # Main tab navigation
│   ├── _layout.tsx         # Tab bar + hydration guard
│   ├── index.tsx           # Home dashboard
│   ├── businesses.tsx      # Business list
│   └── profile.tsx         # User profile
└── businesses/[businessId]/ # Business-scoped screens
    ├── index.tsx            # Business dashboard
    ├── staff/, inventory/, payroll.tsx, etc.

api/
├── client.ts               # Axios instance (THE ONLY http client)
└── modules/*.api.ts         # Domain API functions

components/ui/               # Reusable Vritt* components
store/auth.store.ts          # Zustand auth state
types/*.types.ts             # API response/request types
lib/                         # Business logic helpers
utils/                       # Error parsing, storage, slugify
constants/                   # env.ts (API_URL), theme.ts, options
```

## Critical Rules

### HTTP Requests

- **ALWAYS** use `api/client.ts` -> `api/modules/*.api.ts`. Never raw `fetch`, never ad-hoc axios instances.
- API types live in `types/*.types.ts` — keep them in sync with backend DTOs
- Parse errors with `utils/error.utils.ts`, not custom per-screen parsing

### Auth Flow (DO NOT break)

```
app/index.tsx -> useAuthBootstrap() -> token check
  ├── No token  -> /login
  └── Has token -> GET /auth/me -> /(tabs)
                   └── 401 -> auto logout via setApiUnauthorizedHandler()
```

- Auth state: `store/auth.store.ts` (Zustand) — `token`, `user`, `isAuthenticated`, `isHydrated`
- Token storage: SecureStore (native), localStorage (web)
- Login/logout transitions: use `router.replace()` (not `push`)
- `(tabs)/_layout.tsx` re-checks hydration — don't remove this guard

### Styling

- **NativeWind** with `className` — this is the only styling system
- Design tokens in `tailwind.config.js`:
  - Colors: `veritt-bg` (#000), `veritt-surface` (#0B0B0B), `veritt-border` (#1D1D1D), `veritt-text` (#FFF), `veritt-muted` (#8C8C8C)
  - Radius: `rounded-veritt` (18px), `rounded-card` (22px)
- Visual language: dark-first, high contrast, clean
- Use `StyleSheet` only where React Navigation/Expo APIs require imperative style objects
- `constants/theme.ts` is Expo starter — don't use for new Veritt UI

### Components

**Reuse these before creating new ones.** This is the full inventory of `components/ui/` — check it first; only build new when nothing fits.

| Component | Purpose |
|-----------|---------|
| `VrittScreen` | Safe-area screen wrapper |
| `VrittWebPanel` | Desktop web layout wrapper |
| `VrittHeader` | Screen headers with back nav |
| `VrittScreenHeader` | Screen title/header block |
| `VrittSheetHeader` | Header for bottom-sheet / modal |
| `VrittTabsWebHeader` | Tab header for web layout |
| `VrittSectionLabel` | Section dividers |
| `VrittCard` | Card containers |
| `VrittButton` | Primary/secondary/outline buttons |
| `VrittPrimaryButton` | Emphasized primary CTA |
| `VrittTextButton` | Low-emphasis text/link button |
| `VrittInput` | Text inputs with labels |
| `VrittAppInput` | App-styled labeled input |
| `VrittSelect` | Dropdown selects |
| `VrittBottomDock` | Sticky bottom action bar |
| `VrittStatusChip` | Status/state pill badge |
| `VrittInfoBanner` | Inline info/warning banner |
| `VrittLoader` | Full-screen loading state |
| `VrittEmptyState` | Empty list/data states |
| `VrittToast` (`VrittToastHost`) | Toast notifications — mount the host once, trigger from anywhere |

When this list and `ls components/ui/` disagree, the directory wins — refresh this table.

### Navigation

- `router.push()` for forward navigation, `router.replace()` for auth transitions
- `useLocalSearchParams<{ businessId: string }>()` for route params
- Business screens always under `/businesses/[businessId]/...`
- Icons: `@expo/vector-icons/Ionicons`

### State Management

- **Zustand** for auth/session (`store/auth.store.ts`) — don't add Redux or Context for this
- **useState** for form state, loading, transient UI
- **No global stores** for domain data — fetch on screen mount via API modules

### Language

- Code (vars, functions, types, files): **English**
- UI copy (labels, alerts, placeholders, empty states): **Spanish**

## Adding a New Screen — Step by Step

1. Create file in `app/` following Expo Router convention (e.g., `app/businesses/[businessId]/new-feature.tsx`)
2. Import route params: `const { businessId } = useLocalSearchParams<{ businessId: string }>()`
3. Create/update API module in `api/modules/` + types in `types/`
4. Build UI with `VrittScreen` > `VrittHeader` > content using `Vritt*` components
5. Handle states: loading (`VrittLoader`), empty (`VrittEmptyState`), error (`Alert.alert`)
6. All user-facing text in Spanish

## Adding a New API Module

1. Create `api/modules/<domain>.api.ts` with functions calling `apiClient`
2. Create `types/<domain>.types.ts` with request/response interfaces
3. Export from the module file — screens import directly

## Adding a New UI Component (reusability — do NOT skip)

**Default to reuse.** Before writing any new component, scan the table above + `ls components/ui/`. Build new only when nothing composes to the need — and prefer composing existing `Vritt*` components over a one-off.

1. Confirm no existing `Vritt*` fits or can be extended (a new `variant`/`size` prop usually beats a new component).
2. If genuinely new, create `components/ui/Vritt<Name>.tsx` — generic and screen-agnostic. **No business logic, no API calls, no screen-specific copy inside `components/ui/`.**
3. Match existing patterns: accept `className` for NativeWind overrides, use only `veritt-*` tokens (never hardcoded hex), typed props with explicit return type, `memo` if it's a leaf rendered in lists.
4. Add it to the component table in this file so the next session finds it.
5. **Red flag:** copy-pasting JSX between two screens → extract a `Vritt*` instead. Inline styling that duplicates a token → use the token.

## Commands

```bash
npx expo start              # Dev server
npx expo start --clear      # Clear cache + dev server
npx expo run:ios            # iOS simulator
npx expo run:android        # Android emulator
npm run lint                # ESLint
```

## Onboarding System

Business onboarding progress is managed through:
- `lib/update-onboarding.ts` — API calls to mark steps complete
- `lib/business-onboarding.ts` — step definitions and progress calculation
- Don't hardcode step logic in individual screens
