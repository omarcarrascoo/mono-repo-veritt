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
import { receiptsApi } from '@/api/modules/receipts.api';
import { purchaseOrdersApi } from '@/api/modules/purchase-orders.api';
import { inventoryApi } from '@/api/modules/inventory.api';
import { useBusinessStore } from '@/store/business.store';
import { permissions } from '@/lib/role-permissions';
import { notify } from '@/lib/notify';
import { getApiErrorMessage } from '@/utils/error.utils';
import {
  formatInventoryCurrency,
  formatInventoryQuantity,
  formatLocationType,
} from '@/lib/inventory-formatters';
import type { Business } from '@/types/business.types';
import type { PurchaseOrder } from '@/types/purchase-order.types';
import type { CreateReceiptItemDto } from '@/types/receipt.types';
import type {
  InventoryLocation,
  Material,
} from '@/types/inventory.types';
import {
  palette,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittInventoryHeader } from '@/components/inventory/VrittInventoryHeader';
import { VrittInventoryCard } from '@/components/inventory/VrittInventoryCard';
import {
  VrittPaperInput,
  VrittPaperListPicker,
} from '@/components/inventory/VrittPaperInput';
import { VrittInventoryFooterActions } from '@/components/inventory/VrittInventoryFooterActions';
import { VrittInventoryEmpty } from '@/components/inventory/VrittInventoryEmpty';
import { VrittInfoBanner } from '@/components/ui/VrittInfoBanner';
import {
  VrittReceiptItemCard,
  type ReceiptItemValue,
} from '@/components/receipts/VrittReceiptItemCard';

// ── Helpers ──────────────────────────────────────────────────────────

type DraftItem = ReceiptItemValue & { id: string };

function createDraftItem(): DraftItem {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    materialId: '',
    quantityReceived: '',
    actualUnitCost: '',
  };
}

// ── Pantalla ────────────────────────────────────────────────────────

