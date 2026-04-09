# Monkeys API — NestJS Backend

## Stack

NestJS 11.x, Prisma 7.x (`@prisma/adapter-pg`), PostgreSQL (Supabase), JWT Auth, class-validator

## Module Map

```
src/
├── auth/           # Register, login, JWT strategy
├── users/          # User profile
├── businesses/     # Business CRUD + slug generation
├── memberships/    # Business member invites/roles
├── onboarding/     # Business setup wizard
├── staff/          # Staff profiles + compensation + history
├── payroll/        # Payment tracking + scheduling
├── inventory/      # Materials, products, locations, lots, movements
├── notifications/  # Alerts (payroll due, low stock, etc.)
├── database/prisma/# PrismaService (adapter-pg + pool)
└── common/         # JwtAuthGuard, CurrentUser, ParseUUIDPipe, decorators
```

## Critical Rules

### 3-Layer Pattern (ALWAYS follow)

```
Controller (thin)  ->  Service (logic + auth)  ->  Repository (Prisma only)
```

- Controllers: validate input (DTOs), apply guards, delegate. No business logic.
- Services: check membership/permissions, enforce business rules, throw NestJS exceptions (`ForbiddenException`, `NotFoundException`, `ConflictException`). Never return ad-hoc error objects.
- Repositories: Prisma queries. Centralize repeated `include` shapes and membership lookups here.

### Auth & Authorization

- `@UseGuards(JwtAuthGuard)` on every controller unless intentionally public
- `@CurrentUser()` returns `{ id: string, email: string }` from JWT — NOT a full user record
- To get full profile/membership: query Prisma in the service layer
- Business authorization: check membership in service via repository (`findMembership`)
- Role checks: validate `membership.role` in service (OWNER, ADMIN, SUPERVISOR, OPERATOR)

### DTOs & Validation

- Global `ValidationPipe` is configured: `whitelist`, `transform`, `forbidNonWhitelisted`
- Always create DTO classes with `class-validator` decorators for POST/PATCH
- Never leak raw Prisma input types into controllers
- Route params: use `ParseUUIDPipe` for ID params

### Data Mutations

- Prefer Prisma nested writes, `upsert`, and `$transaction()` for multi-step mutations
- Example: business creation atomically creates owner membership + onboarding + default location
- Don't split concurrent-sensitive mutations across uncoordinated queries

### Database

- IDs are UUIDs (strings), never numeric, never MongoDB ObjectIds
- Schema source: `prisma/schema.prisma`
- PrismaService uses `@prisma/adapter-pg` + `pg` pool — preserve this pattern
- `@ts-expect-error` on adapter init is intentional (Prisma 7 type mismatch with `@types/pg`)

### Security

- No hardcoded secrets — use `ConfigModule` (global)
- `JWT_SECRET` falls back to `dev-secret` — don't add more fallback secrets
- Environment: `DATABASE_URL_SESSION`, `DATABASE_URL`, `JWT_SECRET`, `PORT`

## Adding a New Module — Step by Step

1. **Schema**: Add model + enums to `prisma/schema.prisma`
2. **Migrate**: `npx prisma migrate dev --name add-<entity>`
3. **Repository**: `<entity>.repository.ts` — Prisma queries, membership lookup
4. **Service**: `<entity>.service.ts` — permission checks, business logic, NestJS exceptions
5. **DTOs**: `dto/create-<entity>.dto.ts`, `dto/update-<entity>.dto.ts` with class-validator
6. **Controller**: `<entity>.controller.ts` — `@UseGuards(JwtAuthGuard)`, thin delegation
7. **Module**: `<entity>.module.ts` — import PrismaModule, provide repo/service/controller
8. **Wire**: Add to `app.module.ts` imports
9. **Test**: Write `*.spec.ts` (Jest + ts-jest, test files in `src/`)

## Adding a New Endpoint to Existing Module

1. Add DTO if needed (with class-validator decorators)
2. Add repository method (Prisma query)
3. Add service method (permission check + business logic)
4. Add controller method (guard + DTO + delegate)
5. If response shape is new: coordinate with mobile types update

## Commands

```bash
npm run start:dev          # Dev server (watch mode)
npm run build              # Production build
npm run lint               # ESLint + Prettier
npm test                   # Jest tests
npx prisma migrate dev     # Run/create migrations
npx prisma generate        # Regenerate client after schema change
npx prisma studio          # DB browser GUI
```

## Enums Reference

Key enums (defined in schema.prisma):
- `MembershipRole`: OWNER, ADMIN, SUPERVISOR, OPERATOR, VERITT_STAFF
- `StaffStatus`: ACTIVE, INACTIVE
- `PayrollFrequency`: DAILY, WEEKLY, BIWEEKLY, SEMIMONTHLY, MONTHLY
- `PayrollPaymentStatus`: PENDING, PAID, OVERDUE, SKIPPED, CANCELED
- `InventoryMovementType`: OPENING_BALANCE, PURCHASE, RECEIPT, PRODUCTION_IN/OUT, TRANSFER_IN/OUT, ADJUSTMENT_IN/OUT, SALE, RETURN, WASTE
- `ProductType`: DIRECT, RECIPE
- `NotificationType`: PAYROLL_DUE, PAYROLL_OVERDUE, MATERIAL_LOW_STOCK, MATERIAL_OUT_OF_STOCK, PRODUCT_LOW_STOCK, PRODUCT_OUT_OF_STOCK
