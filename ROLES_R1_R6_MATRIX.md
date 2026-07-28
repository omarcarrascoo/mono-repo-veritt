# F1 — Matriz de permisos R1–R6 (contrato)

> **Qué es:** el contrato de permisos que guía la migración de los 5 roles actuales
> a los 6 roles del V8.0. Antes de tocar los ~130 checks del código, este doc define
> qué puede cada rol. Si un check no cuadra con esta matriz, la matriz manda.
>
> **Fecha:** 2026-07-08 · **Fase:** F1 (roadmap V8.0) · **Estado:** propuesta para aprobar.

---

## 1. Mapeo desde los roles actuales

El código hoy tiene 5 roles usados como **niveles de acceso** (~130 referencias en 24 archivos). El V8.0 los redefine como **posiciones en la cadena operativa**.

| Rol actual | → V8.0 | Tipo de cambio |
|---|---|---|
| `OWNER` | **R6 — Dueño** | Renombre 1:1 |
| `ADMIN` | **R5 — Administrador** | Renombre 1:1 |
| `SUPERVISOR` | **R4 — Gerente de Turno** | Renombre 1:1 |
| `OPERATOR` | **R3 — Operador POS** *(transición)* | Split: todos los OPERATOR actuales pasan a R3 por defecto; se reasignan a R1/R2 manualmente después |
| `VERITT_STAFF` | **VERITT_STAFF** *(se mantiene)* | Fuera del modelo R1–R6: es staff interno de Veritt con bypass total (soporte). No es un rol de negocio. |

**Decisión sobre operadores existentes:** van a **R3 (POS)** como rol de transición (elegido por ti). Nadie pierde acceso; tú reasignas a R1 (inventario) o R2 (caja) según lo que hace cada persona.

**Decisión sobre VERITT_STAFF:** se conserva como está (bypass, igual que OWNER). El V8.0 no lo menciona porque es interno de la plataforma, no del negocio del cliente.

### Enum resultante
```
enum MembershipRole {
  R1_INVENTORY   // Encargado de Inventario
  R2_CASH        // Encargado de Caja
  R3_POS         // Operador POS
  R4_MANAGER     // Gerente de Turno
  R5_ADMIN       // Administrador
  R6_OWNER       // Dueño
  VERITT_STAFF   // Staff interno Veritt (bypass)
}
```
> Nombres con prefijo `R#_` para que el código sea legible (`R4_MANAGER` dice qué es), y el orden numérico refleje la jerarquía de la cadena.

---

## 2. Los 6 roles — qué hace cada uno (del V8.0 §1.5)

| Rol | Nombre | Su función en la cadena | NO ve |
|---|---|---|---|
| **R1** | Encargado de Inventario | FAI, FCI, mermas, recepciones, comida de personal | Ventas, caja, datos de otros roles |
| **R2** | Encargado de Caja | Saldo inicial, pagos, FAF (arqueo) | **Comandas abiertas**, inventario |
| **R3** | Operador POS | Comandar, menú, mesas, cuentas | Inventario, caja, datos de otros roles |
| **R4** | Gerente de Turno | Iniciar día, dashboard tiempo real, aprobar FID/FAF, firmar FOP | P6 del AMD (rendimiento individual) |
| **R5** | Administrador | Facturas, CxP, gastos extraordinarios, OCs, proveedores | Comandas POS, detalle operativo de turno |
| **R6** | Dueño | Todo. AMD completo P1-P6, historial, config | Nada |

---

## 3. Matriz de permisos por dominio

Leyenda: ✅ acceso completo · 👁️ solo lectura · ➕ crea (pero no autoriza) · ✔️ autoriza/aprueba · ❌ sin acceso.

> Regla transversal: **R6 y VERITT_STAFF tienen bypass total** (✅ en todo). La tabla detalla R1–R5.

