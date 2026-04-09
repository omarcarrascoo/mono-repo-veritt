# Gap Analysis: Codigo Actual vs Arquitectura V.3

> Fecha: 2026-04-08 (actualizado)
> Analisis comparando el codigo existente (42 modelos Prisma, 20 modulos NestJS, 100+ endpoints, app mobile con 30+ pantallas) contra ROADMAP.md y ARCHITECTURE_V3.md.

---

## Resumen Ejecutivo

```
Fundacion (auth, negocios, staff, inventario)  ██████████ LISTO
Phase 1: Areas, Procesos, Time Tracking         ██████████ LISTO
Phase 2: Ventas, POS, Revenue Tracking           ██████████ LISTO
Backfills (B1-B4)                                ████████░░ LISTO (B2 diferido)
Phase 3: Ordenes de Compra y Recepcion (Backend) ██████████ LISTO
Phase 3: Ordenes de Compra (Mobile)              ██████████ LISTO
Phase 4: Cadena Diaria (FAI-FCI-FID-FAF-FOP)    ░░░░░░░░░░ NO INICIADO
Phase 5: AMD (6 Pestanas + SHA-256)              ░░░░░░░░░░ NO INICIADO
Phase 6: 7 Candados                              ░░░░░░░░░░ NO INICIADO
Phase 7: V2 y V3 (Escala)                        ░░░░░░░░░░ NO INICIADO
```

---

## FASE 1 — Entidades Universales (CONSTRUIDO)

### 1.1 Areas Module — LISTO
| Requerimiento V.3 | Estado | Detalle |
|---|---|---|
| Modelo `Area` con businessId, name, type, status | LISTO | Modelo existe con enums AreaType, AreaStatus |
| Jerarquia (parentAreaId) | LISTO | Campo `parentAreaId` existe en schema |
| Relacion InventoryLocation -> Area | LISTO | `linkLocationToArea` endpoint existe |
| CRUD + API completo | LISTO | Controller con GET/POST/PATCH + link-location |
| Mobile screens | LISTO | List, detail, create screens en app |

**Gaps:** Ninguno critico.

### 1.2 Processes Module — LISTO
| Requerimiento V.3 | Estado | Detalle |
|---|---|---|
| ProcessTemplate con pasos ordenados | LISTO | ProcessTemplate + ProcessStep con `order` |
| ProcessExecution con tracking | LISTO | Start/complete execution endpoints |
| isBlocking (para FOP) | LISTO | Campo `isBlocking` en ProcessTemplate |
| Roles por paso | LISTO | `requiredRole` en ProcessStep |
| Area asignada por paso | LISTO | `assignedAreaId` en ProcessStep |
| Mobile screens | LISTO | List, detail, create + execution tracking |

**Gaps:** Ninguno critico. El campo `isBlocking` sera clave para Phase 4 (FOP).

### 1.3 Time Tracking — LISTO
| Requerimiento V.3 | Estado | Detalle |
|---|---|---|
| ShiftLog con clock in/out | LISTO | Modelo completo con timestamps |
| Geolocalizacion | LISTO | clockInLat/Lng, clockOutLat/Lng |
| ShiftBreak con tipos | LISTO | MEAL, REST, OTHER |
| totalMinutes calculado | LISTO | Campo en modelo |
| Mobile screens | LISTO | Shift list + clock-in/out screen |

**Gaps:** Ninguno critico. Base solida para Candado 5 (Nomina vs Log in/Log out).

### 1.4 Role-Based Access por Area — LISTO (infraestructura)
| Requerimiento V.3 | Estado | Detalle |
|---|---|---|
| Modelo RolePermission | LISTO | Existe en schema con businessId, role, areaId, processId, permission |
| Enum PermissionAction | LISTO | READ, EXECUTE, APPROVE, MANAGE |
| `@RequirePermission` decorator | LISTO | `src/common/decorators/require-permission.decorator.ts` |
| `PermissionGuard` | LISTO | `src/common/guards/permission.guard.ts` — consulta RolePermission, OWNER/VERITT_STAFF bypasean |
| "Log in habilita modulos por rol" en mobile | PENDIENTE | La app mobile no filtra modulos por permisos aun |
| Aplicar guards a endpoints existentes | PENDIENTE | Guard creado pero no aplicado — se activara en Phase 4 |

