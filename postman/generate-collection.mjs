/**
 * Generador de la colección Postman para el backend Veritt (monkeys-api).
 *
 * Fuente de verdad: el mapeo de endpoints hecho a partir de los controllers
 * de NestJS. Ejecutar con:  node postman/generate-collection.mjs
 * Produce: postman/Veritt-API.postman_collection.json
 *
 * Variables de colección usadas (ver al final): baseUrl, token, businessId,
 * y un id por recurso para poder encadenar pruebas.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Helper para declarar un request.
 * @param {object} cfg
 *   name: nombre visible
 *   method: GET|POST|PATCH|DELETE
 *   path: array de segmentos. Usa strings con {{var}} o ':param'.
 *   query: [{key,value,description?,disabled?}]
 *   body: objeto JS (se serializa) o undefined
 *   auth: true (default) usa Bearer heredado; false => noauth
 *   desc: descripción
 *   capture: nombre de variable de colección a setear desde response (campo opcional)
 *   captureFrom: ruta del campo en la respuesta (default igual a capture)
 */
function req(cfg) {
  const {
    name,
    method,
    path,
    query = [],
    body,
    auth = true,
    desc = '',
    capture,
    captureFrom,
  } = cfg;

  const urlRaw =
    '{{baseUrl}}/' +
    path.join('/') +
    (query.length
      ? '?' + query.map((q) => `${q.key}=${q.value}`).join('&')
      : '');

  const item = {
    name,
    request: {
      method,
      header: [],
      url: {
        raw: urlRaw,
        host: ['{{baseUrl}}'],
        path: path.slice(),
        ...(query.length
          ? {
              query: query.map((q) => ({
                key: q.key,
                value: q.value,
                description: q.description || '',
                disabled: q.disabled || false,
              })),
            }
          : {}),
      },
      description: desc,
    },
    response: [],
  };

  if (body !== undefined) {
    item.request.header.push({
      key: 'Content-Type',
      value: 'application/json',
    });
    item.request.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }

  if (auth === false) {
    item.request.auth = { type: 'noauth' };
  }

  if (capture) {
    const field = captureFrom || capture;
    item.event = [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'try {',
            '  const json = pm.response.json();',
            `  const val = ${field.includes('.') ? `json.${field}` : `json.${field}`};`,
            '  if (val) {',
            `    pm.collectionVariables.set('${capture}', val);`,
            `    console.log('Guardado ${capture} =', val);`,
            '  }',
            '} catch (e) { console.log('+"'No JSON response'"+'); }',
          ],
        },
      },
    ];
  }

  return item;
}

const B = ['businesses', '{{businessId}}']; // prefijo de negocio reutilizable

const collection = {
  info: {
    _postman_id: 'veritt-monkeys-api-collection',
    name: 'Veritt API (monkeys-api)',
    description:
      'Colección completa del backend Veritt (NestJS). Prefijo global /api/v1.\n\n' +
      '## Cómo usar\n' +
      '1. Ejecuta **Auth > Register** o **Auth > Login** — el token se guarda solo en la variable `token`.\n' +
      '2. Ejecuta **Businesses > Create business** o **List businesses** — guarda `businessId` automáticamente.\n' +
      '3. El resto de endpoints usan `{{baseUrl}}`, `{{businessId}}` y el `Bearer {{token}}` heredado.\n\n' +
      'Variables editables en la pestaña *Variables* de la colección.\n\n' +
      'Nota: el `ValidationPipe` global usa `forbidNonWhitelisted: true` — no envíes campos fuera del DTO o dará 400.',
    schema:
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: {
    type: 'bearer',
    bearer: [{ key: 'token', value: '{{token}}', type: 'string' }],
  },
  event: [],
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3000/api/v1' },
    { key: 'token', value: '' },
    { key: 'businessId', value: '' },
    { key: 'userId', value: '' },
    { key: 'memberId', value: '' },
    { key: 'areaId', value: '' },
    { key: 'locationId', value: '' },
    { key: 'materialId', value: '' },
    { key: 'productId', value: '' },
    { key: 'recipeVersionId', value: '' },
    { key: 'paymentMethodId', value: '' },
    { key: 'staffId', value: '' },
    { key: 'supplierId', value: '' },
    { key: 'purchaseOrderId', value: '' },
    { key: 'receiptId', value: '' },
    { key: 'supplierInvoiceId', value: '' },
    { key: 'saleId', value: '' },
    { key: 'processId', value: '' },
    { key: 'executionId', value: '' },
    { key: 'shiftId', value: '' },
    { key: 'breakId', value: '' },
    { key: 'paymentId', value: '' },
    { key: 'notificationId', value: '' },
    { key: 'openingId', value: '' },
    { key: 'closingId', value: '' },
    { key: 'reportId', value: '' },
    { key: 'reconciliationId', value: '' },
    { key: 'fopId', value: '' },
    { key: 'amdId', value: '' },
    { key: 'today', value: '2026-06-09' },
  ],
  item: [],
};

// ---------------------------------------------------------------------------
// 1. Health
// ---------------------------------------------------------------------------
collection.item.push({
  name: '00 · Health',
  item: [
    req({
      name: 'Root (hello)',
      method: 'GET',
      path: [''],
      auth: false,
      desc: 'GET /api/v1/ — string de salud (AppService.getHello).',
    }),
  ],
});

// ---------------------------------------------------------------------------
// 2. Auth
// ---------------------------------------------------------------------------
collection.item.push({
  name: '01 · Auth',
  item: [
    req({
      name: 'Register',
      method: 'POST',
      path: ['auth', 'register'],
      auth: false,
      body: {
        email: 'owner@veritt.com',
        password: 'secret123',
        fullName: 'Omar Carrasco',
      },
      desc: 'Crea usuario. Devuelve { accessToken, user }. Guarda token automáticamente.',
      capture: 'token',
      captureFrom: 'accessToken',
    }),
    req({
      name: 'Login',
      method: 'POST',
      path: ['auth', 'login'],
      auth: false,
      body: { email: 'owner@veritt.com', password: 'secret123' },
      desc: 'Login. Devuelve { accessToken, user }. Guarda token automáticamente.',
      capture: 'token',
      captureFrom: 'accessToken',
    }),
    req({
      name: 'Me',
      method: 'GET',
      path: ['auth', 'me'],
      desc: 'Usuario actual del JWT { id, email }.',
    }),
  ],
});

