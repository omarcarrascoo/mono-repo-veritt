# Phase 4 — Daily Chain: Session Handoff (2026-04-14)

## What Was Built (Previous Sessions)

The entire daily chain module — FAI → FCI → FID → FAF → FOP — was built from scratch across the backend (NestJS) and frontend (Expo/React Native). This includes:

- 4 Prisma migrations applied to production DB
- Full `daily-chain/` module: controller, service, repository, DTOs, helpers
- 8 frontend screens under `daily-chain/`
- Integration with Sales (isDayOpen guard + TheoreticalConsumption creation) and Receipts (isDayOpen guard)
- Business store for role-based UI
- Operational date helper with timezone support

## What Was Fixed Today (2026-04-14)

### 1. UTC Date Boundary Bug (ROOT CAUSE of FID/FAF issues)

**Problem**: All 7 aggregation queries in `daily-chain.repository.ts` used `setUTCHours(0,0,0,0)` to `setUTCHours(23,59,59,999)` for date filtering. This creates a UTC midnight-to-midnight window. But sales/receipts store timestamps in actual UTC. For Mexico City (UTC-6), a sale at 7PM local = 1AM UTC **next day**, falling outside the query window.

**Fix**: 
- Added `getOperationalDateRange(opDate, cutoffHour, timezone)` to `operational-date.helper.ts`
- Added `localToUTC()` helper using `Intl.DateTimeFormat` to compute proper UTC offset
- Changed all 7 repository methods to accept `{ start: Date; end: Date }` range instead of raw `Date`
- Service now calls `getDateRange()` and passes the range to all aggregation methods
- Uses `gte: start, lt: end` (exclusive end) since end is start of next operational day

**Affected methods**: `getReceiptsForDate`, `getTheoreticalConsumptionForDate`, `getSalesExpectedByPaymentMethod`, `getCashExpectedTotal`, `getTransferExpectedTotal`, `getBlockingProcessesStatus`, `getShiftHoursForDate`

### 2. FCI Approval Workflow

**Problem**: FCI auto-set status to `COMPLETED` and auto-generated FID in the same transaction. No manager review.

**Fix**:
- Schema: Added `AUTHORIZED`/`REJECTED` to `DailyClosingStatus`, added `authorizedByUserId`, `authorizedAt`, `rejectedReason` fields
- `createClosing()` now creates as `PENDING`, no FID generation
- Added `authorizeClosing()` — manager approves → FID auto-generated in same transaction
- Added `rejectClosing()` — manager rejects with reason
- Added `getClosing()` for review
- Controller: 3 new endpoints (`GET /closing`, `POST /closing/:id/authorize`, `POST /closing/:id/reject`)
- Frontend: new `closing-review.tsx` screen mirroring opening-review pattern
- Dashboard: FCI navigation routes to closing-review when PENDING/AUTHORIZED

### 3. Status Query Fix

**Problem**: `getStatus()` called `findClosing(businessId, '', opDate)` with empty locationId — always returned null.

**Fix**: Changed to use `findClosingForDate(businessId, opDate)` which finds any non-rejected closing for the date.

---

## Current Git State

### Staged (tracked, modified):
```
M monkeys-api/prisma/schema.prisma
M monkeys-api/src/app.module.ts
M monkeys-api/src/businesses/businesses.repository.ts
M monkeys-api/src/businesses/businesses.service.ts
M monkeys-api/src/receipts/receipts.module.ts
M monkeys-api/src/receipts/receipts.service.ts
M monkeys-api/src/sales/sales.module.ts
M monkeys-api/src/sales/sales.service.ts
M veritt-mobile/app/(tabs)/businesses.tsx
M veritt-mobile/app/businesses/[businessId]/index.tsx
M veritt-mobile/types/business.types.ts
```

### Untracked (new files):
```
monkeys-api/prisma/migrations/20260409003255_add_daily_chain_phase4/
monkeys-api/prisma/migrations/20260414220955_add_faf_approval_step/
monkeys-api/prisma/migrations/20260415004020_fai_variance_note_and_allow_retry/
monkeys-api/prisma/migrations/20260415021611_add_fci_approval/
monkeys-api/src/daily-chain/             (entire module — new)
veritt-mobile/api/modules/daily-chain.api.ts
veritt-mobile/app/businesses/[businessId]/daily-chain/  (8 screens)
veritt-mobile/store/business.store.ts
veritt-mobile/types/daily-chain.types.ts
```

