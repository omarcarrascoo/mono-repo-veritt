import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  View,
} from 'react-native';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import { businessesApi } from '@/api/modules/businesses.api';
import { inventoryApi } from '@/api/modules/inventory.api';
import { useBusinessStore } from '@/store/business.store';
import { permissions } from '@/lib/role-permissions';
import { notify } from '@/lib/notify';
import { getApiErrorMessage } from '@/utils/error.utils';
import {
  formatInventoryCurrency,
  getStockHealth,
  toInventoryNumber,
  valueOfMaterial,
} from '@/lib/inventory-formatters';
import type { Business } from '@/types/business.types';
import type { Material, Product } from '@/types/inventory.types';
import { surface } from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittInventoryHeader } from '@/components/inventory/VrittInventoryHeader';
import { VrittInventoryHero } from '@/components/inventory/VrittInventoryHero';
import { VrittInventorySectionHeader } from '@/components/inventory/VrittInventorySectionHeader';
import { VrittInventoryActionGrid } from '@/components/inventory/VrittInventoryActionGrid';
import { VrittInventorySearch } from '@/components/inventory/VrittInventorySearch';
import {
  VrittStockFilter,
  type StockFilterValue,
} from '@/components/inventory/VrittStockFilter';
import { VrittMaterialRow } from '@/components/inventory/VrittMaterialRow';
import { VrittProductRow } from '@/components/inventory/VrittProductRow';
import { VrittInventoryEmpty } from '@/components/inventory/VrittInventoryEmpty';

// ── Helpers ──────────────────────────────────────────────────────────

function matchesQuery(
  item: { name: string; category?: string | null; sku?: string | null },
  q: string,
): boolean {
  if (!q) return true;
  const haystack =
    `${item.name} ${item.category ?? ''} ${'sku' in item ? item.sku ?? '' : ''}`.toLowerCase();
  return haystack.includes(q.toLowerCase());
}

// ── Pantalla ─────────────────────────────────────────────────────────