// ---------------------------------------------------------------------------
// 3. Users
// ---------------------------------------------------------------------------
collection.item.push({
  name: '02 · Users',
  item: [
    req({
      name: 'Get user by id',
      method: 'GET',
      path: ['users', '{{userId}}'],
      desc: 'GET /users/:id',
    }),
  ],
});

// ---------------------------------------------------------------------------
// 4. Businesses
// ---------------------------------------------------------------------------
collection.item.push({
  name: '03 · Businesses',
  item: [
    req({
      name: 'Create business',
      method: 'POST',
      path: ['businesses'],
      body: {
        name: 'Mi Restaurante',
        slug: 'mi-restaurante',
        businessType: 'restaurant',
        description: 'Comida mexicana',
        timezone: 'America/Mexico_City',
        defaultCurrency: 'MXN',
        city: 'CDMX',
        state: 'CDMX',
        operationalScheduleJson: { mon: '09:00-22:00' },
        operationalDayCutoffHour: 4,
      },
      desc: 'Crea negocio (membership owner + onboarding + location por defecto). Guarda businessId.',
      capture: 'businessId',
      captureFrom: 'id',
    }),
    req({
      name: 'List businesses',
      method: 'GET',
      path: ['businesses'],
      desc: 'Negocios del usuario actual. Incluye userRole.',
    }),
    req({
      name: 'Get business',
      method: 'GET',
      path: B,
      desc: 'GET /businesses/:businessId',
    }),
    req({
      name: 'Update business',
      method: 'PATCH',
      path: B,
      body: { name: 'Nuevo nombre', operationalDayCutoffHour: 5 },
      desc: 'Actualiza negocio (el slug no es editable).',
    }),
  ],
});

// ---------------------------------------------------------------------------
// 5. Memberships
// ---------------------------------------------------------------------------
collection.item.push({
  name: '04 · Members',
  item: [
    req({
      name: 'List members',
      method: 'GET',
      path: [...B, 'members'],
    }),
    req({
      name: 'Add member',
      method: 'POST',
      path: [...B, 'members'],
      body: { email: 'empleado@veritt.com', role: 'R3_POS' },
      desc: 'Roles: R1_INVENTORY | R2_CASH | R3_POS | R4_MANAGER | R5_ADMIN | R6_OWNER | VERITT_STAFF',
      capture: 'memberId',
      captureFrom: 'id',
    }),
    req({
      name: 'Update member',
      method: 'PATCH',
      path: [...B, 'members', '{{memberId}}'],
      body: { role: 'R5_ADMIN', status: 'ACTIVE' },
      desc: 'status: ACTIVE | INVITED | INACTIVE',
    }),
  ],
});

// ---------------------------------------------------------------------------
// 6. Onboarding
// ---------------------------------------------------------------------------
collection.item.push({
  name: '05 · Onboarding',
  item: [
    req({
      name: 'Get onboarding',
      method: 'GET',
      path: [...B, 'onboarding'],
    }),
    req({
      name: 'Update onboarding',
      method: 'PATCH',
      path: [...B, 'onboarding'],
      body: {
        status: 'IN_PROGRESS',
        currentStep: 'staff',
        completionPercentage: 25,
        generalInfoCompleted: true,
      },
      desc: 'status: DRAFT|IN_PROGRESS|READY. currentStep: general_info|staff|products|ingredients|recipes|fixed_costs|areas|providers',
    }),
  ],
});

// ---------------------------------------------------------------------------
// 7. Areas
// ---------------------------------------------------------------------------
collection.item.push({
  name: '06 · Areas',
  item: [
    req({ name: 'List areas', method: 'GET', path: [...B, 'areas'] }),
    req({
      name: 'Get area',
      method: 'GET',
      path: [...B, 'areas', '{{areaId}}'],
    }),
    req({
      name: 'Create area',
      method: 'POST',
      path: [...B, 'areas'],
      body: {
        name: 'Cocina principal',
        type: 'KITCHEN',
        description: 'Área de producción',
      },
      desc: 'type: KITCHEN|BAR|DINING|CASH_REGISTER|WAREHOUSE|OFFICE|PRODUCTION|OTHER',
      capture: 'areaId',
      captureFrom: 'id',
    }),
    req({
      name: 'Update area',
      method: 'PATCH',
      path: [...B, 'areas', '{{areaId}}'],
      body: { name: 'Cocina actualizada', status: 'INACTIVE' },
      desc: 'status: ACTIVE|INACTIVE|ARCHIVED',
    }),
    req({
      name: 'Link location to area',
      method: 'POST',
      path: [...B, 'areas', '{{areaId}}', 'link-location'],
      body: { locationId: '{{locationId}}' },
    }),
  ],
});