---

## FASE 2 — Ventas y POS (CONSTRUIDO)

### 2.1 Sales Module — LISTO
| Requerimiento V.3 | Estado | Detalle |
|---|---|---|
| Sale con status, operator, area | LISTO | Modelo completo |
| SaleItem con recipeVersionId snapshot | LISTO | Snapshot de receta al momento de venta |
| Cancelacion con razon y usuario | LISTO | cancelledByUserId, cancellationReason |
| **Stock reversal al cancelar** | **LISTO** | **Transaction: crea RETURN movements, incrementa stock, elimina TheoreticalConsumption** |
| Sale number auto-incremento | LISTO | getNextSaleNumber() en transaction |
| Mobile: crear, listar, detalle, cancelar | LISTO | 4 screens + analytics |

### 2.2 Motor de Consumo Teorico — LISTO
| Requerimiento V.3 | Estado | Detalle |
|---|---|---|
| TheoreticalConsumption por sale | LISTO | Se genera automaticamente al crear venta |
| Vinculo a recipeVersionId | LISTO | Trazabilidad completa |
| Calculo con waste percent | LISTO | `expectedQuantity = qty * recipeQty * (1 + waste/100)` |
| API para consultar consumo | LISTO | `GET /sales/theoretical-consumption` con rango de fechas |
| Descuento de stock de producto | LISTO | ProductStockMovement tipo SALE creado en transaction |

### 2.3 Metodos de Pago — LISTO
| Requerimiento V.3 | Estado | Detalle |
|---|---|---|
| PaymentMethod configurable | LISTO | CASH, CARD_TERMINAL, BANK_TRANSFER, OTHER |
| SalePayment por venta | LISTO | Multiple pagos por venta |
| Validacion: suma pagos = total | LISTO | En sales.service.ts create() |
| Mobile screens | LISTO | List + CRUD de metodos de pago |

### 2.4 Revenue Tracking — LISTO
| Requerimiento V.3 | Estado | Detalle |
|---|---|---|
| Daily summary (ingreso, COGS, margen) | LISTO | `GET /sales/daily-summary` |
| Period summary con desglose diario | LISTO | `GET /sales/period-summary` |
| Revenue por producto | LISTO | `GET /sales/product-revenue` |
| Desglose por metodo de pago | LISTO | En daily y period summary |
| Desglose por area | LISTO | En daily y period summary |
| Mobile analytics screen | LISTO | analytics.tsx con graficas |

**Gaps restantes en Phase 2:**
- Punto de equilibrio diario: no calculado (necesita costos fijos que no existen como modelo)

---

## FASE 3 — Ordenes de Compra y Recepcion (LISTO end-to-end)

### 3.1 Suppliers — LISTO
| Requerimiento V.3 | Estado | Detalle |
|---|---|---|
| Modelo `Supplier` | LISTO | Con name, contactName, email, phone, rfc, address, status |
| CRUD endpoints | LISTO | GET/POST/PATCH en `src/suppliers/` |
| Filtro por status | LISTO | Query param en GET |
| Mobile: types + api + screens | LISTO | `types/supplier.types.ts`, `api/modules/suppliers.api.ts`, 3 screens (list, create, detail) |

### 3.2 Purchase Orders — LISTO
| Requerimiento V.3 | Estado | Detalle |
|---|---|---|
| Modelos `PurchaseOrder`, `PurchaseOrderItem` | LISTO | Con orderNumber auto-incremento, nested items |
| Status flow (DRAFT->SENT->RECEIVED) | LISTO | send + cancel endpoints |
| Validacion de supplier y materiales | LISTO | En service |
| Calculo de totalEstimated | LISTO | Auto-calculado de items |
| Mobile: types + api + screens | LISTO | `types/purchase-order.types.ts`, `api/modules/purchase-orders.api.ts`, 3 screens (list, create con items dinamicos, detail con acciones send/cancel) |

