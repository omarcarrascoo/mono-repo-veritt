# VERITT — Documento Maestro

> **Qué es este documento:** la consolidación de los 9 documentos de `root/` contrastada **uno a uno contra el código real**. Es la **única fuente de verdad** para saber dónde estamos y qué sigue. Antes de construir nada nuevo, revísalo.
>
> **Fecha de consolidación:** 2026-06-15 · **Rama:** `development`
>
> **Cómo leerlo:**
> - **Parte I** — la visión y arquitectura (el *por qué*). No cambia.
> - **Parte II** — el mapa del sistema según el código (el *qué hay*, verificado).
> - **Parte III** — estado fase por fase, con ✅/⚠️/❌ **verificados contra disco**.
> - **Parte IV** — el modelo de costeo por lotes (crítico para el AMD).
> - **Parte V** — riesgos, deuda técnica e issues conocidos (verificados).
> - **Parte VI** — **el roadmap seguro con checkboxes** para seguir y marcar.
> - **Parte VII** — procedencia de los 9 docs originales y qué hacer con ellos.
> - **Apéndice** — mapa de archivos clave.
>
> **Leyenda de estado:** ✅ hecho y verificado en código · ⚠️ hecho pero sin verificar / con riesgo · ❌ no iniciado · 🔶 parcial.

---

## Tabla de contenidos

