# Veritt — Estado del proyecto y plan de iteración

> Síntesis de toda la documentación en root + verificación contra el código real (no solo lo que dicen los docs).
> Fecha de análisis: **2026-06-09**.

---

## TL;DR

- **Foundation + Fases 1–3** (auth, negocios, staff, inventario con lotes FIFO, áreas, procesos, time-tracking, ventas/POS, proveedores, compras, recepciones, facturas): ✅ **completas end-to-end** (BE + FE + tipos + API).
- **Fase 4 — Cadena Diaria** (FAI→FCI→FID→FAF→FOP): ✅ **construida y commiteada** (backend + 8 pantallas). ⚠️ **nunca testeada end-to-end de forma formal.**
- **Fase 5 — AMD + refactor de costeo por lotes:** ✅ **código existe y está cableado**, pero **sin commitear** (22 archivos) y montado sobre una Fase 4 sin tests.
- **Fases 6 (7 candados) y 7 (V2/V3):** ❌ no iniciadas.

**El cuello de botella no es construir más — es consolidar lo construido:** commitear, testear la cadena diaria + AMD, y endurecer RBAC. Después, Fase 6.

---

## 1. Qué es Veritt (visión y arquitectura)

Veritt es **"el sistema operativo para negocios físicos"** — una capa de *verificación*, no de registro: *"Un sistema de registro acepta lo que le dan. Veritt valida que lo que le dan corresponde con la realidad."* Propiedad distintiva: **"simple de usar y complejo de falsificar"** (complejidad oculta: integridad nivel banco bajo una UX trivial).

Decisiones arquitectónicas clave:
- **Primitivas universales:** todo negocio = **Área + Proceso + Persona**. Nada hardcodeado → el mismo core sirve restaurantes, clínicas, parques industriales, escuelas.
- **Datos en cascada:** una acción genera muchas consecuencias trazables sin trabajo humano extra.
- **Cadena diaria secuencial y bloqueante** FAI→FCI→FID→FAF→FOP (restricción de *arquitectura*, no de UI).
- **AMD** (Archivo Maestro Diario): documento diario independiente, sellado con SHA-256, inmutable, 6 pestañas. Se genera al firmar el FOP.
- **7 candados** (C1–C7): consistencia matemática cruzada → falsificar exige corromper 7 capas a la vez.
- **3 capas de valor:** V1 (OS del negocio) → V2 (evidencia certificada, IMSS) → V3 (Veritt Data).

Stack: NestJS 11 + Prisma 7 + Postgres (Supabase, pooler session-mode) · Expo SDK 52 + Expo Router + NativeWind + Zustand · JWT propio (`@CurrentUser()` = `{id,email}`) · sync manual de contratos FE/BE.

---

## 2. Línea de tiempo de fases (reconciliada con el código)

> Los docs se escribieron en momentos distintos y **se contradicen** sobre el estado. Esta tabla está reconciliada contra disco — gana lo más nuevo.

| Fase | Entrega | Estado real |
|---|---|---|
| **Foundation** | Auth, negocios, memberships, onboarding, staff, payroll, inventario (lotes FIFO, recetas/costos versionados), notificaciones | ✅ DONE |
| **Fase 1** | Áreas, Procesos (`isBlocking`), Time Tracking (GPS), infra RBAC | ✅ DONE (RBAC construido, **no aplicado**) |
| **Fase 2** | Ventas/POS, motor de consumo teórico, métodos de pago | ✅ DONE |
| **Fase 3** | Proveedores, Órdenes de compra, Recepciones (separación de funciones), Facturas (CFDI), alertas de precio | ✅ DONE end-to-end |
| **Fase 4** | Cadena diaria FAI→FCI→FID→FAF→FOP, fecha operativa/timezone, FAF conteo-ciego + aprobación, FCI aprobación, UI por rol, `isDayOpen()` | ✅ CONSTRUIDA + commiteada · ⚠️ **sin tests e2e** |
| **Fase 5 (AMD)** | Modelo `DailyMasterArchive`, JSON canónico + SHA-256, builder 6 pestañas, trigger en `signFOP` con rollback, endpoint `verify`, pantalla móvil · + **refactor de costeo por lotes** (LotCostingService) | ✅ CÓDIGO EXISTE y cableado · ⚠️ **sin commitear (22 archivos)** · sin tests e2e |
| **Fase 6 (7 candados)** | Motor de validación cruzada | ❌ No iniciada (C3, C5 listos para construir ya) |
| **Fase 7 (V2/V3)** | IMSS, exportación certificada, credit scoring, Data API | ❌ No iniciada |

