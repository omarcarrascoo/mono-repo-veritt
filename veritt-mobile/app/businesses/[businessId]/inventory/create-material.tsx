import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { businessesApi } from '@/api/modules/businesses.api';
import { inventoryApi } from '@/api/modules/inventory.api';
import { useBusinessStore } from '@/store/business.store';
import { permissions } from '@/lib/role-permissions';
import { notify } from '@/lib/notify';
import { getApiErrorMessage } from '@/utils/error.utils';
import { markIngredientsStepCompleted } from '@/lib/update-onboarding';
import type { Business } from '@/types/business.types';
import type { InventoryLocation } from '@/types/inventory.types';
import { formatLocationType } from '@/lib/inventory-formatters';
import { surface } from '@/constants/design-tokens';

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
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [baseUnit, setBaseUnit] = useState('');
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
        const [businessData, locationData, categories] = await Promise.all([
          businessesApi.getById(businessId),
          inventoryApi.listLocations(businessId),
          inventoryApi.listCategories(businessId).catch(() => []),
        ]);
        if (cancelled) return;
        setBusiness(businessData);
        setLocations(locationData);
        setExistingCategories(categories);
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