### 3.3 Receipts — LISTO
| Requerimiento V.3 | Estado | Detalle |
|---|---|---|
| Modelos `Receipt`, `ReceiptItem` | LISTO | Vinculados a PO, location, user |
| **Separacion de responsabilidades** | **LISTO** | **`receivedByUserId != purchaseOrder.createdByUserId` enforced en service** |
| Crea MaterialLot + StockMovement | LISTO | Por cada item, con weighted average cost update |
| Auto-actualiza PO status | LISTO | PARTIALLY_RECEIVED o RECEIVED segun recibido vs ordenado |
| **Alerta de precio >10%** | **LISTO** | **Crea Notification via upsertNotification cuando costo sube** |
| Mobile: types + api + screens | LISTO | `types/receipt.types.ts`, `api/modules/receipts.api.ts`, 3 screens (list, create con PO/location/items, detail con costo total) |

### 3.4 Supplier Invoices — LISTO
| Requerimiento V.3 | Estado | Detalle |
|---|---|---|
| Modelo `SupplierInvoice` | LISTO | Con cfdiUuid, cfdiXml, vinculo a receipt |
| CRUD endpoints | LISTO | GET/POST/PATCH en `src/supplier-invoices/` |
| Status tracking (PENDING, VERIFIED, DISPUTED) | LISTO | En dto y modelo |
| Mobile: types + api + screens | LISTO | `types/supplier-invoice.types.ts`, `api/modules/supplier-invoices.api.ts`, 3 screens (list, create con vinculo a receipt, detail) |

**Schema migrado:** 8 modelos nuevos + 4 enums — migration `add_supply_chain_phase3` aplicada.
**Mobile completo:** 4 types, 4 API modules, 12 screens — todo end-to-end.

---

## FASE 4 — Cadena Diaria FAI-FCI-FID-FAF-FOP (NO INICIADO)

El corazon de V.3. Nada de esto existe en codigo.

| Formato | Modelos Necesarios | Logica Clave |
|---|---|---|
| 4.1 FAI | `DailyInventoryOpening`, `DailyInventoryOpeningItem` | Conteo fisico, comparar vs FCI anterior, BLOQUEAR todo sin FAI |
| 4.2 FCI | `DailyInventoryClosing`, `DailyInventoryClosingItem` | Conteo fisico final, consumo real = FAI + recepciones - FCI |
| 4.3 FID | `DailyDeviationReport`, `DeviationItem` | Teorico vs real, clasificacion obligatoria de causa |
| 4.4 FAF | `DailyCashReconciliation`, `CashDenominationCount`, `TerminalReconciliation`, `TransferReconciliation` | Arqueo por denominacion, tolerancia CERO |
| 4.5 FOP | `DailyOperationClose`, `FOPValidationItem` | Conciliacion cruzada, firma genera AMD |

**Prerequisitos de Phase 3:** Receipts (LISTO), Invoices (LISTO)
**Prerequisitos de Phase 1-2:** Todo listo (Areas, Processes, Sales, TheoreticalConsumption)
**Todos los prerequisitos cumplidos.**

**Concepto arquitectonico critico:** Necesita un `OperationalDayService` que maneje el estado del dia (CLOSED -> FAI_PENDING -> OPEN -> FCI_PENDING -> CLOSING -> CLOSED) y bloquee operaciones segun el estado.

**Estimacion: ~12 modelos nuevos, 1 servicio orquestador, ~20 endpoints**

---

## FASE 5 — AMD (NO INICIADO)

| Componente | Descripcion |
|---|---|
| `DailyMasterArchive` | Documento JSON inmutable + SHA-256 hash |
| Pestana 1 | Resumen humano (derivado de sales + payroll summaries) |
| Pestana 2 | Estado de Resultados, Balance, Flujo de Efectivo |
| Pestana 3 | Detalle operativo (todos los formatos expandidos) |
| Pestana 4 | Alertas de optimizacion (configurable por negocio) |
| Pestana 5 | Trazabilidad fiscal (CFDIs vinculados) |
| Pestana 6 | Rendimiento por usuario (ShiftLog + acciones + ventas) |

