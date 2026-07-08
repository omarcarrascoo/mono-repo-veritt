import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { businessesApi } from '@/api/modules/businesses.api';
import { inventoryApi } from '@/api/modules/inventory.api';
import { useBusinessStore } from '@/store/business.store';
import { permissions } from '@/lib/role-permissions';
import { notify } from '@/lib/notify';
import { getApiErrorMessage } from '@/utils/error.utils';
import {
  calcProductMargin,
  formatInventoryCurrency,
  formatInventoryQuantity,
  formatInventoryStatus,
  formatProductType,
  getStockHealth,
  toInventoryNumber,
} from '@/lib/inventory-formatters';
import type { Business } from '@/types/business.types';
import type { Product } from '@/types/inventory.types';
import { palette, surface, text } from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittInventoryHeader } from '@/components/inventory/VrittInventoryHeader';
import { VrittInventoryCard } from '@/components/inventory/VrittInventoryCard';
import { VrittInventoryFacts } from '@/components/inventory/VrittInventoryFacts';
import { VrittInventoryHero } from '@/components/inventory/VrittInventoryHero';
import { VrittStockBar } from '@/components/inventory/VrittStockTone';
import { VrittCostBreakdown } from '@/components/inventory/VrittCostBreakdown';
import { VrittPaperInput } from '@/components/inventory/VrittPaperInput';
import { VrittInventoryFooterActions } from '@/components/inventory/VrittInventoryFooterActions';

