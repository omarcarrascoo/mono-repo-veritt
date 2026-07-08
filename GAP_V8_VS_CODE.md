# Gap — Visión V8.0 vs. Código real

> Comparación de [`VERITT_V8_VISION.md`](VERITT_V8_VISION.md) (la nueva visión) contra lo que existe
> hoy en el código, **verificado en disco** (schema Prisma, controllers, AMD builder, lot-costing).
> Objetivo: saber qué del V8.0 ya está, qué falta, y el tamaño del delta para replanear.
>
> Fecha: 2026-06-16. Leyenda: ✅ existe · 🔶 parcial · ❌ no existe.

---

## Veredicto en una línea

El V8.0 es **mucho más grande** que lo construido. La **cadena diaria, el AMD (6 pestañas), los lotes FEFO/FIFO y los 7 candados en su forma estructural ya existen** ✅🔶. Lo que **no existe** y representa el grueso del trabajo nuevo: el **motor financiero M1–M10 como motor explícito**, el **confidence scoring**, los **6 roles** (hoy son 5 y no están segmentados por pantalla), los **cortes de turno FCT/RCT**, y varios módulos (propinas, comida de personal, gastos extraordinarios, OC como entidad rica, FTI).

> Contexto importante: el V8.0 dice "reemplaza cualquier versión anterior". Pero **el código fue construido contra la visión V3**, no contra V8.0. Así que este gap también es, en parte, deuda de visión: cosas que V8.0 formaliza y que el código aún refleja en su forma V3.

---

## 1. Cadena de formatos

| V8.0 | Código | Estado | Nota |
|---|---|---|---|
| FAI → POS → FCI → FID → FAF → FOP → AMD | `daily-chain` con FAI/FCI/FID/FAF/FOP + `sales` + `amd` | 🔶 | La cadena existe y **funciona e2e** (probado). Pero el orden y semántica del V8.0 difieren (abajo). |
| **POS como eslabón formal de la cadena** | `sales` es módulo aparte, con `isDayOpen()` gateado por FAI | 🔶 | Funcionalmente equivalente; V8.0 lo formaliza dentro de la cadena. |
| **Reg. R5** (registros administrativos como formato) | no existe como formato | ❌ | Hoy suppliers/PO/receipts/invoices son módulos sueltos, no un "formato R5" que entre al FOP. |
| **Firma con PIN** en cada formato + co-firma R4 | firmas por `userId`, sin PIN/contraseña de confirmación | ❌ | Hoy la "firma" es la acción autenticada; falta el pop-up de confirmación con PIN. |
| FID = conciliación automática editable hasta FOP | FID auto-generado, clasificable, aprobado por manager | ✅ | Coincide casi exacto. |
| Saldo inicial de caja antes de la 1ª venta (C2) | **no existe** | ❌ | El FAF actual no parte de un saldo inicial declarado. Hueco real del candado C2. |

## 2. El AMD y sus 6 pestañas

| V8.0 | Código | Estado |
|---|---|---|
| AMD sellado SHA-256, inmutable, generado al firmar FOP | `amd` module, hash canónico (JCS), trigger en `signFOP` con rollback | ✅ **Construido y verificado.** |
| **P1** Resumen humano | `AMDP1Summary` | ✅ estructura |
| **P2** Estados financieros (ER, Balance, Flujo) | `AMDP2Financials`: incomeStatement + balanceSheetSnapshot + cashFlow | 🔶 **Sorpresa: ya existe** ER (con COGS material/MOD/CIF), Balance (con prestaciones devengadas) y Flujo. Pero son snapshots derivados, no el motor M1–M10. |
| **P3** Detalle operativo | `AMDP3Operational` | ✅ estructura |
| **P4** Alertas de optimización (R6 aprueba/rechaza/aguanta, se registra) | `AMDP4Alerts` | 🔶 estructura de alertas existe; el ciclo de decisión registrada de R6 no. |
| **P5** Trazabilidad fiscal + semáforo documental | `AMDP5Traceability` | 🔶 estructura existe; el semáforo de 4 indicadores y el vínculo CFDI completo, no. |
| **P6** Rendimiento por usuario (solo R6) | `AMDP6UserPerformance` | 🔶 estructura existe; control de acceso "solo R6" no (no hay rol R6 distinto). |