**Prerequisitos:** Phase 4 completa (el FOP genera el AMD)

---

## FASE 6 — 7 Candados (NO INICIADO)

| Candado | Prerequisitos | Estado prereqs |
|---|---|---|
| C1 Inventario vs Ventas | TheoreticalConsumption + FCI | TheoreticalConsumption LISTO, FCI pendiente (Phase 4) |
| C2 Ventas vs Caja | Sales + FAF | Sales LISTO, FAF pendiente (Phase 4) |
| C3 Recepciones vs Ordenes | PO + Receipts + Invoices | **TODOS LISTOS (Phase 3)** |
| C4 Costos vs Estado de Resultados | Recipes + AMD P2 | Recipes LISTO, AMD pendiente (Phase 5) |
| C5 Nomina vs Log in/Log out | ShiftLog + Payroll | **TODOS LISTOS** |
| C6 AMD vs Tiempo | AMD + SHA-256 | Pendiente (Phase 5) |
| C7 Sistema vs Si mismo | FOP | Pendiente (Phase 4) |

**Nota:** C3 y C5 podrian implementarse como validaciones independientes ya, antes de Phase 4.

---

## BACKFILLS — Estado actual

### B1. Stock Reversal al Cancelar Venta — COMPLETADO
**Archivo:** `monkeys-api/src/sales/sales.service.ts` — `cancel()`
- Transaction que crea ProductStockMovement tipo RETURN (+qty), incrementa product.currentStock, elimina TheoreticalConsumption, actualiza sale status

### B2. Inventory Repository Extraction — DIFERIDO
**Archivo:** `monkeys-api/src/inventory/inventory.service.ts` (~1800 lineas)
- Refactor grande, no bloquea nada. Se hara incrementalmente cuando se toque inventory.

### B3. RBAC Guard Funcional — COMPLETADO (infraestructura)
- `@RequirePermission` decorator en `src/common/decorators/require-permission.decorator.ts`
- `PermissionGuard` en `src/common/guards/permission.guard.ts`
- OWNER y VERITT_STAFF bypasean automaticamente
- **No aplicado a endpoints aun** — se activara en Phase 4

### B4. Prisma Migration — COMPLETADO
- Indexes de PayrollPayment y StaffProfile ya estaban migrados
- Migration Phase 3 ejecutada

---

## PROXIMO PASO — Que sigue

### ~~Opcion A: Mobile Phase 3~~ — COMPLETADO

20 archivos creados: 4 types + 4 API modules + 12 screens (list/create/detail para Suppliers, Purchase Orders, Receipts, Supplier Invoices). Phase 3 cerrada end-to-end.

### Opcion B: Phase 4 Backend (avanzar la arquitectura core)

Iniciar la cadena diaria (FAI-FCI-FID-FAF-FOP). Es el corazon diferenciador de V.3.

**Orden:**
```
4.0 OperationalDay (servicio orquestador + modelo de estado del dia)
    |
4.1 FAI — Apertura de Inventario (conteo fisico + autorizacion)
    |
4.2 FCI — Cierre de Inventario (conteo fisico final + consumo real)
    |
4.3 FID — Desviaciones (teorico vs real + clasificacion)
    |
4.4 FAF — Arqueo Financiero (tolerancia cero)
    |
4.5 FOP — Cierre Operativo (conciliacion cruzada + firma)
```

**Prerequisitos: TODOS CUMPLIDOS** (Phase 1, 2, 3 completo end-to-end)

### Opcion C: Candados tempranos (C3 + C5)

Implementar los 2 candados cuyos prerequisitos ya estan completos:
- **C3 (Recepciones vs Ordenes):** PO vs Receipt vs Invoice — separacion ya enforced
- **C5 (Nomina vs Shifts):** Horas reales de ShiftLog vs horas pagadas en Payroll

Esto valida la logica de candados antes de Phase 4-5.

### Recomendacion

**Opcion B** (Phase 4 backend) — la cadena diaria FAI-FCI-FID-FAF-FOP es el corazon de V.3 y todos los prerequisitos estan cumplidos.