export default function ProductDetailScreen() {
  const { businessId, productId } = useLocalSearchParams<{
    businessId: string;
    productId: string;
  }>();

  const role = useBusinessStore((s) =>
    businessId ? s.getRole(businessId) : null,
  );
  const canManageInventory = permissions.canManageInventory(role);

  const [product, setProduct] = useState<Product | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editMinStock, setEditMinStock] = useState('');
  const [editMakeToOrder, setEditMakeToOrder] = useState(false);

  const loadAll = useCallback(async () => {
    if (!businessId || !productId) return;
    try {
      setIsLoading(true);
      const [bizData, prodData] = await Promise.all([
        businessesApi.getById(businessId),
        inventoryApi.getProduct(businessId, productId),
      ]);
      setBusiness(bizData);
      setProduct(prodData);
      setEditName(prodData.name);
      setEditCategory(prodData.category ?? '');
      setEditMinStock(String(Number(prodData.minStock)));
      setEditMakeToOrder(prodData.makeToOrder ?? false);
    } catch (err) {
      notify.error(
        'No pudimos cargar el producto',
        getApiErrorMessage(err, 'Verifica tu conexión.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [businessId, productId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onBack = useCallback(() => router.back(), []);

  const handleSave = useCallback(async () => {
    if (!businessId || !productId || !editName.trim()) return;
    try {
      setIsSubmitting(true);
      await inventoryApi.updateProduct(businessId, productId, {
        name: editName.trim(),
        category: editCategory.trim() || undefined,
        minStock: Number(editMinStock) || 0,
        // makeToOrder solo aplica a RECIPE; para DIRECT se manda false.
        makeToOrder: product?.type === 'RECIPE' ? editMakeToOrder : false,
      });
      notify.success('Cambios guardados', 'El producto fue actualizado.');
      setIsEditing(false);
      loadAll();
    } catch (err) {
      notify.error(
        'No pudimos actualizar',
        getApiErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    businessId,
    productId,
    editName,
    editCategory,
    editMinStock,
    editMakeToOrder,
    product?.type,
    loadAll,
  ]);

  const handleToggleStatus = useCallback(() => {
    if (!businessId || !productId || !product) return;
    const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const verb = newStatus === 'ACTIVE' ? 'activar' : 'desactivar';

    Alert.alert(
      `¿${verb.charAt(0).toUpperCase() + verb.slice(1)} producto?`,
      `¿Quieres ${verb} "${product.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: newStatus === 'INACTIVE' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await inventoryApi.updateProduct(businessId, productId, {
                status: newStatus,
              });
              notify.success(
                'Listo',
                `Producto ${
                  newStatus === 'ACTIVE' ? 'reactivado' : 'desactivado'
                }.`,
              );
              loadAll();
            } catch (err) {
              notify.error(
                'No pudimos actualizar',
                getApiErrorMessage(err, 'Intenta de nuevo.'),
              );
            }
          },
        },
      ],
    );
  }, [businessId, productId, product, loadAll]);

  const health = useMemo(
    () =>
      product
        ? getStockHealth(product.currentStock, product.minStock)
        : null,
    [product],
  );

  const margin = useMemo(
    () =>
      product
        ? calcProductMargin(product.currentSalePrice, product.currentCost)
        : null,
    [product],
  );

  if (isLoading) return <VrittLoader />;

  if (!product) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <VrittInventoryHeader
          eyebrow="Producto"
          title="No encontrado"
          onBack={onBack}
        />
      </View>
    );
  }

  const currency = business?.defaultCurrency || 'MXN';
  const stockValue =
    toInventoryNumber(product.currentStock) *
    toInventoryNumber(product.currentCost);
  const heroTone =
    health?.tone === 'out'
      ? 'danger'
      : health?.tone === 'low'
      ? 'warning'
      : 'neutral';

  const valueColorForStock =
    health?.tone === 'out'
      ? palette.danger
      : health?.tone === 'low'
      ? palette.amberDeep
      : undefined;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: surface.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <VrittInventoryHeader
        eyebrow={formatProductType(product.type)}
        title={product.name}
        onBack={onBack}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 28,
          paddingBottom: 220,
          gap: 28,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!isEditing ? (
          <>
            <VrittInventoryHero
              eyebrow={`Precio · ${health?.label ?? ''}`}
              primaryValue={formatInventoryCurrency(
                product.currentSalePrice,
                currency,
              )}
              primaryLabel={`Costo ${formatInventoryCurrency(
                product.currentCost,
                currency,
              )} · margen ${margin ? margin.percent.toFixed(0) : 0}%`}
              tone={heroTone}
              metrics={[
                {
                  label: 'Stock',
                  value: formatInventoryQuantity(
                    product.currentStock,
                    product.stockUnit,
                  ),
                  tone:
                    health?.tone === 'out'
                      ? 'danger'
                      : health?.tone === 'low'
                      ? 'warning'
                      : 'neutral',
                },
                {
                  label: 'Mínimo',
                  value: formatInventoryQuantity(
                    product.minStock,
                    product.stockUnit,
                  ),
                },
                {
                  label: 'Valor',
                  value: formatInventoryCurrency(stockValue, currency),
                },
              ]}
            />

            <VrittInventoryCard eyebrow="Salud del stock">
              <View style={{ gap: 10 }}>
                <VrittStockBar
                  tone={health?.tone ?? 'ok'}
                  ratio={health?.ratio ?? 0}
                  height={8}
                />
                <VrittInventoryFacts
                  facts={[
                    {
                      label: 'Stock actual',
                      value: formatInventoryQuantity(
                        product.currentStock,
                        product.stockUnit,
                      ),
                      highlight: true,
                      valueColor: valueColorForStock,
                    },
                    {
                      label: 'Stock mínimo',
                      value: formatInventoryQuantity(
                        product.minStock,
                        product.stockUnit,
                      ),
                    },
                    {
                      label: 'Venta diaria estimada',
                      value:
                        product.estimatedDailySalesVolume != null
                          ? formatInventoryQuantity(
                              product.estimatedDailySalesVolume,
                              product.stockUnit,
                            )
                          : '—',
                    },
                  ]}
                />
              </View>
            </VrittInventoryCard>

            <VrittInventoryCard eyebrow="Costo y margen">
              <View style={{ gap: 14 }}>
                <VrittCostBreakdown
                  rows={[
                    {
                      label: 'Materia prima',
                      value: product.currentMaterialCost,
                    },
                    {
                      label: 'Mano de obra',
                      value: product.currentDirectLaborCost,
                    },
                    {
                      label: 'CIF asignado',
                      value: product.currentAllocatedCifCost,
                    },
                  ]}
                  total={product.currentCost}
                  currency={currency}
                  totalLabel="Costo unitario"
                />
                {margin ? (
                  <VrittInventoryFacts
                    facts={[
                      {
                        label: 'Precio de venta',
                        value: formatInventoryCurrency(
                          product.currentSalePrice,
                          currency,
                        ),
                        highlight: true,
                      },
                      {
                        label: 'Margen absoluto',
                        value: formatInventoryCurrency(
                          margin.absolute,
                          currency,
                        ),
                      },
                      {
                        label: 'Margen %',
                        value: `${margin.percent.toFixed(1)}%`,
                      },
                    ]}
                  />
                ) : null}
              </View>
            </VrittInventoryCard>

            <VrittInventoryCard eyebrow="Información">
              <VrittInventoryFacts
                facts={[
                  { label: 'Tipo', value: formatProductType(product.type) },
                  {
                    label: 'Categoría',
                    value: product.category || 'Sin categoría',
                  },
                  { label: 'Unidad de stock', value: product.stockUnit },
                  {
                    label: 'Estado',
                    value: formatInventoryStatus(product.status),
                  },
                ]}
              />
            </VrittInventoryCard>

            {canManageInventory ? (
              <VrittInventoryFooterActions
                primary={{
                  label: 'Editar producto',
                  icon: 'create-outline',
                  onPress: () => setIsEditing(true),
                }}
                secondary={{
                  label:
                    product.status === 'ACTIVE'
                      ? 'Desactivar producto'
                      : 'Reactivar producto',
                  onPress: handleToggleStatus,
                }}
              />
            ) : null}
          </>
        ) : (
          <>
            <VrittInventoryCard eyebrow="Editar datos">
              <View style={{ gap: 14 }}>
                <VrittPaperInput
                  label="Nombre"
                  value={editName}
                  onChangeText={setEditName}
                  editable={!isSubmitting}
                  required
                />
                <VrittPaperInput
                  label="Categoría"
                  value={editCategory}
                  onChangeText={setEditCategory}
                  editable={!isSubmitting}
                />
                <VrittPaperInput
                  label="Stock mínimo"
                  value={editMinStock}
                  onChangeText={setEditMinStock}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                  suffix={product.stockUnit}
                />
                {product.type === 'RECIPE' ? (
                  <Pressable
                    onPress={() =>
                      !isSubmitting && setEditMakeToOrder((v) => !v)
                    }
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <Ionicons
                      name={
                        editMakeToOrder ? 'checkbox' : 'square-outline'
                      }
                      size={24}
                      color={
                        editMakeToOrder ? palette.ink : text.onPaper.muted
                      }
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '600',
                          color: text.onPaper.primary,
                        }}
                      >
                        Producto al momento (sin inventario)
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: text.onPaper.muted,
                          marginTop: 2,
                        }}
                      >
                        No lleva stock de terminado; al vender descuenta los
                        insumos de la receta.
                      </Text>
                    </View>
                  </Pressable>
                ) : null}
              </View>
            </VrittInventoryCard>

            <VrittInventoryFooterActions
              primary={{
                label: 'Guardar cambios',
                icon: 'save-outline',
                onPress: handleSave,
                loading: isSubmitting,
                disabled: !editName.trim(),
              }}
              secondary={{
                label: 'Cancelar',
                onPress: () => {
                  setIsEditing(false);
                  setEditName(product.name);
                  setEditCategory(product.category ?? '');
                  setEditMinStock(String(Number(product.minStock)));
                  setEditMakeToOrder(product.makeToOrder ?? false);
                },
                disabled: isSubmitting,
              }}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
