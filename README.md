# Veritt

**El sistema operativo para negocios físicos** — una capa de *verificación* (no de registro) que produce la verdad verificada de lo que pasa en un negocio físico todos los días. Monorepo full-stack: backend NestJS + app móvil Expo.

> Simple de usar, complejo de falsificar. Ver la visión completa en [`ARCHITECTURE_V3.md`](ARCHITECTURE_V3.md).

## 📍 Empieza aquí

- **Visión (qué debe ser):** [`VERITT_V8_VISION.md`](VERITT_V8_VISION.md) — el Documento Maestro V8.0.
- **Estado (qué existe hoy):** [`VERITT_MASTER.md`](VERITT_MASTER.md) — verificado contra el código, con el roadmap.
- **El delta entre ambos:** [`GAP_V8_VS_CODE.md`](GAP_V8_VS_CODE.md).

## 📚 Documentación viva

| Documento | Para qué |
|---|---|
| [`VERITT_V8_VISION.md`](VERITT_V8_VISION.md) | 🟢 **Visión oficial (V8.0).** Qué debe ser Veritt. Reemplaza a ARCHITECTURE_V3. |
| [`VERITT_MASTER.md`](VERITT_MASTER.md) | 🟢 **Estado** verificado vs código, riesgos y roadmap. |
| [`GAP_V8_VS_CODE.md`](GAP_V8_VS_CODE.md) | 🟢 Qué del V8.0 ya existe / falta / delta de esfuerzo. |
| [`INVENTORY_COSTING.md`](INVENTORY_COSTING.md) | Referencia técnica del costeo por lotes (FIFO). |
| [`FRONTEND_ANALYSIS.md`](FRONTEND_ANALYSIS.md) | Flujos de usuario y componentes reutilizables (móvil). |
| [`STATE_AND_ITERATION_PLAN.md`](STATE_AND_ITERATION_PLAN.md) | Análisis crítico extendido del estado e iteración. |
| [`CLAUDE.md`](CLAUDE.md) · [`unityrc.md`](unityrc.md) | Reglas de código para agentes/colaboradores. |
| [`postman/`](postman/) | Colección Postman — 128 endpoints, 1:1 con el backend. |
| [`docs/archive/`](docs/archive/) | Documentos históricos ya consolidados (no usar para estado actual). |

## 🗂️ Estructura del monorepo

```
monkeys-api/     # NestJS 11 + Prisma 7 + PostgreSQL (Supabase)
veritt-mobile/   # Expo SDK 52 + Expo Router + NativeWind + Zustand
postman/         # Colección de la API (generada)
docs/archive/    # Documentación histórica
```

Cada app tiene su propio `package.json` y `node_modules/`. No hay paquete compartido todavía.

## 🚀 Comandos rápidos

```bash
# Backend (API)
cd monkeys-api && npm run start:dev

# Móvil
cd veritt-mobile && npx expo start

# Migración Prisma
cd monkeys-api && npx prisma migrate dev --name <name>

# Regenerar colección Postman (tras cambiar endpoints)
node postman/generate-collection.mjs
```

## 🧩 Stack

- **Backend:** NestJS 11, Prisma 7, PostgreSQL (Supabase, pooler session-mode), JWT propio.
- **Móvil:** Expo SDK 52, Expo Router, NativeWind, Zustand.
- **Patrón backend:** controller → service → repository. **Móvil:** `api/client.ts` → `api/modules/*.api.ts`.

Detalle de convenciones y arquitectura en [`CLAUDE.md`](CLAUDE.md).