// ---------------------------------------------------------------------------
// 8. Inventory
// ---------------------------------------------------------------------------
collection.item.push({
  name: '07 · Inventory',
  item: [
    // costing / lots
    req({
      name: 'Value summary',
      method: 'GET',
      path: [...B, 'inventory', 'value-summary'],
      desc: 'Valor total del inventario (LotCostingService).',
    }),
    req({
      name: 'Material value',
      method: 'GET',
      path: [...B, 'inventory', 'materials', '{{materialId}}', 'value'],
      desc: 'Valor de inventario de un material lote por lote.',
    }),
    req({
      name: 'Material cost-quote (FIFO)',
      method: 'GET',
      path: [...B, 'inventory', 'materials', '{{materialId}}', 'cost-quote'],
      query: [
        { key: 'qty', value: '5' },
        { key: 'locationId', value: '{{locationId}}' },
      ],
      desc: 'Simula el costo de consumir qty en una ubicación (FIFO).',
    }),
    req({
      name: 'Drift check',
      method: 'GET',
      path: [...B, 'inventory', 'drift'],
      desc: 'Detecta divergencia entre cache y verdad operativa (gate del AMD).',
    }),
    req({
      name: 'List categories',
      method: 'GET',
      path: [...B, 'inventory', 'categories'],
    }),
    // locations
    req({
      name: 'List locations',
      method: 'GET',
      path: [...B, 'inventory', 'locations'],
    }),
    req({
      name: 'Create location',
      method: 'POST',
      path: [...B, 'inventory', 'locations'],
      body: { name: 'Almacén central', type: 'WAREHOUSE' },
      desc: 'type: MAIN|WAREHOUSE|RESTAURANT|KITCHEN|OTHER',
      capture: 'locationId',
      captureFrom: 'id',
    }),
    req({
      name: 'Update location',
      method: 'PATCH',
      path: [...B, 'inventory', 'locations', '{{locationId}}'],
      body: { name: 'Almacén norte', status: 'INACTIVE' },
    }),
    // materials
    req({
      name: 'List materials',
      method: 'GET',
      path: [...B, 'inventory', 'materials'],
    }),
    req({
      name: 'Get material',
      method: 'GET',
      path: [...B, 'inventory', 'materials', '{{materialId}}'],
    }),
    req({
      name: 'Create material',
      method: 'POST',
      path: [...B, 'inventory', 'materials'],
      body: {
        name: 'Harina',
        baseUnit: 'kg',
        kind: 'RAW',
        category: 'Secos',
        sku: 'HAR-001',
        reorderFrequencyDays: 7,
        minStock: 5,
      },
      desc: 'kind: RAW (default, se compra) | TRANSFORMED (semi-elaborado interno: carne marinada, aderezos; usable en recetas).',
      capture: 'materialId',
      captureFrom: 'id',
    }),
    req({
      name: 'Update material',
      method: 'PATCH',
      path: [...B, 'inventory', 'materials', '{{materialId}}'],
      body: { minStock: 10, status: 'ACTIVE', kind: 'RAW' },
    }),
    req({
      name: 'Receive material lot',
      method: 'POST',
      path: [...B, 'inventory', 'materials', '{{materialId}}', 'receipts'],
      body: {
        locationId: '{{locationId}}',
        quantity: 50,
        unitCost: 12.5,
        lotCode: 'L-2026-06',
        receivedAt: '{{today}}',
        note: 'Compra directa',
      },
    }),
    req({
      name: 'Adjust material stock',
      method: 'POST',
      path: [...B, 'inventory', 'materials', '{{materialId}}', 'adjustments'],
      body: {
        locationId: '{{locationId}}',
        direction: 'OUT',
        quantity: 3,
        note: 'Merma',
      },
      desc: 'direction: IN | OUT',
    }),
    req({
      name: 'Transfer material stock',
      method: 'POST',
      path: [...B, 'inventory', 'materials', '{{materialId}}', 'transfers'],
      body: {
        fromLocationId: '{{locationId}}',
        toLocationId: '{{locationId}}',
        quantity: 10,
        note: 'Reabasto',
      },
    }),
    // FTI — insumo transformado (solo kind=TRANSFORMED)
    req({
      name: 'Define material recipe (FTI)',
      method: 'POST',
      path: [...B, 'inventory', 'materials', '{{materialId}}', 'recipe'],
      body: {
        outputQuantity: 1,
        note: 'Receta de producción de la carne marinada',
        items: [
          { materialId: '{{materialId}}', quantity: 1, wastePercent: 0 },
        ],
      },
      desc: 'Receta de producción de un insumo TRANSFORMED: qué crudos consume. Cambia el materialId de items por un insumo RAW real.',
    }),
    req({
      name: 'Produce transformed material (FTI)',
      method: 'POST',
      path: [...B, 'inventory', 'materials', '{{materialId}}', 'production'],
      body: {
        locationId: '{{locationId}}',
        quantity: 3,
        note: 'Producción de carne marinada',
      },
      desc: 'Produce el insumo transformado consumiendo los crudos de su receta activa (FIFO). Crea un lote con costo real.',
    }),
    // products
    req({
      name: 'List products',
      method: 'GET',
      path: [...B, 'inventory', 'products'],
    }),
    req({
      name: 'Get product',
      method: 'GET',
      path: [...B, 'inventory', 'products', '{{productId}}'],
    }),
    req({
      name: 'Create product',
      method: 'POST',
      path: [...B, 'inventory', 'products'],
      body: {
        name: 'Pizza Margarita',
        type: 'RECIPE',
        category: 'Pizzas',
        stockUnit: 'unidad',
        estimatedDailySalesVolume: 20,
        minStock: 0,
        makeToOrder: false,
      },
      desc: 'type: DIRECT | RECIPE. makeToOrder=true (solo RECIPE): producto al momento, sin stock de terminado; la venta descuenta insumos de la receta.',
      capture: 'productId',
      captureFrom: 'id',
    }),
    req({
      name: 'Update product',
      method: 'PATCH',
      path: [...B, 'inventory', 'products', '{{productId}}'],
      body: { category: 'Especiales', status: 'ACTIVE', makeToOrder: false },
    }),
    req({
      name: 'Add product price',
      method: 'POST',
      path: [...B, 'inventory', 'products', '{{productId}}', 'prices'],
      body: {
        price: 120,
        effectiveFrom: '{{today}}',
        changeReason: 'Ajuste de inflación',
      },
    }),
    req({
      name: 'Add product manual cost',
      method: 'POST',
      path: [...B, 'inventory', 'products', '{{productId}}', 'manual-costs'],
      body: {
        materialCost: 30,
        directLaborCost: 10,
        allocatedCifCost: 5,
        totalCost: 45,
        effectiveFrom: '{{today}}',
        changeReason: 'Costeo manual',
      },
    }),
    req({
      name: 'Create recipe version',
      method: 'POST',
      path: [
        ...B,
        'inventory',
        'products',
        '{{productId}}',
        'recipe-versions',
      ],
      body: {
        effectiveFrom: '{{today}}',
        directLaborCost: 8,
        allocatedCifCost: 4,
        note: 'Receta v2',
        items: [
          { materialId: '{{materialId}}', quantity: 0.25, wastePercent: 5 },
        ],
      },
      capture: 'recipeVersionId',
      captureFrom: 'id',
    }),
    req({
      name: 'Receive product lot',
      method: 'POST',
      path: [...B, 'inventory', 'products', '{{productId}}', 'receipts'],
      body: {
        locationId: '{{locationId}}',
        quantity: 30,
        producedAt: '{{today}}',
        totalCost: 45,
        note: 'Lote producido',
      },
    }),
    req({
      name: 'Create production batch',
      method: 'POST',
      path: [
        ...B,
        'inventory',
        'products',
        '{{productId}}',
        'production-batches',
      ],
      body: {
        locationId: '{{locationId}}',
        recipeVersionId: '{{recipeVersionId}}',
        quantity: 20,
        producedAt: '{{today}}',
        directLaborCost: 8,
        allocatedCifCost: 4,
        note: 'Producción mañana',
      },
    }),
    req({
      name: 'Adjust product stock',
      method: 'POST',
      path: [...B, 'inventory', 'products', '{{productId}}', 'adjustments'],
      body: {
        locationId: '{{locationId}}',
        direction: 'OUT',
        quantity: 2,
        note: 'Producto dañado',
      },
    }),
    req({
      name: 'Transfer product stock',
      method: 'POST',
      path: [...B, 'inventory', 'products', '{{productId}}', 'transfers'],
      body: {
        fromLocationId: '{{locationId}}',
        toLocationId: '{{locationId}}',
        quantity: 5,
        note: 'Reubicación',
      },
    }),
  ],
});

