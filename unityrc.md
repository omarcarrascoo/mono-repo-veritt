# UniRX - Architecture Memory for `mono-repo-veritt`

## 1) Scope
This document is the source of truth for AI agents working in:
- `monkeys-api/` (NestJS + Prisma backend API)
- `veritt-mobile/` (Expo Router + React Native frontend)

Use these rules to keep changes consistent with the current architecture and coding patterns.

## 2) Global Rules (Entire Repo)
- TypeScript first: do not introduce new `any` in new code. Some loose JSON-style shapes still exist; tighten them when the change is low risk.
- Naming language: code identifiers in English (`variables`, `functions`, `types`, `files`).
- Copy language: keep the surrounding convention. Mobile labels, alerts, and empty states are in Spanish. Backend exception messages are currently mostly English.
- Dependencies: do not invent libraries. If a new dependency is required, install it explicitly before use.
- Keep changes surgical: edit only the files and lines needed for the task.
- Before editing unfamiliar flows, read the related screen/component/type files on mobile and controller/service/repository/dto files on backend first.
- Prefer explicit return types for new service, repository, and API-layer functions.
- There is no shared package yet. Keep frontend and backend contracts synchronized manually when changing API shapes.

## 3) Frontend Rules (`veritt-mobile`)

### 3.1 Routing and Screen Structure
- Router: Expo Router (`expo-router`).
- New screens must live in `veritt-mobile/app/` using file-based routes.
- Preserve the current auth bootstrap flow:
  - `useAuthBootstrap()` runs from `app/index.tsx`.
  - `app/index.tsx` redirects unauthenticated users to `/login`.
  - `app/index.tsx` redirects authenticated users to `/(tabs)`.
  - `app/(tabs)/_layout.tsx` re-checks hydration/auth state and redirects guests back to `/login`.
- Post-auth navigation should keep using `router.replace(...)` for login/register/logout transitions.
- Business-scoped flows live under `app/businesses/[businessId]/...`; preserve that route structure for new business detail, onboarding, and staff screens.

### 3.2 State Management
- Global auth/session state lives in `store/auth.store.ts` (Zustand).
- Use local `useState` for form state, screen loading, and transient UI state.
- Do not introduce Context API or Redux for auth/session flow.
- Keep unauthorized logout wiring through `setApiUnauthorizedHandler(...)` in the auth store.

### 3.3 API Access Pattern
- Use `api/client.ts` as the single HTTP client entrypoint.
- Do not call raw `fetch`.
- Do not create ad-hoc axios clients inside screens/components.
- Keep domain clients in `api/modules/*.api.ts`.
- Keep request/response contracts in `types/*.types.ts`.
- Token handling pattern must remain:
  - web: `localStorage`
  - native: `expo-secure-store`
  - auth header injected via axios interceptor after `setApiAuthToken(...)`.
- Parse and surface backend errors with `utils/error.utils.ts` instead of custom per-screen axios parsing.

### 3.4 Styling and Design System
- Primary styling system is NativeWind (`className`) with tokens defined in `tailwind.config.js`.
- Use the existing `veritt` palette/tokens (`veritt.bg`, `veritt.surface`, `veritt.border`, `veritt.text`, `rounded-veritt`, `rounded-card`, tracking helpers) for new UI.
- Reuse shared `Vritt*` UI components from `components/ui/` before creating one-off controls.
- Use `StyleSheet` only where React Navigation/Expo APIs or imperative layout objects require it.
- `constants/theme.ts` is still Expo starter theming; avoid using it for new Veritt UI work unless you are modifying starter hook behavior.
- Keep the visual language consistent with the current black-first, high-contrast VERITT screens.

### 3.5 Icons
- Preferred icon family: `@expo/vector-icons/Ionicons`.
- Preserve the current tab icon pattern in `app/(tabs)/_layout.tsx` unless there is an explicit redesign.

### 3.6 Frontend-Specific Notes
- Screen copy, form labels, alerts, and empty states should stay in Spanish.
- Reuse `VrittLoader`, `VrittEmptyState`, `VrittHeader`, `VrittCard`, `VrittInput`, `VrittSelect`, and `VrittButton` for standard states and forms.
- Business onboarding progress is centralized through `lib/update-onboarding.ts` and `lib/business-onboarding.ts`; do not hardcode onboarding step math in multiple screens.
- Use `useLocalSearchParams()` for route params and keep business-scoped navigation under `/businesses/<businessId>/...`.
- `global.css` plus `nativewind/preset` are part of the styling pipeline; do not remove them when touching app bootstrap.

## 4) Backend Rules (`monkeys-api`)