> **Hallazgo clave:** el AMD builder ya hace mucho más de lo que el roadmap V3 sugería — incluye un Estado de Resultados y Balance General reales como snapshot. El motor financiero del V8.0 **no parte de cero**: parte de estos snapshots.

## 3. Motor financiero M1–M10

| V8.0 | Código | Estado |
|---|---|---|
| M1 ventas/costos variables (CVTu por lote en tiempo real) | `sales` + `lot-costing` (FIFO, costo real por lote) | 🔶 La base de costeo por lote existe; falta el modelo M1 explícito (PVN, MC%, agregación). |
| M2 estado de producción | producción existe (`createProductionBatch`) | 🔶 sin reporte M2 formal |
| M3 estructura de costos MP/MOD/MODI/GIF | costo de material por lote ✅; **MOD/MODI/GIF no existen** | ❌ no hay nómina-a-costo, ni GIF, ni renta/luz/gas prorrateados |
| M4 prorrateo de costos fijos | **no existe** | ❌ no hay modelo de costos fijos |
| M5 punto de equilibrio + cobertura CxP | **no existe** | ❌ |
| M6 Estado de Resultados diario + MTD | snapshot en AMD P2 (diario); **sin acumulado MTD ni análisis V/H** | 🔶 |
| M7 Balance General diario | snapshot en AMD P2; **sin ecuación de validación ni provisión diaria formal** | 🔶 |
| M8 Flujo de Efectivo + proyección 30d | snapshot en AMD P2; **sin proyección** | 🔶 |
| M9 razones financieras + EBITDA + semáforo IMSS | **no existe** | ❌ |
| M10 estados E/C/V + indicador de madurez | **no existe** | ❌ — pieza central de adopción del V8.0, totalmente ausente |

**Resumen M1–M10:** ~20% existe (costeo por lote + snapshots financieros del AMD). **~80% es trabajo nuevo**, principalmente porque requiere modelar **costos fijos, nómina-a-costo (MOD), GIF, y el sistema de estados E/C/V**. Es el módulo más grande del V8.0.

## 4. Los 6 roles

| V8.0 | Código | Estado |
|---|---|---|
| R1 Inventario, R2 Caja, R3 POS, R4 Gerente, R5 Admin, R6 Dueño | enum `MembershipRole`: OWNER, ADMIN, SUPERVISOR, OPERATOR, VERITT_STAFF | ❌ **No mapean.** Hoy son 5 roles genéricos de permiso, no 6 posiciones en la cadena. |
| "No navegas, sigues un flujo" — pantalla por rol/momento | app móvil con navegación libre por módulos | ❌ El frontend no está organizado por rol-flujo. |
| Separación R2 no ve comandas; R3 superficie mínima; R5→R6 | RBAC **construido pero no aplicado** (0 controllers usan `@RequirePermission`) | ❌ La separación de funciones del V8.0 ni siquiera está enforced a nivel API. |
| Acceso de terceros (código invitación, marca de agua) | no existe | ❌ |
| Información societaria con unanimidad de R6 | no existe | ❌ |

> Este es el segundo gap más grande: el V8.0 redefine los roles como **el esqueleto de la experiencia**, y el código actual tiene un modelo de roles distinto y sin enforcement.

## 5. Inventario y lotes

| V8.0 | Código | Estado |
|---|---|---|
| Lotes con costo real, fecha entrada, vencimiento | `MaterialLot` con `unitCost`, `receivedAt`, `expiresAt` | ✅ |
| **FEFO** (por vencimiento) + FIFO desempate | `lot-costing` implementa **FIFO** por `receivedAt`; **no FEFO** | 🔶 falta priorizar por `expiresAt`. Existe el campo, falta la lógica. |
| Alertas de vencimiento | `expiresAt` existe; alertas no | ❌ |
| Clasificación ABC automática | no existe | ❌ |
| **FTI** (transformación interna) | no existe (producción ≠ FTI) | ❌ |
| Métricas visuales por rol | no existe (backend); el móvil tiene dashboards | 🔶 |
| Cuentas por Pagar con línea de tiempo 90d | no existe (hay supplier-invoices, sin CxP/calendario) | 🔶 |