// ---------------------------------------------------------------------------
// 9. Payment methods
// ---------------------------------------------------------------------------
collection.item.push({
  name: '08 · Payment Methods',
  item: [
    req({
      name: 'List payment methods',
      method: 'GET',
      path: [...B, 'payment-methods'],
    }),
    req({
      name: 'Create payment method',
      method: 'POST',
      path: [...B, 'payment-methods'],
      body: {
        name: 'Terminal BBVA',
        type: 'CARD_TERMINAL',
        terminalReference: 'T-001',
      },
      desc: 'type: CASH|CARD_TERMINAL|BANK_TRANSFER|OTHER',
      capture: 'paymentMethodId',
      captureFrom: 'id',
    }),
    req({
      name: 'Update payment method',
      method: 'PATCH',
      path: [...B, 'payment-methods', '{{paymentMethodId}}'],
      body: { name: 'Terminal actualizada', status: 'INACTIVE' },
    }),
  ],
});

// ---------------------------------------------------------------------------
// 10. Staff
// ---------------------------------------------------------------------------
collection.item.push({
  name: '09 · Staff',
  item: [
    req({
      name: 'Create staff',
      method: 'POST',
      path: [...B, 'staff'],
      body: {
        fullName: 'Juan Pérez',
        operationalRole: 'Cocinero',
        shift: 'Matutino',
        systemAccessLevel: 'OPERATOR',
        username: 'juanp',
        password: 'secret6',
        phoneNumber: '5512345678',
        email: 'juan@veritt.com',
        compensation: {
          salaryAmount: 6000,
          salaryCurrency: 'MXN',
          payrollFrequency: 'WEEKLY',
          firstPaymentDate: '2026-06-13',
          weeklyPayDay: 5,
        },
      },
      desc: 'systemAccessLevel: NONE|OPERATOR|SUPERVISOR|ADMIN. payrollFrequency: DAILY|WEEKLY|BIWEEKLY|SEMIMONTHLY|MONTHLY',
      capture: 'staffId',
      captureFrom: 'id',
    }),
    req({ name: 'List staff', method: 'GET', path: [...B, 'staff'] }),
    req({
      name: 'Get staff',
      method: 'GET',
      path: [...B, 'staff', '{{staffId}}'],
    }),
    req({
      name: 'Staff compensation history',
      method: 'GET',
      path: [...B, 'staff', '{{staffId}}', 'compensation-history'],
    }),
    req({
      name: 'Update staff',
      method: 'PATCH',
      path: [...B, 'staff', '{{staffId}}'],
      body: {
        operationalRole: 'Jefe de cocina',
        status: 'ACTIVE',
        compensation: { salaryAmount: 7000, payrollFrequency: 'BIWEEKLY' },
      },
    }),
  ],
});

// ---------------------------------------------------------------------------
// 11. Payroll
// ---------------------------------------------------------------------------
collection.item.push({
  name: '10 · Payroll',
  item: [
    req({
      name: 'Upcoming payments',
      method: 'GET',
      path: [...B, 'payroll', 'payments', 'upcoming'],
    }),
    req({
      name: 'Payment history',
      method: 'GET',
      path: [...B, 'payroll', 'payments', 'history'],
    }),
    req({
      name: 'Update payment',
      method: 'PATCH',
      path: [...B, 'payroll', 'payments', '{{paymentId}}'],
      body: { status: 'PAID', paidAt: '{{today}}', notes: 'Pago en efectivo' },
      desc: 'status: PENDING|PAID|SKIPPED',
    }),
  ],
});