### 4.1 Core Stack
- Framework: NestJS modules/controllers/services/repositories.
- Persistence: Prisma ORM + PostgreSQL via the global `PrismaService`.
- Database schema source of truth is `prisma/schema.prisma`.
- New persisted entities require:
  - Prisma model changes in `prisma/schema.prisma`
  - a Prisma migration in `prisma/migrations/`
  - query access through a repository under the owning module
  - module wiring in `src/app.module.ts`
- Repositories own Prisma queries; services own business rules and permission checks.

### 4.2 Authentication and Authorization
- Protected controllers currently use `@UseGuards(JwtAuthGuard)` at the controller level unless the endpoint is intentionally public.
- `@CurrentUser()` returns JWT payload data from `JwtStrategy.validate(...)`, not a full database user document.
  - Current safe assumption: `{ id, email }`
- Never assume membership, role, or full profile fields exist on `@CurrentUser()`. Load them from Prisma when needed.
- Business authorization is currently enforced mostly inside services with membership lookups (`findMembership`, `findBusinessMembership`).
- `RolesGuard` and `BusinessMembershipGuard` exist, but they are not the dominant pattern yet. If you introduce them on new endpoints, wire them together consistently so `request.membership` exists before `RolesGuard` runs.

### 4.3 DTO Validation
- Global `ValidationPipe` is already configured in `src/main.ts` with:
  - `whitelist: true`
  - `transform: true`
  - `forbidNonWhitelisted: true`
- For POST/PATCH endpoints, create DTO classes with `class-validator` and `class-transformer`.
- Keep DTOs strict and avoid leaking raw Prisma input types into controllers.

### 4.4 ID Handling
- Primary keys are Prisma string IDs/UUIDs, not Mongo `ObjectId`s.
- Validate new route params before querying when the endpoint is ID-sensitive; prefer `ParseUUIDPipe` or explicit guards/helpers.
- Never assume numeric IDs.

### 4.5 Data Mutation and Atomicity
- Prefer Prisma nested writes, `upsert`, and `$transaction(...)` for multi-step mutations.
- Current examples:
  - business creation creates owner membership plus onboarding in one write
  - staff create/update keeps profile plus compensation changes in a transaction
- Avoid splitting concurrent-sensitive mutations across multiple uncoordinated queries.

### 4.6 Query and Service Patterns
- Controllers stay thin.
- Services enforce permission checks, conflict handling, and `NotFoundException`/`ForbiddenException` decisions.
- Repositories encapsulate Prisma access and repeated membership lookups.
- If a Prisma `include` shape or membership query is repeated in new code, centralize it in the repository.
- Service methods should throw Nest exceptions (`ConflictException`, `ForbiddenException`, `NotFoundException`, `UnauthorizedException`) instead of returning ad-hoc error objects.
- Add explicit return types to new/updated service and repository methods.

### 4.7 Security and Config Guardrails
- Do not add new hardcoded secrets or credentials.
- `ConfigModule.forRoot({ isGlobal: true })` is enabled. Keep JWT and database config env-driven.
- `JWT_SECRET` currently falls back to `dev-secret`; do not add more hardcoded fallback secrets.
- `PrismaService` uses `@prisma/adapter-pg` plus `pg` pool initialization. Preserve that pattern unless you are intentionally refactoring the database layer.

## 5) Module Boundaries (Current Backend)
Current feature modules:
- `auth`
- `users`
- `businesses`
- `memberships`
- `onboarding`
- `staff`

Shared infrastructure:
- `database/prisma`
- `common`

Respect module encapsulation: controllers -> services -> repositories. Avoid reaching into another module's repository directly or introducing circular dependencies.

## 6) Monorepo Coordination Rules
- Repo layout is two sibling apps under one git repo, each with its own dependencies and `package-lock.json`.
- There is no dedicated shared package yet.
- Do not import frontend files from backend or backend files from frontend directly.
- Mobile API calls assume the backend global prefix `api/v1`; keep `veritt-mobile/constants/env.ts` and backend routing in sync.
- When backend DTOs or response shapes change, update the matching mobile `types/*.types.ts` and `api/modules/*.api.ts` in the same PR.

## 7) Explicitly Not Applicable (For Now)
- No Mongoose or MongoDB architecture exists in this repo.
- No Tailwind-free React Native design system exists; mobile styling is already NativeWind-based.
- No shared workspace package for contracts or UI exists yet.
- No Redux or Context-based auth architecture is in use.
- No GraphQL or NestJS WebSocket gateway architecture is currently implemented.

If any of the above is introduced later, update this document in the same PR that adds the new architecture.