**Cronología narrada por los docs:** ROADMAP (Fase 4 sin iniciar) → GAP_ANALYSIS (8-abr, igual) → DEEP_ANALYSIS (13-abr, "30%, sorpresa: ya empezó") → COMPLETION_PLAN/HANDOFF (14-abr, "~95%, construida pero sin probar") → **INVENTORY_COSTING (7-may, "costeo hecho, AMD Fase 5 hecho").**

---

## 3. Inventario de documentos (qué es cada uno)

| Doc | Fecha | Qué es | Estado que refleja |
|---|---|---|---|
| `ARCHITECTURE_V3.md` | 2026 | La biblia conceptual (el "por qué") | Atemporal — visión |
| `ROADMAP.md` | s/f | Fases 1–7 con modelos Prisma y orden de build | El más viejo: Fases 3–7 "NO INICIADO" |
| `GAP_ANALYSIS.md` | 8-abr | Código vs Arquitectura V.3 | Fase 3 hecha, Fase 4 sin iniciar |
| `DEEP_ANALYSIS.md` | 13-abr | Estado real del repo, conteos | Fase 4 ~30% en progreso |
| `PHASE4_PLAN.md` | s/f | Blueprint original de la cadena diaria | Plan (todo "to do") |
| `PHASE4_COMPLETION_PLAN.md` | 14-abr | Cerrar el ~5% que faltaba | Fase 4 ~95% |
| `PHASE4_SESSION_HANDOFF.md` | 14-abr | Volcado de fin de sesión + próximos pasos | Fase 4 construida, sin commitear, sin tests |
| `INVENTORY_COSTING.md` ⭐ | 7-may | Spec del costeo por lotes (precede al AMD) | **El más nuevo:** 10/10 pasos ✅, AMD incluido |
| `unityrc.md` | s/f | Reglas de código para agentes IA | ⚠️ lista de módulos **desactualizada** (solo nombra hasta Foundation) |
| `README.md` | — | vacío | — |

⚠️ **`unityrc.md` está stale:** su §5 "Module Boundaries" solo lista `auth, users, businesses, memberships, onboarding, staff`. Las reglas siguen válidas; el inventario de módulos no. Duplica en gran parte el `CLAUDE.md` de root.

---

## 4. Qué está DONE (consolidado y verificado en disco)

- **Foundation + Fases 1–3** end-to-end.
- **Backfills:** B1 reversa de stock al cancelar ✅, B3 infra RBAC ✅ (guard + `@RequirePermission`, bypass OWNER/VERITT_STAFF), B4 migraciones ✅.
- **Fase 4 cadena diaria:** 11 modelos / 7 enums, módulo único `daily-chain` (controller con **19 rutas**, service ~600 líneas, repository ~620), 8 pantallas móviles, helper de fecha operativa con timezone, **bug de frontera UTC corregido**, flujo de aprobación FCI, flujo FAF conteo-ciego→aprobación, cache de rol en `business.store.ts`, `isDayOpen()` en sales + receipts. **Commiteada** (commit `f233add` + refactors posteriores).
- **Refactor de costeo (7-may):** `lot-costing.helpers.ts` (22 tests unitarios verdes), `LotCostingService` (lecturas, mutadores, detección de drift), bloqueo de sobreventa, costo de referencia con única fuente, endpoints admin (`cost-quote`, `value`, `value-summary`, `drift`).
- **Fase 5 AMD:** módulo `amd/` (builder, service, controller, repository, helpers de JSON canónico + hash con specs, tipos), cableado en `app.module.ts`; `signFOP` llama `amdService.generateForFOP(tx, …)` dentro de la transacción con rollback; migración `add_amd_phase5`; móvil `amd.api.ts` + `amd.types.ts` + `amd.tsx`.

**Backend:** 21 controllers · **128 rutas** (verificado: 128 route decorators) · 15 migraciones · 3 archivos de test.
**Mobile:** 60 pantallas · 17 módulos API · 0 tests.

---

## 5. Qué está IN PROGRESS / recién construido y sin verificar

1. **22 archivos sin commitear** = todo el stream **AMD + lot-costing (Fase 5 + costeo)** más el refactor de la cadena diaria que los integra. *Es el dominante riesgo "en vuelo".* (El core de la Fase 4 sí está commiteado; lo nuevo no.)
2. **Fase 4 nunca testeada formalmente** — el handoff tiene listas largas de tests críticos sin marcar (números correctos tras el fix UTC, walkthrough completo FAI→FOP, flujo de 2 usuarios operador/manager, race conditions). Ningún doc posterior registra que se ejecutaran.
3. **Fase 5 AMD sin verificación e2e** — marcada ✅ en el doc, pero se apoya sobre (a) una Fase 4 sin tests y (b) la capa de costeo nueva. La validación de punta a punta es el pendiente real.

