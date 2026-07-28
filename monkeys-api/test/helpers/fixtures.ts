/**
 * Builders de datos para los e2e de la cadena diaria.
 *
 * `setupBusinessScaffold` crea el escenario mínimo para ejercitar FAI→FOP:
 *   - owner  (rol R6_OWNER, puede firmar el FOP)
 *   - manager(rol R4_MANAGER, autoriza FAI/FCI/FID/FAF y firma FOP — distinto del operador)
 *   - operator (rol R1_INVENTORY, crea conteos físicos pero no autoriza)
 *   - business (con location MAIN por defecto)
 *   - 1 material con lote inicial (stock + costo para FIFO)
 *   - 1 product RECIPE que consume el material (para consumo teórico)
 *   - 1 payment method CASH (para el arqueo FAF)
 *
 * Todos los IDs salen de respuestas reales de la API — nada hardcodeado.
 */
import { INestApplication } from '@nestjs/common';
import { api, registerUser, RegisteredUser } from './app-harness';

export interface BusinessScaffold {
  owner: RegisteredUser;
  manager: RegisteredUser;
  operator: RegisteredUser;
  businessId: string;
  locationId: string;
  materialId: string;
  productId: string;
  recipeVersionId: string;
  paymentMethodId: string;
}

export async function setupBusinessScaffold(
  app: INestApplication,
): Promise<BusinessScaffold> {
  const owner = await registerUser(app);
  const manager = await registerUser(app);
  const operator = await registerUser(app);

  // Business (crea location MAIN por defecto)
  const bizRes = await api(app, owner.token)
    .post('/businesses')
    .send({
      name: 'Test Biz',
      slug: `test-biz-${Date.now()}`,
      timezone: 'America/Mexico_City',
      defaultCurrency: 'MXN',
      operationalDayCutoffHour: 4,
    })
    .expect(201);
  const businessId: string = bizRes.body.id;
  const locationId: string = bizRes.body.inventoryLocations[0].id;

  // Agregar manager (R4_MANAGER) y operator (R1_INVENTORY) — addMember requiere user existente
  await api(app, owner.token)
    .post(`/businesses/${businessId}/members`)
    .send({ email: manager.email, role: 'R4_MANAGER' })
    .expect(201);
  await api(app, owner.token)
    .post(`/businesses/${businessId}/members`)
    .send({ email: operator.email, role: 'R1_INVENTORY' })
    .expect(201);

  // Material + lote inicial (50 @ $12.50)
  const matRes = await api(app, owner.token)
    .post(`/businesses/${businessId}/inventory/materials`)
    .send({ name: 'Harina', baseUnit: 'kg', minStock: 5 })
    .expect(201);
  const materialId: string = matRes.body.id;

  await api(app, owner.token)
    .post(`/businesses/${businessId}/inventory/materials/${materialId}/receipts`)
    .send({ locationId, quantity: 50, unitCost: 12.5, lotCode: 'L-1' })
    .expect(201);

  // Product RECIPE + receta que usa 0.25kg del material
  const prodRes = await api(app, owner.token)
    .post(`/businesses/${businessId}/inventory/products`)
    .send({ name: 'Pizza', type: 'RECIPE', stockUnit: 'unidad' })
    .expect(201);
  const productId: string = prodRes.body.id;

  await api(app, owner.token)
    .post(`/businesses/${businessId}/inventory/products/${productId}/prices`)
    .send({ price: 120 })
    .expect(201);

  const recipeRes = await api(app, owner.token)
    .post(
      `/businesses/${businessId}/inventory/products/${productId}/recipe-versions`,
    )
    .send({
      items: [{ materialId, quantity: 0.25, wastePercent: 0 }],
    })
    .expect(201);
  const recipeVersionId: string = recipeRes.body.id;

  // Payment method CASH (para el FAF)
  const pmRes = await api(app, owner.token)
    .post(`/businesses/${businessId}/payment-methods`)
    .send({ name: 'Efectivo', type: 'CASH' })
    .expect(201);
  const paymentMethodId: string = pmRes.body.id;

  return {
    owner,
    manager,
    operator,
    businessId,
    locationId,
    materialId,
    productId,
    recipeVersionId,
    paymentMethodId,
  };
}

/**
 * Conduce la cadena completa FAI→FCI→FID→FAF hasta dejar el FOP generado
 * y SIN firmar. Devuelve el fopId. Útil para tests que solo quieren ejercitar
 * el paso de firma (p.ej. rollback del AMD) sin repetir todo el flujo.
 *
 * Sin ventas → consumo teórico 0 → FID sin items → desviación 0.
 */
export async function driveChainToFOP(
  app: INestApplication,
  s: BusinessScaffold,
): Promise<string> {
  const base = `/businesses/${s.businessId}/daily-chain`;
  const operator = api(app, s.operator.token);
  const manager = api(app, s.manager.token);

  // FAI
  const fai = await operator
    .post(`${base}/opening`)
    .send({
      locationId: s.locationId,
      items: [{ materialId: s.materialId, countedQuantity: 50 }],
    })
    .expect(201);
  await manager.post(`${base}/opening/${fai.body.id}/authorize`).expect(201);

  // FCI → FID auto-generado
  const fci = await operator
    .post(`${base}/closing`)
    .send({
      locationId: s.locationId,
      items: [{ materialId: s.materialId, countedQuantity: 50 }],
    })
    .expect(201);
  await manager.post(`${base}/closing/${fci.body.id}/authorize`).expect(201);

  // FID: clasificar y aprobar. El reporte arranca en PENDING_CLASSIFICATION
  // (el FID crea un item por material del closing, con desviación 0 sin ventas).
  // approve exige CLASSIFIED, así que SIEMPRE hay que clasificar primero.
  const fid = await manager.get(`${base}/deviations`).expect(200);
  const fidItems = (fid.body.items ?? []).map(
    (i: { materialId: string }) => ({
      materialId: i.materialId,
      cause: 'ADJUSTMENT',
      note: 'sin desviación (e2e)',
    }),
  );
  if (fidItems.length > 0) {
    await operator
      .patch(`${base}/deviations/${fid.body.id}/classify`)
      .send({ items: fidItems })
      .expect(200);
  }
  await manager.post(`${base}/deviations/${fid.body.id}/approve`).expect(201);

  // FAF → FOP auto-generado
  const faf = await operator
    .post(`${base}/reconciliation`)
    .send({
      cashDenominations: [{ denomination: 100, quantity: 0 }],
      terminalTotals: [],
      transferTotals: [],
    })
    .expect(201);
  await manager
    .post(`${base}/reconciliation/${faf.body.id}/approve`)
    .expect(201);

  const fop = await manager.get(`${base}/fop`).expect(200);
  return fop.body.id as string;
}