- [Parte I — Visión y Arquitectura](#parte-i--visión-y-arquitectura)
- [Parte II — Mapa del sistema (verdad del código)](#parte-ii--mapa-del-sistema-verdad-del-código)
- [Parte III — Estado fase por fase (verificado)](#parte-iii--estado-fase-por-fase-verificado)
- [Parte IV — Modelo de costeo por lotes (FIFO)](#parte-iv--modelo-de-costeo-por-lotes-fifo)
- [Parte V — Riesgos, deuda técnica e issues](#parte-v--riesgos-deuda-técnica-e-issues)
- [Parte VI — Roadmap seguro (checkable)](#parte-vi--roadmap-seguro-checkable)
- [Parte VII — Procedencia de los 9 documentos](#parte-vii--procedencia-de-los-9-documentos)
- [Apéndice — Mapa de archivos clave](#apéndice--mapa-de-archivos-clave)

---

# Parte I — Visión y Arquitectura

> Fuente: `ARCHITECTURE_V3.md` (2026, documento interno). Es la biblia conceptual — atemporal.

## 1. El problema

Hay **5.5 millones de negocios físicos** activos en México; 99.8% micro/PYMEs. **32 de cada 100** en servicios cierran antes de 4 años. La causa más frecuente no es demanda ni competencia ni financiamiento, sino:

> **El dueño no sabe la verdad de lo que pasa en su negocio todos los días.**

Tres síntomas del mismo problema estructural:

| Sin info operativa confiable | Sin formalización laboral real | Sin acceso al sistema financiero |
|---|---|---|
| Decisiones sobre estimaciones no verificadas. Inventario sin trazabilidad. Caja absorbe diferencias. | No registra en IMSS porque no sabe si puede pagar → rotación, baja calidad, ciclo que se retroalimenta. | Sin estados financieros verificables, no hay crédito institucional. |
| Solo 25.3% de microempresas usa cómputo. | 54.4% de informalidad laboral. | Solo 14.4% de PYMEs usó crédito bancario nuevo en 2024. |

## 2. Qué es Veritt

**Veritt es el sistema operativo para negocios físicos.** No es contabilidad, ni POS, ni app de inventarios — es la capa que conecta todo eso y produce **la verdad verificada de lo que pasa en un negocio físico, todos los días**.

> Un sistema de registro acepta lo que le dan. **Veritt valida que lo que le dan corresponde con la realidad.**

**La propiedad más importante:** *simple de usar y complejo de falsificar.* Por dentro tiene integridad nivel banco (consistencia cruzada, documentos inmutables, validación matemática en tiempo real); por fuera el operador solo cuenta lo que hay y el gerente verifica. A eso se le llama **complejidad oculta**.

## 3. El modelo universal: Área + Proceso + Persona

Veritt **no está diseñado para restaurantes** — está diseñado para negocios físicos. Los restaurantes son el vertical de entrada. La arquitectura es universal porque se sostiene sobre tres entidades presentes en cualquier negocio:

| ÁREA | PROCESO | PERSONA |
|---|---|---|
| El espacio físico/funcional (cocina, consultorio, nave). | La secuencia de pasos (apertura, servicio, cierre). | El usuario que ejecuta el proceso en el área. |

**Ningún comportamiento está hardcodeado.** Veritt configura estas tres entidades por cliente y el mismo núcleo opera en restaurantes, clínicas, parques industriales, escuelas y construcción (ver §8 de `ARCHITECTURE_V3.md` para ejemplos por industria).

## 4. Una acción, múltiples consecuencias

El principio de diseño central: **cada acción tiene consecuencias trazables que atraviesan múltiples capas sin trabajo adicional de nadie.** Ejemplos (consecuencias automáticas de una sola acción):

- **Login de turno** → control de acceso + inicio de cómputo de horas (geo) + trazabilidad + base de nómina + registro laboral verificable + inicio de métricas P6.
- **Venta en POS** → ingreso bruto + consumo teórico por receta + margen + avance a punto de equilibrio + ticket promedio del operador + ventas por área + base de conciliación del FOP.
- **Recepción de mercancía** → inventario + costo unitario vigente + margen recalculado + punto de equilibrio + folio CFDI + alerta de precio + input de conciliación de la OC.
- **Firma del FOP** → **genera el AMD** + hash SHA-256 + cierre de métricas de usuarios + Balance General + prestaciones devengadas + desbloqueo del día siguiente.

## 5. La cadena de formatos (corazón de V.3)

Cinco formatos **secuenciales y bloqueantes**. Cada uno es prerrequisito del siguiente. *No es restricción de interfaz — es restricción de arquitectura.*

| Formato | Captura | Produce | Regla de bloqueo |
|---|---|---|---|
| **FAI** — Apertura de Inventario | Estado inicial verificado físicamente; valida vs FCI de ayer. | Inventario inicial del día; detecta inconsistencias nocturnas en pesos. | **Sin FAI autorizado, el día no inicia.** Ningún rol opera. |
| **FCI** — Cierre de Inventario | Conteo físico final. | Consumo real por insumo; base del FID y del FAI de mañana. | Sin FCI, el FID no corre; el día no cierra. |
| **FID** — Inventario y Desviaciones | Teórico (recetas) vs real (FCI); clasificación de causa obligatoria. | Desviaciones con impacto en pesos, clasificadas. | Desviaciones sin clasificar bloquean el FAF; críticas sin justificar bloquean el AMD. |
| **FAF** — Arqueo Financiero | Efectivo por denominación, terminal por referencia, transferencias por folio, todo vs POS. | Conciliación financiera verificada. | **Tolerancia exactamente cero. Sin override por ningún rol.** |
| **FOP** — Operación y Procesos | Procesos críticos + conciliación cruzada reportado vs teórico. | **Su firma genera el AMD.** Último actor humano. | Procesos bloqueantes sin ejecutar impiden el FOP. Conciliación fallida requiere corrección. |

## 6. El AMD — Archivo Maestro Diario

Al firmar el FOP, el sistema genera el **AMD** automáticamente. **No es una vista dinámica de otras tablas** — es un documento completo e independiente, sellado con **SHA-256**, inmutable. Alterar cualquier campo rompe el hash → manipulación matemáticamente detectable para siempre.

Seis pestañas:

| Pestaña | Contenido |
|---|---|
| **P1 — Resumen humano** | ¿Gané o perdí hoy? ¿Dónde está el dinero? ¿Cuánto debo en prestaciones? ¿Cómo me fue vs ayer? En lenguaje de dueño. Universal a cualquier industria. |
| **P2 — Estados financieros formales** | Estado de Resultados diario (con costo total de personal), Balance General (con pasivos de prestaciones devengadas), Flujo de Efectivo. Nomenclatura contable estándar. |
| **P3 — Detalle operativo completo** | Cada evento del día expandido, cada formato, cada firma y timestamp, log in/out con horas. Respaldo de auditoría. |
| **P4 — Alertas de optimización** | Producto sin ventas en X días, merma sobre umbral, turno no rentable, costo subió sin ajustar precio, momento óptimo para formalizar en IMSS. Configurables por negocio. |
| **P5 — Trazabilidad fiscal** | Cada número vinculado a su documento fuente (CFDI venta/proveedor, recibo de nómina). Índice de completitud con semáforo. Listo para SAT/IMSS/STPS. |
| **P6 — Rendimiento por usuario** | Horas trabajadas, acciones, volumen, desviaciones atribuibles, cumplimiento de procesos. Diario y acumulable. Exportable con hash. |

## 7. Los 7 candados (por qué es casi imposible falsificar)

| Candado | Mecanismo | Depende de |
|---|---|---|
| **C1 — Inventario vs Ventas** | Consumo teórico (recetas × ventas) vs real (FCI). No cuadra → desviación con nombre, cantidad y pesos. | Sales, FCI, FID |
| **C2 — Ventas vs Caja** | POS vs efectivo + terminal + transferencias del FAF. Tolerancia cero. | Sales, FAF |
| **C3 — Recepciones vs OC** | Orden vs recepción física vs factura. **Mismo usuario no puede hacer OC y recepción** (separación de funciones de arquitectura). | PO, Receipts, Invoices |
| **C4 — Costos vs Estado de Resultados** | Costo de ventas auto-calculado de recetas/consumo. Nadie lo cambia a mano. Inflarlo contradice el inventario. | Recipes, Sales, AMD P2 |
| **C5 — Nómina vs Log in/out** | Horas desde timestamps reales, no reportadas. Borrarlas queda en un AMD con hash. | ShiftLog, Payroll |
| **C6 — AMD vs Tiempo** | SHA-256 congela el estado. Modificar = hash no coincide. | AMD |
| **C7 — Sistema vs sí mismo** | Core Regulador con dos libros (operadores vs sistema). El FOP los compara; deben coincidir o el AMD no se genera. | FOP, todos |

> Para falsificar Veritt sin ser detectado habría que manipular **7 capas independientes con consistencia matemática perfecta**, sin disparar alertas y sin que el FOP detecte la inconsistencia. **En la práctica, imposible.** Esto produce el **efecto disuasorio de la transparencia estructural**: la merma baja y las diferencias de caja desaparecen, no por vigilancia sino porque *la aritmética no miente*.

## 8. Escala — V1 / V2 / V3

| Capa | Descripción |
|---|---|
| **V1** — OS del negocio individual | Control diario, inteligencia financiera, formalización orgánica, trazabilidad fiscal, acceso a crédito. **$2,000–2,500 MXN/mes.** |
| **V2** — Veritt Certificado | 365 días de cierre certificado continuo. Integración directa con IMSS. Evidencia verificable ante banco/SAT/autoridad. |
| **V3** — Veritt Data | La base operativa-laboral más granular y verificable del sector informal LATAM. Valor para bancos (scoring alternativo), aseguradoras (pricing de riesgo), IMSS/INFONAVIT/BID/OIT/STPS. |

## 9. Coherencia arquitectónica

> **Veritt no es una colección de funcionalidades. Es un sistema donde cada elemento existe porque los demás lo requieren.** La cadena produce la integridad que hace posible el AMD; el AMD produce la evidencia que habilita el crédito, la trazabilidad fiscal y V3; los 7 candados hacen esa evidencia confiable. Quitar cualquier pieza rompe el sistema (ver §10 de `ARCHITECTURE_V3.md`).

**Implicación para el desarrollo:** como el valor *es la integridad del dato*, no se puede construir hacia adelante sobre capas sin verificar. Un AMD sellado con datos incorrectos es peor que no tener AMD. → Ver [Parte VI](#parte-vi--roadmap-seguro-checkable).

---

# Parte II — Mapa del sistema (verdad del código)

> Todo lo de esta sección está **contado directamente del repo** (no de los docs).

## Stack

| | Backend (`monkeys-api/`) | Mobile (`veritt-mobile/`) |
|---|---|---|
| Framework | NestJS 11 | Expo SDK 52 + Expo Router |
| Datos | Prisma 7 + PostgreSQL (Supabase, pooler session-mode :6543) | Zustand (estado) + caches por hook |
| Estilo | — | NativeWind + `constants/design-tokens.ts` |
| Auth | JWT propio (`JwtAuthGuard`, `@CurrentUser()` → `{id,email}`) | token en SecureStore/localStorage vía interceptor axios |

## Backend en números (verificado)

- **21 controllers** · **128 endpoints** (= 128 route decorators, mapeados 1:1 en `postman/`).
- **53 modelos Prisma** · **37 enums**.
- **15 migraciones** (de `20260315_init_sprint1` a `20260507_add_amd_phase5`).
- **3 archivos de test** (`lot-costing.helpers.spec`, `amd-hash.spec`, `canonical-json.spec`). **0 tests de integración del flujo.**

### Los 53 modelos por dominio

| Dominio | Modelos |
|---|---|
| **Core** | `User`, `Business`, `BusinessMembership`, `BusinessOnboarding`, `RolePermission` |
| **Staff/Payroll** | `StaffProfile`, `StaffCompensation`, `StaffCompensationHistory`, `PayrollPayment` |
| **Áreas/Procesos/Turnos** | `Area`, `ProcessTemplate`, `ProcessStep`, `ProcessExecution`, `ShiftLog`, `ShiftBreak` |
| **Inventario** | `InventoryLocation`, `Material`, `MaterialLot`, `MaterialLotAllocation`, `MaterialStockMovement`, `Product`, `ProductLot`, `ProductLotAllocation`, `ProductStockMovement`, `ProductRecipeVersion`, `ProductRecipeVersionItem`, `ProductSalePriceHistory`, `ProductManualCostHistory` |
| **Ventas** | `Sale`, `SaleItem`, `SalePayment`, `PaymentMethod`, `TheoreticalConsumption` |
| **Cadena de suministro** | `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `Receipt`, `ReceiptItem`, `SupplierInvoice` |
| **Cadena diaria (Fase 4)** | `DailyInventoryOpening` (+Item), `DailyInventoryClosing` (+Item), `DailyDeviationReport`, `DeviationItem`, `DailyCashReconciliation`, `CashDenominationCount`, `TerminalReconciliation`, `TransferReconciliation`, `DailyOperationClose`, `FOPValidationItem` |
| **AMD (Fase 5)** | `DailyMasterArchive` |
| **Notificaciones** | `Notification` |

### Las 15 migraciones (línea de tiempo real)

```
20260315  init_sprint1                         ← Foundation
20260318  add_staff_compensation_phase1
20260320  add_payroll_calendar_and_notifications
20260330  add_inventory_module
20260408  add_areas_processes_shifts_sales_pos  ← Fases 1+2
20260408  add_supply_chain_phase3               ← Fase 3
20260408  add_receipt_cancel_invoice_lifecycle
20260409  add_daily_chain_phase4                ← Fase 4
20260414  add_faf_approval_step
20260415  fai_variance_note_and_allow_retry
20260415  add_fci_approval
20260415  fci_allow_retry_after_reject
20260427  faf_reject_and_fop_discrepancy_signoff
20260429  receipts_draft_flow
20260507  add_amd_phase5                        ← Fase 5
```

## Mobile en números (verificado)

- **60 pantallas** (Expo Router) · **17 módulos API** · **~90 componentes** · **0 tests**.
- 2 stores Zustand (`auth.store`, `business.store`); el resto se fetchea por pantalla con caches (`useHomeData`, `useBusinessDetail`, `useBusinessesSummary`, `usePosData`).
- **Migración de diseño dark→paper a medias** (ver `FRONTEND_ANALYSIS.md`).
- ~58/60 pantallas completas; incompletas: `chat.tsx` (stub) y `explore.tsx` (mock con `fetch` crudo).

> **Detalle de flujos y componentes:** `FRONTEND_ANALYSIS.md`. **Endpoints navegables:** colección en `postman/`.

---

# Parte III — Estado fase por fase (verificado)

> Reconciliado contra disco. Donde un doc antiguo decía una cosa y el código dice otra, **gana el código** (se nota la divergencia).

## Resumen ejecutivo

| Fase | Entrega | Estado |
|---|---|---|
| **Foundation** | Auth, negocios, staff, payroll, inventario (lotes FIFO, recetas/costos versionados), notificaciones, onboarding | ✅ |
| **Fase 1** | Áreas, Procesos, Time Tracking, infra RBAC | ✅ (RBAC **no aplicado** 🔶) |
| **Fase 2** | Ventas/POS, consumo teórico, métodos de pago | ✅ |
| **Fase 3** | Proveedores, OC, Recepciones, Facturas, alertas de precio | ✅ |
| **Fase 4** | Cadena diaria FAI→FCI→FID→FAF→FOP | ⚠️ construida + commiteada, **sin tests e2e** |
| **Fase 5** | AMD (modelo, hash, builder 6 tabs, trigger en FOP) + refactor de costeo por lotes | ⚠️ construida, **sin commitear + sin tests e2e** |
| **Fase 6** | 7 candados (motor de validación cruzada) | ❌ no iniciada (C3, C5 listos para construir) |
| **Fase 7** | V2 (IMSS, certificación) / V3 (Veritt Data) | ❌ no iniciada |

> **Cronología narrada por los docs (para entender las contradicciones):** ROADMAP (Fase 4 sin iniciar) → GAP_ANALYSIS 8-abr (igual) → DEEP_ANALYSIS 13-abr ("30%, sorpresa: ya empezó") → COMPLETION_PLAN/HANDOFF 14-abr ("~95%, construida sin probar") → **INVENTORY_COSTING 7-may ("costeo hecho, AMD Fase 5 hecho")**. El estado más nuevo + el disco = la realidad de arriba.

---

### Foundation — ✅

Auth (JWT), `businesses`, `memberships`, `onboarding`, `staff` (+compensation +history), `payroll`, inventario base (`Material`/`MaterialLot`/`MaterialStockMovement`, `Product`/`ProductLot`, recetas versionadas, `ProductSalePriceHistory`/`ProductManualCostHistory`), `notifications`, lot allocations.
**Código:** `src/auth`, `src/users`, `src/businesses`, `src/memberships`, `src/onboarding`, `src/staff`, `src/payroll`, `src/inventory`, `src/notifications`.

### Fase 1 — Áreas, Procesos, Time Tracking, RBAC — ✅ / 🔶

- **Áreas:** modelo `Area` (jerarquía con `parentAreaId`), `InventoryLocation` se vincula a `Area`. `src/areas`.
- **Procesos:** `ProcessTemplate` + `ProcessStep` + `ProcessExecution` (`isBlocking`, `requiredRole`, `assignedAreaId`). `src/processes`.
- **Time Tracking:** `ShiftLog` + `ShiftBreak` (clock in/out con lat/lng). `src/time-tracking` (ruta `/shifts`).
- **RBAC:** 🔶 **infra existe pero NO está aplicada.** `src/common/guards/permission.guard.ts` y `src/common/decorators/require-permission.decorator.ts` existen, pero **0 controllers** usan `@RequirePermission`. → Riesgo R4.

### Fase 2 — Ventas y POS — ✅

- `Sale` + `SaleItem` + `SalePayment`; `PaymentMethod`; motor de **consumo teórico** (`TheoreticalConsumption`, creado por venta/ítem/ingrediente en `sales.service.ts`). `src/sales`, `src/payment-methods`.
- Endpoints de analítica: `daily-summary`, `period-summary`, `product-revenue`, `theoretical-consumption`.

### Fase 3 — Cadena de suministro — ✅

- `Supplier` · `PurchaseOrder`+`PurchaseOrderItem` · `Receipt`+`ReceiptItem` (separación de funciones: `receivedByUserId ≠ createdByUserId`) · `SupplierInvoice` (CFDI).
- Flujo de borrador de recepciones (migración `receipts_draft_flow`) + ciclo cancelar/autorizar/rechazar.
- **Alertas de precio:** 🔶 usan el tipo `MATERIAL_LOW_STOCK` en vez de un `PRICE_ALERT` dedicado (issue menor). `src/suppliers`, `src/purchase-orders`, `src/receipts`, `src/supplier-invoices`.

### Fase 4 — Cadena diaria — ⚠️ construida, sin tests e2e

Módulo único `src/daily-chain` (controller con **19 rutas**, service ~600 líneas, repository ~620, dto/, `helpers/operational-date.helper.ts`). 8 pantallas móviles + `business.store.ts`.

**Lo construido y arreglado (per handoff 14-abr):**
- 11 modelos / 7 enums; `isDayOpen()` integrado en sales + receipts.
- **Bug de frontera UTC corregido** (las 7 queries de agregación usaban ventana UTC midnight→midnight, perdiendo ventas nocturnas de Mexico City que caen al día UTC siguiente). Fix vía `getOperationalDateRange` + `localToUTC` con `Intl.DateTimeFormat`, usando `gte: start, lt: end`.
- Flujo de aprobación FCI (PENDING → manager AUTHORIZED → FID auto-gen).
- Flujo FAF conteo-ciego → aprobación de manager.

**Flujo as-built (verificado):**
```
FAI: operador crea PENDING → manager AUTHORIZED (habilita ventas/recepciones) | REJECTED (reintentar)
 ↓
FCI: operador crea PENDING → manager AUTHORIZED → FID auto-generado | REJECTED
 ↓
FID: auto-gen (teórico vs real) → operador clasifica CLASSIFIED → manager APPROVED
 ↓
FAF: operador conteo-ciego PENDING_REVIEW → manager RECONCILED (si dif≈0) | DISCREPANCY → si RECONCILED, FOP auto-gen
 ↓
FOP: auto-gen con 4 validaciones (INVENTORY/CASH/PROCESSES/HOURS) → manager SIGNED → genera AMD
```

**Matemática clave (verbatim del handoff):**
- **FID:** `realConsumption = opening + received − counted`; `theoretical = Σ(productQty × recipeQty × (1 + waste/100))`; `deviation = real − theoretical`; `deviationValueMXN = deviation × costo` (ahora vía `getRealConsumptionCost`, ver Parte IV).
- **FAF:** `totalExpected = cashExpected + Σ terminalExpected + transferExpected` (de `SalePayment` por tipo en el rango); `difference = totalCounted − totalExpected`.

**Estado de los "próximos pasos" del handoff (verificado en código):**
- ✅ #1 `DailyInventoryClosing` `@@unique`→`@@index` — **hecho** (migración `fci_allow_retry_after_reject`).
- ❌ #2–#4 (test del fix UTC, walkthrough completo, **commit**) — **pendientes**.
- ⚠️ #5 (timing de recepción, thresholds FOP, precisión decimal) — pendientes (ver Parte V).

### Fase 5 — AMD + costeo por lotes — ⚠️ construida, SIN COMMITEAR

**Refactor de costeo (ver Parte IV):** `lot-costing.helpers.ts` (22 tests verdes) + `LotCostingService`. ✅ en código.

**AMD:** `src/amd/` (`amd.service.ts`, `amd-builder.service.ts`, `amd.controller.ts`, `amd.repository.ts`, `helpers/canonical-json.ts` + `amd-hash.ts` con specs, `types/`). Cableado en `app.module.ts`. `signFOP` llama `amdService.generateForFOP(tx, …)` **dentro de la transacción** (vía `forwardRef`), con rollback si el AMD falla. Migración `add_amd_phase5`. Móvil: `amd.api.ts`, `amd.types.ts`, `amd.tsx` (6 tabs + verify).

⚠️ **Todo este stream (22 archivos) está sin commitear.** → Riesgo R1.

### Fase 6 — 7 candados — ❌

No iniciada. **C3** (recepciones vs OC) y **C5** (nómina vs turnos) tienen todos los prerequisitos listos y son construibles ya. C1/C2/C4/C7 dependen de la Fase 4/5 ya construida (pero sin verificar). C6 ya existe de facto en el `verify` del AMD.

### Fase 7 — V2/V3 — ❌

No iniciada. V2: evidencia certificada 365 días, IMSS, exportación. V3: Veritt Data.

---

# Parte IV — Modelo de costeo por lotes (FIFO)

> Fuente: `INVENTORY_COSTING.md` (7-may, "doc vivo"). **Crítico** porque el AMD sella snapshots de costo — si el costo está mal, queda sellado mal. Verificado: `lot-costing.{helpers,service}.ts` + `.spec.ts` existen e integrados en inventory/receipts/daily-chain.

## Inmutable vs cache

| Campo | Naturaleza | Quién escribe |
|---|---|---|
| `MaterialLot.unitCost/totalCost/originalQuantity/receivedAt` | **Inmutable** | al recibir el lote |
| `MaterialLot.remainingQuantity` | Mutable decreciente | solo `LotCostingService.consume()` |
| `MaterialStockMovement.*Snapshot`, `MaterialLotAllocation.*` | **Inmutable** | solo `consume()` |
| `Material.currentStock` | **Cache** | `LotCostingService` |
| `Material.currentReferenceUnitCost` | **Cache** (promedio ponderado) | `LotCostingService.refreshReferenceCost()` |

> **Invariante:** solo `LotCostingService` muta esos campos. Receipts/sales/daily-chain delegan.

## Las 4 preguntas de costo (la tabla canónica)

| # | Pregunta | Respuesta | Método | Quién la usa |
|---|---|---|---|---|
| **A** | ¿Cuánto vale lo que tengo en almacén ahora? | Σ `remaining × unitCost` de lotes abiertos (costo histórico) | `getMaterialInventoryValue` | reportes, **AMD P2**, FOP inventario |
| **B** | ¿A qué costo consumo N ahora en esta ubicación? | **Simulación FIFO** por `receivedAt ASC` | `quoteFifoConsumption` | snapshots de venta, **varianza FAI** |
| **C** | ¿Cuánto cuesta una unidad teórica para receta? | **Promedio ponderado** = `currentReferenceUnitCost` | `getReferenceUnitCost` | recetas, alertas de margen, **snapshot de venta** |
| **D** | ¿Cuánto costó el consumo real del día X? | Σ `MaterialLotAllocation.totalCostSnapshot` en el rango | `getRealConsumptionCost` | **FID** (desviación en pesos), **AMD P2** (COGS real) |

> La venta (`sales.create`) usa **C**, no FIFO — porque la venta **no consume material físico** (eso ocurre en producción o se mide con el FCI). El consumo real lo registra el FID con **D**. Hay un comentario explicativo en `sales.service.ts:132` para que nadie lo "corrija" a FIFO por error.

## Reglas estrictas (R1–R5) — verificadas

- **R1 — Oversell prohibido:** si los lotes no cubren la cantidad → `BadRequestException` (no se "consume del aire").
- **R2 — `locationId` obligatorio** en `consume` y `quoteFifoConsumption`.
- **R3 — Snapshots inmutables:** corrección = reverse + new, nunca `UPDATE`.
- **R4 — Solo `LotCostingService` muta caches.**
- **R5 — Drift detection antes de cerrar:** `GET /businesses/:id/inventory/drift`. **Si hay drift, el AMD no se genera.**

## Decisiones cerradas (2026-05-07)

1. Hash del AMD sobre **JSON canónico (RFC 8785 / JCS)**.
2. **Si la generación del AMD falla → la firma del FOP se revierte** (rollback completo).
3. El AMD guarda snapshot completo en `contentJson` (sin FKs para datos clave).
4. Valor de inventario con FIFO sobre lotes activos (Pregunta A).
5. Oversell prohibido.
6. `locationId` obligatorio.

---

# Parte V — Riesgos, deuda técnica e issues

> Consolidado de `GAP_ANALYSIS`, `DEEP_ANALYSIS`, `PHASE4_SESSION_HANDOFF`, `INVENTORY_COSTING` + **verificado en código**.

## Riesgos altos

| # | Riesgo | Por qué importa | Evidencia (verificada) |
|---|---|---|---|
| **R1** | **22 archivos sin commitear** (Fase 5 + costeo + refactor daily-chain) | El trabajo más complejo y reciente vive solo en el working tree. Un `git checkout` lo borra; imposible code-review/rollback granular. | `git status`: 11 `M` + 11 `??`. El handoff pedía "commit all" en abril; sigue abierto. |
| **R2** | **Core de V.3 sin tests e2e** | La cadena + AMD *son* el producto. Si las reglas de bloqueo o los números están mal, el valor "complejo de falsificar" se cae. | `find *.spec.ts` → solo **3** (lot-costing + hash). **0** tests de integración del flujo. **0** en móvil. El handoff lista ~20 escenarios sin marcar. |
| **R3** | **AMD montado sobre base sin verificar** | El AMD **sella con hash** lo que *cree* que pasó. Un error en Fase 4 o costeo queda **inmutable** — lo peor para una "fuente de verdad". | `daily-chain.service.ts:736` → `generateForFOP` en la misma transacción. |
| **R4** | **RBAC construido pero no aplicado** | "Cualquier miembro puede hacer todo." Rompe la separación de funciones que la arquitectura exige (C3, FAI autorizador≠creador). | `permission.guard.ts` existe; **0 controllers** usan `@RequirePermission`. |

## Riesgos medios / deuda técnica (del handoff, verificada)

1. **Timing recepción vs FCI:** `receivedQuantity` se captura al crear el FCI; una recepción entre creación y autorización puede causar **falsa desviación**. Mitigación: recalcular al autorizar, o bloquear recepciones con FCI abierto.
2. ✅ ~~`@@unique`→`@@index` en `DailyInventoryClosing`~~ — **ya resuelto**.
3. **`DailyClosingStatus.COMPLETED` huérfano:** el enum aún lo tiene pero el flujo va PENDING→AUTHORIZED. Código muerto (verificado).
4. **`completedByUserId/completedAt`** en closing — sin uso desde que el FCI no auto-completa.
5. **Sin `_layout.tsx`** en la carpeta daily-chain.
6. **Precisión decimal en móvil:** JS `Number` (float64) vs backend `Decimal(14,4)`. Posible drift de display (`0.1+0.2≠0.3`).
7. **Thresholds del FOP hardcodeados:** INVENTORY (cualquier varianza falla), CASH (tolerancia 1 centavo). Deberían ser por-negocio.

## Diferidos / menores

- **B2 — Inventory sin repository:** `inventory.service.ts` = **1798 líneas**, sin capa repository (verificado). Refactor incremental.
- **Alertas de precio** con `MATERIAL_LOW_STOCK` en vez de `PRICE_ALERT`.
- **Punto de equilibrio diario** — requiere un modelo de costos fijos inexistente.
- **`notifications.api.ts`** existe en móvil pero ninguna pantalla lo consume.
- **Frontend:** migración dark→paper a medias, 5 componentes muertos, `explore.tsx` rompe la regla de HTTP, `chat.tsx` stub (ver `FRONTEND_ANALYSIS.md`).

## Riesgo de proceso: deriva documental

9 docs con estados contradictorios por fecha. `unityrc.md` tiene la **lista de módulos desactualizada** (solo nombra hasta Foundation) → puede engañar a un colaborador/agente. **Este documento maestro existe para neutralizar eso** (ver Parte VII).

## La tensión estratégica central

El proyecto tiene un patrón de **"construir hacia adelante sin consolidar hacia atrás"**: Fase 4 antes de testear → Fase 5 sobre Fase 4 sin testear → nada commiteado. Cada fase nueva *aumenta la superficie sin verificar*. Para un producto cuyo valor **es la integridad del dato**, la siguiente iteración debe ser de **consolidación, no de construcción**.

---

# Parte VI — Roadmap seguro (checkable)

> Marca cada caja al completarla. **No avanzar a la siguiente iteración sin cerrar la anterior.** El orden está diseñado para *dejar de acumular riesgo* antes de construir más.

## 🔴 Iteración 0 — Consolidar (1–2 días · BLOQUEANTE)

Objetivo: dejar de acumular riesgo. **No construir nada nuevo.**

- [ ] Commitear el trabajo en vuelo en **commits lógicos** (no uno gigante):
  - [ ] `feat(inventory): lot-costing service + helpers + tests`
  - [ ] `feat(amd): phase 5 daily master archive (model, builder, hash, verify)`
  - [ ] `feat(daily-chain): integrate AMD generation on FOP sign`
  - [ ] `feat(mobile): AMD screen + api/types`
  - [ ] `docs: master doc + frontend analysis + postman collection`
- [ ] Verificar build desde cero: `cd monkeys-api && npm run build` (verde).
- [ ] Verificar migraciones limpias: `npx prisma migrate reset` en DB de dev + `npx prisma migrate deploy`.
- [ ] `cd veritt-mobile && npm run lint` (verde).
- [ ] Archivar los docs obsoletos en `docs/archive/` (ver Parte VII) — que dejen de confundir.
- [ ] Actualizar la lista de módulos de `unityrc.md` o marcarlo como superseded por este doc.

**Criterio de salida:** `git status` limpio · build verde · este documento como única fuente de verdad.

## 🟠 Iteración 1 — Probar el corazón de V.3 (3–5 días)

Objetivo: convertir "construido" en "verificado". Sin esto, todo lo demás es castillo de naipes (R2, R3).

- [ ] Suite de integración backend de la cadena diaria (DB de test). Escenarios mínimos:
  - [ ] Venta antes de FAI autorizado → rechazada (`isDayOpen` falso).
  - [ ] FAI autorizado → habilita ventas/recepciones.
  - [ ] Creador ≠ autorizador en FAI/FCI → 403.
  - [ ] FCI autorizado → FID auto-gen con `theoreticalConsumption` ≠ 0.
  - [ ] FID incluye exactamente los materiales del closing.
  - [ ] Cancelar venta → se borran sus `TheoreticalConsumption` → no aparecen en FID.
  - [ ] FAF conteo-ciego → revelar → aprobar; `totalExpected` = pagos reales.
  - [ ] Solo manager firma FOP; firma → **AMD generado y `verify` OK**.
  - [ ] **Rollback:** forzar fallo del AMD → la firma del FOP se revierte.
  - [ ] Drift detectado → el AMD no se genera (R5).
- [ ] Verificar números tras el fix UTC con datos sembrados (venta nocturna que cae al día UTC siguiente).
- [ ] Walkthrough manual de **2 usuarios** (operador + manager) FAI→FOP→AMD; documentar resultado.
- [ ] Resolver deuda que afecta correctitud: timing recepción/FCI (#1), thresholds FOP configurables (#7), limpiar `COMPLETED`/`completedBy*` huérfanos (#3,#4).

**Criterio de salida:** la suite FAI→FOP→AMD pasa en verde; un AMD generado se verifica con hash OK.

## 🟡 Iteración 2 — Endurecer para producción (2–4 días)

- [ ] **Aplicar RBAC** (`@RequirePermission`) en controllers, empezando por daily-chain (separación de funciones) y finanzas (R4).
- [ ] Filtrar módulos por rol en el móvil.
- [ ] Limpieza frontend: borrar 5 componentes muertos · arreglar/eliminar `explore.tsx` · decidir `chat.tsx` (backend o "Próximamente").
- [ ] Precisión decimal en móvil (formateo consistente vs `Decimal(14,4)`) (#6).

## 🟢 Iteración 3 — Fase 6: primeros candados (1–2 semanas)

- [ ] **C3** — Recepciones vs Órdenes de compra (prereqs listos).
- [ ] **C5** — Nómina vs turnos fichados (prereqs listos).
- [ ] Diseñar el motor de candados como servicio post-FOP que alimenta el AMD P4 (alertas).

## 🔵 Backlog posterior

- [ ] Candados restantes C1/C2/C4/C7 (C6 ya vive en `verify`).
- [ ] B2 — extraer repository de inventario (1798 líneas).
- [ ] Alertas de precio → tipo `PRICE_ALERT` dedicado.
- [ ] Pantalla de notificaciones en móvil (backend + api ya existen).
- [ ] Punto de equilibrio (requiere modelo de costos fijos).
- [ ] Fase 7 — V2 (IMSS, certificación) / V3 (Veritt Data).

## La decisión

La única bifurcación real es **qué hacer primero: (A) consolidar (Iter 0+1)** o **(B) seguir construyendo (Fase 6)**. Dado que la propuesta de valor de Veritt **es la integridad del dato**, **A es la opción coherente con la propia arquitectura**: de nada sirven 7 candados sobre datos mal calculados.

---

# Parte VII — Procedencia de los 9 documentos

> Este documento maestro **consolida y supersede** los siguientes. Recomendación: mover los marcados como "archivar" a `docs/archive/` para que esta sea la única fuente viva.

| Doc | Fecha | Qué aportó | Acción recomendada |
|---|---|---|---|
| `ARCHITECTURE_V3.md` | 2026 | La visión completa (Parte I de aquí). Atemporal. | **Conservar** — es la biblia conceptual. |
| `ROADMAP.md` | s/f | Definición de fases con modelos Prisma. Su tabla de estado quedó obsoleta. | Archivar (su estado vive aquí; su detalle de modelos en la Parte III). |
| `GAP_ANALYSIS.md` | 8-abr | Código vs arquitectura, backfills B1–B4. | Archivar. |
| `DEEP_ANALYSIS.md` | 13-abr | Conteos y descubrimiento de que Fase 4 ya había empezado. | Archivar. |
| `PHASE4_PLAN.md` | s/f | Blueprint original de la cadena diaria. | Archivar. |
| `PHASE4_COMPLETION_PLAN.md` | 14-abr | El ~5% final de Fase 4 (role en `GET /businesses`, FAF approval). | Archivar. |
| `PHASE4_SESSION_HANDOFF.md` | 14-abr | Matemática as-built, issues conocidos, next-steps (Parte III/V de aquí). | Archivar (su contenido cargante está absorbido). |
| `INVENTORY_COSTING.md` | 7-may | Modelo de costeo por lotes (Parte IV). Doc vivo. | **Conservar** — referencia técnica activa del costeo. |
| `unityrc.md` | s/f | Reglas de código para agentes. Lista de módulos **stale**. | Actualizar lista de módulos **o** marcar superseded por `CLAUDE.md` + este doc. |
| `README.md` | — | vacío | Llenar con un índice que apunte a este doc. |

**Documentos vivos tras esta consolidación:**
- `VERITT_MASTER.md` (este) — estado, roadmap, fuente de verdad.
- `ARCHITECTURE_V3.md` — visión.
- `INVENTORY_COSTING.md` — referencia técnica del costeo.
- `FRONTEND_ANALYSIS.md` — flujos y componentes móviles.
- `STATE_AND_ITERATION_PLAN.md` — análisis crítico extendido (complementa la Parte V/VI).
- `postman/` — endpoints navegables (1:1 con el código).
- `CLAUDE.md` — reglas operativas para agentes.

---

# Apéndice — Mapa de archivos clave

```
veritt-tree/
├── VERITT_MASTER.md                ← ESTE DOC (fuente de verdad)
├── ARCHITECTURE_V3.md              ← visión (conservar)
├── INVENTORY_COSTING.md            ← costeo por lotes (conservar)
├── FRONTEND_ANALYSIS.md            ← flujos + componentes móviles
├── STATE_AND_ITERATION_PLAN.md     ← análisis crítico extendido
├── CLAUDE.md                       ← reglas para agentes
├── postman/
│   ├── Veritt-API.postman_collection.json   ← 21 carpetas · 128 requests
│   ├── generate-collection.mjs              ← generador (fuente de verdad)
│   └── README.md
│
├── monkeys-api/                    ← Backend NestJS
│   ├── prisma/
│   │   ├── schema.prisma           ← 53 modelos · 37 enums
│   │   └── migrations/             ← 15 migraciones
│   └── src/
│       ├── amd/                    ← Fase 5: builder, hash, canonical-json, verify
│       │   ├── amd.service.ts · amd-builder.service.ts · amd.controller.ts
│       │   └── helpers/{canonical-json,amd-hash}.ts (+ specs)
│       ├── daily-chain/            ← Fase 4: controller (19 rutas), service ~600L
│       │   ├── daily-chain.service.ts   (signFOP:736 → generateForFOP)
│       │   └── helpers/operational-date.helper.ts  (fix UTC)
│       ├── inventory/              ← lot-costing.{helpers,service}.ts (+ spec)
│       │   └── inventory.service.ts     (1798L — sin repository, deuda B2)
│       ├── common/
│       │   ├── guards/permission.guard.ts        ← RBAC (NO aplicado, R4)
│       │   └── decorators/require-permission.decorator.ts
│       ├── sales/ · receipts/ · purchase-orders/ · suppliers/ · supplier-invoices/
│       ├── areas/ · processes/ · time-tracking/ · payment-methods/
│       ├── staff/ · payroll/ · businesses/ · memberships/ · onboarding/
│       ├── notifications/ · users/ · auth/
│       └── app.module.ts           ← 21 módulos cableados (incl. AmdModule)
│
└── veritt-mobile/                  ← Mobile Expo
    ├── app/                        ← 60 pantallas (Expo Router)
    │   └── businesses/[businessId]/daily-chain/  ← 8 pantallas + amd.tsx
    ├── components/                 ← ~90 componentes (ui/ + dominios)
    ├── api/{client.ts, modules/}   ← 17 módulos API
    ├── store/{auth,business}.store.ts
    ├── hooks/{useHomeData,useBusinessDetail,usePosData,useFaiDraft}.ts
    └── constants/design-tokens.ts  ← sistema "paper"
```

---

> **Recordatorio final:** el código manda sobre los docs. Si en una sesión futura algo de aquí ya no cuadra con el repo, **verifica en disco y actualiza este documento** — no construyas sobre un supuesto. Antes de cada iteración nueva, vuelve a la [Parte VI](#parte-vi--roadmap-seguro-checkable) y confirma que la anterior está cerrada.
