# Frontend Analysis — veritt-mobile

> Análisis de flujos de usuario y componentes reutilizables.
> Stack: Expo SDK 52 + Expo Router + NativeWind + Zustand. **60 pantallas, 17 módulos API, ~90 componentes.**

## Hallazgo transversal: migración de diseño a medias

La app está **en migración entre dos sistemas visuales**:

- **Sistema "dark"** (más antiguo): NativeWind `className` + tokens `veritt-*` (`bg-veritt-bg`), componentes `VrittScreen`/`VrittCard`/`VrittHeader`, alertas con `Alert.alert`.
- **Sistema "paper"** (nuevo, editorial claro): `StyleSheet` inline + `constants/design-tokens.ts` (`surface.paper`, `palette`, `text.onPaper`), toasts con `lib/notify`.

Aproximadamente la mitad de los dominios ya migraron a "paper" (Inventory, Daily Chain, Sales/POS, Receipts, Shifts, Business detail, Home). El resto sigue "dark" (Purchase Orders, Suppliers, Supplier Invoices, Staff, Areas, Processes, Payroll, Payment Methods, Sales analytics/detail). **Split de feedback:** 21 pantallas usan `notify.*`, 31 todavía `Alert.alert`.

---

## Infraestructura (leer primero)

| Pieza | Archivo | Rol |
|---|---|---|
| Axios | `api/client.ts` | Instancia única. `baseURL = ENV.API_URL + '/api/v1'`. Interceptor de request inyecta Bearer; interceptor de response llama `onUnauthorized()` en 401. |
| Auth store | `store/auth.store.ts` | Zustand: `token/user/isAuthenticated/isHydrated` + `bootstrap/login/register/logout`. Token en SecureStore (native) / localStorage (web). |
| Business store | `store/business.store.ts` | Zustand: `businesses[]`, `activeBusinessId`, `chainToneByBusinessId`, `getRole()`. **Único store de dominio**; el resto se fetchea por pantalla. |
| Caches | `hooks/useHomeData`, `useBusinessDetail`, `useBusinessesSummary`, `usePosData` | Caches estilo SWR: `Map` a nivel módulo, TTL 60s, dedupe de requests en vuelo, `invalidateX()` para refrescar tras mutación. |
| Permisos | `lib/role-permissions.ts` | `permissions.canSeeFinance/canManageStaff/canManageInventory/...` gatean UI y fetches. |
| Toasts | `lib/notify.ts` + `components/ui/VrittToast.tsx` | Sistema de toasts (paper). |

---

## PARTE 1 — Flujos de usuario

### Auth / Bootstrap — ✅ COMPLETO
`_layout.tsx` (root Stack, `useAuthBootstrap()`, monta `VrittToastHost`) → `index.tsx` espera `isHydrated` y redirige a `/(tabs)` o `/login` → `login.tsx` / `register.tsx`. 401 en cualquier punto → `logout()` → redirección a login.
- ⚠️ `login.tsx`: "¿Olvidaste tu contraseña?" es un `TouchableOpacity` muerto (sin handler).
- ⚠️ `register.tsx`: usa `TextInput` inline (no `VrittInput`).

### Tabs — ✅ COMPLETO (excepto Explore)
- `(tabs)/index.tsx` (**Home**) — pantalla más compuesta. `useHomeData` + `useActiveBusiness`; renderiza greeting, pill de negocio activo, stage, bento, next-move, timeline, módulos y switcher de negocios. Builders en `lib/home-builders.ts`.
- `(tabs)/businesses.tsx` — carrusel snap de `VrittBusinessCard` + summary pills.
- `(tabs)/profile.tsx` — datos de cuenta + logout. Copy de placeholder ("Hay que meter todo lo de seguridad en un sprint…").
- ⚠️ `(tabs)/explore.tsx` — **STUB / rompe reglas.** Usa `fetch()` crudo a **newsapi.org con API key hardcodeada** (viola la regla "solo api/client.ts"). Buscador no funcional.

