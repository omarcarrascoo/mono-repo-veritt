# Deep Analysis: Veritt — Estado del Proyecto

> Fecha: 2026-04-13
> Analisis completo del codigo existente contra ARCHITECTURE_V3.md, ROADMAP.md, PHASE4_PLAN.md y GAP_ANALYSIS.md

---

## Resumen Ejecutivo

```
Arquitectura V.3 — Progreso General
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fundacion (auth, negocios, staff, inventario)  ██████████ 100%  LISTO
Phase 1: Areas, Procesos, Time Tracking        ██████████ 100%  LISTO
Phase 2: Ventas, POS y Revenue Tracking        ██████████ 100%  LISTO
Phase 3: Ordenes de Compra y Recepcion         ██████████ 100%  LISTO
Phase 4: Cadena Diaria (FAI-FCI-FID-FAF-FOP)  ███░░░░░░░  30%  EN PROGRESO
Phase 5: AMD (6 Pestanas + SHA-256)            ░░░░░░░░░░   0%  NO INICIADO
Phase 6: 7 Candados                            ░░░░░░░░░░   0%  NO INICIADO
Phase 7: V2 y V3 (Escala)                      ░░░░░░░░░░   0%  NO INICIADO
```

**Numeros clave del proyecto:**

- **52 modelos Prisma**, 36 enums
- **21 modulos NestJS** (19 feature + 2 core)
- **54 pantallas mobile**, 16 API modules, 18 archivos de tipos
- **15 componentes UI** del design system `Vritt*`

---

## Analisis Modulo por Modulo: Backend vs Frontend

### FUNDACION — Todo construido y funcional

| Modulo | Backend (BE) | Frontend (FE) | Sync? |
|--------|-------------|---------------|-------|
| **Auth** | `src/auth/` — JWT custom, register/login/me, guards, strategies | `login.tsx`, `register.tsx`, `auth.store.ts`, `useAuthBootstrap` | OK |
| **Users** | `src/users/` — CRUD basico, repo | Consumido via auth (no pantalla dedicada) | OK |
| **Businesses** | `src/businesses/` — CRUD completo, slug, timezone, cutoff hour | `businesses.tsx` (tab), `create.tsx`, `[businessId]/index.tsx` dashboard | OK |
| **Memberships** | `src/memberships/` — add/update member, roles (OWNER→OPERATOR) | Integrado en dashboard de negocio | OK |
| **Onboarding** | `src/onboarding/` — wizard por pasos, GET/PATCH | `lib/business-onboarding.ts` + `lib/update-onboarding.ts` | OK |
| **Staff** | `src/staff/` — profiles, compensacion, historial | `staff.tsx`, `[staffId].tsx`, `create-staff.tsx` | OK |
| **Payroll** | `src/payroll/` — pagos, periodos, frecuencias | `payroll.tsx` + `PayrollDateSelector` component | OK |
| **Notifications** | `src/notifications/` — upsert con dedup, tipos expandidos (11 tipos) | `notifications.api.ts` (consume, no pantalla dedicada visible) | OK |
| **Inventory** | `src/inventory/` — locations, materials (FIFO lots), products (recetas versionadas), stock movements | 7 pantallas: dashboard, create material/product/location, detail pages | OK |

**Observacion critica sobre Inventory:** El service tiene ~1800 lineas con Prisma directo (sin repository). Funcional pero es deuda tecnica identificada. Diferido correctamente — no bloquea nada.

---

### PHASE 1 — Entidades Universales

| Modulo | Backend | Frontend | Sync? |
|--------|---------|----------|-------|
| **Areas** | `src/areas/` — CRUD + `link-location` para vincular InventoryLocation. Enums: KITCHEN, BAR, DINING, CASH_REGISTER, WAREHOUSE, OFFICE, PRODUCTION, OTHER. Jerarquia con `parentAreaId`. | 3 pantallas: `areas/index.tsx`, `create.tsx`, `[areaId].tsx` | OK |
| **Processes** | `src/processes/` — ProcessTemplate con pasos ordenados, ProcessStep con `requiredRole` y `assignedAreaId`, ProcessExecution con start/complete. **`isBlocking` para FOP.** | 3 pantallas: `processes/index.tsx`, `create.tsx`, `[processId].tsx` | OK |
| **Time Tracking** | `src/time-tracking/` — ShiftLog con clock in/out + GPS (lat/lng), ShiftBreak (MEAL/REST/OTHER), totalMinutes. | 2 pantallas: `shifts/index.tsx`, `shifts/clock-in.tsx` | OK |
| **RBAC** | `src/common/guards/permission.guard.ts` + `@RequirePermission()` decorator. RolePermission model con READ/EXECUTE/APPROVE/MANAGE. OWNER y VERITT_STAFF bypass. | **NO aplicado en FE** — la app no filtra modulos por permisos aun | GAP |

