# Veritt — Roadmap V.3

Analisis de la Arquitectura V.3 contra el codigo actual. Que esta construido, que falta, y en que orden construirlo.

---

## Estado Actual — Lo que ya existe en codigo

| Concepto V.3 | Status | Ubicacion |
|---|---|---|
| Users + Auth (JWT) | Listo | `src/auth/`, `src/users/` |
| Businesses + Memberships + Roles | Listo | `src/businesses/`, `src/memberships/` |
| Staff profiles + compensation + history | Listo | `src/staff/` |
| Payroll payment tracking | Listo | `src/payroll/` |
| Inventory locations (areas de inventario) | Listo | `InventoryLocation` model |
| Materials + lots + movimientos FIFO | Listo | `Material`, `MaterialLot`, `MaterialStockMovement` |
| Products + lots + movimientos | Listo | `Product`, `ProductLot`, `ProductStockMovement` |
| Recetas (versionadas, con items) | Listo | `ProductRecipeVersion`, `ProductRecipeVersionItem` |
| Versionado de costos | Listo | `ProductSalePriceHistory`, `ProductManualCostHistory` |
| Notificaciones basicas | Listo | `src/notifications/` (stock bajo, nomina pendiente) |
| Onboarding wizard | Listo | `src/onboarding/` |
| Lot allocation tracking | Listo | `MaterialLotAllocation`, `ProductLotAllocation` |

La base esta solida: auth, negocios, staff, inventario, recetas y versionado de costos funcionan. Lo que falta es el corazon diferenciador de V.3.

---

## Progreso General

```
Arquitectura V.3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fundacion (auth, negocios, staff, inventario)  █████ LISTO
Phase 1: Areas, Procesos, Time Tracking        █████ LISTO
Phase 2: Ventas, POS y Revenue Tracking         █████ LISTO
Phase 3: Ordenes de Compra y Recepcion         ░░░░░ NO INICIADO
Phase 4: Cadena Diaria (FAI-FCI-FID-FAF-FOP)  ░░░░░ NO INICIADO
Phase 5: AMD (6 Pestanas + SHA-256)            ░░░░░ NO INICIADO
Phase 6: 7 Candados                            ░░░░░ NO INICIADO
Phase 7: V2 y V3 (Escala)                      ░░░░░ NO INICIADO
```

---

## Phase 1 — Entidades Universales (Areas, Procesos, Personas)

V.3 dice que todo corre sobre Area + Proceso + Persona. Actualmente "areas" solo existen como `InventoryLocation`. Esto necesita convertirse en un concepto universal de primera clase.

### 1.1 Areas Module

Modelo `Area` — espacios fisicos o funcionales por negocio (cocina, barra, caja, almacen). `InventoryLocation` se convierte en hijo/vinculo de Area, no el unico concepto de espacio.

**Modelos nuevos:**
- `Area` — id, businessId, name, type (configurable), status, parentAreaId (jerarquia opcional)
- Relacion: `InventoryLocation` -> `Area` (un location pertenece a un area)

**Dependencias:** Ninguna — puede iniciar inmediatamente.

### 1.2 Processes Module

Modelo `Process` — procesos configurables por negocio. Cada proceso tiene pasos, areas asignadas y roles asignados. Es la columna vertebral del FOP.

**Modelos nuevos:**
- `Process` — id, businessId, name, description, isBlocking (si bloquea el cierre), status
- `ProcessStep` — id, processId, name, order, requiredRole, assignedAreaId
- `ProcessExecution` — id, processId, executedByUserId, areaId, startedAt, completedAt, status

**Dependencias:** Areas (1.1)

### 1.3 Time Tracking (Control de Asistencia)

Modelo `ShiftLog` — log in/log out con timestamps y geolocalizacion por staff. Base para horas de nomina, Pestana 6, y Candado 5.

**Modelos nuevos:**
- `ShiftLog` — id, businessId, staffProfileId, clockInAt, clockOutAt, clockInLocation (lat/lng), clockOutLocation, totalMinutes, status
- `ShiftBreak` — id, shiftLogId, startAt, endAt, type (meal, rest)

