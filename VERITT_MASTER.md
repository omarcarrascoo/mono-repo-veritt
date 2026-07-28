# VERITT — Documento Maestro (Estado)

> **Qué es este documento:** el **ESTADO real del proyecto verificado contra el código** — dónde estamos, qué existe, qué falta, y el roadmap. Antes de construir nada nuevo, revísalo.
>
> **Relación con la VISIÓN:** la visión oficial de Veritt vive ahora en [`VERITT_V8_VISION.md`](VERITT_V8_VISION.md) (V8.0, reemplaza al antiguo `ARCHITECTURE_V3.md` ya archivado). El delta entre esa visión y lo construido está en [`GAP_V8_VS_CODE.md`](GAP_V8_VS_CODE.md). Este documento es el **estado**; el V8.0 es el **deber ser**. Si hay contradicción sobre *qué debe ser* el sistema, prevalece el V8.0; sobre *qué existe hoy*, prevalece este (verificado en disco).
>
> **Fecha de consolidación:** 2026-06-15 (actualizado 2026-06-16 con V8.0) · **Rama:** `development`
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

## 🔴 Iteración 0 — Consolidar (1–2 días · BLOQUEANTE) — ✅ COMPLETADA (2026-06-15)

Objetivo: dejar de acumular riesgo. **No construir nada nuevo.**

- [x] Commitear el trabajo en vuelo. *(Hecho en commit único `1dd6505 "First AMD"` — incluye AMD, lot-costing, integración daily-chain, AMD móvil, Postman y docs. Nota: fue un commit grande en vez de los commits lógicos sugeridos; aceptable, no se reescribe historia.)*
- [x] Verificar build desde cero: `cd monkeys-api && npm run build` → **verde** (`nest build` sin errores).
- [x] Schema Prisma válido: `npx prisma validate` → **válido**. ⚠️ `migrate status`/`reset` no verificable desde este entorno (pooler Supabase no alcanzable) — **pendiente correr en la máquina con acceso a la DB de dev**.
- [x] Tests unitarios existentes: `npx jest` → **50 tests / 3 suites en verde** (lot-costing, amd-hash, canonical-json).
- [ ] `cd veritt-mobile && npm run lint` (verde) — pendiente.
- [x] Archivar los docs obsoletos en `docs/archive/` (6 docs + README).
- [x] Actualizar la lista de módulos de `unityrc.md` (20 módulos reales) + `README.md` como índice.

**Criterio de salida:** ✅ `git status` limpio · ✅ build verde · ✅ tests unitarios verdes · ✅ este documento como única fuente de verdad. → **R1 (trabajo sin commitear) resuelto.**

> **Quedan 2 verificaciones de entorno** (no bloquean el avance a Iteración 1, pero hazlas en tu máquina con DB): `npx prisma migrate status` y `npm run lint` en móvil.

## 🟠 Iteración 1 — Probar el corazón de V.3 (3–5 días)

Objetivo: convertir "construido" en "verificado". Sin esto, todo lo demás es castillo de naipes (R2, R3).

**🟢 Infraestructura de test montada (2026-06-15):** Postgres desechable (`docker-compose.test.yml`, `:5433`), harness e2e que replica `main.ts`, fixtures, guardarraíles anti-producción (`test/assert-test-db.ts` — bloquea cualquier URL Supabase/pooler). Correr: `npm run test:e2e:full`. Ver `monkeys-api/test/README.md`.