---

## 6. Qué está PLANEADO / backlog

- **Fase 6 — 7 candados** (motor de validación cruzada). **C3** (recepciones vs OC) y **C5** (nómina vs turnos) explícitamente construibles ya; C1/C2/C4/C7 dependen de la Fase 4/5 ya construida.
- **Fase 7 — V2** (evidencia certificada 365 días, integración IMSS directa, exportación financiera certificada) y **V3** (Veritt Data: credit scoring alternativo, dataset sectorial anónimo).
- **Diferidos:** B2 extracción del repository de inventario (~1800 líneas de service); punto de equilibrio diario (necesita modelo de costos fijos inexistente); rollout de enforcement RBAC a endpoints + filtrado de módulos en móvil; migrar alertas de precio de `MATERIAL_LOW_STOCK` al tipo dedicado `PRICE_ALERT`.

---

## 7. Análisis crítico

### 7.1 Riesgos altos

| # | Riesgo | Por qué importa | Evidencia |
|---|---|---|---|
| R1 | **22 archivos sin commitear** (Fase 5 + costeo) | El cuerpo de trabajo más complejo y reciente vive solo en el working tree. Un `git checkout` accidental lo borra. Imposible hacer code-review o rollback granular. | `git status`: 11 `M` + 11 `??`. El handoff ya pedía "commit all changes" en abril y sigue abierto. |
| R2 | **Core de V.3 sin tests e2e** | La cadena diaria + AMD *son* el producto. Si las reglas de bloqueo o los números (consumo teórico, arqueo, deviation en pesos) están mal, el valor "complejo de falsificar" se cae. Solo hay 3 specs unitarios (lot-costing + hash), 0 tests de integración del flujo, 0 tests en móvil. | `find *.spec.ts` → 3 archivos; el handoff lista ~20 escenarios críticos sin marcar. |
| R3 | **AMD montado sobre base sin verificar** | El AMD sella con hash lo que *cree* que pasó. Si la Fase 4 o el costeo tienen un error de cálculo, queda **sellado e inmutable** un dato incorrecto — lo peor posible para una "fuente de verdad". | Dependencia directa `signFOP → generateForFOP`. |
| R4 | **RBAC construido pero no aplicado** | *"Cualquier miembro puede hacer todo"* — aceptable en dev, inaceptable en prod, y rompe la separación de funciones que la propia arquitectura exige (ej. FAI: autorizador ≠ creador). | GAP/DEEP_ANALYSIS lo marcan "Media"; la infra existe (B3) pero no está en los controllers. |

### 7.2 Riesgos medios

- **Deriva de docs:** 9 documentos, varios contradictorios por fecha. Un colaborador nuevo (o agente IA) que lea `ROADMAP`/`GAP_ANALYSIS` creerá que la Fase 4 no existe. **`unityrc.md` con lista de módulos stale** agrava esto.
- **Deuda técnica del handoff:** timing de recepción vs FCI (puede crear falsa desviación), `DailyClosingStatus.COMPLETED` huérfano, falta `_layout.tsx` en daily-chain, precisión decimal JS vs `Decimal(14,4)`, thresholds del FOP hardcodeados (deberían ser por-negocio).
- **Migración dark→paper a medias en el frontend** (ver `FRONTEND_ANALYSIS.md`): dos sistemas de diseño coexistiendo, `Alert` vs `notify` split, componentes muertos duplicados, `explore.tsx` con `fetch` crudo + API key hardcodeada.

### 7.3 Lo que está bien hecho (no romperlo)

- Arquitectura backend limpia y consistente (controller→service→repository, DTOs con validación estricta).
- Decisiones de costeo **bien razonadas y documentadas** (INVENTORY_COSTING distingue inmutable vs cache, 4 preguntas de costo canónicas, reglas R1–R5, gate de drift antes del AMD). Es trabajo de calidad.
- AMD con JSON canónico (RFC 8785/JCS) + SHA-256 + rollback transaccional → diseño correcto para inmutabilidad.
- Capa móvil sólida: stores, caches con TTL/dedupe, permisos por rol centralizados, capa API tipada.

### 7.4 Tensión estratégica central