### Business creation + detail — ✅ COMPLETO
`businesses/create.tsx` (dark) → `businesses/[businessId]/index.tsx` (paper). El detalle usa `useBusinessDetail` (agrega business/onboarding/chain/sales/staff/payroll/inventory) y renderiza header, CTA de cadena, quick modules, pendientes de onboarding, bento de métricas. Pull-to-refresh.

### Inventory — ✅ COMPLETO (paper, el dominio más pulido)
`index` (hero stats, búsqueda, filtro de stock, secciones por categoría) · `create-material` (+ lote inicial opcional) · `create-product` (toggle DIRECT/RECIPE, recetas dinámicas, el form más complejo de la app) · `create-location` · `materials/[id]` · `products/[id]` · `locations/[id]`.

### Daily chain — ✅ COMPLETO (paper, flujo insignia)
`index` orquesta FAI→FCI→FID→FAF→FOP con semáforo y lógica de lock/clickable, y muestra `AmdCard` cuando FOP queda `SIGNED`.
- `opening` (FAI): conteo con `useFaiDraft` (borrador autoguardado).
- `opening-review`: manager autoriza/rechaza con sheets.
- `closing` (FCI): reutiliza componentes FAI con `kind:'fci'`.
- `closing-review` · `deviations` (FID, clasificar causa) · `reconciliation` (FAF, arqueo de caja con modos input/review/final) · `fop` (cierre final, firma) · `amd` (Archivo Maestro Diario: 6 tabs + verificación de hash).

### Sales / POS — ✅ COMPLETO
`index` (paper; manager ve ingresos/margen, operador solo conteo — finance-gated) · `create` (POS, `usePosData`, grid + carrito + sheet de pago) · `analytics` (dark) · `[saleId]` (dark).

### Receipts — ✅ COMPLETO (paper, reutiliza componentes de inventory)
`index` (agrupado por día) · `create` (link opcional a PO, líneas dinámicas) · `[receiptId]` (+ sheet de cancelación).

### Resto — ✅ COMPLETO (dark, más antiguos)
Purchase Orders (index/create/[poId]) · Suppliers (index/create/[supplierId]) · Supplier Invoices (index/create/[invoiceId]) · Staff (staff/create-staff/[staffId]) · Areas · Processes · Payroll · Payment Methods · Shifts (paper, newer).

### Chat — ⚠️ STUBBED
`chat.tsx` — visualmente completo pero `handleSend()` es un placeholder (`// aquí irá la llamada al asistente`). Sin módulo API, sin historial, sin streaming. Colores hardcodeados (no usa design-tokens).

**Resumen:** ~58 de 60 pantallas funcionales y conectadas a API. Solo `chat.tsx` (stub) y `explore.tsx` (mock/rompe reglas) están incompletas.

---

## PARTE 2 — Componentes reutilizables

### Design-system core (`components/ui/`)

**Canónicos, muy usados:**
| Componente | Propósito |
|---|---|
| `VrittButton` | Botón primary/secondary, `loading`. **Botón canónico** (~25 pantallas). |
| `VrittInput` | Input con label (dark). **Input canónico.** |
| `VrittCard` | Card redondeada dark (~21 pantallas). |
| `VrittScreen` | Wrapper safe-area + `VrittWebPanel` para desktop. |
| `VrittHeader` | Hero header dark (eyebrow + título + subtítulo). |
| `VrittLoader` | Spinner de pantalla completa. |
| `VrittEmptyState` | Estado vacío con acción. |
| `VrittSelect` | Dropdown modal genérico `<T extends string>`. |
| `VrittSectionLabel` · `VrittWebPanel` · `VrittToast` | Label, centrado desktop, toasts. |

**Chrome del sistema paper (nuevos):** `VrittScreenHeader` (nav paper), `VrittSheetHeader` (modal pageSheet), `VrittBottomDock` (footer fijo), `VrittStatusChip` (tono + label), `VrittInfoBanner` (banner contextual), `VrittTabsWebHeader` (nav web).

**⚠️ MUERTOS / DUPLICADOS (0 usos — borrar):**
- `VrittPrimaryButton.tsx` — clon de `VrittButton`.
- `VrittAppInput.tsx` — clon de `VrittInput`.
- `VrittTextButton.tsx` — sin usos.
- `components/business-detail/VrittDetailHero.tsx` y `VrittDetailModuleGrid.tsx` — sin usos.