// ---------------------------------------------------------------------------
// 12. Suppliers
// ---------------------------------------------------------------------------
collection.item.push({
  name: '11 · Suppliers',
  item: [
    req({
      name: 'List suppliers',
      method: 'GET',
      path: [...B, 'suppliers'],
      query: [{ key: 'status', value: 'ACTIVE', disabled: true }],
    }),
    req({
      name: 'Get supplier',
      method: 'GET',
      path: [...B, 'suppliers', '{{supplierId}}'],
    }),
    req({
      name: 'Create supplier',
      method: 'POST',
      path: [...B, 'suppliers'],
      body: {
        name: 'Distribuidora XYZ',
        contactName: 'Ana López',
        email: 'ventas@xyz.com',
        phone: '5598765432',
        rfc: 'XYZ010101AAA',
        address: 'Av. Reforma 100',
        notes: 'Entrega martes y viernes',
      },
      capture: 'supplierId',
      captureFrom: 'id',
    }),
    req({
      name: 'Update supplier',
      method: 'PATCH',
      path: [...B, 'suppliers', '{{supplierId}}'],
      body: { phone: '5500000000', status: 'INACTIVE' },
    }),
  ],
});

// ---------------------------------------------------------------------------
// 13. Purchase orders
// ---------------------------------------------------------------------------
collection.item.push({
  name: '12 · Purchase Orders',
  item: [
    req({
      name: 'Create purchase order',
      method: 'POST',
      path: [...B, 'purchase-orders'],
      body: {
        supplierId: '{{supplierId}}',
        currency: 'MXN',
        notes: 'Pedido semanal',
        items: [
          {
            materialId: '{{materialId}}',
            quantityOrdered: 100,
            estimatedUnitCost: 12.5,
            notes: 'urgente',
          },
        ],
      },
      capture: 'purchaseOrderId',
      captureFrom: 'id',
    }),
    req({
      name: 'List purchase orders',
      method: 'GET',
      path: [...B, 'purchase-orders'],
      query: [
        { key: 'status', value: 'DRAFT', disabled: true },
        { key: 'supplierId', value: '{{supplierId}}', disabled: true },
      ],
    }),
    req({
      name: 'Get purchase order',
      method: 'GET',
      path: [...B, 'purchase-orders', '{{purchaseOrderId}}'],
    }),
    req({
      name: 'Update purchase order',
      method: 'PATCH',
      path: [...B, 'purchase-orders', '{{purchaseOrderId}}'],
      body: { notes: 'Cambio de fecha de entrega' },
    }),
    req({
      name: 'Send purchase order',
      method: 'POST',
      path: [...B, 'purchase-orders', '{{purchaseOrderId}}', 'send'],
    }),
    req({
      name: 'Cancel purchase order',
      method: 'POST',
      path: [...B, 'purchase-orders', '{{purchaseOrderId}}', 'cancel'],
    }),
  ],
});

// ---------------------------------------------------------------------------
// 14. Receipts
// ---------------------------------------------------------------------------
collection.item.push({
  name: '13 · Receipts',
  item: [
    req({
      name: 'Create receipt',
      method: 'POST',
      path: [...B, 'receipts'],
      body: {
        purchaseOrderId: '{{purchaseOrderId}}',
        locationId: '{{locationId}}',
        notes: 'Recepción parcial',
        items: [
          {
            materialId: '{{materialId}}',
            quantityReceived: 90,
            actualUnitCost: 12.8,
          },
        ],
      },
      capture: 'receiptId',
      captureFrom: 'id',
    }),
    req({
      name: 'List receipts',
      method: 'GET',
      path: [...B, 'receipts'],
      query: [
        { key: 'purchaseOrderId', value: '{{purchaseOrderId}}', disabled: true },
        { key: 'from', value: '2026-06-01', disabled: true },
        { key: 'to', value: '2026-06-30', disabled: true },
      ],
    }),
    req({
      name: 'Get receipt',
      method: 'GET',
      path: [...B, 'receipts', '{{receiptId}}'],
    }),
    req({
      name: 'Authorize receipt',
      method: 'POST',
      path: [...B, 'receipts', '{{receiptId}}', 'authorize'],
    }),
    req({
      name: 'Reject receipt',
      method: 'POST',
      path: [...B, 'receipts', '{{receiptId}}', 'reject'],
      body: { reason: 'Mercancía dañada' },
    }),
    req({
      name: 'Cancel receipt',
      method: 'POST',
      path: [...B, 'receipts', '{{receiptId}}', 'cancel'],
      body: { reason: 'Error de captura', comment: 'Duplicado' },
    }),
  ],
});

// ---------------------------------------------------------------------------
// 15. Supplier invoices
// ---------------------------------------------------------------------------
collection.item.push({
  name: '14 · Supplier Invoices',
  item: [
    req({
      name: 'Create supplier invoice',
      method: 'POST',
      path: [...B, 'supplier-invoices'],
      body: {
        supplierId: '{{supplierId}}',
        receiptId: '{{receiptId}}',
        cfdiUuid: 'ABCD-1234-EFGH-5678',
        totalAmount: 1160.0,
        currency: 'MXN',
        invoiceDate: '2026-06-08',
        discrepancyNote: 'Diferencia de $10 vs recepción',
      },
      capture: 'supplierInvoiceId',
      captureFrom: 'id',
    }),
    req({
      name: 'List supplier invoices',
      method: 'GET',
      path: [...B, 'supplier-invoices'],
      query: [
        { key: 'supplierId', value: '{{supplierId}}', disabled: true },
        { key: 'status', value: 'PENDING', disabled: true },
      ],
    }),
    req({
      name: 'Receipt total (for matching)',
      method: 'GET',
      path: [...B, 'supplier-invoices', 'receipt-total', '{{receiptId}}'],
    }),
    req({
      name: 'Get supplier invoice',
      method: 'GET',
      path: [...B, 'supplier-invoices', '{{supplierInvoiceId}}'],
    }),
    req({
      name: 'Update supplier invoice',
      method: 'PATCH',
      path: [...B, 'supplier-invoices', '{{supplierInvoiceId}}'],
      body: { cfdiUuid: 'EFGH-5678-IJKL-9012', status: 'VERIFIED' },
      desc: 'status: PENDING|VERIFIED|DISPUTED',
    }),
    req({
      name: 'Verify supplier invoice',
      method: 'POST',
      path: [...B, 'supplier-invoices', '{{supplierInvoiceId}}', 'verify'],
    }),
    req({
      name: 'Dispute supplier invoice',
      method: 'POST',
      path: [...B, 'supplier-invoices', '{{supplierInvoiceId}}', 'dispute'],
      body: { reason: 'Monto no coincide con recepción' },
    }),
    req({
      name: 'Delete supplier invoice (soft)',
      method: 'POST',
      path: [...B, 'supplier-invoices', '{{supplierInvoiceId}}', 'delete'],
      body: { reason: 'Factura cargada por error' },
    }),
  ],
});