**Dependencias:** Staff (ya existe)

### 1.4 Role-Based Access por Area

Evolucionar el `MembershipRole` actual hacia permisos con scope por area y proceso. V.3 dice "log in habilita los modulos correspondientes a su rol."

**Modelos nuevos:**
- `RolePermission` — id, businessId, role, areaId, processId, permission (READ, EXECUTE, APPROVE)

**Dependencias:** Areas (1.1), Processes (1.2)

---

## Phase 2 — Ventas y POS

Sin ventas no hay datos de ingreso — y 4 de 7 candados dependen de la reconciliacion ventas vs inventario vs caja.

### 2.1 Sales Module

**Modelos nuevos:**
- `Sale` — id, businessId, areaId, operatorUserId, saleNumber, subtotal, tax, total, paymentMethod, status (OPEN, COMPLETED, CANCELLED, REFUNDED), cancelledByUserId, cancellationReason, createdAt
- `SaleItem` — id, saleId, productId, quantity, unitPrice, totalPrice, recipeVersionId (snapshot de la receta usada)

**Dependencias:** Products (ya existe), Areas (1.1)

### 2.2 Motor de Consumo Teorico

Cuando se registra una venta, auto-calcular el consumo esperado de materiales a partir de las recetas. Este es el corazon del Candado 1.

**Logica:**
- Al completar una `Sale`, por cada `SaleItem`: buscar `ProductRecipeVersion` activa -> calcular consumo teorico de cada material
- Almacenar en `TheoreticalConsumption` — id, saleId, saleItemId, materialId, expectedQuantity, recipeVersionId, calculatedAt

**Dependencias:** Sales (2.1), Recipes (ya existe)

### 2.3 Metodos de Pago

**Modelos nuevos:**
- `PaymentMethod` — id, businessId, name, type (CASH, CARD_TERMINAL, TRANSFER, OTHER), terminalReference, status
- `SalePayment` — id, saleId, paymentMethodId, amount, reference

Cada metodo tiene su propia ruta de reconciliacion en el FAF.

**Dependencias:** Sales (2.1)

### 2.4 Tracking de Ingresos Diarios

Agregacion en tiempo real: ingreso bruto, costo de venta (de recetas), margen bruto, avance hacia punto de equilibrio.

**Logica:** Calculos derivados de Sales + TheoreticalConsumption. Puede ser un servicio sin modelo propio inicialmente, materializando en el AMD despues.

**Dependencias:** Sales (2.1), Consumo Teorico (2.2)

---

## Phase 3 — Ordenes de Compra y Recepcion

Candado 3 requiere tres capas independientes: orden, recepcion fisica, factura del proveedor.

### 3.1 Purchase Orders Module

**Modelos nuevos:**
- `Supplier` — id, businessId, name, contactInfo, rfc, status
- `PurchaseOrder` — id, businessId, supplierId, createdByUserId, orderNumber, status (DRAFT, SENT, PARTIALLY_RECEIVED, RECEIVED, CANCELLED), totalEstimated, currency
- `PurchaseOrderItem` — id, purchaseOrderId, materialId, quantityOrdered, estimatedUnitCost

**Dependencias:** Materials (ya existe)

### 3.2 Recepcion con Separacion de Responsabilidades

Flujo de recepcion separado (usuario diferente al creador de la PO). Separacion de responsabilidades forzada por arquitectura, no por politica.

**Modelos nuevos:**
- `Receipt` — id, businessId, purchaseOrderId, receivedByUserId, locationId, receivedAt, status
- `ReceiptItem` — id, receiptId, materialId, quantityReceived, actualUnitCost, lotId (vincula al lote creado)

**Regla de arquitectura:** `Receipt.receivedByUserId` != `PurchaseOrder.createdByUserId`

**Dependencias:** Purchase Orders (3.1), Inventory Locations (ya existe)

### 3.3 Vinculacion de Factura del Proveedor