Suite de integración backend de la cadena diaria — **11 tests en verde** (`test/daily-chain-*.e2e-spec.ts`):
  - [x] Venta antes de FAI autorizado → día cerrado (`fai: null` en status).
  - [x] No se puede crear el FCI sin FAI autorizado → 400.
  - [x] Creador ≠ autorizador en FAI → 403 (incluso si es manager).
  - [x] Operador no autoriza (gate de management) → 403.
  - [x] Manager distinto del creador sí autoriza FAI → AUTHORIZED.
  - [x] 401 sin token · 403 a externos al negocio.
  - [x] Solo OWNER/ADMIN firma FOP (operador → 403).
  - [x] **Recorrido feliz FAI→FCI→FID→FAF→FOP→AMD; firma genera AMD y `verify.valid === true`** (candado C6 ✅).
  - [ ] **Rollback:** forzar fallo del AMD → la firma del FOP se revierte. *(`it` placeholder — requiere override de `AmdService` en el TestingModule; hacer en vivo.)*
  - [ ] **Con ventas:** FID `theoreticalConsumption > 0` y `deviationValueMXN` correcto. *(`it.todo` — requiere crear `StaffProfile` para el operador.)*
  - [ ] Drift detectado → el AMD no se genera (R5).
- [ ] Verificar números tras el fix UTC con datos sembrados (venta nocturna que cae al día UTC siguiente).
- [ ] Resolver deuda que afecta correctitud: timing recepción/FCI (#1), thresholds FOP configurables (#7), limpiar `COMPLETED`/`completedBy*` huérfanos (#3,#4).

**Criterio de salida:** ✅ la suite FAI→FOP→AMD pasa en verde y un AMD generado verifica con hash OK. **Restan:** caso con ventas (consumo teórico > 0), test de rollback, y drift gate.

> **🔐 Bonus de seguridad (2026-06-15):** se removió una **credencial de producción hardcodeada** en `prisma.service.ts` (fallback con la contraseña de la DB). Ahora exige `DATABASE_URL_SESSION` o falla al arrancar. ⚠️ **ACCIÓN PENDIENTE DEL DUEÑO: rotar la contraseña de la DB en Supabase** — debe considerarse comprometida (estuvo en el repo/historial).

---

## 🎯 Alcance de V1 = el V8.0 completo (decisión del dueño, 2026-06-16)

Decisión tomada: **todos los frentes del V8.0 entran en V1**, construidos **en orden de dependencia**; la **migración de roles a R1–R6 se hace ya**. Las fases F1→F6 de abajo son ese orden. Ver el delta completo en [`GAP_V8_VS_CODE.md`](GAP_V8_VS_CODE.md).

**Regla de oro del orden:** cada fase construye sobre datos/estructuras que la anterior dejó listos. Construir fuera de orden = refactor doble (ej. crear features atadas a R2 antes de que R2 exista).

> Antes de F1 va el cierre de la **Iteración 1** (arriba): no se construye sobre una cadena/AMD sin terminar de verificar.

---

## 🟡 F1 — Roles R1–R6 + RBAC aplicado (FUNDACIÓN · primero)

**Por qué primero:** todo el V8.0 ata responsabilidades a roles concretos (R2 declara saldo de caja, R5 registra gastos, P6 solo R6…). Si construimos features con los roles actuales y migramos después, refactorizamos dos veces.

⚠️ **No es un renombre — es un remodelado.** Hoy: `OWNER/ADMIN/SUPERVISOR/OPERATOR/VERITT_STAFF` (5). V8.0: R1 Inventario, R2 Caja, R3 POS, R4 Gerente, R5 Admin, R6 Dueño (6). El `OPERATOR` genérico se parte en R1/R2/R3.

- [x] Definir el mapeo y la migración del enum `MembershipRole` → R1–R6 (+ migración Prisma de datos: `20260708120000_roles_r1_r6`). Contrato en `ROLES_R1_R6_MATRIX.md`.
- [x] Actualizar los gates de servicio a la matriz vía **grupos con nombre** (`roles.constants.ts`): ~43 checks en 23 archivos. Separación aplicada (POS create R3/R4/R6; ajuste stock/precio solo finanzas; FOP firma R4↑). Build verde.
- [x] Sincronizar contratos: `veritt-mobile/types/*`, `lib/role-permissions.ts`, labels/pickers, y Postman regenerado. Typecheck móvil verde.
- [x] Adaptar la suite e2e a R1–R6 (fixtures: manager=R4_MANAGER, operator=R1_INVENTORY). e2e **11/11 verdes** (corridos con Docker). Unit tests verdes; typecheck test/ verde.
- [x] Docs actualizados (backend CLAUDE.md, este roadmap).
- [x] **Permisos configurables por negocio** (F1.5): capa de **capabilities** con `PermissionService` (default en código + override por negocio en DB `BusinessRoleCapability`). Los ~43 gates ahora usan `permissions.can(businessId, role, capability)`. Endpoints `GET/PUT/DELETE /businesses/:id/permissions` para que R6 configure. **Test de equivalencia prueba cero regresión** (matriz default ≡ grupos originales). Build + 61 unit tests verdes.
- [ ] **Ejecutar la suite e2e completa tras las nuevas migraciones** (roles + capabilities) contra DB de test — smoke test crítico (los gates ahora consultan DB).
- [ ] Frontend: pantalla de config de permisos para R6 (consume `GET/PUT /permissions`). *Pendiente móvil.*
- [ ] **Aplicar RBAC con `@RequirePermission`** en controllers. *Diferido: los servicios ya bloquean vía `can()`; el decorator es endurecimiento adicional.*
- [ ] Frontend por **rol-flujo** completo (R2 no ve comandas, R3 superficie mínima). *Diferido: hoy los permisos gatean botones/módulos.*

**Criterio de salida:** ✅ los 6 roles existen, los gates usan capabilities configurables por negocio (default = comportamiento previo, probado equivalente), e2e verde. **Pendiente:** re-correr e2e tras la migración de capabilities; pantalla de config móvil; RBAC decorator y navegación rol-flujo como endurecimiento posterior.

### F1.5 — Permisos configurables (arquitectura)

- **`capabilities.ts`**: enum `Capability` (INVENTORY_WRITE, INVENTORY_ADJUST, POS_OPERATE, FINANCE_VIEW, CASH_OPERATE, FINANCE_MANAGE, STAFF_MANAGE, CONFIG_MANAGE, CHAIN_AUTHORIZE, CHAIN_SIGN, MEMBER_ADMIN) + `DEFAULT_ROLE_CAPABILITIES` (matriz rol→capacidades, = grupos originales). `CASH_OPERATE` → R2/R4/R5 (+bypass) cierra el candado C2.
- **`PermissionService.can(businessId, role, capability)`**: bypass (R6/STAFF) → override del negocio si existe → default. Sin config → default → cero regresión.
- **`BusinessRoleCapability`** (tabla): override por negocio. Si un negocio tiene filas para un rol, esas definen sus capacidades; si no, default.
- **Endpoints** `businesses/:id/permissions` (GET matriz efectiva, PUT/:role override, DELETE/:role reset) — solo quien tiene `MEMBER_ADMIN` (R6).

## 🟡 F2 — Cerrar candados base (C1 y C2 completos)

**Por qué aquí:** son piezas pequeñas de alta integridad que el motor financiero (F4) va a consumir. Mejor tenerlas firmes antes.

- [x] **Saldo inicial de caja (C2):** R2 (capacidad `CASH_OPERATE`) declara el efectivo inicial antes de la 1ª venta vía `POST /daily-chain/cash-opening`. Con la cadena activa (FAI autorizado), una venta se bloquea si no hay saldo declarado. El FAF parte de ese saldo (`efectivo esperado = saldo inicial + ventas en efectivo`). Modelo `DailyCashOpening` (uno por negocio/fecha). e2e: `daily-chain-cash-opening.e2e-spec.ts`.
- [ ] **FEFO real (C1/costeo):** hoy el costeo es solo FIFO por `receivedAt`; agregar prioridad por `expiresAt` (el campo ya existe). + alertas de vencimiento.
- [x] Tests e2e del saldo inicial (C2). Falta el de FEFO.

## 🟡 F3 — Módulos operativos que alimentan las finanzas

**Por qué antes del motor:** estos generan los movimientos que M5–M8 necesitan (gastos, propinas, comida de personal impactan ER/Balance/Flujo).

- [ ] **Gastos extraordinarios** (R5/R6): 18 categorías en 6 grupos, **comprobante obligatorio**, impacta M5/M7/M8 y P3/P5.
- [ ] **Propinas y moje** (POS/R3): 3 opciones forzadas al cerrar cuenta + distribución configurable.
- [ ] **Comida de personal** (R1): movimiento de inventario a **gasto de operación** (no a costo de ventas), costo al lote FEFO+FIFO.

## 🟡 F4 — Motor financiero M1–M10 (el frente grande)

**Por qué aquí:** necesita roles (acceso), candados base (datos limpios) y los módulos de F3 (movimientos completos). El AMD P2 ya tiene ER/Balance/Flujo como snapshot — esto los convierte en motor real.

- [ ] Modelar lo que falta: **costos fijos**, **MOD** (nómina-a-costo desde turnos), **GIF**.
- [ ] M1–M5: ventas/costos variables, producción, estructura de costos, **prorrateo**, punto de equilibrio + cobertura CxP.
- [ ] M6–M9: ER diario+MTD, Balance con validación y provisión diaria de prestaciones, Flujo + proyección 30d, razones + **EBITDA** + **semáforo IMSS**.
- [ ] **M10 — estados E/C/V + indicador de madurez** (clave de adopción: AMDs válidos desde día 1, refinando a V).
- [ ] Conectar el motor al AMD P2 (reemplazar el snapshot por el cálculo real) + Cuentas por Pagar con línea de tiempo 90d.

## 🟡 F5 — Cierres de turno + candados cruzados restantes

- [ ] **FCT / RCT** (cortes de turno con hash encadenado al AMD): `Hash_AMD = SHA256(totales + Hash_RCT[1..n])`.
- [ ] **OC como entidad rica** (C3): perfil estadístico por proveedor, clasificación auto de discrepancias.
- [ ] Candados **C4** (costos vs resultados) y **C5** (nómina vs actividad) como verificación explícita post-FOP que alimenta P4.
- [ ] **FTI** (transformación interna), clasificación **ABC** de inventario.

## 🟡 F6 — Inteligencia y escala

- [ ] **Confidence scoring** (Shadow Mode 30–60d, score por rol, vector R2-R3, escalamiento, loop). Va al final: necesita el historial de AMDs que F1–F5 producen.
- [ ] **Módulo de inteligencia de horarios** (modo lectura sobre AMDs, ROI, restricciones).
- [ ] **Onboarding contextual** (notas reactivas in-app).
- [ ] Escala: **V2** (multi-ubicación, API de salida, multi-R6/societario), **V3** (red), **V4** (Red Veritt, WorkPass).

## 🔵 Deuda técnica transversal (atender cuando se toque cada área)

- [ ] B2 — extraer repository de inventario (`inventory.service.ts`, 1798 líneas).
- [ ] Alertas de precio → tipo `PRICE_ALERT` dedicado (hoy usa `MATERIAL_LOW_STOCK`).
- [ ] Limpieza frontend: 5 componentes muertos, `explore.tsx` (rompe regla HTTP), `chat.tsx` (stub), precisión decimal vs `Decimal(14,4)`.
- [ ] Firma con **PIN/contraseña** en cada formato (trazabilidad de intención) — transversal a la cadena.

## La decisión (resuelta)

V1 = V8.0 completo, en el orden F1→F6 de arriba. **Roles primero** porque son la fundación; **confidence scoring al final** porque necesita los datos que todo lo demás produce. La integridad del dato sigue siendo el principio rector: cada fase deja datos verificados sobre los que la siguiente construye.

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