### Nothing committed yet — all changes are uncommitted.

---

## Full Chain Flow (Current State)

```
FAI (Opening)
  Operator creates → PENDING
  Manager authorizes → AUTHORIZED (enables sales/receipts)
  Manager rejects → REJECTED (operator retries)
      ↓
FCI (Closing)
  Operator creates → PENDING
  Manager authorizes → AUTHORIZED → FID auto-generated
  Manager rejects → REJECTED (operator retries)
      ↓
FID (Deviations)
  Auto-generated with: theoreticalConsumption vs realConsumption
  Operator classifies causes → CLASSIFIED
  Manager approves → APPROVED
      ↓
FAF (Reconciliation)
  Operator enters blind cash count + terminal/transfer totals → PENDING_REVIEW
  Manager approves → RECONCILED (if diff ≈ 0) or DISCREPANCY
  If RECONCILED → FOP auto-generated
      ↓
FOP (Operational Close)
  Auto-generated with 4 validations (INVENTORY, CASH, PROCESSES, HOURS)
  Status: PENDING (all pass) or BLOCKED (some fail)
  Manager signs → SIGNED (day complete)
```

---

## Key Math: FID Deviation Calculation

```
For each material in closing items:
  openingQuantity    = FAI countedQuantity (what we started with)
  receivedQuantity   = SUM(ReceiptItem.quantityReceived) for operational date range
  countedQuantity    = FCI countedQuantity (what we ended with)
  
  realConsumption    = openingQuantity + receivedQuantity - countedQuantity
  
  theoreticalConsumption = SUM(TheoreticalConsumption.expectedQuantity) for operational date range
    where: expectedQuantity = productQty × recipeQty × (1 + wastePercent/100)
    (created per sale item per recipe ingredient in sales.service.ts)
  
  deviationQuantity  = realConsumption - theoreticalConsumption
  deviationValueMXN  = deviationQuantity × material.currentReferenceUnitCost
```

**If deviationQuantity > 0**: We consumed MORE than recipes predicted (waste, theft, error)
**If deviationQuantity < 0**: We consumed LESS than predicted (overproduction recorded, counting error)
**If deviationQuantity ≈ 0**: Operations match theoretical perfectly

## Key Math: FAF Reconciliation

```
cashExpected      = SUM(SalePayment.amount) WHERE paymentMethod.type = 'CASH' in date range
transferExpected  = SUM(SalePayment.amount) WHERE paymentMethod.type = 'BANK_TRANSFER' in date range  
terminalExpected  = SUM(SalePayment.amount) GROUP BY paymentMethodId (CARD_TERMINAL types) in date range

totalExpected = cashExpected + SUM(terminalExpected) + transferExpected

cashCounted      = SUM(denomination × quantity) from operator's bill count
terminalReported = SUM(reportedTotal) from each terminal
transferReported = SUM(reportedTotal) from transfer section

totalCounted = cashCounted + terminalReported + transferReported

difference = totalCounted - totalExpected
```

## TheoreticalConsumption Record Creation (sales.service.ts)

When a sale is completed:
```typescript
for each SaleItem with a recipe:
  for each RecipeVersionItem:
    expectedQuantity = saleItem.quantity × recipeItem.quantity × (1 + recipeItem.wastePercent / 100)
    expectedCost = expectedQuantity × recipeItem.unitCost (snapshot)
    
    → INSERT TheoreticalConsumption {
        businessId, saleId, saleItemId, materialId, recipeVersionId,
        productQuantity, recipeQuantity, wastePercent,
        expectedQuantity, unitCostSnapshot, expectedCost,
        calculatedAt: now()  // ← this is the timestamp used for date filtering
      }
```

When a sale is cancelled: `DELETE FROM TheoreticalConsumption WHERE saleId = :id` (cleanup happens)

---

## API Endpoints (Complete Reference)

Base: `POST /api/v1/businesses/:businessId/daily-chain/`