El proyecto tiene un **patrón de "construir hacia adelante sin consolidar hacia atrás"**: Fase 4 se construyó antes de testear, Fase 5 se construyó sobre Fase 4 sin testear, y nada se commiteó. Cada fase nueva *aumenta la superficie sin verificar*. Para un producto cuya propuesta de valor es **la integridad del dato**, esto es exactamente el riesgo que no puede correrse: un AMD sellado con datos incorrectos es peor que no tener AMD. **La siguiente iteración debe ser de consolidación, no de construcción.**

---

## 8. Plan de iteración (recomendado)

### 🔴 Iteración 0 — Consolidar (1–2 días, BLOQUEANTE, hacer ya)
Objetivo: dejar de acumular riesgo. **No construir nada nuevo.**

1. **Commitear el trabajo en vuelo en commits lógicos** (no un solo commit gigante):
   - `feat(inventory): lot-costing service + helpers + tests`
   - `feat(amd): phase 5 daily master archive (model, builder, hash, verify)`
   - `feat(daily-chain): integrate AMD generation on FOP sign`
   - `feat(mobile): AMD screen + api/types`
   - `docs: inventory costing spec`
2. **Verificar que compila y migra limpio** desde cero: `npx prisma migrate reset` en DB de dev + `npm run build` (backend) + `tsc`/lint (mobile).
3. **Actualizar `unityrc.md`** (lista de módulos) y archivar los docs de Fase 4 obsoletos en una carpeta `docs/archive/` para que dejen de confundir.

> Criterio de salida: `git status` limpio, build verde, un README de "estado actual" único y veraz.

### 🟠 Iteración 1 — Probar el corazón de V.3 (3–5 días)
Objetivo: convertir "construido" en "verificado". Sin esto, todo lo demás es castillo de naipes.

1. **Tests de integración del backend de la cadena diaria** (e2e con DB de test): los ~20 escenarios del handoff —
   - venta antes de FAI → rechazada; FAI autoriza → desbloquea; FCI→FID auto-gen con `theoreticalConsumption` ≠ 0; creador ≠ autorizador (403); FAF conteo-ciego→revelar→aprobar; solo manager firma FOP; **firma FOP → AMD generado y verificable**; rollback si AMD falla; gate de drift.
2. **Verificar los números tras el fix UTC** con datos sembrados (ventas nocturnas que caen al día UTC siguiente).
3. **Walkthrough manual de 2 usuarios** (operador + manager) de FAI a FOP a AMD — documentar resultado.
4. **Resolver la deuda del handoff** que afecta correctitud: timing recepción/FCI, status huérfanos, thresholds FOP configurables.

> Criterio de salida: una suite que prueba FAI→FOP→AMD pasa en verde; un AMD generado se verifica con hash OK.

### 🟡 Iteración 2 — Endurecer para producción (2–4 días)
1. **Aplicar RBAC** (`@RequirePermission`) en los controllers, empezando por la cadena diaria (separación de funciones) y finanzas. Filtrar módulos por rol en móvil.
2. **Limpieza de frontend** (ver `FRONTEND_ANALYSIS.md`): borrar 5 componentes muertos, arreglar `explore.tsx`, decidir `chat.tsx`.
3. **Precisión decimal** en móvil (formateo consistente vs `Decimal(14,4)`).

### 🟢 Iteración 3 — Fase 6: primeros candados (1–2 semanas)
Construir los 2 candados con prerequisitos listos:
- **C3** — Recepciones vs Órdenes de compra.
- **C5** — Nómina vs turnos fichados (time-tracking).
Diseñar el motor de candados como servicio que corre al cerrar el día (post-FOP) y alimenta el AMD P4 (alertas).

### 🔵 Backlog posterior
C1/C2/C4/C6/C7 restantes · punto de equilibrio (requiere modelo de costos fijos) · B2 repository de inventario · Fase 7 (V2/V3).

---

## 9. Decisión a tomar

La única bifurcación real es **qué hacer primero**:

- **(A) Consolidar (Iter 0+1)** — recomendado. Asume que el valor está en que lo construido sea *confiable*.
- **(B) Seguir construyendo (Fase 6)** — solo si hay presión de demo/inversión que exija features nuevas visibles. Aumenta deuda y riesgo R3.

Dado que la propuesta de valor de Veritt **es la integridad del dato**, A es la opción coherente con la propia arquitectura. Construir la Fase 6 (más candados) sobre una Fase 4/5 sin probar contradice el principio "complejo de falsificar": de nada sirven 7 candados si el dato que candan está mal calculado.
