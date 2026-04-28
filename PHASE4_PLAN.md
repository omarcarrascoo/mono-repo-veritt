# Plan: Phase 4 — Cadena Diaria (FAI → FCI → FID → FAF → FOP)

## Context

**Phases 1-3 estan 100% construidas.** Todo el stack funciona end-to-end:
- Foundation: Auth, Businesses, Staff, Payroll, Inventory, Notifications, Onboarding
- Phase 1: Areas, Processes, Time Tracking, RBAC Guard (infraestructura lista, sin aplicar)
- Phase 2: Sales + POS (con cancel + stock reversal + consumo teorico + payment methods + revenue tracking)
- Phase 3: Suppliers, Purchase Orders (send/cancel), Receipts (con inventory reversal + price alerts), Supplier Invoices (verify/dispute/soft delete)
- Mobile: Screens completas para todos los modulos anteriores

**Gaps menores identificados (NO bloqueantes para Phase 4):**
- Price alerts usan `MATERIAL_LOW_STOCK` en vez de tipo dedicado — funcional pero semanticamente incorrecto
- Inventory repository no extraido (service tiene ~1800 lineas Prisma directas) — refactor diferido

**Phase 4 es el corazon diferenciador de Veritt.** Es la cadena de 5 formatos diarios que bloquean operaciones si no se completan correctamente. Esto es lo que hace que el sistema sea "simple de usar y complejo de falsificar."

---

## Arquitectura General de Phase 4

La cadena es secuencial y bloqueante:

```
FAI (Apertura) → Operaciones del dia → FCI (Cierre) → FID (Desviaciones) → FAF (Arqueo) → FOP (Firma)
     ↓                                      ↓                ↓                   ↓              ↓
  Bloquea todo               Compara vs FAI    Clasifica causa    Tolerancia 0    Genera AMD
  hasta autorizar            + recepciones     por desviacion      en efectivo    (Phase 5)
```

**Concepto clave: `operationalDate`** — Cada formato pertenece a un dia operativo. El dia operativo no es necesariamente el dia calendario; lo define `business.operationalDayCutoffHour`. Todos los formatos del dia comparten el mismo `operationalDate`.

---

## Orden de Ejecucion

### PASO 1: Schema — Nuevos modelos para los 5 formatos

**Archivo:** `monkeys-api/prisma/schema.prisma`

**Enums nuevos:**
```prisma
enum DailyOpeningStatus {
  PENDING
  AUTHORIZED
  REJECTED
}

enum DailyClosingStatus {
  PENDING
  COMPLETED
}

enum DeviationReportStatus {
  PENDING_CLASSIFICATION
  CLASSIFIED
  APPROVED
}

enum DeviationCause {
  ERROR
  WASTE
  THEFT
  ADJUSTMENT
  OVERPRODUCTION
  UNDERPRODUCTION
  OTHER
}

enum ReconciliationStatus {
  PENDING
  RECONCILED
  DISCREPANCY
}

enum DailyOperationStatus {
  PENDING
  SIGNED
  BLOCKED
}

enum FOPValidationType {
  INVENTORY
  CASH
  PROCESSES
  HOURS
}
```

**Modelos nuevos (6 modelos core + 5 modelos detalle = 11 modelos):**

#### 4.1 FAI — Apertura de Inventario
```prisma
model DailyInventoryOpening {
  id                  String              @id @default(uuid())
  businessId          String
  locationId          String
  operationalDate     DateTime            @db.Date
  status              DailyOpeningStatus  @default(PENDING)
  authorizedByUserId  String?
  authorizedAt        DateTime?
  rejectedReason      String?
  createdByUserId     String
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  business    Business          @relation(fields: [businessId], references: [id])
  location    InventoryLocation @relation(fields: [locationId], references: [id])
  items       DailyInventoryOpeningItem[]

  @@unique([businessId, locationId, operationalDate])
  @@index([businessId, operationalDate])
}

model DailyInventoryOpeningItem {
  id                      String  @id @default(uuid())
  openingId               String
  materialId              String
  countedQuantity         Decimal @db.Decimal(14, 4)
  previousClosingQuantity Decimal @default(0) @db.Decimal(14, 4)
  systemQuantity          Decimal @default(0) @db.Decimal(14, 4)
  variance                Decimal @default(0) @db.Decimal(14, 4)
  varianceValueMXN        Decimal @default(0) @db.Decimal(14, 4)

  opening  DailyInventoryOpening @relation(fields: [openingId], references: [id], onDelete: Cascade)
  material Material              @relation(fields: [materialId], references: [id])

  @@unique([openingId, materialId])
}
```