**Gap identificado:** El guard de permisos esta construido pero no aplicado a ningun endpoint ni consumido en mobile. Esto es intencional — se activara cuando la cadena diaria lo requiera.

---

### PHASE 2 — Ventas y POS

| Modulo | Backend | Frontend | Sync? |
|--------|---------|----------|-------|
| **Sales** | `src/sales/` — Sale con status flow (OPEN→COMPLETED→CANCELLED/REFUNDED), SaleItem con snapshot de recipeVersionId, cancel con stock reversal (RETURN movements + TheoreticalConsumption cleanup), sale number auto-incremento | 4 pantallas: `sales/index.tsx`, `create.tsx`, `[saleId].tsx`, `analytics.tsx` | OK |
| **Consumo Teorico** | TheoreticalConsumption auto-generado al crear venta. Formula: `qty * recipeQty * (1 + waste/100)`. API para consultar por rango. | Consumido en analytics screen | OK |
| **Payment Methods** | `src/payment-methods/` — CASH, CARD_TERMINAL, BANK_TRANSFER, OTHER. SalePayment multiple por venta con validacion suma = total | 1 pantalla: `payment-methods/index.tsx` | OK |
| **Revenue Tracking** | Daily summary, period summary, product revenue. Desglose por metodo de pago y area. | `analytics.tsx` con graficas | OK |

**Gap menor:** Punto de equilibrio diario no calculado — necesita un modelo de costos fijos que no existe aun. No bloquea Phase 4.

---

### PHASE 3 — Supply Chain

| Modulo | Backend | Frontend | Sync? |
|--------|---------|----------|-------|
| **Suppliers** | `src/suppliers/` — CRUD con RFC, status | 3 pantallas: list, create, detail | OK |
| **Purchase Orders** | `src/purchase-orders/` — DRAFT→SENT→RECEIVED, items con materialId y costos estimados, orderNumber auto-incremento, send/cancel | 3 pantallas: list, create (items dinamicos), detail (acciones send/cancel) | OK |
| **Receipts** | `src/receipts/` — Vinculado a PO, **separacion de responsabilidades enforced** (`receivedByUserId != PO.createdByUserId`), crea MaterialLot + StockMovement, weighted average cost update, alerta de precio >10% | 3 pantallas: list, create, detail | OK |
| **Supplier Invoices** | `src/supplier-invoices/` — CFDI UUID/XML, vinculo a receipt, status (PENDING→VERIFIED→DISPUTED), verify/dispute/soft-delete | 3 pantallas: list, create, detail | OK |

**Phase 3 esta 100% end-to-end.** Es la supply chain completa y es prerequisito cumplido para Phase 4.

---

### PHASE 4 — Cadena Diaria (EN PROGRESO)

Este es el hallazgo mas importante del analisis. Segun el PHASE4_PLAN y el GAP_ANALYSIS, Phase 4 estaba "NO INICIADO", pero **el codigo actual muestra que ya se inicio:**

| Componente | Schema (Prisma) | Backend Module | Frontend | Estado |
|------------|----------------|----------------|----------|--------|
| **Modelos** | 11 modelos + 6 enums en schema.prisma | Existen | — | LISTO |
| **Migration** | `20260409003255_add_daily_chain_phase4/` | Creada (en git untracked) | — | LISTO |
| **daily-chain module** | — | `src/daily-chain/` con controller, service, repository, DTOs, helpers | — | LISTO (estructura) |
| **FAI (Apertura)** | DailyInventoryOpening + Items | Endpoints create + authorize + reject | `opening.tsx` + `opening-review.tsx` | PARCIAL |
| **FCI (Cierre)** | DailyInventoryClosing + Items | Endpoint create | `closing.tsx` | PARCIAL |
| **FID (Desviaciones)** | DailyDeviationReport + DeviationItem | GET + classify + approve | `deviations.tsx` | PARCIAL |
| **FAF (Arqueo)** | DailyCashReconciliation + 3 sub-modelos | Endpoint create (tolerancia cero) | `reconciliation.tsx` | PARCIAL |
| **FOP (Firma)** | DailyOperationClose + FOPValidationItem | GET + sign | `fop.tsx` | PARCIAL |
| **Dashboard** | — | GET status endpoint | `daily-chain/index.tsx` | PARCIAL |
| **Types + API** | — | — | `daily-chain.types.ts` + `daily-chain.api.ts` | LISTO |
| **NotificationType expansion** | 5 nuevos tipos (PRICE_ALERT, DAILY_*) | En schema | — | LISTO |
| **Integracion bloqueo** | — | Sales/Receipts check `isDayOpen()` | — | PENDIENTE |
| **Wired in app.module** | — | DailyChainModule importado | — | LISTO |

