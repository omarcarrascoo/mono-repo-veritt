# Inventory Costing — Lotes, FIFO y costo de referencia

> **Estado:** Doc vivo. Especificacion del refactor en curso para tener costos por lote correctos antes de arrancar el AMD (Phase 5).

## 1. Por que existe este documento

Hoy hay tres niveles de informacion de costo conviviendo en el sistema y no estan claramente delimitados. El resultado es que algunos consumidores leen costo de un agregado mutable cuando deberian leer costo de los lotes activos. Antes de generar el AMD — que captura un snapshot inmutable del estado del dia — la logica de costos tiene que estar pulida y documentada.

Este documento define:

- Que campo es la fuente de verdad para que pregunta de costo
- Como se calcula cada uno
- Quien lee cada uno y por que
- Las invariantes que el sistema debe mantener

---

## 2. Modelo de datos relevante

```
Material
├── currentStock                  Decimal — agregado de movements (cache)
├── currentReferenceUnitCost      Decimal — promedio ponderado de lotes abiertos (cache, para reportes y recetas)
└── lots: MaterialLot[]

MaterialLot
├── unitCost                      Decimal — INMUTABLE, costo del lote al recibirse
├── totalCost                     Decimal — INMUTABLE, unitCost * originalQuantity
├── originalQuantity              Decimal — INMUTABLE
├── remainingQuantity             Decimal — MUTABLE, baja con cada consumo
├── locationId                    String — FK a InventoryLocation
└── receivedAt                    DateTime — define el orden FIFO

MaterialStockMovement
├── unitCostSnapshot              Decimal — INMUTABLE, costo unitario efectivo del movimiento
├── totalCostSnapshot             Decimal — INMUTABLE, total del movimiento
├── balanceAfter                  Decimal — INMUTABLE, balance del material en su ubicacion al cierre del movimiento
└── allocations: MaterialLotAllocation[]

MaterialLotAllocation
├── lotId                         FK al lote consumido
├── movementId                    FK al movimiento que lo consumio
├── quantity                      Decimal — INMUTABLE, cuanto del lote se uso
├── unitCostSnapshot              Decimal — INMUTABLE, copia del lote.unitCost
└── totalCostSnapshot             Decimal — INMUTABLE, quantity * unitCost
```

### Que es inmutable, que es cache

| Campo | Naturaleza | Quien escribe |
|---|---|---|
| `MaterialLot.unitCost`, `totalCost`, `originalQuantity`, `receivedAt` | **Inmutable** una vez creado | Solo se setea al recibirse el lote |
| `MaterialLot.remainingQuantity` | Mutable, decreciente | Solo `LotCostingService.consume()` |
| `MaterialStockMovement.*Snapshot` | **Inmutable** una vez creado | Solo `LotCostingService.consume()` |
| `MaterialLotAllocation.*` | **Inmutable** una vez creado | Solo `LotCostingService.consume()` |
| `Material.currentStock` | **Cache** del balance agregado | `LotCostingService` despues de cada movimiento |
| `Material.currentReferenceUnitCost` | **Cache** del promedio ponderado | `LotCostingService.refreshReferenceCost()` |

> **Invariante operativa:** ningun otro servicio que no sea `LotCostingService` puede mutar `MaterialLot.remainingQuantity`, `Material.currentStock` o `Material.currentReferenceUnitCost`. Receipts, sales y daily-chain delegan al servicio.

---

## 3. Las cuatro preguntas de costo

Cada pregunta tiene una respuesta canonica. Si un caller no sabe cual usar, este es el arbol de decision.

### Pregunta A — "¿Cuanto vale el material que tengo en almacen ahora mismo?"

**Para reportes, P2 del AMD, valor de inventario, listas administrativas.**

Respuesta: **Suma de `MaterialLot.remainingQuantity * MaterialLot.unitCost`** sobre todos los lotes con `remainingQuantity > 0`.

Metodo:
```typescript
LotCostingService.getMaterialInventoryValue(tx, materialId): {
  totalQuantity: number;
  totalValueAtCost: number;
  byLot: Array<{ lotId, remaining, unitCost, subtotal, locationId, receivedAt }>;
}
```

> Se valua a costo historico, no a costo de reposicion. Es lo correcto contablemente y lo que el AMD necesita guardar como snapshot.

### Pregunta B — "¿A que costo voy a consumir N unidades AHORA en esta ubicacion?"

**Para snapshots de venta, valuar varianza FAI, valuar consumo del dia (FID/FCI).**