| Method | Path | Description |
|--------|------|-------------|
| GET | /status?date= | Chain status for all 5 stages |
| POST | /opening | Create FAI |
| GET | /opening?date=&locationId= | Get FAI |
| POST | /opening/:id/authorize | Authorize FAI |
| POST | /opening/:id/reject | Reject FAI (body: {reason}) |
| POST | /closing | Create FCI |
| GET | /closing?date= | Get FCI |
| POST | /closing/:id/authorize | Authorize FCI → auto-generates FID |
| POST | /closing/:id/reject | Reject FCI (body: {reason}) |
| GET | /deviations?date= | Get FID |
| PATCH | /deviations/:id/classify | Classify deviations |
| POST | /deviations/:id/approve | Approve FID |
| GET | /reconciliation?date= | Get FAF |
| POST | /reconciliation | Create FAF |
| POST | /reconciliation/:id/approve | Approve FAF → auto-generates FOP if RECONCILED |
| GET | /fop?date= | Get FOP |
| POST | /fop/:id/sign | Sign FOP |
| GET | /history?from=&to= | Historical chain data |

---

## Frontend Screens (8 total)

| Screen | File | Purpose |
|--------|------|---------|
| Dashboard | `index.tsx` | 5-stage progress view, "Iniciar Dia" card, role-aware navigation |
| Opening | `opening.tsx` | FAI form — count materials, explain variances |
| Opening Review | `opening-review.tsx` | FAI review — manager approve/reject |
| Closing | `closing.tsx` | FCI form — count materials at end of day |
| Closing Review | `closing-review.tsx` | FCI review — manager approve/reject, shows consumption |
| Deviations | `deviations.tsx` | FID — classify causes, manager approve |
| Reconciliation | `reconciliation.tsx` | FAF — blind cash count, terminal/transfer input, manager approve |
| FOP | `fop.tsx` | FOP — view validations, manager sign |

---

## What NEEDS Testing (Critical)

### Backend — Must Test Before Ship

- [ ] **UTC date range fix**: Create a sale (which creates TheoreticalConsumption), then authorize FCI. Verify FID `theoreticalConsumption` is non-zero for the materials in the sale's recipe.
- [ ] **FAF totals with date fix**: After sales, create reconciliation. Verify `totalExpected` matches the actual sale payment amounts.
- [ ] **FCI approval flow end-to-end**: Operator creates closing → manager authorizes → FID auto-generated with correct data.
- [ ] **FCI rejection + retry**: Reject FCI → verify operator can create a new one for same date/location.
- [ ] **Creator ≠ authorizer enforcement**: Verify that the same user who created FCI cannot authorize it (403 expected).
- [ ] **FID generation includes all closing materials**: Verify FID items match exactly the materials from the closing.
- [ ] **Cancelled sales cleanup**: Cancel a sale → verify TheoreticalConsumption records are deleted → verify FID doesn't include them.
- [ ] **Operational date edge case**: Test with cutoff hour = 6, sale at 5:30 AM local time (should be previous operational day).
- [ ] **Full chain walkthrough**: FAI → authorize → make sales → FCI → authorize → classify FID → approve FID → FAF → approve FAF → sign FOP.

### Frontend — Must Test Before Ship

- [ ] **Closing review screen**: Verify it loads, shows materials with opening/received/counted/consumption.
- [ ] **Closing review — manager actions**: Authorize and reject buttons work.
- [ ] **Closing review — operator view**: Shows "Pendiente de autorizacion" message (no buttons).
- [ ] **Dashboard FCI navigation**: PENDING → goes to closing-review, no FCI → goes to closing form.
- [ ] **Dashboard status labels**: Verify FCI shows correct status text for all states.
- [ ] **FID screen after FCI authorization**: Navigating to FID shows the auto-generated deviation report.
- [ ] **Reconciliation screen**: Blind cash counting works, manager review mode shows expected vs counted.
- [ ] **Two-user flow**: Test with 2 different accounts — operator creates, manager approves.

### Edge Cases