export default function CreateReceiptScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const role = useBusinessStore((s) =>
    businessId ? s.getRole(businessId) : null,
  );
  const canCreate = permissions.canReceiveInventory(role);
  // Los gerentes (R5/R6) mueven stock al instante y pueden vincular una OC.
  // El resto (R1) genera un borrador PENDING_REVIEW sin tocar inventario.
  const isManager = permissions.canManageSupply(role);

  // Gate: si llegan sin permisos por deep-link, regresar.
  useEffect(() => {
    if (!canCreate && businessId) {
      router.replace(`/businesses/${businessId}/receipts`);
    }
  }, [canCreate, businessId]);

  const [business, setBusiness] = useState<Business | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([createDraftItem()]);

  // ── Bootstrap ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!businessId) return;
      try {
        setIsLoadingData(true);
        // Sólo gerencia puede listar OCs (FINANCE_MANAGE); para R1 el endpoint
        // devuelve 403, así que ni lo pedimos: registran recepción directa.
        const [businessData, poData, locData, matData] = await Promise.all([
          businessesApi.getById(businessId),
          isManager
            ? purchaseOrdersApi.list(businessId, { status: 'SENT' })
            : Promise.resolve([] as PurchaseOrder[]),
          inventoryApi.listLocations(businessId),
          inventoryApi.listMaterials(businessId),
        ]);
        if (cancelled) return;
        setBusiness(businessData);
        setPurchaseOrders(poData);
        setLocations(locData.filter((l) => l.status === 'ACTIVE'));
        setMaterials(matData.filter((m) => m.status === 'ACTIVE'));
        const primary = locData.find((l) => l.isPrimary) ?? locData[0];
        if (primary) setLocationId(primary.id);
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
  }, [businessId, isManager]);

  // ── Derivados ─────────────────────────────────────────────────────

  const currency = business?.defaultCurrency || 'MXN';

  const poOptions = useMemo(
    () => [
      {
        label: 'Recepción directa',
        value: '',
        hint: 'Sin orden de compra',
        icon: 'cube-outline' as const,
      },
      ...purchaseOrders.map((po) => ({
        label: `OC-${po.orderNumber}`,
        value: po.id,
        hint: po.supplier?.name ?? 'Sin proveedor',
        icon: 'document-text-outline' as const,
      })),
    ],
    [purchaseOrders],
  );

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

  const totalCost = useMemo(() => {
    return items.reduce((acc, it) => {
      return (
        acc + Number(it.quantityReceived || 0) * Number(it.actualUnitCost || 0)
      );
    }, 0);
  }, [items]);

  const filledItemCount = useMemo(
    () =>
      items.filter(
        (it) => it.materialId && it.quantityReceived && it.actualUnitCost,
      ).length,
    [items],
  );

  // ── Handlers ──────────────────────────────────────────────────────

  const onBack = useCallback(() => router.back(), []);

  const updateItem = useCallback(
    (id: string, field: keyof ReceiptItemValue, value: string) => {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
      );
    },
    [],
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, createDraftItem()]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((it) => it.id !== id);
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (!businessId) return;
    if (!locationId) {
      notify.warning(
        'Faltan datos',
        'Selecciona una ubicación de recepción.',
      );
      return;
    }

    const validItems: CreateReceiptItemDto[] = [];
    for (const item of items) {
      if (
        !item.materialId ||
        !item.quantityReceived ||
        !item.actualUnitCost
      ) {
        notify.warning(
          'Faltan datos',
          'Cada artículo necesita material, cantidad y costo.',
        );
        return;
      }
      const qty = parseFloat(item.quantityReceived);
      const cost = parseFloat(item.actualUnitCost);
      if (!Number.isFinite(qty) || qty <= 0) {
        notify.warning(
          'Cantidad inválida',
          'La cantidad recibida debe ser mayor a cero.',
        );
        return;
      }
      if (!Number.isFinite(cost) || cost < 0) {
        notify.warning(
          'Costo inválido',
          'El costo unitario debe ser cero o mayor.',
        );
        return;
      }
      validItems.push({
        materialId: item.materialId,
        quantityReceived: qty,
        actualUnitCost: cost,
      });
    }

    const ids = validItems.map((it) => it.materialId);
    if (new Set(ids).size !== ids.length) {
      notify.warning(
        'Material duplicado',
        'No agregues el mismo insumo en dos renglones.',
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await receiptsApi.create(businessId, {
        purchaseOrderId: purchaseOrderId || undefined,
        locationId,
        notes: notes.trim() || undefined,
        items: validItems,
      });
      // El backend decide: gerencia mueve stock (COMPLETED); el resto deja un
      // borrador (PENDING_REVIEW) que un gerente debe autorizar. El mensaje
      // debe reflejar lo que realmente pasó, no prometer stock que no entró.
      if (created.status === 'PENDING_REVIEW') {
        notify.success(
          'Recepción enviada a revisión',
          'Un gerente debe autorizarla. El stock aún no entra al inventario.',
        );
      } else {
        notify.success('Recepción registrada', 'El stock fue actualizado.');
      }
      router.replace(`/businesses/${businessId}/receipts`);
    } catch (err) {
      notify.error(
        'No pudimos registrar la recepción',
        getApiErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [businessId, locationId, items, purchaseOrderId, notes]);

  // ── Render ────────────────────────────────────────────────────────

  if (isLoadingData) return <VrittLoader />;

  if (materials.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <VrittInventoryHeader
          eyebrow="Recepciones"
          title="Nueva recepción"
          onBack={onBack}
        />
        <View
          style={{
            flex: 1,
            paddingHorizontal: 20,
            paddingTop: 28,
            justifyContent: 'center',
          }}
        >
          <VrittInventoryEmpty
            icon="cube-outline"
            title="Sin insumos disponibles"
            description="Necesitas registrar al menos un insumo activo para poder recibir mercancía."
            actionLabel="Agregar insumo"
            onAction={() =>
              router.push(
                `/businesses/${businessId}/inventory/create-material`,
              )
            }
          />
        </View>
      </View>
    );
  }

  if (locations.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <VrittInventoryHeader
          eyebrow="Recepciones"
          title="Nueva recepción"
          onBack={onBack}
        />
        <View
          style={{
            flex: 1,
            paddingHorizontal: 20,
            paddingTop: 28,
            justifyContent: 'center',
          }}
        >
          <VrittInventoryEmpty
            icon="location-outline"
            title="Sin ubicaciones activas"
            description="Necesitas al menos una ubicación de inventario activa para recibir mercancía."
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: surface.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <VrittInventoryHeader
        eyebrow="Recepciones"
        title="Nueva recepción"
        onBack={onBack}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 32,
          paddingBottom: 260,
          gap: 36,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isManager ? (
          <VrittInventoryCard
            eyebrow="Origen"
            description="Vincula la recepción a una orden de compra o regístrala como recepción directa si llegó sin OC."
          >
            <VrittPaperListPicker
              label="Orden de compra"
              options={poOptions}
              value={purchaseOrderId}
              onChange={setPurchaseOrderId}
            />
          </VrittInventoryCard>
        ) : (
          <VrittInfoBanner
            tone="review"
            icon="hourglass-outline"
            title="Recepción para autorizar"
            description="Registra lo que llegó físicamente. Un gerente revisará los costos y autorizará la entrada al inventario."
          />
        )}

        <VrittInventoryCard eyebrow="Destino">
          <VrittPaperListPicker
            label="Ubicación de recepción"
            options={locationOptions}
            value={locationId}
            onChange={setLocationId}
          />
        </VrittInventoryCard>

        <View style={{ gap: 18 }}>
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
                Artículos recibidos
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
                {items.length === 1 ? '1 renglón' : `${items.length} renglones`}
              </Text>
            </View>
            <AddItemButton onPress={addItem} disabled={isSubmitting} />
          </View>

          <View style={{ gap: 14 }}>
            {items.map((item, idx) => {
              const material = materials.find(
                (m) => m.id === item.materialId,
              );
              return (
                <VrittReceiptItemCard
                  key={item.id}
                  index={idx}
                  item={item}
                  materialOptions={materialOptions}
                  canRemove={items.length > 1}
                  onChange={(field, value) =>
                    updateItem(item.id, field, value)
                  }
                  onRemove={() => removeItem(item.id)}
                  disabled={isSubmitting}
                  currency={currency}
                  baseUnitSuffix={material?.baseUnit}
                />
              );
            })}
          </View>
        </View>

        <VrittInventoryCard eyebrow="Notas (opcional)">
          <VrittPaperInput
            label="Observaciones"
            placeholder="Llegó dañado, factura pendiente, etc."
            value={notes}
            onChangeText={setNotes}
            editable={!isSubmitting}
            multiline
          />
        </VrittInventoryCard>

        {totalCost > 0 ? (
          <View
            style={{
              backgroundColor: surface.ink,
              borderRadius: radius.lg,
              padding: 22,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text
                style={{
                  color: 'rgba(245,242,234,0.6)',
                  fontSize: 10,
                  fontWeight: '900',
                  letterSpacing: 1.8,
                  textTransform: 'uppercase',
                }}
              >
                Total a registrar
              </Text>
              <Text
                style={{
                  color: 'rgba(245,242,234,0.7)',
                  fontSize: 12,
                  fontWeight: '700',
                  marginTop: 4,
                }}
              >
                {filledItemCount} de {items.length}{' '}
                {items.length === 1 ? 'artículo' : 'artículos'} listos
              </Text>
            </View>
            <Text
              style={{
                color: palette.paper,
                fontSize: 22,
                fontWeight: '900',
                letterSpacing: -0.8,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatInventoryCurrency(totalCost, currency)}
            </Text>
          </View>
        ) : null}

        <VrittInventoryFooterActions
          primary={{
            label: isManager ? 'Registrar recepción' : 'Enviar a revisión',
            icon: isManager ? 'archive-outline' : 'hourglass-outline',
            onPress: handleCreate,
            loading: isSubmitting,
            disabled: filledItemCount === 0 || !locationId,
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

// ── Subcomponentes ───────────────────────────────────────────────────

function AddItemButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
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
  );
}