#### 4.2 FCI — Cierre de Inventario
```prisma
model DailyInventoryClosing {
  id                String              @id @default(uuid())
  businessId        String
  locationId        String
  operationalDate   DateTime            @db.Date
  status            DailyClosingStatus  @default(PENDING)
  completedByUserId String?
  completedAt       DateTime?
  createdByUserId   String
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  business    Business          @relation(fields: [businessId], references: [id])
  location    InventoryLocation @relation(fields: [locationId], references: [id])
  items       DailyInventoryClosingItem[]

  @@unique([businessId, locationId, operationalDate])
  @@index([businessId, operationalDate])
}

model DailyInventoryClosingItem {
  id                String  @id @default(uuid())
  closingId         String
  materialId        String
  countedQuantity   Decimal @db.Decimal(14, 4)
  openingQuantity   Decimal @default(0) @db.Decimal(14, 4)
  receivedQuantity  Decimal @default(0) @db.Decimal(14, 4)
  realConsumption   Decimal @default(0) @db.Decimal(14, 4)

  closing  DailyInventoryClosing @relation(fields: [closingId], references: [id], onDelete: Cascade)
  material Material              @relation(fields: [materialId], references: [id])

  @@unique([closingId, materialId])
}
```

#### 4.3 FID — Desviaciones
```prisma
model DailyDeviationReport {
  id                      String                  @id @default(uuid())
  businessId              String
  operationalDate         DateTime                @db.Date
  status                  DeviationReportStatus   @default(PENDING_CLASSIFICATION)
  totalDeviationValueMXN  Decimal                 @default(0) @db.Decimal(14, 4)
  approvedByUserId        String?
  approvedAt              DateTime?
  createdAt               DateTime                @default(now())
  updatedAt               DateTime                @updatedAt

  business Business        @relation(fields: [businessId], references: [id])
  items    DeviationItem[]

  @@unique([businessId, operationalDate])
  @@index([businessId, operationalDate])
}

model DeviationItem {
  id                      String         @id @default(uuid())
  reportId                String
  materialId              String
  theoreticalConsumption  Decimal        @db.Decimal(14, 4)
  realConsumption         Decimal        @db.Decimal(14, 4)
  deviationQuantity       Decimal        @db.Decimal(14, 4)
  deviationValueMXN       Decimal        @db.Decimal(14, 4)
  cause                   DeviationCause?
  classifiedByUserId      String?
  note                    String?

  report   DailyDeviationReport @relation(fields: [reportId], references: [id], onDelete: Cascade)
  material Material              @relation(fields: [materialId], references: [id])

  @@unique([reportId, materialId])
}
```

#### 4.4 FAF — Arqueo Financiero
```prisma
model DailyCashReconciliation {
  id                 String                @id @default(uuid())
  businessId         String
  operationalDate    DateTime              @db.Date
  status             ReconciliationStatus  @default(PENDING)
  totalExpected      Decimal               @default(0) @db.Decimal(14, 4)
  totalCounted       Decimal               @default(0) @db.Decimal(14, 4)
  difference         Decimal               @default(0) @db.Decimal(14, 4)
  reconciledByUserId String?
  reconciledAt       DateTime?
  createdByUserId    String
  createdAt          DateTime              @default(now())
  updatedAt          DateTime              @updatedAt

  business                Business                  @relation(fields: [businessId], references: [id])
  cashDenominations       CashDenominationCount[]
  terminalReconciliations TerminalReconciliation[]
  transferReconciliations TransferReconciliation[]

  @@unique([businessId, operationalDate])
  @@index([businessId, operationalDate])
}

model CashDenominationCount {
  id                String  @id @default(uuid())
  reconciliationId  String
  denomination      Decimal @db.Decimal(10, 2)
  quantity          Int
  subtotal          Decimal @db.Decimal(14, 4)

  reconciliation DailyCashReconciliation @relation(fields: [reconciliationId], references: [id], onDelete: Cascade)

  @@unique([reconciliationId, denomination])
}

model TerminalReconciliation {
  id                String  @id @default(uuid())
  reconciliationId  String
  paymentMethodId   String
  expectedTotal     Decimal @db.Decimal(14, 4)
  reportedTotal     Decimal @db.Decimal(14, 4)
  reference         String?
  difference        Decimal @db.Decimal(14, 4)

  reconciliation DailyCashReconciliation @relation(fields: [reconciliationId], references: [id], onDelete: Cascade)
  paymentMethod  PaymentMethod           @relation(fields: [paymentMethodId], references: [id])

  @@unique([reconciliationId, paymentMethodId])
}

model TransferReconciliation {
  id                String  @id @default(uuid())
  reconciliationId  String
  expectedTotal     Decimal @db.Decimal(14, 4)
  reportedTotal     Decimal @db.Decimal(14, 4)
  folioReferences   String?
  difference        Decimal @db.Decimal(14, 4)

  reconciliation DailyCashReconciliation @relation(fields: [reconciliationId], references: [id], onDelete: Cascade)
}
```