- [ ] What happens if a receipt is created AFTER FCI but BEFORE FCI authorization? (receivedQuantity was already captured at FCI creation time — receipt won't be reflected in deviation)
- [ ] What if materials are added to inventory AFTER FCI creation? (FID only includes materials from closing items)
- [ ] What if the business has no payment methods? (FAF terminal reconciliation would be empty)
- [ ] What if all deviations are exactly zero? (Should auto-set CLASSIFIED status, no classification needed)
- [ ] Race condition: two managers try to authorize FCI simultaneously

---

## Known Issues / Technical Debt

### 1. Receipt timing with FCI
When FCI is created, `receivedQuantity` is captured at that moment. If a receipt arrives between FCI creation and FCI authorization, it won't be counted in the closing items (but WILL appear in theoretical consumption if it enables a sale). This could cause a false deviation.

**Mitigation**: FCI authorization should probably recalculate receipts at authorization time, not creation time. Or block receipts once FCI is created.

### 2. `findClosing` unique constraint changed to `findFirst`
The `findClosing` method was changed from using `@@unique` lookup to `findFirst` with `status: { not: 'REJECTED' }`. The `@@unique` constraint on `(businessId, locationId, operationalDate)` still exists in the schema, which means rejected closings will block new ones at the DB level.

**Action needed**: Change `@@unique` to `@@index` on DailyInventoryClosing (same fix as was done for DailyInventoryOpening).

### 3. `DailyClosingStatus.COMPLETED` is now orphaned
We added AUTHORIZED/REJECTED but never use COMPLETED anymore. FCI goes PENDING → AUTHORIZED. The COMPLETED status is dead code but still in the enum.

**Action**: Either remove COMPLETED from the enum (migration needed) or document it as deprecated.

### 4. `completedByUserId` / `completedAt` on DailyInventoryClosing
These fields are now unused since FCI no longer auto-completes. They're still in the schema taking up space.

**Action**: Remove in a cleanup migration or repurpose as audit fields.

### 5. No `_layout.tsx` for daily-chain folder
The daily-chain screens don't have a layout file. Expo Router will use the parent layout. This is fine for now but if we want a shared header or back button behavior, we'd need one.

### 6. Decimal precision on frontend
All financial calculations on frontend use JavaScript `Number` (IEEE 754 float64). For denominations like `0.50 * 3 = 1.5` this is fine, but edge cases could cause display issues (e.g., `0.1 + 0.2 ≠ 0.3`). The backend uses Prisma `Decimal(14,4)` which is exact.

### 7. FOP validation thresholds are hardcoded
- INVENTORY: `isWithinThreshold = inventoryVariance === 0` (any variance fails)
- CASH: `isWithinThreshold = Math.abs(cashDiff) < 0.01` (1 centavo tolerance)
- These should probably be configurable per business.

---

## File Map (All Phase 4 Files)

### Backend
```
monkeys-api/src/daily-chain/
├── daily-chain.module.ts
├── daily-chain.controller.ts      (18 endpoints)
├── daily-chain.service.ts         (~600 lines, all business logic)
├── daily-chain.repository.ts      (~620 lines, all Prisma queries)
├── dto/
│   ├── create-opening.dto.ts
│   ├── create-closing.dto.ts
│   ├── classify-deviation.dto.ts
│   └── create-reconciliation.dto.ts
└── helpers/
    └── operational-date.helper.ts  (getOperationalDate, parseOperationalDate, getOperationalDateRange, localToUTC)
```

### Frontend
```
veritt-mobile/app/businesses/[businessId]/daily-chain/
├── index.tsx              (dashboard)
├── opening.tsx            (FAI form)
├── opening-review.tsx     (FAI review)
├── closing.tsx            (FCI form)
├── closing-review.tsx     (FCI review)  ← NEW TODAY
├── deviations.tsx         (FID)
├── reconciliation.tsx     (FAF)
└── fop.tsx                (FOP)

veritt-mobile/api/modules/daily-chain.api.ts   (17 API functions)
veritt-mobile/types/daily-chain.types.ts       (all interfaces + DTOs)
veritt-mobile/store/business.store.ts          (role detection for manager checks)
```

### Schema
```
monkeys-api/prisma/schema.prisma    (Phase 4 section: 7 enums, 11 models)
monkeys-api/prisma/migrations/
├── 20260409003255_add_daily_chain_phase4/
├── 20260414220955_add_faf_approval_step/
├── 20260415004020_fai_variance_note_and_allow_retry/
└── 20260415021611_add_fci_approval/
```

---

## Priority for Next Session

1. **Fix DailyInventoryClosing unique constraint** — change `@@unique` to `@@index` so rejected closings don't block retries (same pattern as FAI fix)
2. **Test the UTC date range fix** — make sales, then verify FID/FAF show correct numbers
3. **Full chain walkthrough** — operator creates FAI/FCI, manager approves, all the way to FOP sign
4. **Commit all changes** — everything is uncommitted
5. **Consider**: receipt timing issue, FOP threshold configuration, frontend decimal precision
