# Tests e2e — Cadena diaria

Suite de integración que corre contra una **Postgres desechable** (no producción) para verificar números, bloqueos y el flujo FAI→FOP→AMD de verdad.

## Requisitos (una vez)

1. **Docker** corriendo (los tests levantan una Postgres en el puerto 5433).
2. Crear el `.env.test`:
   ```bash
   cp .env.test.example .env.test
   ```
   Ya apunta a la DB de test. **No pongas credenciales de producción aquí** — los tests truncan tablas.

## Correr

```bash
# Todo en uno: levanta DB, migra, corre e2e, baja DB
npm run test:e2e:full

# O por pasos (útil al iterar — deja la DB viva entre corridas):
npm run test:db:up      # levanta la Postgres de test
npm run test:e2e        # migra (globalSetup) + corre los specs
npm run test:db:down    # baja la DB y borra el volumen
```

## Qué cubre

| Archivo | Cubre |
|---|---|
| `daily-chain-access.e2e-spec.ts` | Control de acceso y bloqueos: 401 sin token, 403 a externos, separación de funciones (creador ≠ autorizador en FAI), gate de rol en firma de FOP, secuencialidad (no FCI sin FAI autorizado). **Alta confianza.** |
| `daily-chain-happy-path.e2e-spec.ts` | Recorrido feliz FAI→FCI→FID→FAF→FOP y que la firma genera un **AMD verificable** (hash, candado C6). Incluye un `it.todo` (ventas con consumo teórico > 0) y un test de rollback por implementar en vivo. |

## Arquitectura del harness

- `helpers/app-harness.ts` — arranca `AppModule` replicando `main.ts` (prefijo `api/v1` + `ValidationPipe`), `truncateAll()` entre suites, `registerUser()` y un cliente `api()` con Bearer.
- `helpers/fixtures.ts` — `setupBusinessScaffold()` crea owner/manager/operator + negocio + material con lote + producto con receta + método de pago.
- `global-setup.ts` — carga `.env.test` y corre `prisma migrate deploy` una vez.
- `load-test-env.ts` — carga `.env.test` en cada worker; **aborta si la URL no apunta a `:5433`** (guardarraíl anti-producción).

## Guardarraíles de seguridad

1. `PrismaService` exige `DATABASE_URL_SESSION` (ya no hay fallback a producción).
2. `load-test-env.ts` y `global-setup.ts` abortan si la DB no es la de test (`:5433`).
3. `.env.test` está gitignoreado.

## Estado

- ✅ Compilan contra los tipos reales del backend (`tsc --noEmit` limpio).
- ⏳ **Pendiente: ejecutarlos con Docker arriba** (no se pudieron correr en el entorno donde se escribieron). Primera corrida: `npm run test:e2e:full` y ajustar los asserts que dependan de shapes finos si algo no cuadra.