### Tokens
`constants/design-tokens.ts` — fuente de verdad del sistema "paper" (`palette`, `surface`, `text`, `radius`, `shadow`, `withAlpha()`). Separado de los tokens NativeWind `veritt-*` (dark). `constants/theme.ts` es del starter de Expo, sin uso.

### Carpetas de dominio
| Carpeta | Componentes | Reutilizable |
|---|---|---|
| `home/` | Greeting, switcher, stage, semáforo, next-move, bento, timeline, `VrittAbstractShapes` (reusado por shifts). `home/sections/*` son wrappers de composición solo de Home. | Específico de Home (salvo AbstractShapes). |
| `inventory/` | El set mejor factorizado. Genéricos (ya reusados por receipts): `VrittInventoryHeader`, `VrittPaperInput` + pickers, `VrittInventoryHero/Facts/Empty`, `VrittCostBreakdown`, `VrittCategoryPicker`. Específicos: `VrittMaterialRow`, `VrittProductRow`, `VrittRecipeItemCard`, `VrittStockChip/Bar`, etc. | Mixto — **la mina de oro de reuso.** |
| `fai/` | `VrittFaiCounterSheet`, `VrittFaiMaterialRow`, `VrittFaiReviewSheet` (parametrizados FAI vs FCI). | Reusados en opening + closing. |
| `pos/` | `VrittPosFilters`, `VrittPosProductGrid`, `VrittPosCartDock`, `VrittPosReviewSheet`. | POS-específico. |
| `receipts/` | `VrittReceiptRow`, `VrittReceiptItemCard`, `VrittCancelReceiptSheet`, etc. | Receipts-específico. |
| `sales/` | `VrittSaleRow`. | Específico. |
| `staff/` | `PayrollDateSelector` (⚠️ sin prefijo `Vritt`). | Específico. |
| `business-detail/` | Header, action, quick modules, bento, info, pending. | Específico. |
| `businesses/` | `VrittBusinessCard`, `VrittBusinessCreateCard`. | Específico. |
| `navigation/` | `VrittFloatingTabBar` (tab bar nativo custom). | Global. |

### Capa API
`api/client.ts` + 17 módulos `api/modules/*.api.ts` (auth, businesses, areas, daily-chain, inventory, notifications, payment-methods, payroll, processes, purchase-orders, receipts, sales, staff, supplier-invoices, suppliers, time-tracking, amd). Cada uno exporta un objeto `xxxApi` con métodos `async` tipados. Tipos en `types/*.types.ts`.
- ⚠️ `notifications.api.ts` existe pero **ninguna pantalla lo consume** (no hay pantalla de notificaciones).

---

## Recomendaciones de consolidación

1. **Borrar componentes muertos:** `VrittPrimaryButton`, `VrittAppInput`, `VrittTextButton`, `VrittDetailHero`, `VrittDetailModuleGrid` (0 referencias).
2. **Inputs paralelos:** `ui/VrittInput` (dark) vs `inventory/VrittPaperInput` (paper). Al terminar la migración, promover `VrittPaperInput` a `ui/` y retirar `VrittInput`. Misma historia con `VrittButton/Card/Screen/Header`.
3. **Overlap real de headers:** `VrittInventoryHeader` vs `VrittScreenHeader` — fusionar. El resto de headers (hero/sheet/web/dock) son intencionales, no redundantes.
4. **`explore.tsx`:** mover tras `api/client.ts` o eliminar (rompe la regla de HTTP + key hardcodeada).
5. **`chat.tsx`:** único flujo totalmente stub — definir backend o marcarlo "Próximamente".
6. **Notify vs Alert:** migrar las 31 pantallas con `Alert.alert` a `notify.*` conforme se rediseñan.
7. **Pantalla de notificaciones:** el backend y `notifications.api.ts` existen pero no hay UI — oportunidad de bajo costo.

> Deuda principal del frontend: **terminar la migración dark→paper** y limpiar duplicados. La arquitectura (stores, caches, permisos, capa API) es sólida y consistente.