// ---------------------------------------------------------------------------
// 16. Sales / POS
// ---------------------------------------------------------------------------
collection.item.push({
  name: '15 · Sales (POS)',
  item: [
    req({
      name: 'Create sale',
      method: 'POST',
      path: [...B, 'sales'],
      body: {
        areaId: '{{areaId}}',
        operatorStaffId: '{{staffId}}',
        items: [{ productId: '{{productId}}', quantity: 2, unitPrice: 120 }],
        payments: [
          {
            paymentMethodId: '{{paymentMethodId}}',
            amount: 240,
            reference: 'TICKET-001',
          },
        ],
        taxAmount: 0,
        note: 'Mesa 5',
      },
      capture: 'saleId',
      captureFrom: 'id',
    }),
    req({
      name: 'List sales',
      method: 'GET',
      path: [...B, 'sales'],
      query: [
        { key: 'status', value: 'COMPLETED', disabled: true },
        { key: 'areaId', value: '{{areaId}}', disabled: true },
        { key: 'operatorStaffId', value: '{{staffId}}', disabled: true },
        { key: 'from', value: '2026-06-01', disabled: true },
        { key: 'to', value: '2026-06-30', disabled: true },
      ],
    }),
    req({
      name: 'Daily summary',
      method: 'GET',
      path: [...B, 'sales', 'daily-summary'],
      query: [{ key: 'date', value: '{{today}}' }],
    }),
    req({
      name: 'Period summary',
      method: 'GET',
      path: [...B, 'sales', 'period-summary'],
      query: [
        { key: 'from', value: '2026-06-01' },
        { key: 'to', value: '2026-06-30' },
      ],
    }),
    req({
      name: 'Product revenue',
      method: 'GET',
      path: [...B, 'sales', 'product-revenue'],
      query: [
        { key: 'from', value: '2026-06-01' },
        { key: 'to', value: '2026-06-30' },
      ],
    }),
    req({
      name: 'Theoretical consumption',
      method: 'GET',
      path: [...B, 'sales', 'theoretical-consumption'],
      query: [
        { key: 'from', value: '2026-06-01' },
        { key: 'to', value: '2026-06-30' },
      ],
    }),
    req({
      name: 'Get sale',
      method: 'GET',
      path: [...B, 'sales', '{{saleId}}'],
    }),
    req({
      name: 'Cancel sale',
      method: 'POST',
      path: [...B, 'sales', '{{saleId}}', 'cancel'],
      body: { reason: 'Error en el cobro' },
    }),
  ],
});

// ---------------------------------------------------------------------------
// 17. Processes
// ---------------------------------------------------------------------------
collection.item.push({
  name: '16 · Processes',
  item: [
    req({ name: 'List processes', method: 'GET', path: [...B, 'processes'] }),
    req({
      name: 'List executions',
      method: 'GET',
      path: [...B, 'processes', 'executions'],
      query: [
        { key: 'processId', value: '{{processId}}', disabled: true },
        { key: 'status', value: 'IN_PROGRESS', disabled: true },
        { key: 'from', value: '2026-06-01', disabled: true },
        { key: 'to', value: '2026-06-30', disabled: true },
      ],
    }),
    req({
      name: 'Get process',
      method: 'GET',
      path: [...B, 'processes', '{{processId}}'],
    }),
    req({
      name: 'Create process',
      method: 'POST',
      path: [...B, 'processes'],
      body: {
        name: 'Apertura de turno',
        description: 'Checklist de apertura',
        isBlocking: true,
        steps: [
          {
            name: 'Encender equipos',
            stepOrder: 1,
            requiredRole: 'R3_POS',
            assignedAreaId: '{{areaId}}',
          },
          {
            name: 'Verificar caja',
            description: 'Conteo inicial',
            stepOrder: 2,
          },
        ],
      },
      desc: 'requiredRole: R1_INVENTORY|R2_CASH|R3_POS|R4_MANAGER|R5_ADMIN|R6_OWNER|VERITT_STAFF',
      capture: 'processId',
      captureFrom: 'id',
    }),
    req({
      name: 'Update process',
      method: 'PATCH',
      path: [...B, 'processes', '{{processId}}'],
      body: { name: 'Apertura v2', status: 'INACTIVE' },
      desc: 'status: ACTIVE|INACTIVE|ARCHIVED',
    }),
    req({
      name: 'Start execution',
      method: 'POST',
      path: [...B, 'processes', '{{processId}}', 'executions'],
      body: { areaId: '{{areaId}}', notes: 'Inicio de turno mañana' },
      capture: 'executionId',
      captureFrom: 'id',
    }),
    req({
      name: 'Complete execution',
      method: 'PATCH',
      path: [
        ...B,
        'processes',
        '{{processId}}',
        'executions',
        '{{executionId}}',
        'complete',
      ],
      body: { notes: 'Completado sin incidencias' },
    }),
  ],
});