| Dominio / acción | R1 Inv | R2 Caja | R3 POS | R4 Gte | R5 Admin | R6 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| **Inventario** — ver | ✅ | ❌ | ❌ | 👁️ | 👁️ | ✅ |
| **Inventario** — crear/editar material, producto | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Inventario** — ajustar stock, precio | ❌¹ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Inventario** — recibir lote, FTI (producir) | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Ventas (POS)** — crear venta | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Ventas** — ver analítica/finanzas | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Ventas** — cancelar venta | ❌ | ❌ | ❌ | ✔️ | ❌ | ✅ |
| **Caja / FAF** — saldo inicial, arqueo | ❌ | ✅⁶ | ❌ | ✔️ | ✅ | ✅ |
| **Comandas abiertas** (tiempo real) | ❌ | ❌ | 👁️² | ✅ | ❌ | ✅ |
| **Cadena diaria** — crear FAI/FCI | ✅ | ❌ | ❌ | ➕ | ❌ | ✅ |
| **Cadena diaria** — autorizar FAI/FCI/FID | ❌ | ❌ | ❌ | ✔️ | ❌ | ✅ |
| **Cadena diaria** — firmar FOP | ❌ | ❌ | ❌ | ✔️³ | ✔️³ | ✅ |
| **Iniciar día operativo** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Proveedores / OC / Recepciones** | 👁️⁴ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Facturas / CxP / Gastos extraordinarios** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Staff / Nómina** — ver | ❌ | ❌ | ❌ | 👁️ | ✅ | ✅ |
| **Staff / Nómina** — gestionar | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Miembros del negocio** (invitar, roles) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Config del negocio** | ❌ | ❌ | ❌ | ❌ | ➕⁵ | ✅ |
| **AMD** — ver P1-P5 | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **AMD** — ver P6 (rendimiento individual) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Turnos (clock in/out)** — propio | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Notas:**
1. R1 recibe y produce (sube stock con costo real), pero **ajustar stock a mano / cambiar precio** es de R5/R6 (control financiero). Coincide con lo que ya decidiste para inventario.
2. R3 ve solo *sus* comandas para operar; **no** el panel de comandas abiertas del negocio (eso es R4). Candado C2.
3. FOP: firman **de R4 hacia arriba** (R4 Gerente, R5 Admin, R6 Dueño). Decisión del dueño 2026-07-08. `CHAIN_SIGN_ROLES = [R4, R5, R6, VERITT_STAFF]`.
4. R1 ve recepciones porque las ejecuta físicamente, pero no crea OCs (eso es R5) — separación de funciones (candado C3).
5. R5 opera config administrativa; cambios estructurales del negocio son R6.
6. **Implementado (F2):** capacidad `CASH_OPERATE`. R2 declara el saldo inicial de caja antes de la 1ª venta; el FAF parte de ese saldo (candado C2). `CASH_ROLES = [R2, R4, R5, R6, VERITT_STAFF]`. Con la cadena activa (FAI autorizado), no se puede vender sin saldo declarado.

---

## 4. Cómo se traduce a los gates del código

Hoy el código usa dos helpers repetidos (`ensureBusinessAccess` = cualquier miembro, `ensureManagementAccess` = OWNER/ADMIN). Para la nueva matriz conviene **grupos de roles con nombre** en `roles.constants.ts`, en vez de arrays hardcodeados:

```typescript
// Grupos derivados de la matriz — un solo lugar que cambiar.
export const MANAGEMENT_ROLES = ['R4_MANAGER', 'R5_ADMIN', 'R6_OWNER', 'VERITT_STAFF'];
export const FINANCE_ROLES    = ['R5_ADMIN', 'R6_OWNER', 'VERITT_STAFF'];
export const INVENTORY_ROLES  = ['R1_INVENTORY', 'R5_ADMIN', 'R6_OWNER', 'VERITT_STAFF'];
export const POS_ROLES        = ['R3_POS', 'R4_MANAGER', 'R6_OWNER', 'VERITT_STAFF'];
export const CASH_ROLES       = ['R2_CASH', 'R4_MANAGER', 'R5_ADMIN', 'R6_OWNER', 'VERITT_STAFF']; // saldo inicial + arqueo (C2)
export const CHAIN_AUTH_ROLES = ['R4_MANAGER', 'R5_ADMIN', 'R6_OWNER', 'VERITT_STAFF']; // autorizar FAI/FCI/FID
export const CHAIN_SIGN_ROLES = ['R4_MANAGER', 'R5_ADMIN', 'R6_OWNER', 'VERITT_STAFF']; // firmar FOP (R4 hacia arriba)
export const BYPASS_ROLES     = ['R6_OWNER', 'VERITT_STAFF'];
```
Esto reduce los ~130 checks a **referencias a grupos**, y la matriz vive en un solo archivo. Cambiar un permiso = editar un grupo, no cazar 130 strings.

---

## 5. Plan de migración por etapas (verificable)

1. **Etapa 1 — enum + datos + constantes** (bajo riesgo):
   - Migración Prisma: renombra valores del enum + mapea datos (OWNER→R6_OWNER, etc.; OPERATOR→R3_POS).
   - Reescribe `roles.constants.ts` con los grupos de arriba.
   - Build verde. *Los checks siguen funcionando porque apuntan a los grupos.*
2. **Etapa 2 — reescribir checks por dominio** (donde vive el riesgo):
   - Cambiar arrays hardcodeados por los grupos con nombre.
   - Aplicar la separación R1/R2/R3 (el "split" real).
   - Verificar con la suite e2e (los tests de daily-chain ya cubren separación de funciones — adaptarlos a R-roles).
3. **Etapa 3 — móvil** :
   - `lib/role-permissions.ts` a la nueva matriz.
   - Navegación por rol-flujo (R2 no ve comandas, R3 superficie mínima, etc.).
   - Sync tipos + Postman.

> Cada etapa compila y se verifica antes de la siguiente. Nada de big-bang.

---

## 6. Decisiones del dueño (2026-07-08) ✅

- ✅ **FOP lo firman de R4 hacia arriba** (R4 Gerente, R5 Admin, R6 Dueño). → `CHAIN_SIGN_ROLES`.
- ✅ **VERITT_STAFF se queda** como bypass interno (soporte de la plataforma).
- ✅ **Matriz §3 aprobada.** Base para reescribir los checks en la Etapa 2.

> Si al probar algún permiso no cuadra con la operación real, se ajusta el grupo correspondiente en `roles.constants.ts` (un solo lugar).
