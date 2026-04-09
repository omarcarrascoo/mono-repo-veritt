# Veritt Monorepo

Full-stack SaaS para gestionar negocios: inventario, nomina, staff, y mas.

## Monorepo Layout

```
monkeys-api/     # NestJS 11 + Prisma 7 + PostgreSQL (Supabase)
veritt-mobile/   # Expo SDK 52 + Expo Router + NativeWind + Zustand
```

Each app has its own `package.json`, `package-lock.json`, and `node_modules/`. No shared workspace package exists yet.

## Global Rules

- **TypeScript first** — no new `any`. Tighten existing loose types only when the change is low-risk.
- **Language** — code identifiers in English, UI copy in Spanish (mobile labels, alerts, placeholders).
- **Surgical edits** — change only files/lines needed. Don't refactor surrounding code unless asked.
- **No invented dependencies** — install explicitly before importing.
- **Explicit return types** on service, repository, and API-layer functions.
- **Manual contract sync** — when backend DTOs change, update `veritt-mobile/types/*.types.ts` + `api/modules/*.api.ts` in the same PR.
- **No cross-imports** — never import frontend from backend or vice versa.

## Quick Commands

```bash
# Backend dev server
cd monkeys-api && npm run start:dev

# Mobile dev server
cd veritt-mobile && npx expo start

# Prisma migration
cd monkeys-api && npx prisma migrate dev --name <name>

# Prisma studio (DB GUI)
cd monkeys-api && npx prisma studio

# Lint
cd monkeys-api && npm run lint
cd veritt-mobile && npm run lint
```

## Database

- Supabase PostgreSQL via `@prisma/adapter-pg` + `pg` pool
- **Session mode pooler** (port 6543) for RLS compatibility
- Schema source of truth: `monkeys-api/prisma/schema.prisma`
- Known issue: RLS enforcement on pooler — needs disabling in Supabase Dashboard

## Auth Architecture

- Custom JWT (not Supabase Auth)
- Backend: `JwtAuthGuard` + `@CurrentUser()` decorator (returns `{ id, email }` from JWT payload)
- Mobile: token in SecureStore (native) / localStorage (web), injected via axios interceptor
- 401 responses trigger automatic logout via `setApiUnauthorizedHandler()`

## API Routes

Base prefix: `/api/v1`

| Domain | Routes |
|--------|--------|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Businesses | `GET/POST /businesses`, `GET/PATCH /businesses/:id` |
| Members | `GET/POST /businesses/:id/members` |
| Onboarding | `GET/PATCH /businesses/:id/onboarding` |
| Staff | `GET/POST /businesses/:id/staff` |
| Inventory | `GET/POST /businesses/:id/inventory/*` (materials, products, locations) |
| Payroll | `GET/PATCH /businesses/:id/payroll/*` |
| Notifications | `GET /notifications` |

## Architecture Patterns

### Backend (Controller -> Service -> Repository)

- **Controllers**: thin — validation, guards, delegate to service
- **Services**: business logic, permission checks (membership lookups), throw NestJS exceptions
- **Repositories**: Prisma queries only, centralize repeated includes/lookups

### Frontend (Expo Router + Zustand)

- File-based routing in `app/`
- Auth bootstrap: `app/index.tsx` -> `useAuthBootstrap()` -> redirect to `/(tabs)` or `/login`
- Business-scoped screens: `app/businesses/[businessId]/...`
- HTTP: always through `api/client.ts` -> `api/modules/*.api.ts` (never raw fetch)
- Styling: NativeWind `className` with `veritt.*` tokens (dark theme, high contrast)
- Components: reuse `Vritt*` from `components/ui/` before creating new ones

## Common Task Checklists

### Adding a New Backend Module

1. Create Prisma model in `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add-<entity>`
3. Create module folder: `src/<module>/`
4. Create files: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.dto.ts`
5. Wire into `src/app.module.ts` imports
6. Add `@UseGuards(JwtAuthGuard)` on controller
7. Implement membership check in service for business-scoped resources

### Adding a New Mobile Screen

1. Create screen file in `app/` following Expo Router conventions
2. Use `useLocalSearchParams()` for route params
3. Create/update API module in `api/modules/` and types in `types/`
4. Use `VrittScreen`, `VrittHeader`, and existing `Vritt*` components
5. Handle loading (`VrittLoader`), empty (`VrittEmptyState`), and error states
6. UI copy in Spanish, code in English

### Changing an API Response Shape

1. Update backend DTO/service return type
2. Update `veritt-mobile/types/*.types.ts` to match
3. Update `veritt-mobile/api/modules/*.api.ts` if endpoint signature changed
4. Update consuming screens — same PR

## Code Style

- **Backend**: ESLint + Prettier — single quotes, trailing commas
- **Frontend**: ESLint with expo config
- **Formatting**: `{ singleQuote: true, trailingComma: 'all' }`