#### 4.5 FOP — Operacion y Procesos
```prisma
model DailyOperationClose {
  id                String                @id @default(uuid())
  businessId        String
  operationalDate   DateTime              @db.Date
  status            DailyOperationStatus  @default(PENDING)
  signedByUserId    String?
  signedAt          DateTime?
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt

  business        Business              @relation(fields: [businessId], references: [id])
  validationItems FOPValidationItem[]

  @@unique([businessId, operationalDate])
  @@index([businessId, operationalDate])
}

model FOPValidationItem {
  id                String            @id @default(uuid())
  fopId             String
  validationType    FOPValidationType
  label             String
  operatorValue     Decimal           @db.Decimal(14, 4)
  systemValue       Decimal           @db.Decimal(14, 4)
  difference        Decimal           @db.Decimal(14, 4)
  isWithinThreshold Boolean           @default(false)
  resolution        String?

  fop DailyOperationClose @relation(fields: [fopId], references: [id], onDelete: Cascade)

  @@index([fopId])
}
```

**Relaciones a agregar en modelos existentes:**
- `Business`: agregar relaciones a los 5 modelos core
- `InventoryLocation`: agregar relaciones a Opening y Closing
- `Material`: agregar relaciones a OpeningItem, ClosingItem, DeviationItem
- `PaymentMethod`: agregar relacion a TerminalReconciliation

**Migration:** `npx prisma migrate dev --name add_daily_chain_phase4`

---

### PASO 2: Modulo `daily-chain` (Backend)

**Decision arquitectonica:** Un solo modulo `daily-chain` en vez de 5 modulos separados. Razon: los 5 formatos estan tan entrelazados que separarlos crearia dependencias circulares. El modulo encapsula toda la cadena.

**Archivos a crear:**
```
src/daily-chain/
├── daily-chain.module.ts
├── daily-chain.controller.ts          # Todos los endpoints de la cadena
├── daily-chain.service.ts             # Orquestador principal + reglas de bloqueo
├── daily-chain.repository.ts          # Queries Prisma para los 5 formatos
├── dto/
│   ├── create-opening.dto.ts          # { locationId, items: [{ materialId, countedQuantity }] }
│   ├── authorize-opening.dto.ts       # { } (solo firma)
│   ├── create-closing.dto.ts          # { locationId, items: [{ materialId, countedQuantity }] }
│   ├── classify-deviation.dto.ts      # { items: [{ materialId, cause, note }] }
│   ├── create-reconciliation.dto.ts   # { cashDenominations, terminalTotals, transferTotals }
│   └── sign-fop.dto.ts               # { } (solo firma)
└── helpers/
    └── operational-date.helper.ts     # Calcula operationalDate segun cutoff del business
```