Referencia de folio CFDI en recepciones — base para Pestana 5 de trazabilidad fiscal.

**Modelos nuevos:**
- `SupplierInvoice` — id, businessId, supplierId, receiptId, cfdiUuid, cfdiXml, totalAmount, currency, invoiceDate, status

**Dependencias:** Receipts (3.2)

### 3.4 Alertas de Cambio de Precio

Auto-alerta cuando el costo unitario recibido excede el umbral configurado vs la ultima compra.

**Logica:** Comparar `ReceiptItem.actualUnitCost` contra `Material.currentReferenceUnitCost`. Si la diferencia supera el umbral del negocio -> generar `Notification`.

**Dependencias:** Receipts (3.2), Notifications (ya existe)

---

## Phase 4 — Cadena Diaria (FAI -> FCI -> FID -> FAF -> FOP)

El corazon de V.3. Cada formato es prerrequisito del siguiente. El sistema NO permite avanzar si el anterior no esta correcto. Restriccion de arquitectura, no de interfaz.

### 4.1 FAI — Apertura de Inventario

Conteo fisico al inicio del dia. Comparar contra el FCI del dia anterior. Bloquear TODAS las operaciones hasta que se autorice.

**Modelos nuevos:**
- `DailyInventoryOpening` — id, businessId, locationId, operationalDate, status (PENDING, AUTHORIZED, REJECTED), authorizedByUserId, authorizedAt
- `DailyInventoryOpeningItem` — id, openingId, materialId, countedQuantity, previousClosingQuantity, variance, varianceValueMXN

**Regla de bloqueo:** Sin FAI autorizado, el dia no puede iniciar. Ningun rol puede ejecutar ninguna operacion.

**Dependencias:** Inventory (ya existe), FCI del dia anterior (4.2 — al inicio solo se valida que exista)

### 4.2 FCI — Cierre de Inventario

Conteo fisico al final del dia. Calculo de consumo real = FAI + recepciones - FCI.

**Modelos nuevos:**
- `DailyInventoryClosing` — id, businessId, locationId, operationalDate, status (PENDING, COMPLETED), completedByUserId, completedAt
- `DailyInventoryClosingItem` — id, closingId, materialId, countedQuantity, openingQuantity, receivedQuantity, realConsumption

**Regla de bloqueo:** Sin FCI, el FID no puede ejecutarse. El dia no puede cerrarse.

**Dependencias:** FAI (4.1), Receipts (3.2)

### 4.3 FID — Inventario y Desviaciones

Diferencia entre consumo teorico (de recetas/ventas) y consumo real (del FCI). Clasificacion de causa obligatoria por cada diferencia.

**Modelos nuevos:**
- `DailyDeviationReport` — id, businessId, operationalDate, status (PENDING_CLASSIFICATION, CLASSIFIED, APPROVED), totalDeviationValueMXN
- `DeviationItem` — id, reportId, materialId, theoreticalConsumption, realConsumption, deviationQuantity, deviationValueMXN, cause (ERROR, WASTE, THEFT, ADJUSTMENT, OTHER), classifiedByUserId, note

**Regla de bloqueo:** Desviaciones sin clasificar bloquean el FAF. Desviaciones criticas sin justificacion bloquean el AMD.

**Dependencias:** FCI (4.2), Consumo Teorico (2.2)

### 4.4 FAF — Arqueo Financiero

Efectivo contado por denominacion. Terminal por referencia. Transferencias por folio. Todo contra lo que el POS registro. **Tolerancia exactamente cero.**

**Modelos nuevos:**
- `DailyCashReconciliation` — id, businessId, operationalDate, status (PENDING, RECONCILED, DISCREPANCY), totalExpected, totalCounted, difference
- `CashDenominationCount` — id, reconciliationId, denomination, quantity, subtotal
- `TerminalReconciliation` — id, reconciliationId, paymentMethodId, expectedTotal, reportedTotal, reference, difference
- `TransferReconciliation` — id, reconciliationId, expectedTotal, reportedTotal, folioReferences

