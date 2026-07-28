import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { markIngredientsStepCompleted } from '@/lib/update-onboarding';
import type { Business } from '@/types/business.types';
import type {
  InventoryLocation,
  Material,
  MaterialKind,
} from '@/types/inventory.types';
import {
  formatInventoryQuantity,
  formatLocationType,
} from '@/lib/inventory-formatters';
import { palette, radius, surface, text } from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittInventoryHeader } from '@/components/inventory/VrittInventoryHeader';
import { VrittInventoryCard } from '@/components/inventory/VrittInventoryCard';
import {
  VrittPaperInput,
  VrittPaperListPicker,
} from '@/components/inventory/VrittPaperInput';
import {
  VrittCategoryPicker,
  CATEGORY_CUSTOM_VALUE,
} from '@/components/inventory/VrittCategoryPicker';
import { VrittInventoryFooterActions } from '@/components/inventory/VrittInventoryFooterActions';
import {
  VrittRecipeItemCard,
  type RecipeItemValue,
} from '@/components/inventory/VrittRecipeItemCard';

type RecipeItemForm = RecipeItemValue & { id: string };

function createRecipeItem(): RecipeItemForm {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    materialId: '',
    quantity: '',
    wastePercent: '',
  };
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function CreateMaterialScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const role = useBusinessStore((s) =>
    businessId ? s.getRole(businessId) : null,
  );
  const canManageInventory = permissions.canManageInventory(role);

  // Si un usuario sin permisos llega aquí (e.g., deep-link), regresar.
  useEffect(() => {
    if (!canManageInventory && businessId) {
      router.replace(`/businesses/${businessId}/inventory`);
    }
  }, [canManageInventory, businessId]);

  const [business, setBusiness] = useState<Business | null>(null);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [baseUnit, setBaseUnit] = useState('');
  const [kind, setKind] = useState<MaterialKind>('RAW');
  // Receta de producción (solo cuando kind === TRANSFORMED).
  const [recipeItems, setRecipeItems] = useState<RecipeItemForm[]>([
    createRecipeItem(),
  ]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const category =
    selectedCategory === CATEGORY_CUSTOM_VALUE
      ? customCategory
      : selectedCategory;
  const [sku, setSku] = useState('');
  const [reorderFrequencyDays, setReorderFrequencyDays] = useState('');
  const [minStock, setMinStock] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [initialUnitCost, setInitialUnitCost] = useState('');
  const [locationId, setLocationId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!businessId) return;
      try {
        setIsLoadingData(true);
        const [businessData, locationData, categories, materialData] =
          await Promise.all([
            businessesApi.getById(businessId),
            inventoryApi.listLocations(businessId),
            inventoryApi.listCategories(businessId).catch(() => []),
            inventoryApi.listMaterials(businessId).catch(() => []),
          ]);
        if (cancelled) return;
        setBusiness(businessData);
        setLocations(locationData);
        setExistingCategories(categories);
        setMaterials(materialData);
        const preferred =
          locationData.find((l) => l.isPrimary) ?? locationData[0];
        if (preferred) setLocationId(preferred.id);
      } catch (err) {
        notify.error(
          'No pudimos preparar el formulario',
          getApiErrorMessage(err, 'Verifica tu conexión.'),
        );
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const locationOptions = useMemo(
    () =>
      locations.map((l) => ({
        label: l.name,
        value: l.id,
        hint: formatLocationType(l.type),
        icon: l.isPrimary
          ? ('star' as const)
          : ('location-outline' as const),
      })),
    [locations],
  );

  // Insumos disponibles como ingredientes de la receta (los ya existentes).
  const recipeMaterialOptions = useMemo(
    () =>
      materials.map((m) => ({
        label: m.name,
        value: m.id,
        hint: `Disp. ${formatInventoryQuantity(m.currentStock, m.baseUnit)}`,
        icon: 'cube-outline' as const,
      })),
    [materials],
  );

  const handleRecipeItemChange = useCallback(
    (id: string, field: keyof RecipeItemValue, value: string) => {
      setRecipeItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, [field]: value } : item,
        ),
      );
    },
    [],
  );

  const handleRemoveRecipeItem = useCallback((id: string) => {
    setRecipeItems((current) =>
      current.length === 1 ? current : current.filter((it) => it.id !== id),
    );
  }, []);

  const handleAddRecipeItem = useCallback(() => {
    setRecipeItems((current) => [...current, createRecipeItem()]);
  }, []);

  const onBack = useCallback(() => router.back(), []);

  const handleCreate = useCallback(async () => {
    if (!businessId) return;

    if (!name.trim() || !baseUnit.trim()) {
      notify.warning(
        'Faltan datos',
        'Completa el nombre y la unidad base del insumo.',
      );
      return;
    }

    const reorderFrequencyValue = parseOptionalNumber(reorderFrequencyDays);
    const minStockValue = parseOptionalNumber(minStock);
    const initialQuantityValue = parseOptionalNumber(initialQuantity);
    const initialUnitCostValue = parseOptionalNumber(initialUnitCost);

    if (
      reorderFrequencyDays.trim() &&
      (!reorderFrequencyValue || reorderFrequencyValue < 1)
    ) {
      notify.warning(
        'Dato inválido',
        'La frecuencia de reabastecimiento debe ser mayor a cero.',
      );
      return;
    }

    if (
      minStock.trim() &&
      (minStockValue === undefined || minStockValue < 0)
    ) {
      notify.warning(
        'Dato inválido',
        'El stock mínimo debe ser cero o mayor.',
      );
      return;
    }

    if (initialQuantity.trim() || initialUnitCost.trim()) {
      if (!initialQuantityValue || initialQuantityValue <= 0) {
        notify.warning(
          'Dato inválido',
          'La cantidad inicial debe ser mayor a cero.',
        );
        return;
      }
      if (
        initialUnitCostValue === undefined ||
        initialUnitCostValue < 0
      ) {
        notify.warning(
          'Dato inválido',
          'El costo unitario inicial debe ser cero o mayor.',
        );
        return;
      }
    }

    let createdName = '';
    try {
      setIsSubmitting(true);
      const material = await inventoryApi.createMaterial(businessId, {
        name: name.trim(),
        baseUnit: baseUnit.trim(),
        kind,
        category: category.trim() || undefined,
        sku: sku.trim() || undefined,
        reorderFrequencyDays: reorderFrequencyValue,
        minStock: minStockValue,
      });
      createdName = material.name;

      if (initialQuantityValue && initialUnitCostValue !== undefined) {
        await inventoryApi.receiveMaterialLot(businessId, material.id, {
          locationId: locationId || undefined,
          quantity: initialQuantityValue,
          unitCost: initialUnitCostValue,
          note: 'Carga inicial desde app móvil',
        });
      }

      // Insumo transformado: guardar su receta de producción si se definió.
      if (kind === 'TRANSFORMED') {
        const normalizedRecipe = recipeItems
          .filter((it) => it.materialId)
          .map((it) => ({
            materialId: it.materialId,
            quantity: parseOptionalNumber(it.quantity),
            wastePercent: parseOptionalNumber(it.wastePercent) ?? 0,
          }))
          .filter((it) => it.quantity !== undefined && it.quantity > 0);

        if (normalizedRecipe.length > 0) {
          await inventoryApi.createMaterialRecipe(businessId, material.id, {
            note: 'Receta de producción desde app móvil',
            items: normalizedRecipe.map((it) => ({
              materialId: it.materialId,
              quantity: it.quantity!,
              wastePercent: it.wastePercent,
            })),
          });
        }
      }

      await markIngredientsStepCompleted(businessId).catch(() => {});
      notify.success('Insumo creado', `${material.name} ya está en tu inventario.`);
      router.replace(`/businesses/${businessId}/inventory`);
    } catch (err) {
      if (createdName) {
        notify.warning(
          'Insumo creado parcialmente',
          getApiErrorMessage(
            err,
            `Creamos ${createdName}, pero no pudimos registrar el stock inicial.`,
          ),
        );
        router.replace(`/businesses/${businessId}/inventory`);
        return;
      }
      notify.error(
        'No pudimos guardar el insumo',
        getApiErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    businessId,
    name,
    baseUnit,
    kind,
    recipeItems,
    category,
    sku,
    reorderFrequencyDays,
    minStock,
    initialQuantity,
    initialUnitCost,
    locationId,
  ]);

  if (isLoadingData) return <VrittLoader />;

  const currency = business?.defaultCurrency || 'MXN';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: surface.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <VrittInventoryHeader
        eyebrow="Inventario"
        title="Nuevo insumo"
        onBack={onBack}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 28,
          paddingBottom: 240,
          gap: 28,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <VrittInventoryCard
          eyebrow="Tipo de insumo"
          description="Comprado: lo adquieres a un proveedor. Transformado: lo preparas internamente con otros insumos (carne marinada, aderezos) y puedes usarlo en recetas."
        >
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
              const active = kind === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => !isSubmitting && setKind(opt.value)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 14,
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
        </VrittInventoryCard>

        <VrittInventoryCard
          eyebrow="Datos básicos"
          description="Solo el nombre y la unidad base son obligatorios. Los demás datos te ayudan a controlar mejor tu inventario."
        >
          <View style={{ gap: 14 }}>
            <VrittPaperInput
              label="Nombre"
              placeholder="Harina de trigo"
              value={name}
              onChangeText={setName}
              editable={!isSubmitting}
              required
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <VrittPaperInput
                  label="Unidad base"
                  placeholder="kg"
                  value={baseUnit}
                  onChangeText={setBaseUnit}
                  autoCapitalize="none"
                  editable={!isSubmitting}
                  required
                  hint="kg · l · pza · cja"
                />
              </View>
              <View style={{ flex: 1 }}>
                <VrittPaperInput
                  label="SKU"
                  placeholder="HAR-001"
                  value={sku}
                  onChangeText={setSku}
                  autoCapitalize="characters"
                  editable={!isSubmitting}
                />
              </View>
            </View>

            <VrittCategoryPicker
              existingCategories={existingCategories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
              customValue={customCategory}
              onCustomChange={setCustomCategory}
              disabled={isSubmitting}
            />
          </View>
        </VrittInventoryCard>

        <VrittInventoryCard
          eyebrow="Control de inventario"
          description="Define cuándo te avisamos para reabastecer."
        >
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <VrittPaperInput
                label="Frecuencia"
                placeholder="3"
                value={reorderFrequencyDays}
                onChangeText={setReorderFrequencyDays}
                keyboardType="numeric"
                editable={!isSubmitting}
                suffix="días"
              />
            </View>
            <View style={{ flex: 1 }}>
              <VrittPaperInput
                label="Stock mínimo"
                placeholder="10"
                value={minStock}
                onChangeText={setMinStock}
                keyboardType="numeric"
                editable={!isSubmitting}
                suffix={baseUnit || undefined}
              />
            </View>
          </View>
        </VrittInventoryCard>

        {kind === 'TRANSFORMED' ? (
          <View style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                paddingHorizontal: 4,
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: text.onPaper.muted,
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 1.8,
                    textTransform: 'uppercase',
                  }}
                >
                  Receta de producción
                </Text>
                <Text
                  style={{
                    color: text.onPaper.primary,
                    fontSize: 22,
                    fontWeight: '800',
                    letterSpacing: -0.8,
                    marginTop: 4,
                  }}
                >
                  {recipeItems.length === 1
                    ? '1 insumo'
                    : `${recipeItems.length} insumos`}
                </Text>
                <Text
                  style={{
                    color: text.onPaper.muted,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  Qué insumos se consumen al preparar 1 {baseUnit || 'unidad'}.
                  Al producir, se descuentan del inventario por FIFO.
                </Text>
              </View>
              <Pressable
                onPress={handleAddRecipeItem}
                disabled={isSubmitting}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: 'rgba(11,14,18,0.05)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="add" size={12} color={text.onPaper.primary} />
                <Text
                  style={{
                    color: palette.ink,
                    fontSize: 11,
                    fontWeight: '900',
                    letterSpacing: -0.1,
                  }}
                >
                  Agregar
                </Text>
              </Pressable>
            </View>

            {materials.length === 0 ? (
              <Text
                style={{
                  color: text.onPaper.muted,
                  fontSize: 13,
                  paddingHorizontal: 4,
                }}
              >
                Aún no tienes insumos para usar como ingredientes. Puedes
                guardar el insumo ahora y definir su receta más tarde.
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {recipeItems.map((item, idx) => (
                  <VrittRecipeItemCard
                    key={item.id}
                    index={idx}
                    item={item}
                    materialOptions={recipeMaterialOptions}
                    canRemove={recipeItems.length > 1}
                    onChange={(field, value) =>
                      handleRecipeItemChange(item.id, field, value)
                    }
                    onRemove={() => handleRemoveRecipeItem(item.id)}
                    disabled={isSubmitting}
                  />
                ))}
              </View>
            )}
          </View>
        ) : null}

        <VrittInventoryCard
          eyebrow="Carga inicial (opcional)"
          description={`Si ya tienes inventario físico, déjalo cargado desde ahora en moneda ${currency}.`}
        >
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <VrittPaperInput
                  label="Cantidad"
                  placeholder="100"
                  value={initialQuantity}
                  onChangeText={setInitialQuantity}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                  suffix={baseUnit || undefined}
                />
              </View>
              <View style={{ flex: 1 }}>
                <VrittPaperInput
                  label={`Costo (${currency})`}
                  placeholder="18.50"
                  value={initialUnitCost}
                  onChangeText={setInitialUnitCost}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {locationOptions.length > 0 ? (
              <VrittPaperListPicker
                label="Ubicación de ingreso"
                options={locationOptions}
                value={locationId}
                onChange={setLocationId}
              />
            ) : null}
          </View>
        </VrittInventoryCard>

        <VrittInventoryFooterActions
          primary={{
            label: 'Guardar insumo',
            icon: 'save-outline',
            onPress: handleCreate,
            loading: isSubmitting,
            disabled: !name.trim() || !baseUnit.trim(),
          }}
          secondary={{
            label: 'Cancelar',
            onPress: onBack,
            disabled: isSubmitting,
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
