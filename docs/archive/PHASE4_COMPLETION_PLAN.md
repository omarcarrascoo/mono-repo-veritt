# Plan: Completar Phase 4 — Cadena Diaria (Optimizado)

> Fecha: 2026-04-14
> Prerequisitos: Phase 1-3 completas, Phase 4 ~95% construido

---

## Context

Phase 4 (FAI-FCI-FID-FAF-FOP) esta casi completo pero tiene huecos criticos:
- Sales/Receipts no verifican si el dia esta abierto
- No hay concepto de "Iniciar Dia" en la UI
- El FAF revela montos esperados antes de que el operador cuente
- El FAF no tiene aprobacion de gerente
- La UI no diferencia roles (operador ve botones de gerente)
- FID permite FAF con solo CLASSIFIED — deberia requerir APPROVED (gerente aprobo)

**Principio de optimizacion:** No resolver el rol en cada query. El rol viaja una vez (al cargar negocio) y se cachea en Zustand.

---

## Step 1: Backend — Incluir rol del usuario en GET /businesses

### 1a. Modificar `businesses.repository.ts` — `findByUser()`

**Archivo:** `monkeys-api/src/businesses/businesses.repository.ts`

Cambiar `findByUser()` para incluir la membership del usuario:

```typescript
async findByUser(userId: string) {
  return this.prisma.business.findMany({
    where: { memberships: { some: { userId, status: 'ACTIVE' } } },
    include: {
      onboarding: true,
      inventoryLocations: true,
      memberships: {
        where: { userId, status: 'ACTIVE' },
        select: { role: true },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
```

Esto retorna cada negocio con `memberships: [{ role: 'OWNER' }]` — una query, sin N+1.

### 1b. Transformar response en service

Mapear para que el frontend reciba `userRole` como campo flat:

```typescript
// businesses.service.ts
async findMine(userId: string) {
  const businesses = await this.repo.findByUser(userId);
  return businesses.map(b => ({
    ...b,
    userRole: b.memberships[0]?.role ?? null,
    memberships: undefined,
  }));
}
```

---

## Step 2: Frontend — Business Store con Rol Cacheado

### 2a. Actualizar tipos
**Archivo:** `veritt-mobile/types/business.types.ts`

```typescript
export type MembershipRole = 'OWNER' | 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | 'VERITT_STAFF';

export interface Business {
  // ... campos existentes ...
  userRole?: MembershipRole;  // viene de GET /businesses
}
```

### 2b. Crear business store
**Archivo nuevo:** `veritt-mobile/store/business.store.ts`

```typescript
interface BusinessState {
  businesses: Business[];
  isLoaded: boolean;
  loadBusinesses: () => Promise<void>;
  getRole: (businessId: string) => MembershipRole | null;
}
```

- `loadBusinesses()` llama `businessesApi.getMine()` una vez y cachea
- `getRole(businessId)` busca en el array cacheado — O(1) lookup, sin API call
- Se llama en bootstrap despues de auth o en la primera navegacion a businesses

### 2c. Usar en daily-chain screens
Cada pantalla accede al rol via:
```typescript
const getRole = useBusinessStore(s => s.getRole);
const userRole = getRole(businessId);
const isManager = ['OWNER', 'ADMIN', 'SUPERVISOR', 'VERITT_STAFF'].includes(userRole);
```

**Zero API calls extra para resolver rol.** Se resuelve del store local.

---

## Step 3: Schema Migration — FAF Approval

**Archivo:** `monkeys-api/prisma/schema.prisma`

Agregar `PENDING_REVIEW` al enum:
```prisma
enum ReconciliationStatus {
  PENDING
  PENDING_REVIEW    // NUEVO — esperando aprobacion de gerente
  RECONCILED
  DISCREPANCY
}
```

Agregar campos a `DailyCashReconciliation`:
```prisma
  approvedByUserId    String?
  approvedAt          DateTime?
```

**Comando:** `npx prisma migrate dev --name add_faf_approval_step`

---

## Step 4: Backend — Logica de FAF Approval + FID Gate

### 4a. FAF: Cambiar flujo de creacion
**Archivo:** `monkeys-api/src/daily-chain/daily-chain.service.ts`

