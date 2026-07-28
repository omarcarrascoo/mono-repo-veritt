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
  formatInventoryCurrency,
  formatInventoryQuantity,
  formatInventoryStatus,
  getStockHealth,
  valueOfMaterial,
} from '@/lib/inventory-formatters';
import type { Business } from '@/types/business.types';
import type { Material, MaterialKind } from '@/types/inventory.types';
import { hairline, palette, surface, text } from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittInventoryHeader } from '@/components/inventory/VrittInventoryHeader';
import { VrittInventoryCard } from '@/components/inventory/VrittInventoryCard';
import { VrittInventoryFacts } from '@/components/inventory/VrittInventoryFacts';
import { VrittInventoryHero } from '@/components/inventory/VrittInventoryHero';
import { VrittStockBar } from '@/components/inventory/VrittStockTone';
import { VrittPaperInput } from '@/components/inventory/VrittPaperInput';
import { VrittInventoryFooterActions } from '@/components/inventory/VrittInventoryFooterActions';

export default function MaterialDetailScreen() {
  const { businessId, materialId } = useLocalSearchParams<{
    businessId: string;
    materialId: string;
  }>();

  const role = useBusinessStore((s) =>
    businessId ? s.getRole(businessId) : null,
  );
  const canManageInventory = permissions.canManageInventory(role);

  const [material, setMaterial] = useState<Material | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editMinStock, setEditMinStock] = useState('');
  const [editKind, setEditKind] = useState<MaterialKind>('RAW');
  const [produceQty, setProduceQty] = useState('');
  const [isProducing, setIsProducing] = useState(false);

  const loadAll = useCallback(async () => {
    if (!businessId || !materialId) return;
    try {
      setIsLoading(true);
      const [bizData, matData, materialData] = await Promise.all([
        businessesApi.getById(businessId),
        inventoryApi.getMaterial(businessId, materialId),
        inventoryApi.listMaterials(businessId).catch(() => []),
      ]);
      setBusiness(bizData);
      setMaterial(matData);
      setMaterials(materialData);
      setEditName(matData.name);
      setEditCategory(matData.category ?? '');
      setEditSku(matData.sku ?? '');
      setEditMinStock(String(Number(matData.minStock)));
      setEditKind(matData.kind ?? 'RAW');
    } catch (err) {
      notify.error(
        'No pudimos cargar el insumo',
        getApiErrorMessage(err, 'Verifica tu conexión.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [businessId, materialId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onBack = useCallback(() => router.back(), []);

  const materialNameById = useCallback(
    (id: string) => materials.find((m) => m.id === id)?.name ?? 'Insumo',
    [materials],
  );

  const hasRecipe = Boolean(material?.productionRecipes?.[0]?.items?.length);

  const handleSave = useCallback(async () => {
    if (!businessId || !materialId || !editName.trim()) return;
    try {
      setIsSubmitting(true);
      await inventoryApi.updateMaterial(businessId, materialId, {
        name: editName.trim(),
        category: editCategory.trim() || undefined,
        sku: editSku.trim() || undefined,
        minStock: Number(editMinStock) || 0,
        kind: editKind,
      });
      notify.success('Cambios guardados', 'El insumo fue actualizado.');
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
    materialId,
    editName,
    editCategory,
    editSku,
    editMinStock,
    editKind,
    loadAll,
  ]);

  const handleToggleStatus = useCallback(() => {
    if (!businessId || !materialId || !material) return;
    const newStatus = material.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const verb = newStatus === 'ACTIVE' ? 'activar' : 'desactivar';

    Alert.alert(
      `¿${verb.charAt(0).toUpperCase() + verb.slice(1)} insumo?`,
      `¿Quieres ${verb} "${material.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: newStatus === 'INACTIVE' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await inventoryApi.updateMaterial(businessId, materialId, {
                status: newStatus,
              });
              notify.success(
                'Listo',
                `Insumo ${
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
  }, [businessId, materialId, material, loadAll]);

  const handleProduce = useCallback(async () => {
    if (!businessId || !materialId) return;
    const qty = Number(produceQty);
    if (!qty || qty <= 0) {
      notify.error('Cantidad inválida', 'Indica cuánto vas a producir.');
      return;
    }
    try {
      setIsProducing(true);
      const result = await inventoryApi.produceTransformedMaterial(
        businessId,
        materialId,
        { quantity: qty },
      );
      notify.success(
        'Producción registrada',
        `Se produjeron ${qty} ${material?.baseUnit ?? ''} (costo unitario ${formatInventoryCurrency(
          result.unitCost,
        )}).`,
      );
      setProduceQty('');
      loadAll();
    } catch (err) {
      notify.error(
        'No pudimos producir',
        getApiErrorMessage(
          err,
          'Verifica que haya receta de producción y stock de insumos suficiente.',
        ),
      );
    } finally {
      setIsProducing(false);
    }
  }, [businessId, materialId, produceQty, material?.baseUnit, loadAll]);

  const health = useMemo(
    () =>
      material
        ? getStockHealth(material.currentStock, material.minStock)
        : null,
    [material],
  );

  if (isLoading) return <VrittLoader />;

  if (!material) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <VrittInventoryHeader
          eyebrow="Insumo"
          title="No encontrado"
          onBack={onBack}
        />
      </View>
    );
  }

  const currency = business?.defaultCurrency || 'MXN';
  const stockValue = valueOfMaterial(
    material.currentStock,
    material.currentReferenceUnitCost,
  );
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
        eyebrow={material.category || 'Insumo'}
        title={material.name}
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
              eyebrow={`Stock · ${health?.label ?? ''}`}
              primaryValue={formatInventoryQuantity(
                material.currentStock,
                material.baseUnit,
              )}
              primaryLabel={`mín ${formatInventoryQuantity(
                material.minStock,
                material.baseUnit,
              )} · valor ${formatInventoryCurrency(stockValue, currency)}`}
              tone={heroTone}
              metrics={[
                {
                  label: 'Costo unitario',
                  value: formatInventoryCurrency(
                    material.currentReferenceUnitCost,
                    currency,
                  ),
                },
                {
                  label: 'Estado',
                  value: formatInventoryStatus(material.status),
                  tone: material.status === 'ACTIVE' ? 'neutral' : 'warning',
                },
                {
                  label: 'Mínimo',
                  value: formatInventoryQuantity(
                    material.minStock,
                    material.baseUnit,
                  ),
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
                        material.currentStock,
                        material.baseUnit,
                      ),
                      highlight: true,
                      valueColor: valueColorForStock,
                    },
                    {
                      label: 'Stock mínimo',
                      value: formatInventoryQuantity(
                        material.minStock,
                        material.baseUnit,
                      ),
                    },
                    {
                      label: 'Valor inventariado',
                      value: formatInventoryCurrency(stockValue, currency),
                    },
                  ]}
                />
              </View>
            </VrittInventoryCard>

            <VrittInventoryCard eyebrow="Información">
              <VrittInventoryFacts
                facts={[
                  {
                    label: 'Categoría',
                    value: material.category || 'Sin categoría',
                  },
                  { label: 'SKU', value: material.sku || '—' },
                  { label: 'Unidad base', value: material.baseUnit },
                  {
                    label: 'Reabasto cada',
                    value: material.reorderFrequencyDays
                      ? `${material.reorderFrequencyDays} días`
                      : '—',
                  },
                ]}
              />
            </VrittInventoryCard>

            {canManageInventory && material.kind === 'TRANSFORMED' ? (
              <VrittInventoryCard
                eyebrow="Producción interna (FTI)"
                description="Registra cuánto preparaste. El sistema consume los insumos crudos de su receta (FIFO) y calcula el costo real."
              >
                <View style={{ gap: 12 }}>
                  {material.productionRecipes?.[0]?.items?.length ? (
                    <View
                      style={{
                        gap: 8,
                        paddingBottom: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: hairline.onPaper,
                      }}
                    >
                      <Text
                        style={{
                          color: text.onPaper.muted,
                          fontSize: 10,
                          fontWeight: '800',
                          letterSpacing: 1.4,
                          textTransform: 'uppercase',
                        }}
                      >
                        Consume por {Number(material.productionRecipes[0].outputQuantity) || 1}{' '}
                        {material.baseUnit}
                      </Text>
                      {material.productionRecipes[0].items.map((it) => (
                        <View
                          key={it.id ?? it.materialId}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Text
                            style={{
                              color: text.onPaper.primary,
                              fontSize: 14,
                              flex: 1,
                            }}
                            numberOfLines={1}
                          >
                            {materialNameById(it.materialId)}
                          </Text>
                          <Text
                            style={{
                              color: text.onPaper.muted,
                              fontSize: 14,
                              fontWeight: '600',
                            }}
                          >
                            {Number(it.quantity)}
                            {Number(it.wastePercent)
                              ? ` (+${Number(it.wastePercent)}% merma)`
                              : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ color: text.onPaper.muted, fontSize: 13 }}>
                      Aún no tiene receta. Define qué insumos consume para poder
                      producir.
                    </Text>
                  )}
                  <VrittPaperInput
                    label={`Cantidad a producir`}
                    placeholder="3"
                    value={produceQty}
                    onChangeText={setProduceQty}
                    keyboardType="numeric"
                    editable={!isProducing}
                    suffix={material.baseUnit}
                  />
                  <Pressable
                    onPress={handleProduce}
                    disabled={isProducing || !produceQty.trim() || !hasRecipe}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      paddingVertical: 14,
                      borderRadius: 14,
                      backgroundColor:
                        isProducing || !produceQty.trim() || !hasRecipe
                          ? text.onPaper.subtle
                          : palette.ink,
                    }}
                  >
                    <Ionicons
                      name="construct-outline"
                      size={18}
                      color={surface.paper}
                    />
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: surface.paper,
                      }}
                    >
                      {isProducing ? 'Produciendo…' : 'Producir'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      router.push(
                        `/businesses/${businessId}/inventory/materials/${materialId}/recipe`,
                      )
                    }
                    disabled={isProducing}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 6,
                    }}
                  >
                    <Ionicons
                      name="git-branch-outline"
                      size={15}
                      color={text.onPaper.muted}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: text.onPaper.muted,
                      }}
                    >
                      Definir / editar receta de producción
                    </Text>
                  </Pressable>
                </View>
              </VrittInventoryCard>
            ) : null}

            {canManageInventory ? (
              <VrittInventoryFooterActions
                primary={{
                  label: 'Editar insumo',
                  icon: 'create-outline',
                  onPress: () => setIsEditing(true),
                }}
                secondary={{
                  label:
                    material.status === 'ACTIVE'
                      ? 'Desactivar insumo'
                      : 'Reactivar insumo',
                  onPress: handleToggleStatus,
                }}
              />
            ) : null}
          </>
        ) : (
          <>
            <VrittInventoryCard eyebrow="Editar datos">
              <View style={{ gap: 14 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(
                    [
                      { value: 'RAW' as const, label: 'Comprado', icon: 'cube-outline' as const },
                      {
                        value: 'TRANSFORMED' as const,
                        label: 'Transformado',
                        icon: 'construct-outline' as const,
                      },
                    ]
                  ).map((opt) => {
                    const active = editKind === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => !isSubmitting && setEditKind(opt.value)}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          paddingVertical: 12,
                          borderRadius: 14,
                          borderWidth: 1.5,
                          borderColor: active ? palette.ink : text.onPaper.subtle,
                          backgroundColor: active ? palette.ink : 'transparent',
                        }}
                      >
                        <Ionicons
                          name={opt.icon}
                          size={18}
                          color={active ? surface.paper : text.onPaper.muted}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: active ? surface.paper : text.onPaper.primary,
                          }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <VrittPaperInput
                  label="Nombre"
                  value={editName}
                  onChangeText={setEditName}
                  editable={!isSubmitting}
                  required
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <VrittPaperInput
                      label="Categoría"
                      value={editCategory}
                      onChangeText={setEditCategory}
                      editable={!isSubmitting}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <VrittPaperInput
                      label="SKU"
                      value={editSku}
                      onChangeText={setEditSku}
                      autoCapitalize="characters"
                      editable={!isSubmitting}
                    />
                  </View>
                </View>
                <VrittPaperInput
                  label="Stock mínimo"
                  value={editMinStock}
                  onChangeText={setEditMinStock}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                  suffix={material.baseUnit}
                />
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
                  setEditName(material.name);
                  setEditCategory(material.category ?? '');
                  setEditSku(material.sku ?? '');
                  setEditMinStock(String(Number(material.minStock)));
                  setEditKind(material.kind ?? 'RAW');
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