Respuesta: **simulacion FIFO** sobre los lotes abiertos de esa ubicacion ordenados por `receivedAt ASC`. Se devuelve un quote sin mutar nada.

Metodo:
```typescript
LotCostingService.quoteFifoConsumption(tx, materialId, qty, locationId): {
  totalCost: number;
  unitCost: number;          // weighted avg de la cantidad pedida
  layers: Array<{ lotId, quantity, unitCost, totalCost }>;
  shortfall: number;         // qty que no se puede cubrir con lotes activos
}
```

**Si `shortfall > 0`** y el caller esta consumiendo de verdad (no solo cotizando) → **bloquear con `BadRequestException`**. Decision arquitectonica: oversell prohibido.

### Pregunta C — "¿Cuanto cuesta una unidad teorica para mi receta o estimacion comercial?"

**Para recetas, costos a priori, alertas de margen, comparativos.**

Respuesta: **promedio ponderado de lotes abiertos** = `Material.currentReferenceUnitCost`.

Es una estimacion. Cambia con cada recepcion. No es la verdad operacional del consumo real — solo una referencia agregada para que las recetas tengan un costo base estable.

Metodo:
```typescript
LotCostingService.getReferenceUnitCost(tx, materialId): number
// Equivale a leer Material.currentReferenceUnitCost
```

Tambien se expone:
```typescript
LotCostingService.refreshReferenceCost(tx, materialId): Promise<void>
// Recalcula y persiste. Llamar despues de cualquier mutacion de lotes.
```

### Pregunta D — "¿Cuanto costo el consumo real de este material durante el dia X?"

**Para el FID (desviacion en pesos), para la P2 del AMD (costo de ventas real).**

Respuesta: **suma de `MaterialLotAllocation.totalCostSnapshot`** de todas las allocations creadas dentro del rango operacional, dividida entre la suma de `quantity` para sacar el costo unitario promedio del consumo real.

Metodo:
```typescript
LotCostingService.getRealConsumptionCost(tx, materialId, range): {
  totalQuantity: number;
  totalCost: number;
  weightedUnitCost: number;
}
```

> Es la unica respuesta que refleja **lo que realmente paso**: que lotes fueron tocados ese dia, en que cantidades, a que costos congelados. Es lo que el AMD debe guardar para auditoria.

---

## 4. Tabla de uso por consumidor

Esta es la tabla canonica. Cualquier nuevo lugar que necesite preguntar costo debe encontrar su respuesta aqui.

| Consumidor | Pregunta | Metodo |
|---|---|---|
| `inventory.receiveMaterialLot` | Crear lote, refrescar promedio | `consume`/`refreshReferenceCost` |
| `inventory.consumeMaterialStock` | Consumir N de ubicacion L | `consume` (interno) |
| `inventory.adjustMaterialStock` (`OUT`) | Ajuste hacia abajo | `consume` |
| `inventory.transferMaterialStock` | Mover entre ubicaciones | `consume` en origen + `receiveLot` virtual en destino con costo del lote consumido |
| `inventory.receiveProductLot` (productos directos) | Costo material para producir lote | `getReferenceUnitCost` (es estimacion de receta, no consumo) |
| `inventory.createProductionBatch` | Producir desde recetas | `consume` por cada material de la receta |
| `inventory.createProductRecipeVersion` | Costear receta a priori | `getReferenceUnitCost` (D — estimacion) |
| `sales.create` | Snapshot teorico del costo de material por receta | `getReferenceUnitCost` (la venta NO consume material fisico — eso ocurre en produccion o FCI) |
| `daily-chain.createOpening` (FAI) | Valuar varianza fisica | `quoteFifoConsumption` — varianza es lo que "habria salido" en FIFO |
| `daily-chain.authorizeClosing` (FCI/FID) | Valuar desviacion del dia | `getRealConsumptionCost` (D) — refleja lotes consumidos reales |
| `daily-chain.computeFopValidations` | Validar inventario en pesos | `getMaterialInventoryValue` (A) |
| `amd.generate` (Phase 5, P2) | Snapshot del valor de inventario | `getMaterialInventoryValue` (A) |
| `amd.generate` (Phase 5, P2) | Snapshot del costo de ventas del dia | `getRealConsumptionCost` (D) |

---

## 5. Reglas estrictas

### R1 — `consumeMaterialStock` debe bloquear oversell

Si la suma de `remainingQuantity` de los lotes activos en la ubicacion no cubre la cantidad pedida:

```typescript
throw new BadRequestException(
  `Stock insuficiente en ${locationName} para ${materialName}: faltan ${shortfall} ${baseUnit}`,
);
```

No se "consume del aire" con `currentReferenceUnitCost`. Si el negocio necesita registrar consumo sin lote, debe primero registrar un lote de ajuste con costo declarado.

### R2 — `locationId` es obligatorio en consumo y cotizacion

`quoteFifoConsumption` y `consume` siempre reciben `locationId` explicito. Esto significa que `daily-chain.service.ts:142` (FAI varianza) debe pasar `opening.locationId`, y `sales.service.ts` debe pasar `defaultLocationId` del business o `sale.areaId.linkedLocationId`.

`getReferenceUnitCost` y `getMaterialInventoryValue` (preguntas C y A) operan a nivel de material — no requieren `locationId`.

### R3 — Snapshots inmutables siempre

Cualquier movimiento, allocation o snapshot que se cree no se puede actualizar. Si un consumo fue mal capturado, se corrige con un nuevo movimiento (reverse + new), nunca con `UPDATE` al original.

### R4 — Solo `LotCostingService` muta caches

`Material.currentStock` y `Material.currentReferenceUnitCost` son caches calculadas. Solo el servicio puede tocarlas. Si un caller necesita ese valor, lo lee del campo del Material o llama a un metodo del servicio — no recalcula su propia version.

### R5 — Drift detection antes de cerrar

Antes de generar un AMD, el sistema debe poder verificar que el cache no diverge de la verdad:

```typescript
LotCostingService.detectDrift(businessId): Promise<Drift[]>
// Para cada material:
//   sumLots[location] = SUM(MaterialLot.remainingQuantity) GROUP BY locationId
//   sumMovements[location] = SUM(MaterialStockMovement.quantityDelta) GROUP BY locationId
//   if abs(sumLots - sumMovements) > 0.005 → drift
```

Endpoint admin: `GET /businesses/:id/inventory/drift`. Si hay drift detectado, el AMD no se genera.

---

## 6. Migracion de codigo existente

Lista exhaustiva de cambios. Cada item documenta el antes y despues.

### 6.1 `inventory/inventory.service.ts:299` `refreshMaterialReferenceCost`
- **Hoy:** privado, lee y escribe directo. No filtra por ubicacion.
- **Cambio:** se mueve a `LotCostingService.refreshReferenceCost`. Sigue siendo agregado global del material (no por ubicacion) — esto esta bien para el cache de C.
- **Bug actual:** si todos los lotes estan vacios (`totalQuantity <= 0`) retorna `material.currentReferenceUnitCost` viejo en vez de hacer 0 o mantener el ultimo conocido. Decision: **mantener el ultimo conocido**. Cuando un material se queda sin stock, el ultimo costo conocido es la mejor estimacion para la siguiente recepcion.

### 6.2 `inventory/inventory.service.ts:299-338` (consumer del fallback)
- **Hoy:** lineas 625-633 inventan un layer con `fallbackUnitCost = material.currentReferenceUnitCost`.
- **Cambio:** eliminar ese bloque. Si `remaining > 0` despues de iterar lotes → throw oversell.

### 6.3 `sales/sales.service.ts:132` snapshot de costo
- **Hoy:** `unitCost: toNumber(ri.material.currentReferenceUnitCost)` — promedio.
- **Cambio:** **ninguno funcional**. La venta NO consume material fisicamente — eso ocurre en `createProductionBatch`/`adjust`/`transfer`, o se mide retroactivamente con el FCI. Por eso el snapshot que va a `TheoreticalConsumption` debe ser el promedio agregado del momento (Pregunta C). El consumo real del material lo registra el FID al cerrar el dia con `getRealConsumptionCost` (Pregunta D).
- Solo se agrega comentario explicativo para que el siguiente desarrollador no se confunda y "corrija" a FIFO.

### 6.4 `daily-chain/daily-chain.service.ts:142` (FAI varianza)
- **Hoy:** `varianceValueMXN = variance * mat.currentReferenceUnitCost`
- **Cambio:** `varianceValueMXN = variance * lotCostingService.getFifoFloor(materialId, opening.locationId)`. Si la varianza es negativa (faltante), valuar al lote mas viejo abierto es el peor caso operativo defendible.
- Si no hay lotes en esa ubicacion, fallback a `getReferenceUnitCost` (C).