export default function BusinessInventoryScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const role = useBusinessStore((s) =>
    businessId ? s.getRole(businessId) : null,
  );
  const canManageInventory = permissions.canManageInventory(role);

  const [business, setBusiness] = useState<Business | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilterValue>('all');

  const loadInventory = useCallback(async () => {
    if (!businessId) return;
    try {
      const [businessData, materialData, productData] = await Promise.all([
        businessesApi.getById(businessId),
        inventoryApi.listMaterials(businessId),
        inventoryApi.listProducts(businessId),
      ]);

      setBusiness(businessData);
      setMaterials(materialData);
      setProducts(productData);
    } catch (err) {
      notify.error(
        'No pudimos cargar el inventario',
        getApiErrorMessage(err, 'Verifica tu conexión e intenta de nuevo.'),
      );
    }
  }, [businessId]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadInventory().finally(() => setIsLoading(false));
    }, [loadInventory]),
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadInventory();
    setIsRefreshing(false);
  }, [loadInventory]);

  // ── Derivados ───────────────────────────────────────────────────────

  const stats = useMemo(() => {
    let totalValue = 0;
    let lowItems = 0;
    let outItems = 0;

    for (const m of materials) {
      totalValue += valueOfMaterial(
        m.currentStock,
        m.currentReferenceUnitCost,
      );
      const h = getStockHealth(m.currentStock, m.minStock);
      if (h.tone === 'low') lowItems += 1;
      if (h.tone === 'out') outItems += 1;
    }
    for (const p of products) {
      totalValue +=
        toInventoryNumber(p.currentStock) *
        toInventoryNumber(p.currentCost);
      const h = getStockHealth(p.currentStock, p.minStock);
      if (h.tone === 'low') lowItems += 1;
      if (h.tone === 'out') outItems += 1;
    }

    return {
      totalValue,
      lowItems,
      outItems,
      activeProducts: products.filter((p) => p.status === 'ACTIVE').length,
    };
  }, [materials, products]);

  const heroTone: 'neutral' | 'warning' | 'danger' =
    stats.outItems > 0
      ? 'danger'
      : stats.lowItems > 0
      ? 'warning'
      : 'neutral';

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (!matchesQuery(m, query)) return false;
      if (stockFilter === 'all') return true;
      const h = getStockHealth(m.currentStock, m.minStock);
      return h.tone === stockFilter;
    });
  }, [materials, query, stockFilter]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!matchesQuery(p, query)) return false;
      if (stockFilter === 'all') return true;
      const h = getStockHealth(p.currentStock, p.minStock);
      return h.tone === stockFilter;
    });
  }, [products, query, stockFilter]);

  const filterOptions = useMemo(() => {
    const total = materials.length + products.length;
    let okCount = 0;
    let lowCount = 0;
    let outCount = 0;
    [...materials, ...products].forEach((it: Material | Product) => {
      const h = getStockHealth(it.currentStock, it.minStock);
      if (h.tone === 'ok') okCount += 1;
      if (h.tone === 'low') lowCount += 1;
      if (h.tone === 'out') outCount += 1;
    });
    return [
      { key: 'all' as const, label: 'Todos', count: total },
      { key: 'ok' as const, label: 'Sano', count: okCount },
      { key: 'low' as const, label: 'Bajo', count: lowCount },
      { key: 'out' as const, label: 'Agotado', count: outCount },
    ];
  }, [materials, products]);

  // ── Handlers ────────────────────────────────────────────────────────

  const onBack = useCallback(() => router.back(), []);

  const goToCreateMaterial = useCallback(() => {
    if (businessId)
      router.push(`/businesses/${businessId}/inventory/create-material`);
  }, [businessId]);

  const goToCreateProduct = useCallback(() => {
    if (businessId)
      router.push(`/businesses/${businessId}/inventory/create-product`);
  }, [businessId]);

  const onOpenMaterial = useCallback(
    (materialId: string) => {
      if (businessId)
        router.push(
          `/businesses/${businessId}/inventory/materials/${materialId}`,
        );
    },
    [businessId],
  );

  const onOpenProduct = useCallback(
    (productId: string) => {
      if (businessId)
        router.push(
          `/businesses/${businessId}/inventory/products/${productId}`,
        );
    },
    [businessId],
  );

  // ── Render ──────────────────────────────────────────────────────────

  if (isLoading && !business) return <VrittLoader />;

  if (!business) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <VrittInventoryHeader
          eyebrow="Inventario"
          title="No disponible"
          onBack={onBack}
        />
        <View style={{ flex: 1, padding: 22, justifyContent: 'center' }}>
          <VrittInventoryEmpty
            icon="alert-circle-outline"
            title="No pudimos cargar la configuración"
            description="Verifica tu conexión e intenta de nuevo desde el negocio."
            actionLabel="Volver"
            onAction={onBack}
          />
        </View>
      </View>
    );
  }

  const currency = business.defaultCurrency || 'MXN';
  const isFiltering = query.length > 0 || stockFilter !== 'all';

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <VrittInventoryHeader
        eyebrow={business.name}
        title="Inventario"
        onBack={onBack}
        rightAction={
          canManageInventory
            ? {
                label: 'Nuevo',
                icon: 'add',
                onPress: goToCreateProduct,
              }
            : undefined
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 28,
          paddingBottom: 220,
          gap: 40,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={surface.ink}
          />
        }
      >
        <VrittInventoryHero
          eyebrow="Resumen"
          primaryValue={formatInventoryCurrency(stats.totalValue, currency)}
          primaryLabel="valor total inventariado"
          tone={heroTone}
          metrics={[
            {
              label: 'Productos',
              value: String(products.length),
            },
            {
              label: 'Stock bajo',
              value: String(stats.lowItems),
              tone: stats.lowItems > 0 ? 'warning' : 'neutral',
            },
            {
              label: 'Agotados',
              value: String(stats.outItems),
              tone: stats.outItems > 0 ? 'danger' : 'neutral',
            },
          ]}
        />

        {canManageInventory ? (
          <View style={{ gap: 14 }}>
            <VrittInventorySectionHeader
              eyebrow="Acciones rápidas"
              title="Agregar al inventario"
            />
            <VrittInventoryActionGrid
              columns={2}
              items={[
                {
                  key: 'material',
                  label: 'Insumo',
                  icon: 'cube-outline',
                  onPress: goToCreateMaterial,
                },
                {
                  key: 'product',
                  label: 'Producto',
                  icon: 'bag-add-outline',
                  onPress: goToCreateProduct,
                  highlight: true,
                },
              ]}
            />
          </View>
        ) : null}

        <View style={{ gap: 18 }}>
          <VrittInventorySectionHeader
            eyebrow="Catálogo"
            title="Insumos y productos"
            trailing={`${materials.length + products.length} items`}
          />

          <VrittInventorySearch
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nombre, categoría o SKU"
          />
          <VrittStockFilter
            options={filterOptions}
            selected={stockFilter}
            onSelect={setStockFilter}
          />
        </View>

        <View style={{ gap: 18 }}>
          <VrittInventorySectionHeader
            eyebrow="Insumos"
            title={
              filteredMaterials.length === 1
                ? '1 insumo'
                : `${filteredMaterials.length} insumos`
            }
            trailing={isFiltering ? 'filtrado' : undefined}
            onAction={canManageInventory ? goToCreateMaterial : undefined}
            actionLabel={canManageInventory ? 'Nuevo' : undefined}
          />
          {materials.length === 0 ? (
            <VrittInventoryEmpty
              icon="cube-outline"
              title="Aún no hay insumos"
              description={
                canManageInventory
                  ? 'Registra harina, agua, empaques o cualquier materia prima que tu negocio use.'
                  : 'Aún no se han registrado insumos. Pide a un administrador que dé de alta los primeros.'
              }
              actionLabel={canManageInventory ? 'Agregar insumo' : undefined}
              onAction={canManageInventory ? goToCreateMaterial : undefined}
            />
          ) : filteredMaterials.length === 0 ? (
            <VrittInventoryEmpty
              icon="funnel-outline"
              title="Nada que mostrar"
              description="Cambia el filtro o limpia la búsqueda para ver tus insumos."
            />
          ) : (
            <View style={{ gap: 12 }}>
              {filteredMaterials.map((m) => (
                <VrittMaterialRow
                  key={m.id}
                  material={m}
                  currency={currency}
                  onPress={onOpenMaterial}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ gap: 18 }}>
          <VrittInventorySectionHeader
            eyebrow="Productos"
            title={
              filteredProducts.length === 1
                ? '1 producto'
                : `${filteredProducts.length} productos`
            }
            trailing={isFiltering ? 'filtrado' : undefined}
            onAction={canManageInventory ? goToCreateProduct : undefined}
            actionLabel={canManageInventory ? 'Nuevo' : undefined}
          />
          {products.length === 0 ? (
            <VrittInventoryEmpty
              icon="bag-outline"
              title="Aún no hay productos"
              description={
                canManageInventory
                  ? 'Cuando registres productos directos o con receta verás precio, costo y stock aquí.'
                  : 'Aún no se han registrado productos. Pide a un administrador que dé de alta el catálogo.'
              }
              actionLabel={canManageInventory ? 'Agregar producto' : undefined}
              onAction={canManageInventory ? goToCreateProduct : undefined}
            />
          ) : filteredProducts.length === 0 ? (
            <VrittInventoryEmpty
              icon="funnel-outline"
              title="Nada que mostrar"
              description="Cambia el filtro o limpia la búsqueda para ver tus productos."
            />
          ) : (
            <View style={{ gap: 12 }}>
              {filteredProducts.map((p) => (
                <VrittProductRow
                  key={p.id}
                  product={p}
                  currency={currency}
                  onPress={onOpenProduct}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
