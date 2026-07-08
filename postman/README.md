# Postman — Veritt API (monkeys-api)

Colección completa del backend NestJS. **21 carpetas · 128 requests** (= los 128 route decorators reales del código, verificado 1:1).

## Archivos

| Archivo | Qué es |
|---|---|
| `Veritt-API.postman_collection.json` | La colección lista para importar en Postman. |
| `generate-collection.mjs` | Generador (fuente de verdad). Si cambias un endpoint, edita aquí y regenera. |

## Importar

1. Postman → **Import** → arrastra `Veritt-API.postman_collection.json`.
2. La colección trae sus propias **variables** (pestaña *Variables*). La única que normalmente tocarás es `baseUrl`.

## Flujo de uso (encadenado)

La colección guarda IDs automáticamente vía scripts de test, así que ejecuta en orden:

1. **01 · Auth → Register** (o **Login**) → guarda `token` solo.
2. **03 · Businesses → Create business** → guarda `businessId`.
3. **07 · Inventory → Create location / Create material / Create product** → guardan `locationId`, `materialId`, `productId`.
4. **08 · Payment Methods → Create** → guarda `paymentMethodId`.
5. **09 · Staff → Create** → guarda `staffId`.
6. A partir de ahí, Sales, Receipts, Daily Chain, etc. ya tienen sus variables.

El `Authorization: Bearer {{token}}` está configurado a nivel de colección y se hereda en todos los requests (salvo los públicos: root, register, login, marcados como *No Auth*).

## Variables

| Variable | Default | Notas |
|---|---|---|
| `baseUrl` | `http://localhost:3000/api/v1` | Cambia el puerto si usas `PORT`. |
| `token` | _(vacío)_ | Se setea solo al hacer login/register. |
| `businessId` | _(vacío)_ | Se setea al crear/listar negocio. |
| `today` | `2026-06-09` | Día operativo para la cadena diaria. Ajústalo. |
| _resto de IDs_ | _(vacío)_ | Se setean solos al crear cada recurso. |

## Notas importantes del backend

- **Prefijo global:** `/api/v1` (ya incluido en `baseUrl`).
- **ValidationPipe** global con `forbidNonWhitelisted: true` → **no envíes campos fuera del DTO** o la respuesta será `400`. Los bodies de la colección ya están alineados a los DTOs.
- **ParseUUIDPipe** en `purchase-orders`, `receipts`, `suppliers`, `supplier-invoices` → si `businessId` o el id del recurso no es un UUID válido, devuelve `400`.
- **Time tracking** vive bajo el segmento `/shifts`, no `/time-tracking`.
- **Notifications** NO está anidado en `businesses/:id` — `businessId` es un query param opcional.
- Algunos endpoints de reject/sign usan `@Body('campo')` crudo (sin DTO): `daily-chain` reject/sign. Los bodies ya reflejan la forma correcta (`{ "reason": "..." }` / `{ "discrepancyJustification": "..." }`).

## Regenerar

```bash
node postman/generate-collection.mjs
```

Salida esperada: `Folders: 21 | Requests: 128`.