## 6. Módulos nuevos del V8.0 (no existen)

| Módulo | Estado | Tamaño |
|---|---|---|
| **Confidence scoring** (Shadow Mode, score por rol, vector R2-R3, escalamiento, loop) | ❌ 0 código | Grande — módulo de analítica estadística completo |
| **FCT / RCT** (cortes de turno + hash encadenado al AMD) | ❌ | Medio — nuevos modelos + sellado |
| **Propinas y moje** | ❌ | Medio |
| **Comida de personal** (movimiento de inventario a gasto operativo) | ❌ | Pequeño-medio |
| **Gastos extraordinarios** (18 categorías, comprobante obligatorio) | ❌ | Medio |
| **OC como entidad rica** (perfil estadístico por proveedor, C3 con clasificación auto) | 🔶 existe `PurchaseOrder` simple | Medio |
| **Módulo de inteligencia de horarios** (ROI, restricciones) | ❌ | Grande |
| **Onboarding contextual** (notas reactivas in-app) | ❌ | Medio (frontend) |
| **API de salida / código de invitación / multi-R6 / societario** | ❌ | Grande (V2 según el doc) |

## 7. Escala V1–V4

| V8.0 | Estado |
|---|---|
| V1 negocio individual | 🔶 en construcción (es donde estamos) |
| V2 multi-ubicación, V3 red, V4 Red Veritt + WorkPass | ❌ no iniciado (consistente con el roadmap) |

---

## Síntesis para replanear

**Lo que el V8.0 confirma que ya está bien encaminado (no rehacer):**
- La cadena diaria FAI→FOP→AMD y el sellado SHA-256 (C6). ✅ probado e2e.
- El costeo por lote como fuente de verdad de costos. ✅
- El AMD de 6 pestañas, incluyendo snapshots financieros (P2) más ricos de lo esperado. 🔶

**Los 3 frentes grandes nuevos que el V8.0 agrega (en orden de impacto):**
1. **Motor financiero M1–M10** — requiere modelar costos fijos, MOD/GIF, prorrateo, y el sistema de estados **E/C/V** (M10). Es el corazón de la propuesta de valor financiera y ~80% es nuevo.
2. **Los 6 roles como experiencia-flujo + enforcement RBAC** — redefine el modelo de roles actual y exige aplicar permisos (hoy construidos pero inactivos) y reorganizar el frontend por rol.
3. **Confidence scoring** — módulo de analítica estadística completo (Shadow Mode, baseline, escalamiento).

**Frentes medianos:** saldo inicial de caja (cierra C2), FEFO real, FCT/RCT, propinas, comida de personal, gastos extraordinarios, OC rica, CxP.

**Riesgo de proceso:** el código se construyó contra V3; V8.0 cambia nombres y semántica (roles R1–R6, POS/Reg.R5 como formatos, firma con PIN). Antes de construir, conviene **decidir explícitamente qué de V8.0 entra en V1** — el documento describe un sistema mucho más grande que un MVP, y mezclar todo sin priorizar dispararía el alcance.

**Mi recomendación de secuencia** (respetando que la integridad del dato es el valor central):
1. **Cerrar Iteración 1** (lo que ya estaba: tests con ventas, rollback, drift) — no tirar el progreso.
2. **Saldo inicial de caja + FEFO** — huecos pequeños que cierran candados ya existentes (C2, C1).
3. **Decidir el alcance de V1 del V8.0** contigo (¿motor financiero? ¿6 roles? ¿confidence scoring?) antes de construir — es una decisión de producto, no técnica.
4. Recién entonces, atacar el frente grande que priorices.

> El roadmap detallado vive en [`VERITT_MASTER.md`](VERITT_MASTER.md) (Parte VI). Este gap alimenta su replanteo.
