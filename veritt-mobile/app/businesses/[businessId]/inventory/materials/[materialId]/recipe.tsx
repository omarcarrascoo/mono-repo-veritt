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

import { inventoryApi } from '@/api/modules/inventory.api';
import { useBusinessStore } from '@/store/business.store';
import { permissions } from '@/lib/role-permissions';
import { notify } from '@/lib/notify';
import { getApiErrorMessage } from '@/utils/error.utils';
import { formatInventoryQuantity } from '@/lib/inventory-formatters';
import type { Material } from '@/types/inventory.types';
import { palette, radius, surface, text } from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittInventoryHeader } from '@/components/inventory/VrittInventoryHeader';
import { VrittInventoryCard } from '@/components/inventory/VrittInventoryCard';
import { VrittInventoryEmpty } from '@/components/inventory/VrittInventoryEmpty';
import { VrittInventoryFooterActions } from '@/components/inventory/VrittInventoryFooterActions';
import { VrittPaperInput } from '@/components/inventory/VrittPaperInput';
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
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export default function MaterialRecipeScreen() {
  const { businessId, materialId } = useLocalSearchParams<{
    businessId: string;
    materialId: string;
  }>();

  const role = useBusinessStore((s) =>
    businessId ? s.getRole(businessId) : null,
  );
  const canManageInventory = permissions.canManageInventory(role);

  const [material, setMaterial] = useState<Material | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [outputQuantity, setOutputQuantity] = useState('1');
  const [recipeItems, setRecipeItems] = useState<RecipeItemForm[]>([
    createRecipeItem(),
  ]);

  const loadAll = useCallback(async () => {
    if (!businessId || !materialId) return;
    try {
      setIsLoading(true);
      const [mat, allMaterials] = await Promise.all([
        inventoryApi.getMaterial(businessId, materialId),
        inventoryApi.listMaterials(businessId),
      ]);
      setMaterial(mat);
      setMaterials(allMaterials);

      // Precargar la receta activa para editar con referencia (no arrancar vacía).
      const current = mat.productionRecipes?.[0];
      if (current) {
        setOutputQuantity(String(Number(current.outputQuantity) || 1));
        if (current.items.length > 0) {
          setRecipeItems(
            current.items.map((it) => ({
              id: `${it.id ?? it.materialId}`,
              materialId: it.materialId,
              quantity: String(Number(it.quantity)),
              wastePercent: it.wastePercent
                ? String(Number(it.wastePercent))
                : '',
            })),
          );
        }
      }
    } catch (err) {
      notify.error(
        'No pudimos cargar la receta',
        getApiErrorMessage(err, 'Verifica tu conexión.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [businessId, materialId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Insumos candidatos: cualquier material distinto del que estamos produciendo.
  const materialOptions = useMemo(
    () =>
      materials
        .filter((m) => m.id !== materialId)
        .map((m) => ({
          label: m.name,
          value: m.id,
          hint: `Disp. ${formatInventoryQuantity(m.currentStock, m.baseUnit)}`,
          icon: 'cube-outline' as const,
        })),
    [materials, materialId],
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
    setRecipeItems((current) => {
      if (current.length === 1) return current;
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const handleAddRecipeItem = useCallback(() => {
    setRecipeItems((current) => [...current, createRecipeItem()]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!businessId || !materialId) return;

    const output = parseOptionalNumber(outputQuantity);
    if (output === undefined || output <= 0) {
      notify.error('Rendimiento inválido', 'Indica cuánto rinde la receta.');
      return;
    }

    // Validar renglones: material elegido + cantidad > 0.
    const normalized = recipeItems
      .filter((it) => it.materialId)
      .map((it) => ({
        materialId: it.materialId,
        quantity: parseOptionalNumber(it.quantity),
        wastePercent: parseOptionalNumber(it.wastePercent) ?? 0,
      }));

    if (normalized.length === 0) {
      notify.error(
        'Falta el insumo',
        'Agrega al menos un insumo con su cantidad.',
      );
      return;
    }
    if (normalized.some((it) => it.quantity === undefined || it.quantity <= 0)) {
      notify.error(
        'Cantidad inválida',
        'Cada insumo necesita una cantidad mayor a cero.',
      );
      return;
    }
    // Evitar insumos duplicados (el backend tiene @@unique).
    const uniqueIds = new Set(normalized.map((it) => it.materialId));
    if (uniqueIds.size !== normalized.length) {
      notify.error(
        'Insumo repetido',
        'No repitas el mismo insumo en la receta.',
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await inventoryApi.createMaterialRecipe(businessId, materialId, {
        outputQuantity: output,
        note: 'Receta de producción desde app móvil',
        items: normalized.map((it) => ({
          materialId: it.materialId,
          quantity: it.quantity!,
          wastePercent: it.wastePercent,
        })),
      });
      notify.success(
        'Receta guardada',
        'Ya puedes producir este insumo consumiendo sus ingredientes.',
      );
      router.back();
    } catch (err) {
      notify.error(
        'No pudimos guardar la receta',
        getApiErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [businessId, materialId, outputQuantity, recipeItems]);

  if (isLoading) return <VrittLoader />;

  const unit = material?.baseUnit ?? '';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: surface.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
      <VrittInventoryHeader
        eyebrow="Transformación interna"
        title={material ? `Receta · ${material.name}` : 'Receta de producción'}
        onBack={() => router.back()}
      />

      {!canManageInventory ? (
        <VrittInventoryEmpty
          icon="lock-closed-outline"
          title="Sin permisos"
          description="Solo un administrador puede definir recetas de producción."
        />
      ) : materialOptions.length === 0 ? (
        <VrittInventoryEmpty
          icon="cube-outline"
          title="No hay insumos"
          description="Primero registra los insumos crudos que consume esta transformación."
          actionLabel="Crear insumo"
          onAction={() =>
            router.push(`/businesses/${businessId}/inventory/create-material`)
          }
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{
              padding: 20,
              paddingBottom: 220,
              gap: 20,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <VrittInventoryCard
              eyebrow="Rendimiento"
              description="Cuánto produce esta receta base. Al producir, el sistema escala los insumos proporcionalmente."
            >
              <VrittPaperInput
                label="Rinde"
                placeholder="1"
                value={outputQuantity}
                onChangeText={setOutputQuantity}
                keyboardType="numeric"
                editable={!isSubmitting}
                suffix={unit}
              />
            </VrittInventoryCard>

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
                    Insumos que consume
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
          </ScrollView>

          <VrittInventoryFooterActions
            primary={{
              label: 'Guardar receta',
              icon: 'save-outline',
              onPress: handleSave,
              loading: isSubmitting,
            }}
            secondary={{
              label: 'Cancelar',
              onPress: () => router.back(),
              disabled: isSubmitting,
            }}
          />
        </>
      )}
    </KeyboardAvoidingView>
  );
}