En `createReconciliation()`:
- Status final siempre `PENDING_REVIEW` (no `RECONCILED`/`DISCREPANCY`)
- Calcular y guardar difference pero NO revelar `totalExpected` en el response inmediato
- NO auto-generar FOP
- Response al operador: solo `{ id, status: 'PENDING_REVIEW', totalCounted, cashDenominations, ... }` — sin `totalExpected`

### 4b. FAF: Nuevo endpoint GET + metodo `getReconciliation()`
Para que el gerente (o el operador despues de submit) pueda ver el reveal:
- Retornar todo en GET (totalExpected, difference, comparacion)
- El "conteo ciego" se logra en el frontend no mostrando los montos esperados ANTES del submit
- Una vez que submitio, la comparacion es informacion valiosa para todos

### 4c. FAF: Nuevo metodo `approveReconciliation()`
**Archivo:** `monkeys-api/src/daily-chain/daily-chain.service.ts`

```
approveReconciliation(businessId, reconciliationId, userId):
  1. ensureManagement() — OWNER/ADMIN/SUPERVISOR/VERITT_STAFF
  2. Verificar status === 'PENDING_REVIEW'
  3. Verificar createdByUserId !== userId (separacion de responsabilidades)
  4. Transaccion:
     a. Status final: abs(difference) > 0.005 ? 'DISCREPANCY' : 'RECONCILED'
     b. Update con approvedByUserId, approvedAt, status
     c. Si RECONCILED → generateFOP()
     d. Si DISCREPANCY → no generar FOP, queda bloqueado
  5. Return actualizado
```

### 4d. FID: Requerir APPROVED (no CLASSIFIED) para FAF
**Archivo:** `monkeys-api/src/daily-chain/daily-chain.service.ts`

En `createReconciliation()` pre-condicion, cambiar:
```typescript
// ANTES: status !== 'CLASSIFIED' && status !== 'APPROVED'
// DESPUES: status !== 'APPROVED'
```
Solo desviaciones aprobadas por gerente permiten avanzar al FAF.

### 4e. Controller + Repository
**Archivo:** `monkeys-api/src/daily-chain/daily-chain.controller.ts`
- `GET /reconciliation?date=` — ver FAF
- `POST /reconciliation/:id/approve` — aprobar FAF

**Archivo:** `monkeys-api/src/daily-chain/daily-chain.repository.ts`
- `findReconciliationById(id)`
- `approveReconciliation(tx, id, userId, status)`

---

## Step 5: Backend — isDayOpen en Sales y Receipts

### 5a. Sales
**Archivos:**
- `monkeys-api/src/sales/sales.module.ts` — `imports: [DailyChainModule]`
- `monkeys-api/src/sales/sales.service.ts` — inyectar `DailyChainService`:

```typescript
async create(businessId, userId, dto) {
  // ... ensureAccess existente ...
  const dayOpen = await this.dailyChainService.isDayOpen(businessId);
  if (!dayOpen) {
    throw new BadRequestException('El dia operativo no esta abierto. Autoriza la apertura (FAI) primero.');
  }
  // ... resto del create existente ...
}
```

### 5b. Receipts
**Archivos:**
- `monkeys-api/src/receipts/receipts.module.ts` — `imports: [DailyChainModule]`
- `monkeys-api/src/receipts/receipts.service.ts` — mismo patron

**Nota:** `isDayOpen()` retorna `true` si no existe opening → negocios sin cadena diaria no se afectan. No se necesita feature flag.

---

## Step 6: Frontend Types y API Updates

### 6a. Types
**Archivo:** `veritt-mobile/types/daily-chain.types.ts`
- Agregar `PENDING_REVIEW` a `ReconciliationStatus`
- Agregar `approvedByUserId`, `approvedAt` a `DailyCashReconciliation`
- (MembershipRole ya agregado en Step 2a en business.types.ts)

### 6b. API
**Archivo:** `veritt-mobile/api/modules/daily-chain.api.ts`
- `getReconciliation(businessId, date?)` — GET
- `approveReconciliation(businessId, reconciliationId)` — POST