**Estado real de Phase 4:** Schema migrado, modulo creado y wired, pantallas mobile creadas, types y API definidos. Lo que falta verificar es si la **logica de negocio** (reglas de bloqueo, calculos de varianza, auto-generacion de FID, tolerancia cero del FAF, conciliacion cruzada del FOP) esta completamente implementada, y si la **integracion con Sales/Receipts** para bloquear operaciones sin FAI ya existe.

**Archivos en staging/untracked que confirman trabajo activo:**

- `monkeys-api/prisma/schema.prisma` — MODIFIED
- `monkeys-api/src/app.module.ts` — MODIFIED
- `monkeys-api/src/daily-chain/` — NEW (todo el modulo)
- `veritt-mobile/app/businesses/[businessId]/daily-chain/` — NEW (7 pantallas)
- `veritt-mobile/api/modules/daily-chain.api.ts` — NEW
- `veritt-mobile/types/daily-chain.types.ts` — NEW

---

### PHASES 5-7 — No iniciadas

| Phase | Que falta | Bloqueado por |
|-------|-----------|---------------|
| **5: AMD** | Modelo DailyMasterArchive, JSON builder para 6 pestanas, SHA-256 hashing, inmutabilidad | Phase 4 completa (FOP firma genera AMD) |
| **6: 7 Candados** | Motor de validacion cruzada. **C3 y C5 podrian implementarse ya** (sus prereqs estan listos) | C1,C2,C4,C7 necesitan Phase 4-5 |
| **7: V2+V3** | Integracion IMSS, exportacion certificada, scoring crediticio, API de datos | Todo lo anterior |

---

## Mapa de Dependencias: Que alimenta a que

```
Auth ─────────────┐
Users ────────────┤
Businesses ───────┤
Memberships ──────┤──► FUNDACION (todo OK)
Onboarding ───────┤
Staff ────────────┤
Payroll ──────────┤
Inventory ────────┘
       │
       ├── Areas ──────────────┐
       ├── Processes ──────────┤──► PHASE 1 (todo OK)
       ├── Time Tracking ──────┤
       └── RBAC ───────────────┘
              │
              ├── Sales + POS ─────────┐
              ├── Consumo Teorico ─────┤──► PHASE 2 (todo OK)
              ├── Payment Methods ─────┤
              └── Revenue Tracking ────┘
                     │
                     ├── Suppliers ────────────┐
                     ├── Purchase Orders ──────┤──► PHASE 3 (todo OK)
                     ├── Receipts ─────────────┤
                     └── Supplier Invoices ────┘
                            │
                            ├── FAI (Apertura) ────┐
                            ├── FCI (Cierre) ──────┤
                            ├── FID (Desviaciones)─┤──► PHASE 4 (~30% EN PROGRESO)
                            ├── FAF (Arqueo) ──────┤
                            └── FOP (Firma) ───────┘
                                   │
                                   └── AMD ──► 7 Candados ──► V2/V3
```

---

## Gaps Criticos Consolidados

| # | Gap | Severidad | Donde | Impacto |
|---|-----|-----------|-------|---------|
| 1 | **RBAC no aplicado** a endpoints ni mobile | Media | Guards existen pero no se usan | Cualquier miembro puede hacer todo — aceptable en dev, no en produccion |
| 2 | **Inventory service sin repository** (~1800 lineas) | Baja | `src/inventory/inventory.service.ts` | Deuda tecnica, no bloquea funcionalidad |
| 3 | **Price alerts usan MATERIAL_LOW_STOCK** en vez de PRICE_ALERT | Baja | `src/receipts/` | PRICE_ALERT ya existe en enum, falta migrar el uso |
| 4 | **Punto de equilibrio** no calculado | Baja | Revenue tracking | Necesita modelo de costos fijos |
| 5 | **Phase 4 logica de bloqueo** pendiente de verificar | Alta | `daily-chain.service.ts` | Si las reglas de bloqueo no estan completas, el core de V.3 no funciona |
| 6 | **Integracion Sales/Receipts con isDayOpen()** | Alta | `sales.service.ts`, `receipts.service.ts` | Sin esto, la cadena diaria no bloquea operaciones realmente |

---

## Inventario Completo del Codebase

### Backend — 21 Modulos NestJS