// ---------------------------------------------------------------------------
// 18. Time tracking (shifts)
// ---------------------------------------------------------------------------
collection.item.push({
  name: '17 · Shifts (Time Tracking)',
  item: [
    req({
      name: 'Clock in',
      method: 'POST',
      path: [...B, 'shifts', 'clock-in'],
      body: {
        staffProfileId: '{{staffId}}',
        areaId: '{{areaId}}',
        latitude: 19.43,
        longitude: -99.13,
      },
      capture: 'shiftId',
      captureFrom: 'id',
    }),
    req({
      name: 'Clock out',
      method: 'POST',
      path: [...B, 'shifts', '{{shiftId}}', 'clock-out'],
      body: { latitude: 19.43, longitude: -99.13, note: 'Fin de turno' },
    }),
    req({
      name: 'Start break',
      method: 'POST',
      path: [...B, 'shifts', '{{shiftId}}', 'breaks', 'start'],
      body: { type: 'MEAL' },
      desc: 'type: MEAL|REST|OTHER',
      capture: 'breakId',
      captureFrom: 'id',
    }),
    req({
      name: 'End break',
      method: 'POST',
      path: [...B, 'shifts', '{{shiftId}}', 'breaks', '{{breakId}}', 'end'],
    }),
    req({
      name: 'List shifts',
      method: 'GET',
      path: [...B, 'shifts'],
      query: [
        { key: 'staffProfileId', value: '{{staffId}}', disabled: true },
        { key: 'status', value: 'ACTIVE', disabled: true },
        { key: 'from', value: '2026-06-01', disabled: true },
        { key: 'to', value: '2026-06-30', disabled: true },
      ],
    }),
    req({
      name: 'Active shifts',
      method: 'GET',
      path: [...B, 'shifts', 'active'],
    }),
    req({
      name: 'Shifts summary',
      method: 'GET',
      path: [...B, 'shifts', 'summary'],
      query: [
        { key: 'from', value: '2026-06-01' },
        { key: 'to', value: '2026-06-30' },
      ],
    }),
    req({
      name: 'Get shift',
      method: 'GET',
      path: [...B, 'shifts', '{{shiftId}}'],
    }),
  ],
});

// ---------------------------------------------------------------------------
// 19. Daily chain (cadena diaria)
// ---------------------------------------------------------------------------
collection.item.push({
  name: '18 · Daily Chain (FAI→FCI→FID→FAF→FOP)',
  item: [
    req({
      name: 'Get status',
      method: 'GET',
      path: [...B, 'daily-chain', 'status'],
      query: [{ key: 'date', value: '{{today}}', disabled: true }],
    }),
    // FAI
    req({
      name: 'FAI · Create opening',
      method: 'POST',
      path: [...B, 'daily-chain', 'opening'],
      body: {
        locationId: '{{locationId}}',
        date: '{{today}}',
        items: [
          {
            materialId: '{{materialId}}',
            countedQuantity: 10.5,
            varianceNote: 'ok',
          },
        ],
      },
      capture: 'openingId',
      captureFrom: 'id',
    }),
    req({
      name: 'FAI · Get opening',
      method: 'GET',
      path: [...B, 'daily-chain', 'opening'],
      query: [
        { key: 'date', value: '{{today}}', disabled: true },
        { key: 'locationId', value: '{{locationId}}', disabled: true },
      ],
    }),
    req({
      name: 'FAI · Authorize opening',
      method: 'POST',
      path: [...B, 'daily-chain', 'opening', '{{openingId}}', 'authorize'],
    }),
    req({
      name: 'FAI · Reject opening',
      method: 'POST',
      path: [...B, 'daily-chain', 'opening', '{{openingId}}', 'reject'],
      body: { reason: 'Conteo incorrecto' },
    }),
    // FCI
    req({
      name: 'FCI · Create closing',
      method: 'POST',
      path: [...B, 'daily-chain', 'closing'],
      body: {
        locationId: '{{locationId}}',
        items: [{ materialId: '{{materialId}}', countedQuantity: 8 }],
      },
      capture: 'closingId',
      captureFrom: 'id',
    }),
    req({
      name: 'FCI · Get closing',
      method: 'GET',
      path: [...B, 'daily-chain', 'closing'],
      query: [{ key: 'date', value: '{{today}}', disabled: true }],
    }),
    req({
      name: 'FCI · Authorize closing',
      method: 'POST',
      path: [...B, 'daily-chain', 'closing', '{{closingId}}', 'authorize'],
    }),
    req({
      name: 'FCI · Reject closing',
      method: 'POST',
      path: [...B, 'daily-chain', 'closing', '{{closingId}}', 'reject'],
      body: { reason: 'Conteo de cierre incorrecto' },
    }),
    // FID
    req({
      name: 'FID · Get deviations',
      method: 'GET',
      path: [...B, 'daily-chain', 'deviations'],
      query: [{ key: 'date', value: '{{today}}', disabled: true }],
    }),
    req({
      name: 'FID · Classify deviations',
      method: 'PATCH',
      path: [...B, 'daily-chain', 'deviations', '{{reportId}}', 'classify'],
      body: {
        items: [
          { materialId: '{{materialId}}', cause: 'WASTE', note: 'merma' },
        ],
      },
      desc: 'cause: ERROR|WASTE|THEFT|ADJUSTMENT|OVERPRODUCTION|UNDERPRODUCTION|OTHER',
    }),
    req({
      name: 'FID · Approve deviations',
      method: 'POST',
      path: [...B, 'daily-chain', 'deviations', '{{reportId}}', 'approve'],
    }),
    // Saldo inicial de caja (candado C2)
    req({
      name: 'Cash opening · Get',
      method: 'GET',
      path: [...B, 'daily-chain', 'cash-opening'],
      query: [{ key: 'date', value: '{{today}}', disabled: true }],
    }),
    req({
      name: 'Cash opening · Declare (C2)',
      method: 'POST',
      path: [...B, 'daily-chain', 'cash-opening'],
      body: {
        date: '{{today}}',
        openingBalance: 1000,
        notes: 'Fondo de caja inicial',
      },
      desc: 'R2 declara el efectivo de apertura antes de la 1ª venta. Uno por día.',
    }),
    // FAF
    req({
      name: 'FAF · Get reconciliation',
      method: 'GET',
      path: [...B, 'daily-chain', 'reconciliation'],
      query: [{ key: 'date', value: '{{today}}', disabled: true }],
    }),
    req({
      name: 'FAF · Create reconciliation',
      method: 'POST',
      path: [...B, 'daily-chain', 'reconciliation'],
      body: {
        date: '{{today}}',
        cashDenominations: [
          { denomination: 100, quantity: 5 },
          { denomination: 50, quantity: 3 },
        ],
        terminalTotals: [
          {
            paymentMethodId: '{{paymentMethodId}}',
            reportedTotal: 1500,
            reference: 'TERM-01',
          },
        ],
        transferTotals: [{ reportedTotal: 800, folioReferences: 'SPEI-123' }],
      },
      capture: 'reconciliationId',
      captureFrom: 'id',
    }),
    req({
      name: 'FAF · Approve reconciliation',
      method: 'POST',
      path: [
        ...B,
        'daily-chain',
        'reconciliation',
        '{{reconciliationId}}',
        'approve',
      ],
    }),
    req({
      name: 'FAF · Reject reconciliation',
      method: 'POST',
      path: [
        ...B,
        'daily-chain',
        'reconciliation',
        '{{reconciliationId}}',
        'reject',
      ],
      body: { reason: 'Arqueo no cuadra' },
    }),
    // FOP
    req({
      name: 'FOP · Get',
      method: 'GET',
      path: [...B, 'daily-chain', 'fop'],
      query: [{ key: 'date', value: '{{today}}', disabled: true }],
      capture: 'fopId',
      captureFrom: 'id',
    }),
    req({
      name: 'FOP · Sign',
      method: 'POST',
      path: [...B, 'daily-chain', 'fop', '{{fopId}}', 'sign'],
      body: { discrepancyJustification: 'Diferencia justificada' },
      desc: 'Firmar el FOP cierra el día y dispara la generación del AMD (rollback si el AMD falla).',
    }),
    // history
    req({
      name: 'History',
      method: 'GET',
      path: [...B, 'daily-chain', 'history'],
      query: [
        { key: 'from', value: '2026-06-01' },
        { key: 'to', value: '2026-06-30' },
      ],
    }),
  ],
});