### 6.5 `daily-chain/daily-chain.service.ts:302` (FID desviacion)
- **Hoy:** `costMap` con `currentReferenceUnitCost` por material.
- **Cambio:** llamar `lotCostingService.getRealConsumptionCost(materialId, range)` por cada material. Si retorna `weightedUnitCost > 0`, usar ese. Si no hubo allocations en el dia (caso raro), fallback a promedio del momento.

### 6.6 `receipts/receipts.service.ts:196,404,575` calculo manual del refCost
- **Hoy:** cada uno reimplementa promedio ponderado con su propia formula.
- **Cambio:** despues de crear/cancelar/modificar el lote, llamar `lotCostingService.refreshReferenceCost(tx, materialId)`. Una sola fuente.

### 6.7 `inventory/inventory.service.ts:1167,1470` (recetas)
- **Hoy:** lee `currentReferenceUnitCost` para costear receta.
- **Cambio:** ninguno funcional. Es pregunta C — el promedio agregado es lo correcto. Solo se reemplaza la lectura directa por `lotCostingService.getReferenceUnitCost(materialId)` para mantener UNA puerta de entrada.

---

## 7. Plan de tests

### 7.1 Helpers puros (`lot-costing.helpers.ts`)
- `weightedAverage([])` → `0`
- `weightedAverage([{q:10,c:30},{q:10,c:50}])` → `40`
- `quoteFifoConsumption(lots, qty)`:
  - Pedir 0 → quote vacio
  - Pedir menos que el primer lote → todo del primero, shortfall 0
  - Pedir entre dos lotes → mix correcto
  - Pedir mas que disponible → `shortfall = qty - sum(lots.remaining)`
  - Lots desordenados de input → resultado igual al ordenado por `receivedAt`

### 7.2 Service (`lot-costing.service.ts`)
- Recibir lote A 10 unidades a $30 → ref cost = 30
- Recibir lote B 10 a $50 → ref cost = 40
- Consumir 5 → debe bajar lote A a 5, ref cost = round((5*30 + 10*50)/15) = $43.33
- Consumir otros 8 → 5 de A + 3 de B, ref cost = round(7*50/7) = $50
- Tratar de consumir 100 cuando hay 7 → throw `BadRequestException`

### 7.3 Integracion FIFO real
- Vender producto con receta de 2kg material:
  - Stock inicial: lote A 1kg a $30, lote B 5kg a $50
  - Sale items snapshot debe tener `unitCost` = round((1*30+1*50)/2) = $40
  - Despues del consumo, lote A debe estar en 0, lote B en 4kg
  - `MaterialLotAllocation` debe tener 2 rows: 1kg/$30 del lote A, 1kg/$50 del lote B

### 7.4 FID con allocations reales
- Apertura 10kg, recepcion 5kg, cierre fisico 3kg → consumo real 12kg
- Si las allocations del dia suman 11kg de lote A ($30) y 1kg de lote B ($50) → totalCost = $380, weightedUnitCost = 31.67
- `deviationValueMXN` del FID debe valuar la merma extra (12 - teorico) a $31.67/kg, no al promedio post-recepcion

### 7.5 Drift
- Insertar manualmente un `MaterialStockMovement` sin tocar lotes → `detectDrift` reporta el material
- Despues de fix, drift = 0

### 7.6 AMD reproducibilidad
- Generar AMD del dia 1 con `inventoryAtCost = 5000`
- Recibir lotes nuevos al dia siguiente
- Re-leer (verify) AMD del dia 1 → `inventoryAtCost` sigue siendo 5000 porque vive en `contentJson`, no recalculado

---

## 8. Endpoints expuestos (capa nueva)

```
GET  /businesses/:id/inventory/materials/:materialId/cost-quote?qty=&locationId=
     → Pregunta B en JSON (CostQuote). Para UIs que necesiten previsualizar costo.

GET  /businesses/:id/inventory/materials/:materialId/value
     → Pregunta A. Detalle por lote.

GET  /businesses/:id/inventory/value-summary
     → Pregunta A agregada por business. Lo que P2 del AMD usa.

GET  /businesses/:id/inventory/drift
     → Health-check para admins. Lista de materiales con drift > epsilon.
```

Las preguntas C y D viven internas al backend — no se exponen como endpoints porque son consumo de servicios, no de UIs.

---

## 9. Que cambia en el cliente movil

Nada en este sprint. La capa nueva es 100% backend. Las UIs siguen mostrando `currentReferenceUnitCost` donde lo muestren hoy (lista de materiales, detalle del material). Lo que se corrige es:

- El costo que el FAI muestra como "valor de la varianza"
- El costo que el FID muestra como "valor de la desviacion"
- El snapshot que las ventas guardan internamente

Todo ya esta cableado desde el backend — el cliente lo recibe en los DTOs.

Cuando se construya el AMD (siguiente sprint), la UI consumira el `contentJson` directamente y los valores vendran ya resueltos en la pestana 2.

---

## 10. Orden de implementacion

```
1. lot-costing.helpers.ts + tests unitarios
       ↓
2. LotCostingService (read-only methods: getOpenLots, weightedAverage, getFifoFloor, quoteFifoConsumption, getMaterialInventoryValue, getRealConsumptionCost, getReferenceUnitCost)
       ↓
3. LotCostingService (mutators: consume, refreshReferenceCost, detectDrift)
       ↓
4. inventory.service.ts: consumir LotCostingService en consumeMaterialStock + bloquear oversell
       ↓
5. receipts.service.ts: delegar refreshReferenceCost al servicio (eliminar 3 calculos manuales)
       ↓
6. sales.service.ts:132: cambiar snapshot a quoteFifoConsumption
       ↓
7. daily-chain.service.ts:142 (FAI): cambiar a getFifoFloor
       ↓
8. daily-chain.service.ts:302 (FID): cambiar a getRealConsumptionCost
       ↓
9. Endpoints admin (drift detection + value endpoints)
       ↓
10. AMD Sprint 1 (Phase 5) — usa esto como cimientos
```

Pasos 1-9 no rompen nada externo: las UIs siguen funcionando, los datos historicos no cambian, los tests existentes (si los hay) siguen pasando o se ajustan a la nueva semantica.

Paso 10 ya parte de costos correctos.

---

## 11. Decisiones cerradas

| # | Decision | Fecha |
|---|---|---|
| 1 | Hash del AMD se calcula sobre JSON canonico (RFC 8785 / JCS) | 2026-05-07 |
| 2 | Si la generacion del AMD falla → la firma del FOP se revierte (rollback completo) | 2026-05-07 |
| 3 | El AMD guarda snapshot completo en contentJson — sin FKs para datos clave | 2026-05-07 |
| 4 | Valor de inventario se calcula con FIFO sobre lotes activos (Pregunta A) | 2026-05-07 |
| 5 | Oversell prohibido — `consumeMaterialStock` lanza BadRequestException si shortfall > 0 | 2026-05-07 |
| 6 | `locationId` obligatorio en `consume` y `quoteFifoConsumption` | 2026-05-07 |

---

## 12. Estado de implementacion

| # | Paso | Status |
|---|---|---|
| 1 | `lot-costing.helpers.ts` + tests unitarios (22 tests, todos verdes) | ✅ |
| 2 | `LotCostingService` (read-only + mutadores + drift detection) | ✅ |
| 3 | `inventory.service.ts:consumeMaterialStock` — bloquear oversell | ✅ |
| 4 | `inventory.service.ts:refreshMaterialReferenceCost` — delegar a LotCostingService | ✅ |
| 5 | `receipts.service.ts` — eliminar 3 calculos manuales, delegar al servicio | ✅ |
| 6 | `sales.service.ts:132` — comentario explicativo. La venta NO consume material fisico | ✅ |
| 7 | `daily-chain.service.ts:142` (FAI varianza) — `getFifoFloor` con locationId | ✅ |
| 8 | `daily-chain.service.ts:302` (FID desviacion) — `getRealConsumptionCost` con range | ✅ |
| 9 | Endpoints admin (drift detection + value endpoints + cost-quote) | ✅ |
| 10 | AMD Sprint 1 (Phase 5) — modelo + canonicalizer + builder 6 pestanas + trigger en signFOP + verify + mobile | ✅ |

---

## 13. Glosario

- **FIFO**: First In, First Out — los lotes mas antiguos se consumen primero.
- **Lote activo / abierto**: lote con `remainingQuantity > 0`.
- **Allocation**: registro inmutable que dice "el movimiento M consumio Q unidades del lote L a costo X".
- **Snapshot**: copia inmutable de un valor en un momento dado, guardado para auditoria.
- **Drift**: diferencia entre `Material.currentStock` (cache) y la suma real de lotes/movements.
- **Quote**: simulacion de un consumo sin mutar — devuelve cuanto costaria.
- **FIFO floor**: el `unitCost` del lote abierto mas antiguo (el que se consumiria primero).