**Regla de bloqueo:** Tolerancia exactamente cero. Un peso de diferencia bloquea el cierre. Sin override posible por ningun rol.

**Dependencias:** Sales/POS (2.1), Payment Methods (2.3)

### 4.5 FOP — Operacion y Procesos

Verificacion de procesos criticos. Conciliacion cruzada: datos reportados vs valores teoricos calculados por el sistema. Su firma genera el AMD.

**Modelos nuevos:**
- `DailyOperationClose` — id, businessId, operationalDate, status (PENDING, SIGNED, BLOCKED), signedByUserId, signedAt
- `FOPValidationItem` — id, fopId, validationType (INVENTORY, CASH, PROCESSES, HOURS), operatorValue, systemValue, isWithinThreshold, resolution

**Regla de bloqueo:** Procesos bloqueantes sin ejecutar impiden el FOP. Conciliacion fallida requiere correccion antes de avanzar.

**Dependencias:** FCI (4.2), FID (4.3), FAF (4.4), Processes (1.2)

---

## Phase 5 — AMD (Archivo Maestro Diario)

El documento inmutable que certifica todo lo que ocurrio en el dia. Se genera automaticamente cuando el FOP se firma. No es una vista dinamica — es un documento completo e independiente, sellado con SHA-256.

### 5.1 Modelo Core del AMD

**Modelos nuevos:**
- `DailyMasterArchive` — id, businessId, operationalDate, contentJson (documento completo), contentHash (SHA-256), generatedAt, fopId, status (GENERATED, VERIFIED, TAMPERED)

**Regla critica:** El hash se calcula sobre `contentJson` al momento de generacion. Si alguien modifica cualquier campo, el hash recalculado no coincide. Manipulacion matematicamente detectable en cualquier momento futuro.

### 5.2 Pestana 1 — Resumen Humano

Gane o perdi hoy? Donde esta el dinero? Cuanto debo en prestaciones? Como me fue vs ayer? En lenguaje de dueno, sin tecnicismos.

**Contenido:** Ingreso bruto, costo total, margen, costo de personal (incluyendo prestaciones devengadas), comparativo vs dia anterior, alertas criticas.

### 5.3 Pestana 2 — Estados Financieros Formales

Generados automaticamente, todos los dias, sin trabajo adicional.

- **Estado de Resultados** diario — con costo total de personal
- **Balance General** — acumulativo, con pasivos de prestaciones laborales devengadas
- **Estado de Flujo de Efectivo**

Nomenclatura contable estandar. Para contador, banco, inversionista o autoridad fiscal.

### 5.4 Pestana 3 — Detalle Operativo Completo

Cada evento del dia expandido. Cada formato en su totalidad. Cada firma y timestamp. Registro de log in/log out con horas trabajadas. Trazabilidad completa. Respaldo de auditoria operativa y laboral.

### 5.5 Pestana 4 — Alertas de Optimizacion

Inteligencia aplicada con datos verificados:
- Producto sin ventas en X dias
- Merma sobre umbral recurrente
- Turno no rentable de forma recurrente
- Costo de insumo subio sin ajuste de precio
- Momento optimo para formalizar empleados en IMSS
- Configurables por negocio — ninguna alerta hardcodeada

### 5.6 Pestana 5 — Trazabilidad Fiscal y Documental

Cada numero del dia vinculado a su documento fuente: CFDI de venta, CFDI de proveedor, recibo de nomina, comprobante de gasto.

Indice de completitud documental:
- Verde: todo comprobado
- Amarillo: pendientes
- Rojo: operaciones sin respaldo

Listo para auditoria del SAT, IMSS, STPS o cualquier entidad regulatoria.

### 5.7 Pestana 6 — Rendimiento por Usuario

Metricas individuales de cada usuario activo ese dia:
- Horas trabajadas (de ShiftLog)
- Acciones ejecutadas
- Volumen de ventas o produccion segun rol
- Desviaciones atribuibles
- Cumplimiento de procesos asignados