// ---------------------------------------------------------------------------
// 20. AMD (Archivo Maestro Diario)
// ---------------------------------------------------------------------------
collection.item.push({
  name: '19 · AMD (Archivo Maestro Diario)',
  item: [
    req({
      name: 'Get AMD (by day)',
      method: 'GET',
      path: [...B, 'amd'],
      query: [{ key: 'date', value: '{{today}}', disabled: true }],
      capture: 'amdId',
      captureFrom: 'id',
    }),
    req({
      name: 'AMD history',
      method: 'GET',
      path: [...B, 'amd', 'history'],
      query: [
        { key: 'from', value: '2026-06-01' },
        { key: 'to', value: '2026-06-30' },
      ],
    }),
    req({
      name: 'Get AMD by id',
      method: 'GET',
      path: [...B, 'amd', '{{amdId}}'],
    }),
    req({
      name: 'Verify AMD (hash / candado C6)',
      method: 'GET',
      path: [...B, 'amd', '{{amdId}}', 'verify'],
    }),
  ],
});

// ---------------------------------------------------------------------------
// 21. Notifications
// ---------------------------------------------------------------------------
collection.item.push({
  name: '20 · Notifications',
  item: [
    req({
      name: 'List notifications',
      method: 'GET',
      path: ['notifications'],
      query: [
        { key: 'businessId', value: '{{businessId}}', disabled: true },
        { key: 'status', value: 'UNREAD', disabled: true },
        { key: 'type', value: 'PAYROLL_DUE', disabled: true },
        { key: 'limit', value: '20', disabled: true },
      ],
      desc: 'type: PAYROLL_DUE|PAYROLL_OVERDUE|MATERIAL_LOW_STOCK|MATERIAL_OUT_OF_STOCK|PRODUCT_LOW_STOCK|PRODUCT_OUT_OF_STOCK',
    }),
    req({
      name: 'Mark as read',
      method: 'PATCH',
      path: ['notifications', '{{notificationId}}', 'read'],
    }),
  ],
});

// ---------------------------------------------------------------------------
// 22. Permissions (config de permisos por negocio — solo R6)
// ---------------------------------------------------------------------------
collection.item.push({
  name: '21 · Permissions (config por negocio)',
  item: [
    req({
      name: 'Get permission matrix',
      method: 'GET',
      path: [...B, 'permissions'],
      desc: 'Matriz efectiva del negocio: por cada rol, qué capacidades tiene (default vs override). Solo R6/dueño.',
    }),
    req({
      name: 'Set role capabilities',
      method: 'PUT',
      path: [...B, 'permissions', 'R4_MANAGER'],
      body: {
        capabilities: [
          'POS_OPERATE',
          'FINANCE_VIEW',
          'CHAIN_AUTHORIZE',
          'CHAIN_SIGN',
          'CONFIG_MANAGE',
        ],
      },
      desc: 'Override completo de las capacidades de un rol (:role en la URL). Capacidades: INVENTORY_WRITE, INVENTORY_ADJUST, POS_OPERATE, FINANCE_VIEW, CHAIN_AUTHORIZE, CHAIN_SIGN, FINANCE_MANAGE, STAFF_MANAGE, CONFIG_MANAGE, MEMBER_ADMIN.',
    }),
    req({
      name: 'Reset role to default',
      method: 'DELETE',
      path: [...B, 'permissions', 'R4_MANAGER'],
      desc: 'Borra el override del rol → vuelve al default en código.',
    }),
  ],
});

// ---------------------------------------------------------------------------
// Escribir archivo + conteo
// ---------------------------------------------------------------------------
const outPath = join(__dirname, 'Veritt-API.postman_collection.json');
writeFileSync(outPath, JSON.stringify(collection, null, 2));

let count = 0;
const walk = (items) =>
  items.forEach((it) => (it.item ? walk(it.item) : count++));
walk(collection.item);
console.log(`OK -> ${outPath}`);
console.log(`Folders: ${collection.item.length} | Requests: ${count}`);