**Endpoints:**

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/businesses/:businessId/daily-chain/status?date=` | Estado general de la cadena del dia |
| `POST` | `/businesses/:businessId/daily-chain/opening` | Crear FAI (conteo de apertura) |
| `POST` | `/businesses/:businessId/daily-chain/opening/:openingId/authorize` | Autorizar FAI |
| `POST` | `/businesses/:businessId/daily-chain/opening/:openingId/reject` | Rechazar FAI |
| `POST` | `/businesses/:businessId/daily-chain/closing` | Crear FCI (conteo de cierre) |
| `GET` | `/businesses/:businessId/daily-chain/deviations?date=` | Ver FID (auto-generado del FCI) |
| `PATCH` | `/businesses/:businessId/daily-chain/deviations/:reportId/classify` | Clasificar causas del FID |
| `POST` | `/businesses/:businessId/daily-chain/deviations/:reportId/approve` | Aprobar FID clasificado |
| `POST` | `/businesses/:businessId/daily-chain/reconciliation` | Crear FAF (arqueo de caja) |
| `GET` | `/businesses/:businessId/daily-chain/fop?date=` | Ver FOP (auto-generado) |
| `POST` | `/businesses/:businessId/daily-chain/fop/:fopId/sign` | Firmar FOP (cierra el dia) |
| `GET` | `/businesses/:businessId/daily-chain/history?from=&to=` | Historial de cadenas por rango |

---

### PASO 3: Logica de negocio — Reglas de bloqueo

Estas reglas se implementan en `daily-chain.service.ts`. Son el core de V.3.

#### 3.1 FAI (Apertura)
- **Pre-condicion:** Ninguna (es el primer formato del dia)
- **Al crear:** Para cada material activo en la ubicacion, captura `countedQuantity`. Calcula:
  - `systemQuantity` = `material.currentStock` actual
  - `previousClosingQuantity` = ultimo FCI completado para ese material (si existe)
  - `variance` = `countedQuantity - systemQuantity`
  - `varianceValueMXN` = `variance * material.currentReferenceUnitCost`
- **Autorizacion:** Requiere usuario diferente al creador (`authorizedByUserId != createdByUserId`)
- **Regla de bloqueo:** Sin FAI `AUTHORIZED`, NINGUNA venta ni recepcion puede registrarse en el dia. El service de Sales y Receipts debe consultar si el dia esta abierto.

#### 3.2 FCI (Cierre)
- **Pre-condicion:** FAI del mismo dia `AUTHORIZED`
- **Al crear:** Para cada material:
  - `openingQuantity` = del FAI del dia
  - `receivedQuantity` = sum de ReceiptItems del dia para ese material
  - `realConsumption` = `openingQuantity + receivedQuantity - countedQuantity`
- **Al completar:** Auto-genera el FID (DailyDeviationReport)

#### 3.3 FID (Desviaciones)
- **Auto-generado** al completar FCI. Para cada material:
  - `theoreticalConsumption` = sum de `TheoreticalConsumption.expectedQuantity` del dia
  - `realConsumption` = del FCI
  - `deviationQuantity` = `realConsumption - theoreticalConsumption`
  - `deviationValueMXN` = `deviationQuantity * material.currentReferenceUnitCost`
- **Clasificacion obligatoria:** Cada DeviationItem con `deviationQuantity != 0` requiere `cause` + `classifiedByUserId`
- **Regla de bloqueo:** Desviaciones sin clasificar bloquean el FAF

#### 3.4 FAF (Arqueo Financiero)
- **Pre-condicion:** FID `CLASSIFIED` o `APPROVED`
- **Al crear:**
  - `totalExpected` = sum de ventas COMPLETED del dia por metodo de pago
  - Operador llena: denominaciones de billetes/monedas, totales por terminal, totales de transferencias
  - `totalCounted` = sum de todo lo que el operador reporto
  - `difference` = `totalCounted - totalExpected`
- **Tolerancia CERO:** Si `difference != 0` para CUALQUIER metodo, el status queda `DISCREPANCY`. No puede avanzar al FOP.
- **Nota critica:** No hay override. Ni OWNER puede forzar un arqueo con diferencia.

#### 3.5 FOP (Operacion)
- **Pre-condicion:** FAF `RECONCILED` (difference = 0 en todo)
- **Auto-generado:** Compara 4 dimensiones:
  - `INVENTORY`: variance del FAI vs threshold configurable
  - `CASH`: difference del FAF (debe ser 0)
  - `PROCESSES`: procesos bloqueantes completados vs pendientes
  - `HOURS`: horas de ShiftLog vs horas esperadas
- **Firma:** `signedByUserId` debe ser OWNER o ADMIN
- **Al firmar:** El dia queda cerrado. En Phase 5, esto generara el AMD.

---

### PASO 4: Integracion con modulos existentes (Bloqueo de operaciones)

**Archivos a modificar:**
- `src/sales/sales.service.ts` — en `create()`, verificar que el dia tiene FAI autorizado
- `src/receipts/receipts.service.ts` — en `create()`, verificar que el dia tiene FAI autorizado

**Helper reutilizable en daily-chain:**
```typescript
async isDayOpen(businessId: string, date: Date): Promise<boolean>
// Retorna true si existe FAI AUTHORIZED para esa fecha
```

**Nota:** Este bloqueo se puede activar con un feature flag o config por negocio para no romper negocios existentes que aun no usan la cadena diaria.

---

### PASO 5: Mobile — Pantallas de la Cadena Diaria

**Archivos a crear:**
```
veritt-mobile/
├── types/daily-chain.types.ts
├── api/modules/daily-chain.api.ts
└── app/businesses/[businessId]/daily-chain/
    ├── index.tsx              # Dashboard del dia: estado de cada formato con indicadores
    ├── opening.tsx            # FAI: formulario de conteo + submit
    ├── opening-review.tsx     # FAI: revision y autorizacion (otro usuario)
    ├── closing.tsx            # FCI: formulario de conteo de cierre
    ├── deviations.tsx         # FID: lista de desviaciones + clasificacion de causa
    ├── reconciliation.tsx     # FAF: conteo de denominaciones + terminales + transferencias
    └── fop.tsx                # FOP: resumen cruzado + firma
