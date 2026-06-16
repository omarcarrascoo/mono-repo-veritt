/**
 * Builders de datos para los e2e de la cadena diaria.
 *
 * `setupBusinessScaffold` crea el escenario mínimo para ejercitar FAI→FOP:
 *   - owner  (rol OWNER, puede firmar el FOP)
 *   - manager(rol ADMIN, autoriza FAI/FCI/FID/FAF — distinto del operador)
 *   - operator (rol OPERATOR, crea conteos pero no autoriza)
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

  // Agregar manager (ADMIN) y operator (OPERATOR) — addMember requiere user existente
  await api(app, owner.token)
    .post(`/businesses/${businessId}/members`)
    .send({ email: manager.email, role: 'ADMIN' })
    .expect(201);
  await api(app, owner.token)
    .post(`/businesses/${businessId}/members`)
    .send({ email: operator.email, role: 'OPERATOR' })
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
