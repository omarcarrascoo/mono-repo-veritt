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
import {
  markProductsStepCompleted,
  markRecipesStepCompleted,
} from '@/lib/update-onboarding';
import {
  formatInventoryQuantity,
  formatLocationType,
} from '@/lib/inventory-formatters';
import type { Business } from '@/types/business.types';
import type {
  InventoryLocation,
  Material,
  Product,
  ProductCostBreakdownDto,
  ProductType,
} from '@/types/inventory.types';
import {
  hairline,
  palette,
  radius,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';

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
import { VrittCostBreakdown } from '@/components/inventory/VrittCostBreakdown';
import {
  VrittRecipeItemCard,
  type RecipeItemValue,
} from '@/components/inventory/VrittRecipeItemCard';
import { VrittInventoryEmpty } from '@/components/inventory/VrittInventoryEmpty';

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function createRecipeItem(): RecipeItemValue & { id: string } {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    materialId: '',
    quantity: '',
    wastePercent: '',
  };
}

type RecipeItemForm = RecipeItemValue & { id: string };

export default function CreateProductScreen() {
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

  // Comunes
  const [name, setName] = useState('');
  const [type, setType] = useState<ProductType>('DIRECT');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const category =
    selectedCategory === CATEGORY_CUSTOM_VALUE
      ? customCategory
      : selectedCategory;
  const [stockUnit, setStockUnit] = useState('unit');
  const [estimatedDailySalesVolume, setEstimatedDailySalesVolume] =
    useState('');
  const [minStock, setMinStock] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [initialLocationId, setInitialLocationId] = useState('');

  // DIRECT
  const [directMaterialCost, setDirectMaterialCost] = useState('');
  const [directLaborCost, setDirectLaborCost] = useState('');
  const [directCifCost, setDirectCifCost] = useState('');
  const [initialDirectStock, setInitialDirectStock] = useState('');

  // Producto "al momento": se arma al vender, no lleva stock de terminado.
  const [makeToOrder, setMakeToOrder] = useState(false);

  // RECIPE
  const [recipeDirectLaborCost, setRecipeDirectLaborCost] = useState('');
  const [recipeAllocatedCifCost, setRecipeAllocatedCifCost] = useState('');
  const [initialProductionQuantity, setInitialProductionQuantity] =
    useState('');
  const [recipeItems, setRecipeItems] = useState<RecipeItemForm[]>([
    createRecipeItem(),
  ]);

  // ── Bootstrap ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!businessId) return;
      try {
        setIsLoadingData(true);
        const [businessData, locationData, materialData, categories] =
          await Promise.all([
            businessesApi.getById(businessId),
            inventoryApi.listLocations(businessId),
            inventoryApi.listMaterials(businessId),
            inventoryApi.listCategories(businessId).catch(() => []),
          ]);
        if (cancelled) return;
        setBusiness(businessData);
        setLocations(locationData);
        setMaterials(materialData);
        setExistingCategories(categories);
        const preferred =
          locationData.find((l) => l.isPrimary) ?? locationData[0];
        if (preferred) setInitialLocationId(preferred.id);
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

  // ── Derivados ─────────────────────────────────────────────────────
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

  const materialOptions = useMemo(
    () =>
      materials.map((m) => ({
        label: m.name,
        value: m.id,
        hint: `Disp. ${formatInventoryQuantity(m.currentStock, m.baseUnit)}`,
        icon: 'cube-outline' as const,
      })),
    [materials],
  );

  const directCostBreakdown = useMemo<ProductCostBreakdownDto>(() => {
    const materialCost = parseOptionalNumber(directMaterialCost) ?? 0;
    const laborCost = parseOptionalNumber(directLaborCost) ?? 0;
    const cifCost = parseOptionalNumber(directCifCost) ?? 0;
    return {
      materialCost,
      directLaborCost: laborCost,
      allocatedCifCost: cifCost,
      totalCost: materialCost + laborCost + cifCost,
    };
  }, [directCifCost, directLaborCost, directMaterialCost]);

  const handleRecipeItemChange = useCallback(
    (
      id: string,
      field: keyof RecipeItemValue,
      value: string,
    ) => {
      setRecipeItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, [field]: value } : item,
        ),
      );
    },
    [],
  );

  const handleRemoveRecipeItem = useCallback((id: string) => {
    setRecipeItems((current) => {
      if (current.length === 1) return current;
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const handleAddRecipeItem = useCallback(() => {
    setRecipeItems((current) => [...current, createRecipeItem()]);
  }, []);

  // ── Submit ────────────────────────────────────────────────────────

  const onBack = useCallback(() => router.back(), []);

  const handleCreate = useCallback(async () => {
    if (!businessId) return;

    if (!name.trim()) {
      notify.warning('Faltan datos', 'Asigna un nombre para el producto.');
      return;
    }

    const estimatedSalesValue = parseOptionalNumber(
      estimatedDailySalesVolume,
    );
    const minStockValue = parseOptionalNumber(minStock);

    if (
      estimatedDailySalesVolume.trim() &&
      (estimatedSalesValue === undefined || estimatedSalesValue < 0)
    ) {
      notify.warning(
        'Dato inválido',
        'La venta diaria estimada debe ser cero o mayor.',
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

    const salePriceValue = parseOptionalNumber(salePrice);
    if (salePrice.trim() && (salePriceValue === undefined || salePriceValue <= 0)) {
      notify.warning('Dato inválido', 'El precio debe ser mayor a cero.');
      return;
    }

    const initialDirectStockValue =
      type === 'DIRECT' ? parseOptionalNumber(initialDirectStock) : undefined;
    if (
      type === 'DIRECT' &&
      initialDirectStock.trim() &&
      (initialDirectStockValue === undefined || initialDirectStockValue <= 0)
    ) {
      notify.warning(
        'Dato inválido',
        'El stock inicial debe ser mayor a cero.',
      );
      return;
    }

    const recipeLaborCostValue = parseOptionalNumber(recipeDirectLaborCost);
    const recipeCifCostValue = parseOptionalNumber(recipeAllocatedCifCost);

    if (
      (parseOptionalNumber(directMaterialCost) ?? 0) < 0 ||
      (parseOptionalNumber(directLaborCost) ?? 0) < 0 ||
      (parseOptionalNumber(directCifCost) ?? 0) < 0
    ) {
      notify.warning(
        'Dato inválido',
        'Los costos del producto directo deben ser cero o mayores.',
      );
      return;
    }

    const initialProductionValue =
      type === 'RECIPE'
        ? parseOptionalNumber(initialProductionQuantity)
        : undefined;
    if (
      type === 'RECIPE' &&
      initialProductionQuantity.trim() &&
      (initialProductionValue === undefined || initialProductionValue <= 0)
    ) {
      notify.warning(
        'Dato inválido',
        'La producción inicial debe ser mayor a cero.',
      );
      return;
    }

    if (type === 'RECIPE' && materials.length === 0) {
      notify.warning(
        'Faltan insumos',
        'Primero registra al menos un insumo para poder crear una receta.',
      );
      return;
    }

    const normalizedRecipeItems =
      type === 'RECIPE'
        ? recipeItems.map((item) => ({
            materialId: item.materialId,
            quantity: parseOptionalNumber(item.quantity),
            wastePercent: parseOptionalNumber(item.wastePercent) ?? 0,
          }))
        : [];

    if (type === 'RECIPE') {
      if (
        normalizedRecipeItems.some(
          (item) =>
            !item.materialId ||
            !item.quantity ||
            (item.quantity ?? 0) <= 0,
        )
      ) {
        notify.warning(
          'Receta incompleta',
          'Cada renglón necesita un insumo y una cantidad mayor a cero.',
        );
        return;
      }

      if (
        normalizedRecipeItems.some(
          (item) => (item.wastePercent ?? 0) < 0,
        )
      ) {
        notify.warning(
          'Dato inválido',
          'La merma natural debe ser cero o mayor en todos los insumos.',
        );
        return;
      }

      const materialIds = normalizedRecipeItems.map((it) => it.materialId);
      if (new Set(materialIds).size !== materialIds.length) {
        notify.warning(
          'Receta duplicada',
          'No repitas el mismo insumo dentro de la misma versión.',
        );
        return;
      }
    }

    let createdProduct: Product | null = null;

    try {
      setIsSubmitting(true);

      createdProduct = await inventoryApi.createProduct(businessId, {
        name: name.trim(),
        type,
        category: category.trim() || undefined,
        stockUnit: stockUnit.trim() || undefined,
        estimatedDailySalesVolume: estimatedSalesValue,
        minStock: minStockValue,
        makeToOrder: type === 'RECIPE' ? makeToOrder : false,
      });

      if (salePriceValue) {
        await inventoryApi.addProductPrice(businessId, createdProduct.id, {
          price: salePriceValue,
          changeReason: 'Precio inicial desde app móvil',
        });
      }

      if (type === 'DIRECT') {
        const shouldPersistCost =
          directCostBreakdown.totalCost !== undefined &&
          directCostBreakdown.totalCost > 0;
        if (shouldPersistCost) {
          await inventoryApi.addProductManualCost(
            businessId,
            createdProduct.id,
            {
              ...directCostBreakdown,
              changeReason: 'Costo inicial desde app móvil',
            },
          );
        }
        if (initialDirectStockValue) {
          await inventoryApi.receiveProductLot(
            businessId,
            createdProduct.id,
            {
              locationId: initialLocationId || undefined,
              quantity: initialDirectStockValue,
              note: 'Ingreso inicial desde app móvil',
              ...directCostBreakdown,
            },
          );
        }
      }

      if (type === 'RECIPE') {
        const recipeVersion = await inventoryApi.createRecipeVersion(
          businessId,
          createdProduct.id,
          {
            directLaborCost: recipeLaborCostValue ?? 0,
            allocatedCifCost: recipeCifCostValue ?? 0,
            note: 'Receta base creada desde app móvil',
            items: normalizedRecipeItems.map((it) => ({
              materialId: it.materialId,
              quantity: it.quantity!,
              wastePercent: it.wastePercent,
            })),
          },
        );

        if (initialProductionValue) {
          await inventoryApi.createProductionBatch(
            businessId,
            createdProduct.id,
            {
              locationId: initialLocationId || undefined,
              recipeVersionId: recipeVersion.id,
              quantity: initialProductionValue,
              directLaborCost: recipeLaborCostValue ?? 0,
              allocatedCifCost: recipeCifCostValue ?? 0,
              note: 'Producción inicial desde app móvil',
            },
          );
        }
      }

      await markProductsStepCompleted(businessId).catch(() => {});
      if (type === 'RECIPE') {
        await markRecipesStepCompleted(businessId).catch(() => {});
      }
      notify.success(
        'Producto creado',
        `${createdProduct.name} ya está en tu catálogo.`,
      );
      router.replace(`/businesses/${businessId}/inventory`);
    } catch (err) {
      if (createdProduct) {
        notify.warning(
          'Producto creado parcialmente',
          getApiErrorMessage(
            err,
            `Creamos ${createdProduct.name}, pero faltó completar precio, receta o stock inicial.`,
          ),
        );
        router.replace(`/businesses/${businessId}/inventory`);
        return;
      }
      notify.error(
        'No pudimos guardar el producto',
        getApiErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    businessId,
    name,
    type,
    category,
    stockUnit,
    estimatedDailySalesVolume,
    minStock,
    salePrice,
    initialDirectStock,
    directMaterialCost,
    directLaborCost,
    directCifCost,
    directCostBreakdown,
    initialLocationId,
    recipeDirectLaborCost,
    recipeAllocatedCifCost,
    recipeItems,
    initialProductionQuantity,
    materials.length,
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
        title="Nuevo producto"
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
        <ProductTypeSelector value={type} onChange={setType} />

        {type === 'RECIPE' ? (
          <VrittInventoryCard eyebrow="Modo de inventario">
            <Pressable
              onPress={() => !isSubmitting && setMakeToOrder((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Ionicons
                name={makeToOrder ? 'checkbox' : 'square-outline'}
                size={24}
                color={makeToOrder ? palette.ink : text.onPaper.muted}
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
                  Se arma al vender (ej. hamburguesa). No lleva stock de producto
                  terminado; al vender descuenta los insumos de la receta.
                </Text>
              </View>
            </Pressable>
          </VrittInventoryCard>
        ) : null}

        <VrittInventoryCard eyebrow="Datos básicos">
          <View style={{ gap: 14 }}>
            <VrittPaperInput
              label="Nombre"
              placeholder="Pan artesanal"
              value={name}
              onChangeText={setName}
              editable={!isSubmitting}
              required
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <VrittPaperInput
                  label="Unidad de stock"
                  placeholder="unit"
                  value={stockUnit}
                  onChangeText={setStockUnit}
                  autoCapitalize="none"
                  editable={!isSubmitting}
                />
              </View>
              <View style={{ flex: 1 }}>
                <VrittPaperInput
                  label="Stock mínimo"
                  placeholder="5"
                  value={minStock}
                  onChangeText={setMinStock}
                  keyboardType="numeric"
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

        <VrittInventoryCard eyebrow="Comercial">
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <VrittPaperInput
                label={`Precio (${currency})`}
                placeholder="55"
                value={salePrice}
                onChangeText={setSalePrice}
                keyboardType="numeric"
                editable={!isSubmitting}
              />
            </View>
            <View style={{ flex: 1 }}>
              <VrittPaperInput
                label="Venta diaria"
                placeholder="20"
                value={estimatedDailySalesVolume}
                onChangeText={setEstimatedDailySalesVolume}
                keyboardType="numeric"
                editable={!isSubmitting}
                hint="estimado"
              />
            </View>
          </View>
        </VrittInventoryCard>

        {type === 'DIRECT' ? (
          <>
            <VrittInventoryCard
              eyebrow="Costo del producto"
              description="Desglosa el costo unitario para conocer tu margen real."
            >
              <View style={{ gap: 14 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <VrittPaperInput
                      label="Materia prima"
                      placeholder="18"
                      value={directMaterialCost}
                      onChangeText={setDirectMaterialCost}
                      keyboardType="numeric"
                      editable={!isSubmitting}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <VrittPaperInput
                      label="Mano de obra"
                      placeholder="0"
                      value={directLaborCost}
                      onChangeText={setDirectLaborCost}
                      keyboardType="numeric"
                      editable={!isSubmitting}
                    />
                  </View>
                </View>
                <VrittPaperInput
                  label="CIF asignado"
                  placeholder="0"
                  value={directCifCost}
                  onChangeText={setDirectCifCost}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                />

                <VrittCostBreakdown
                  rows={[
                    {
                      label: 'Materia prima',
                      value: directCostBreakdown.materialCost ?? 0,
                    },
                    {
                      label: 'Mano de obra',
                      value: directCostBreakdown.directLaborCost ?? 0,
                    },
                    {
                      label: 'CIF',
                      value: directCostBreakdown.allocatedCifCost ?? 0,
                    },
                  ]}
                  total={directCostBreakdown.totalCost ?? 0}
                  currency={currency}
                  totalLabel="Costo unitario"
                />
              </View>
            </VrittInventoryCard>

            <VrittInventoryCard
              eyebrow="Ingreso inicial (opcional)"
              description="Si ya recibiste unidades de este producto, déjalas cargadas desde ahora."
            >
              <View style={{ gap: 14 }}>
                <VrittPaperInput
                  label="Cantidad"
                  placeholder="24"
                  value={initialDirectStock}
                  onChangeText={setInitialDirectStock}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                  suffix={stockUnit || undefined}
                />
                {locationOptions.length > 0 ? (
                  <VrittPaperListPicker
                    label="Ubicación"
                    options={locationOptions}
                    value={initialLocationId}
                    onChange={setInitialLocationId}
                  />
                ) : null}
              </View>
            </VrittInventoryCard>
          </>
        ) : (
          <>
            {materials.length === 0 ? (
              <VrittInventoryEmpty
                icon="cube-outline"
                title="Aún no tienes insumos"
                description="Necesitas al menos un insumo para construir una receta. Crea uno y vuelve a este flujo."
                actionLabel="Agregar insumo"
                onAction={() =>
                  router.push(
                    `/businesses/${businessId}/inventory/create-material`,
                  )
                }
              />
            ) : (
              <>
                <View style={{ gap: 12 }}>
                  <RecipeSectionHeader
                    count={recipeItems.length}
                    onAdd={handleAddRecipeItem}
                    disabled={isSubmitting}
                  />
                  <View style={{ gap: 10 }}>
                    {recipeItems.map((item, idx) => (
                      <VrittRecipeItemCard
                        key={item.id}
                        index={idx}
                        item={item}
                        materialOptions={materialOptions}
                        canRemove={recipeItems.length > 1}
                        onChange={(field, value) =>
                          handleRecipeItemChange(item.id, field, value)
                        }
                        onRemove={() => handleRemoveRecipeItem(item.id)}
                        disabled={isSubmitting}
                      />
                    ))}
                  </View>
                </View>

                <VrittInventoryCard
                  eyebrow="Costos adicionales"
                  description="Mano de obra y CIF que se suman por unidad producida."
                >
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <VrittPaperInput
                        label="Mano de obra"
                        placeholder="3"
                        value={recipeDirectLaborCost}
                        onChangeText={setRecipeDirectLaborCost}
                        keyboardType="numeric"
                        editable={!isSubmitting}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <VrittPaperInput
                        label="CIF asignado"
                        placeholder="1.5"
                        value={recipeAllocatedCifCost}
                        onChangeText={setRecipeAllocatedCifCost}
                        keyboardType="numeric"
                        editable={!isSubmitting}
                      />
                    </View>
                  </View>
                </VrittInventoryCard>

                {!makeToOrder ? (
                  <VrittInventoryCard
                    eyebrow="Producción inicial (opcional)"
                    description="Crea un primer lote de producción usando los insumos de la ubicación elegida."
                  >
                    <View style={{ gap: 14 }}>
                      <VrittPaperInput
                        label="Cantidad a producir"
                        placeholder="10"
                        value={initialProductionQuantity}
                        onChangeText={setInitialProductionQuantity}
                        keyboardType="numeric"
                        editable={!isSubmitting}
                        suffix={stockUnit || undefined}
                      />
                      {locationOptions.length > 0 ? (
                        <VrittPaperListPicker
                          label="Ubicación de producción"
                          options={locationOptions}
                          value={initialLocationId}
                          onChange={setInitialLocationId}
                        />
                      ) : null}
                    </View>
                  </VrittInventoryCard>
                ) : null}
              </>
            )}
          </>
        )}

        <VrittInventoryFooterActions
          primary={{
            label: 'Guardar producto',
            icon: 'save-outline',
            onPress: handleCreate,
            loading: isSubmitting,
            disabled:
              !name.trim() ||
              (type === 'RECIPE' && materials.length === 0),
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

// ── Subcomponentes locales ──────────────────────────────────────────

function ProductTypeSelector({
  value,
  onChange,
}: {
  value: ProductType;
  onChange: (value: ProductType) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <ProductTypeCard
        active={value === 'DIRECT'}
        icon="bag-outline"
        title="Directo"
        description="Se compra o recibe listo para vender."
        onPress={() => onChange('DIRECT')}
      />
      <ProductTypeCard
        active={value === 'RECIPE'}
        icon="leaf-outline"
        title="Con receta"
        description="Su costo nace de los insumos usados."
        onPress={() => onChange('RECIPE')}
      />
    </View>
  );
}

function ProductTypeCard({
  active,
  icon,
  title,
  description,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: active ? surface.ink : surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: active
          ? withAlpha(palette.ink, 0.85)
          : hairline.onPaper,
        padding: 14,
        gap: 10,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: active
            ? withAlpha(palette.paper, 0.14)
            : 'rgba(11,14,18,0.06)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={icon}
          size={15}
          color={active ? palette.paper : text.onPaper.primary}
        />
      </View>
      <Text
        style={{
          color: active ? palette.paper : text.onPaper.primary,
          fontSize: 14,
          fontWeight: '900',
          letterSpacing: -0.3,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: active
            ? withAlpha(palette.paper, 0.65)
            : text.onPaper.muted,
          fontSize: 11,
          fontWeight: '600',
          lineHeight: 15,
        }}
      >
        {description}
      </Text>
    </Pressable>
  );
}

function RecipeSectionHeader({
  count,
  onAdd,
  disabled,
}: {
  count: number;
  onAdd: () => void;
  disabled?: boolean;
}) {
  return (
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
          Receta base
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
          {count === 1 ? '1 insumo' : `${count} insumos`}
        </Text>
      </View>
      <Pressable
        onPress={onAdd}
        disabled={disabled}
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
  );
}