Vista diaria en el AMD, acumulable por periodo. Exportable como documento certificado con hash.

---

## Phase 6 — 7 Candados (Motor de Validacion Cruzada)

Los candados validan datos que ya deben existir de las phases 2-5. Son la razon por la que Veritt es "simple de usar y complejo de falsificar."

| Candado | Que valida | Dependencias |
|---|---|---|
| **C1 — Inventario vs Ventas** | Consumo teorico (recetas * ventas) vs consumo real (FCI). Si no cuadra, la desviacion aparece con nombre, cantidad y valor en pesos. | Sales (2), FCI (4.2), FID (4.3) |
| **C2 — Ventas vs Caja** | Totales del POS vs efectivo fisico + terminal + transferencias del FAF. | Sales (2), FAF (4.4) |
| **C3 — Recepciones vs Ordenes** | Orden de compra vs recepcion fisica vs factura del proveedor. El mismo usuario NO puede ejecutar la PO y la recepcion. | PO (3.1), Receipts (3.2), Invoices (3.3) |
| **C4 — Costos vs Estado de Resultados** | Costo de ventas auto-calculado de recetas y consumo real. Nadie puede cambiarlo manualmente. Inflar costos produce contradiccion con inventario. | Recipes (ya existe), Sales (2), AMD P2 (5.3) |
| **C5 — Nomina vs Log in/Log out** | Horas trabajadas desde timestamps reales vs horas cobradas en nomina. Sin timestamp, las horas no existen. | ShiftLog (1.3), Payroll (ya existe) |
| **C6 — AMD vs Tiempo** | Hash SHA-256 congela el estado completo. Modificar cualquier campo = hash no coincide. Detectable en cualquier momento futuro. | AMD (5.1) |
| **C7 — Sistema vs Si mismo** | Core Regulador: dos libros simultaneos — lo que operadores llenan vs lo que el sistema calcula. El FOP los compara. Deben coincidir dentro de umbrales configurados. | FOP (4.5), todos los modulos |

**Para falsificar Veritt:** un actor tendria que manipular simultaneamente 7 capas independientes con consistencia matematica perfecta, sin disparar alertas, y sin que la conciliacion cruzada del FOP detecte la inconsistencia. En la practica — es imposible.

---

## Phase 7 — V2 y V3 (Escala)

### V2 — Veritt Certificado

365 dias de cierre operativo y laboral certificado de forma continua.

- Integracion directa con IMSS
- Exportacion de evidencia financiera para bancos e inversionistas
- El negocio se presenta ante banco, SAT o autoridad con evidencia verificada e inalterable

### V3 — Veritt Data

La base de datos operativa y laboral mas granular y verificable del sector informal latinoamericano.

- Scoring crediticio alternativo para bancos
- Pricing de riesgo operativo para aseguradoras
- Datos para IMSS, INFONAVIT, BID, OIT, STPS
- Datos anonimizados y agregados — valor sistemico

---

## Orden de Ejecucion Recomendado

```
PARALELO A                          PARALELO B
──────────────────                  ──────────────────
Phase 1.1  Areas                    Phase 2.1  Sales/POS
Phase 1.2  Processes                Phase 2.2  Consumo Teorico
Phase 1.3  Time Tracking            Phase 2.3  Metodos de Pago
Phase 1.4  RBAC por Area            Phase 2.4  Revenue Tracking
           │                                   │
           └──────────┬────────────────────────┘
                      ▼
              Phase 3  Ordenes de Compra + Recepcion
                      │
                      ▼
              Phase 4  Cadena Diaria (FAI->FCI->FID->FAF->FOP)
                      │
                      ▼
              Phase 5  AMD (6 Pestanas + SHA-256)
                      │
                      ▼
              Phase 6  7 Candados
                      │
                      ▼
              Phase 7  V2 + V3 (Escala)
```

Phase 1 y Phase 2 pueden desarrollarse en paralelo. A partir de Phase 3, cada fase depende de las anteriores.