---

## Step 7: Frontend — Dashboard "Iniciar Dia" + Role-Aware

**Archivo:** `veritt-mobile/app/businesses/[businessId]/daily-chain/index.tsx`

### 7a. Boton "Iniciar Dia Operativo"
Cuando `chain.fai === null`:
- Card prominente con fecha operativa
- Boton: "Iniciar Dia Operativo" → navega a `opening.tsx`
- Cualquier rol puede iniciar (el operador cuenta, el gerente autoriza despues)

### 7b. Role-aware actions
Usar `userRole` del business store:
```typescript
const userRole = useBusinessStore(s => s.getRole(businessId));
const isManager = ['OWNER', 'ADMIN', 'SUPERVISOR', 'VERITT_STAFF'].includes(userRole);
```

Cada step card muestra:
- Si step requiere accion de gerente y usuario es operador → badge "Pendiente: gerente"
- Si step requiere accion de operador y usuario es gerente → badge "Pendiente: operador"

### 7c. Status del FAF actualizado
- `PENDING_REVIEW` → "Pendiente de aprobacion"
- `RECONCILED` → "Conciliado"
- `DISCREPANCY` → "Discrepancia"

---

## Step 8: Frontend — Pantallas Role-Aware

### 8a. opening-review.tsx (FAI autorizacion)
- Si `!isManager`: ocultar Autorizar/Rechazar, mostrar "Pendiente de autorizacion por gerente"
- Si `isManager`: mostrar botones como ahora

### 8b. deviations.tsx (FID)
- "Clasificar" visible para todos (operadores clasifican)
- "Aprobar reporte" visible solo para `isManager`
- Operador ve: "Pendiente de aprobacion por gerente" cuando status === CLASSIFIED

### 8c. reconciliation.tsx (FAF) — CAMBIO MAYOR (3 modos)

**Modo INPUT** (FAF no existe):
- Formulario de conteo ciego (denominaciones, terminales, transferencias)
- NO mostrar totalExpected ni montos del sistema
- Al submit: crear FAF → cambiar a modo REVIEW

**Modo REVIEW** (FAF existe, status = PENDING_REVIEW):
- Mostrar tabla comparativa: "Tu conteo" vs "Sistema esperaba" vs "Diferencia"
- Diferencias resaltadas en rojo
- Si `isManager` y `createdByUserId !== currentUser.id`:
  → Boton "Aprobar Arqueo"
- Si operador:
  → "Pendiente de aprobacion por gerente"

**Modo FINAL** (FAF aprobado — RECONCILED o DISCREPANCY):
- Resultado final read-only
- "Conciliado" (verde) o "Discrepancia" (rojo)

### 8d. fop.tsx (FOP firma)
- Si `!isManager`: ocultar firma, mostrar "Solo un gerente puede firmar"
- Si `isManager`: mostrar boton como ahora

---

## Flujo Completo Resultante

```
OPERADOR                              GERENTE
────────                              ───────
1. Tap "Iniciar Dia Operativo"
2. Cuenta inventario (FAI)
   - Explica varianzas
3. Submit FAI (status: PENDING)
                                      4. Ve FAI pendiente en dashboard
                                      5. Abre opening-review
                                      6. Autoriza (o rechaza con razon)
                                         → DIA ABIERTO
                                         → Sales/Receipts desbloqueados

... ventas y recepciones del dia ...

7. Cuenta inventario cierre (FCI)
8. Submit FCI
   → FID auto-generado
9. Clasifica desviaciones del FID
                                      10. Aprueba FID (status → APPROVED)
                                          → FAF desbloqueado

11. Cuenta efectivo CIEGO (FAF)
    - NO ve montos esperados
12. Submit FAF (status: PENDING_REVIEW)
    → Se revela comparacion
                                      13. Ve comparacion en review
                                      14. Aprueba FAF
                                          → Status: RECONCILED o DISCREPANCY
                                          → Si RECONCILED: FOP auto-generado

                                      15. Revisa FOP (4 validaciones)
                                      16. Firma FOP
                                          → DIA CERRADO
```

---

## Orden de Ejecucion