| # | Modulo | Controller | Service | Repository | DTOs | Phase |
|---|--------|-----------|---------|------------|------|-------|
| 1 | auth | SI | SI | SI | 2 (login, register) | Fundacion |
| 2 | users | SI | — | SI | — | Fundacion |
| 3 | businesses | SI | SI | SI | 2 (create, update) | Fundacion |
| 4 | memberships | SI | SI | SI | 2 (add, update) | Fundacion |
| 5 | onboarding | SI | SI | SI | 1 (update) | Fundacion |
| 6 | staff | SI | SI | SI | 3 (create, update, compensation) | Fundacion |
| 7 | payroll | SI | SI | SI | 1 (update payment) | Fundacion |
| 8 | notifications | SI | SI | — | 1 (list) | Fundacion |
| 9 | inventory | SI | SI | — | 3 (location, material, product) | Fundacion |
| 10 | areas | SI | SI | SI | 3 (create, update, link-location) | Phase 1 |
| 11 | processes | SI | SI | SI | 3 (create, update, execution) | Phase 1 |
| 12 | time-tracking | SI | SI | SI | 3 (clock-in, clock-out, break) | Phase 1 |
| 13 | sales | SI | SI | SI | 2 (create, cancel) | Phase 2 |
| 14 | payment-methods | SI | SI | SI | 2 (create, update) | Phase 2 |
| 15 | suppliers | SI | SI | SI | 2 (create, update) | Phase 3 |
| 16 | purchase-orders | SI | SI | SI | 2 (create, update) | Phase 3 |
| 17 | receipts | SI | SI | SI | 2 (create, cancel) | Phase 3 |
| 18 | supplier-invoices | SI | SI | SI | 5 (create, update, verify, dispute, delete) | Phase 3 |
| 19 | daily-chain | SI | SI | SI | 4 (opening, closing, reconciliation, classify) | Phase 4 |
| 20 | database/prisma | — | SI | — | — | Core |
| 21 | common | — | — | — | — | Core (guards, decorators, interceptors) |

### Frontend — 54 Pantallas

| Seccion | Pantallas | Archivos |
|---------|-----------|----------|
| Auth | 3 | `index.tsx`, `login.tsx`, `register.tsx` |
| Tabs | 4 | home, businesses, explore, profile |
| Business General | 2 | dashboard, create |
| Staff | 3 | list, detail, create |
| Shifts | 2 | list, clock-in |
| Inventory | 7 | dashboard, create material/product/location, detail x3 |
| Sales | 4 | list, create, detail, analytics |
| Payment Methods | 1 | list |
| Suppliers | 3 | list, create, detail |
| Purchase Orders | 3 | list, create, detail |
| Receipts | 3 | list, create, detail |
| Supplier Invoices | 3 | list, create, detail |
| Areas | 3 | list, create, detail |
| Processes | 3 | list, create, detail |
| Daily Chain | 7 | dashboard, opening, opening-review, closing, deviations, reconciliation, fop |
| Payroll | 1 | overview |

### Prisma Schema — 52 Modelos, 36 Enums

**Modelos por dominio:**

- **Core (4):** User, Business, BusinessMembership, BusinessOnboarding
- **Staff (4):** StaffProfile, StaffCompensation, StaffCompensationHistory, PayrollPayment
- **Inventory (12):** InventoryLocation, Material, MaterialLot, MaterialStockMovement, MaterialLotAllocation, Product, ProductSalePriceHistory, ProductManualCostHistory, ProductRecipeVersion, ProductRecipeVersionItem, ProductLot, ProductStockMovement, ProductLotAllocation
- **Operations (5):** Area, ProcessTemplate, ProcessStep, ProcessExecution, RolePermission
- **Time Tracking (2):** ShiftLog, ShiftBreak
- **Sales (5):** PaymentMethod, Sale, SaleItem, SalePayment, TheoreticalConsumption
- **Supply Chain (6):** Supplier, PurchaseOrder, PurchaseOrderItem, Receipt, ReceiptItem, SupplierInvoice
- **Daily Chain (12):** DailyInventoryOpening, DailyInventoryOpeningItem, DailyInventoryClosing, DailyInventoryClosingItem, DailyDeviationReport, DeviationItem, DailyCashReconciliation, CashDenominationCount, TerminalReconciliation, TransferReconciliation, DailyOperationClose, FOPValidationItem
- **System (1):** Notification

---

## Conclusion

El proyecto tiene una **base extraordinariamente solida**. Phases 1-3 estan completas end-to-end (BE + FE + types + API sync). La arquitectura Controller→Service→Repository se respeta consistentemente, los modelos Prisma estan bien disenados con FIFO, versionado de costos, y separacion de responsabilidades enforced por codigo.

**Phase 4 es donde estamos ahora.** El schema esta migrado, el modulo existe, las pantallas estan creadas. Lo critico pendiente es:

1. Verificar que la **logica de negocio** en `daily-chain.service.ts` implemente las reglas de bloqueo secuencial
2. Conectar el bloqueo con Sales y Receipts (`isDayOpen()`)
3. Testing del flujo completo FAI→FCI→FID→FAF→FOP

Una vez Phase 4 este cerrada, Phase 5 (AMD) es el siguiente paso natural — y es donde Veritt se convierte en lo que la Architecture V.3 promete: **un sistema donde cada dia se cierra con integridad verificable.**