```

**Dashboard del dia (`index.tsx`):**
Muestra 5 cards verticales (FAI → FCI → FID → FAF → FOP), cada una con:
- Status indicator (pendiente/completado/bloqueado)
- Si esta disponible: boton para acceder
- Si esta bloqueado: mensaje de que falta el paso anterior

**Pantalla de conteo (opening.tsx / closing.tsx):**
- Lista de materiales activos de la ubicacion
- Input numerico por cada material
- Muestra varianza en tiempo real vs sistema
- Submit crea el formato

**Pantalla FAF (reconciliation.tsx):**
- Seccion 1: Denominaciones de billetes/monedas (inputs por denominacion: $1000, $500, $200, $100, $50, $20, monedas)
- Seccion 2: Por cada terminal de pago configurada, input de total reportado
- Seccion 3: Total de transferencias con folios
- Muestra comparacion en tiempo real vs ventas del dia

**Navegacion:** Agregar "Cadena diaria" al business dashboard con icono `calendar-outline`

---

### PASO 6: NotificationType expansion

**Archivo:** `monkeys-api/prisma/schema.prisma`

Agregar al enum `NotificationType`:
```prisma
  PRICE_ALERT              // Reemplaza uso incorrecto de MATERIAL_LOW_STOCK en receipts
  DAILY_OPENING_PENDING    // FAI necesita autorizacion
  DAILY_DEVIATION_ALERT    // Desviaciones significativas detectadas
  DAILY_RECONCILIATION_DISCREPANCY // Arqueo con diferencia
  DAILY_CHAIN_BLOCKED      // Algun formato bloquea el cierre
```

---

## Dependencias que ya existen y se reusan

| Que necesitamos | Ya existe en | Como se usa |
|---|---|---|
| Stock actual por material | `material.currentStock` | Para calcular variance en FAI |
| Consumo teorico del dia | `TheoreticalConsumption` tabla | Agrupar por materialId + fecha para FID |
| Ventas del dia por metodo | `Sale` + `SalePayment` | Para totalExpected en FAF |
| Recepciones del dia | `Receipt` + `ReceiptItem` | Para receivedQuantity en FCI |
| Procesos bloqueantes | `ProcessTemplate.isBlocking` + `ProcessExecution` | Para validacion PROCESSES en FOP |
| Horas trabajadas | `ShiftLog` | Para validacion HOURS en FOP |
| Ubicaciones | `InventoryLocation` | Para scope de FAI/FCI |
| Metodos de pago | `PaymentMethod` | Para terminales en FAF |
| Notificaciones | `src/notifications/` | Para alertas de cadena |

---

## Verificacion

1. **Schema:** `npx prisma migrate dev` sin errores
2. **Compilacion:** `npm run start:dev` sin errores
3. **FAI:** Crear conteo → verificar items con variance calculada → autorizar con otro usuario → confirmar que ventas se desbloquean
4. **FCI:** Crear conteo de cierre → verificar que auto-genera FID con desviaciones calculadas
5. **FID:** Clasificar todas las desviaciones → verificar que cambia a CLASSIFIED
6. **FAF:** Crear arqueo con montos correctos → status RECONCILED. Crear con diferencia → status DISCREPANCY, no puede avanzar
7. **FOP:** Verificar que se genera con las 4 validaciones. Firmar → dia cerrado
8. **Bloqueo:** Intentar crear venta sin FAI → debe rechazar con error claro
9. **Mobile:** Navegar dashboard → completar flujo completo de un dia

---

## Estimacion de complejidad

- **Schema + Migration:** 11 modelos nuevos, 6 enums nuevos
- **Backend:** 1 modulo con ~6 archivos + 6 DTOs + 1 helper
- **Integracion:** 2 archivos existentes modificados (sales.service, receipts.service)
- **Mobile:** 1 tipo + 1 API module + 7 pantallas nuevas
- **Total archivos nuevos:** ~20
- **Total archivos modificados:** ~4 (schema, sales.service, receipts.service, business dashboard)