```
Step 1 + Step 2 (role en backend + business store, en paralelo)
   ↓
Step 3 (migration)
   ↓
Step 4 + Step 5 (backend FAF/FID/isDayOpen, en paralelo)
   ↓
Step 6 (types + API)
   ↓
Step 7 + Step 8 (frontend screens, en paralelo)
```

---

## Archivos a Modificar

| # | Archivo | Cambio | Step |
|---|---------|--------|------|
| 1 | `monkeys-api/src/businesses/businesses.repository.ts` | Include membership role en findByUser | 1 |
| 2 | `monkeys-api/src/businesses/businesses.service.ts` | Mapear userRole flat | 1 |
| 3 | `veritt-mobile/types/business.types.ts` | MembershipRole, userRole en Business | 2 |
| 4 | `veritt-mobile/store/business.store.ts` | **NUEVO** — Zustand store con getRole() | 2 |
| 5 | `monkeys-api/prisma/schema.prisma` | PENDING_REVIEW enum, approval fields | 3 |
| 6 | `monkeys-api/src/daily-chain/daily-chain.service.ts` | FAF approval, FID gate, quitar auto-FOP en create | 4 |
| 7 | `monkeys-api/src/daily-chain/daily-chain.controller.ts` | GET + POST reconciliation endpoints | 4 |
| 8 | `monkeys-api/src/daily-chain/daily-chain.repository.ts` | findReconciliationById, approveReconciliation | 4 |
| 9 | `monkeys-api/src/sales/sales.module.ts` | Import DailyChainModule | 5 |
| 10 | `monkeys-api/src/sales/sales.service.ts` | isDayOpen check en create | 5 |
| 11 | `monkeys-api/src/receipts/receipts.module.ts` | Import DailyChainModule | 5 |
| 12 | `monkeys-api/src/receipts/receipts.service.ts` | isDayOpen check en create | 5 |
| 13 | `veritt-mobile/types/daily-chain.types.ts` | PENDING_REVIEW, approval fields | 6 |
| 14 | `veritt-mobile/api/modules/daily-chain.api.ts` | getReconciliation, approveReconciliation | 6 |
| 15 | `veritt-mobile/app/.../daily-chain/index.tsx` | Start day button, role-aware cards | 7 |
| 16 | `veritt-mobile/app/.../daily-chain/opening-review.tsx` | Hide auth buttons for operators | 8 |
| 17 | `veritt-mobile/app/.../daily-chain/deviations.tsx` | Hide approve for operators | 8 |
| 18 | `veritt-mobile/app/.../daily-chain/reconciliation.tsx` | 3 modos: blind input → reveal → final | 8 |
| 19 | `veritt-mobile/app/.../daily-chain/fop.tsx` | Hide sign for operators | 8 |

**Total: 18 archivos modificados, 1 archivo nuevo (business.store.ts)**

---

## Optimizaciones Clave

1. **Rol resuelto UNA vez** — GET /businesses incluye `userRole`, cacheado en Zustand. Zero queries extra por pantalla.
2. **isDayOpen() ya tiene graceful fallback** — retorna true si no hay opening. No se necesita feature flag.
3. **FAF "conteo ciego" es solo UI** — el backend calcula todo, la pantalla simplemente no muestra `totalExpected` hasta despues del submit.
4. **getStatus() NO modificado para rol** — el rol viene del business store, no de cada API call.
5. **Un solo archivo nuevo** — `business.store.ts`. Todo lo demas son edits a archivos existentes.

---

## Verificacion

1. `npx prisma migrate dev` — sin errores
2. `cd monkeys-api && npm run start:dev` — compila
3. Crear venta sin FAI → rechaza con "dia no abierto"
4. FAI: operador crea → gerente autoriza → ventas desbloqueadas
5. FCI: crear → FID auto-generado
6. FID: operador clasifica → gerente aprueba → FAF desbloqueado
7. FAF: operador cuenta ciego → submit → reveal → gerente aprueba → FOP generado
8. FOP: solo gerente firma → dia cerrado
9. Operador NO ve botones de autorizar/aprobar/firmar
10. Rol viene del store, no de API calls repetidos
