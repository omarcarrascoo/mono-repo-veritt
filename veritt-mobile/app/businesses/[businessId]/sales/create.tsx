import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { salesApi } from '@/api/modules/sales.api';
import { useBusinessStore } from '@/store/business.store';
import { usePosData, invalidatePosData } from '@/hooks/usePosData';
import { permissions } from '@/lib/role-permissions';
import { getApiErrorMessage } from '@/utils/error.utils';
import { invalidateBusinessDetail } from '@/hooks/useBusinessDetail';
import type { Product } from '@/types/inventory.types';

import { VrittLoader } from '@/components/ui/VrittLoader';
import {
  VrittPosFilters,
  type PosSortKey,
} from '@/components/pos/VrittPosFilters';
import { VrittPosProductGrid } from '@/components/pos/VrittPosProductGrid';
import { VrittPosCartDock } from '@/components/pos/VrittPosCartDock';
import {
  VrittPosReviewSheet,
  type CartItem,
} from '@/components/pos/VrittPosReviewSheet';
import {
  hairline,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

export default function CreateSaleScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const role = useBusinessStore((s) =>
    businessId ? s.getRole(businessId) : null,
  );
  const isManager = permissions.canSeeFinance(role);

  const {
    products,
    paymentMethods,
    staff,
    areas,
    isLoading,
  } = usePosData(businessId ?? null, role);

  // ── Estado del POS ───────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<PosSortKey>('name');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Derivados ────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const key = p.category ?? 'Sin categoría';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [products]);

  // Filtrado + ordenamiento — pura derivación memoizada.
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    let out = products;
    if (activeCategory !== null) {
      out = out.filter(
        (p) => (p.category ?? 'Sin categoría') === activeCategory,
      );
    }
    if (normalizedQuery.length > 0) {
      out = out.filter((p) => {
        const haystack = `${p.name} ${p.category ?? ''}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    }

    if (sort === 'name') {
      out = [...out].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    } else if (sort === 'price-asc') {
      out = [...out].sort(
        (a, b) => Number(a.currentSalePrice) - Number(b.currentSalePrice),
      );
    } else {
      out = [...out].sort(
        (a, b) => Number(b.currentSalePrice) - Number(a.currentSalePrice),
      );
    }
    return out;
  }, [products, activeCategory, query, sort]);

  const quantityByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart) map[item.productId] = item.quantity;
    return map;
  }, [cart]);

  const { subtotal, itemCount } = useMemo(() => {
    let total = 0;
    let count = 0;
    for (const item of cart) {
      total += item.quantity * item.unitPrice;
      count += item.quantity;
    }
    return { subtotal: total, itemCount: count };
  }, [cart]);

  // Auto-seleccionar primer método de pago cuando carguen.
  React.useEffect(() => {
    if (!selectedPaymentMethodId && paymentMethods.length > 0) {
      setSelectedPaymentMethodId(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedPaymentMethodId]);

  // ── Handlers ─────────────────────────────────────────────────────
  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const found = prev.find((i) => i.productId === product.id);
      if (found) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: Number(product.currentSalePrice),
        },
      ];
    });
  }, []);

  const incrementItem = useCallback((productId: string) => {
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i,
      ),
    );
  }, []);

  const decrementItem = useCallback((productId: string) => {
    setCart((prev) => {
      return prev
        .map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i,
        )
        .filter((i) => i.quantity > 0);
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const openReview = useCallback(() => setIsReviewOpen(true), []);
  const closeReview = useCallback(() => setIsReviewOpen(false), []);

  const handleConfirm = useCallback(async () => {
    if (!businessId) return;
    if (cart.length === 0) return;
    if (!selectedPaymentMethodId) {
      Alert.alert('Falta método de pago', 'Selecciona uno antes de confirmar.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Build payload sin keys undefined — algunos validadores se tropiezan
      // con `{ operatorStaffId: undefined }` aunque el campo sea opcional.
      const payload: Parameters<typeof salesApi.create>[1] = {
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        payments: [
          {
            paymentMethodId: selectedPaymentMethodId,
            amount: subtotal,
          },
        ],
      };
      if (isManager && selectedOperatorId) {
        payload.operatorStaffId = selectedOperatorId;
      }
      if (selectedAreaId) {
        payload.areaId = selectedAreaId;
      }

      await salesApi.create(businessId, payload);

      // Invalida caches dependientes de ventas.
      invalidatePosData(businessId);
      invalidateBusinessDetail(businessId);

      setCart([]);
      setIsReviewOpen(false);
      router.replace(`/businesses/${businessId}/sales`);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'No pudimos registrar la venta.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    businessId,
    cart,
    selectedPaymentMethodId,
    selectedAreaId,
    selectedOperatorId,
    subtotal,
    isManager,
  ]);

  const onBack = useCallback(() => router.back(), []);
  const clearFilters = useCallback(() => {
    setQuery('');
    setActiveCategory(null);
  }, []);

  // ── Render ───────────────────────────────────────────────────────
  if (isLoading && products.length === 0) {
    return <VrittLoader />;
  }

  const totalLabel = `$${subtotal.toFixed(2)}`;
  const hasProducts = products.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      {/* Header */}
      <View
        style={{
          paddingTop: Platform.OS === 'ios' ? 60 : 52,
          paddingHorizontal: 18,
          paddingBottom: 12,
          backgroundColor: surface.paper,
          borderBottomWidth: 1,
          borderBottomColor: hairline.onPaperSoft,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Pressable
            onPress={onBack}
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.sm + 2,
              borderWidth: 1,
              borderColor: hairline.onPaper,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name="arrow-back"
              size={16}
              color={text.onPaper.primary}
            />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: text.onPaper.muted,
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.6,
                textTransform: 'uppercase',
              }}
            >
              Punto de venta
            </Text>
            <Text
              style={{
                color: text.onPaper.primary,
                fontSize: 18,
                fontWeight: '800',
                letterSpacing: -0.5,
                marginTop: 2,
              }}
            >
              Nueva venta
            </Text>
          </View>
        </View>
      </View>

      {/* Filtros: buscador + categorías + sort */}
      {hasProducts ? (
        <View style={{ paddingTop: 14, paddingBottom: 6 }}>
          <VrittPosFilters
            query={query}
            onQueryChange={setQuery}
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            sort={sort}
            onSortChange={setSort}
            resultCount={filteredProducts.length}
          />
        </View>
      ) : null}

      {/* Grid */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 12,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {hasProducts ? (
          filteredProducts.length > 0 ? (
            <VrittPosProductGrid
              products={filteredProducts}
              cartQuantityByProductId={quantityByProductId}
              onAdd={addToCart}
            />
          ) : (
            <EmptyFilter onClear={clearFilters} />
          )
        ) : (
          <EmptyCatalog />
        )}
      </ScrollView>

      {/* Dock inferior con CTA */}
      {itemCount > 0 ? (
        <VrittPosCartDock
          itemCount={itemCount}
          total={totalLabel}
          isSubmitting={isSubmitting}
          onReview={openReview}
        />
      ) : null}

      {/* Review modal */}
      <VrittPosReviewSheet
        visible={isReviewOpen}
        items={cart}
        total={subtotal}
        subtotal={subtotal}
        paymentMethods={paymentMethods}
        selectedPaymentMethodId={selectedPaymentMethodId}
        areas={areas}
        selectedAreaId={selectedAreaId}
        staffOptions={isManager ? staff : null}
        selectedOperatorId={selectedOperatorId}
        isSubmitting={isSubmitting}
        onClose={closeReview}
        onIncrement={incrementItem}
        onDecrement={decrementItem}
        onRemove={removeItem}
        onSelectPaymentMethod={setSelectedPaymentMethodId}
        onSelectArea={setSelectedAreaId}
        onSelectOperator={setSelectedOperatorId}
        onConfirm={handleConfirm}
      />
    </View>
  );
}

function EmptyCatalog() {
  return (
    <View style={{ marginTop: 60, alignItems: 'center', gap: 10 }}>
      <Text
        style={{
          color: text.onPaper.primary,
          fontSize: 18,
          fontWeight: '800',
          letterSpacing: -0.5,
        }}
      >
        Sin productos activos
      </Text>
      <Text
        style={{
          color: text.onPaper.muted,
          fontSize: 13,
          textAlign: 'center',
          maxWidth: 260,
          lineHeight: 18,
        }}
      >
        Añade productos al inventario para empezar a vender.
      </Text>
    </View>
  );
}

function EmptyFilter({ onClear }: { onClear: () => void }) {
  return (
    <View style={{ marginTop: 60, alignItems: 'center', gap: 12 }}>
      <Ionicons name="search" size={28} color={text.onPaper.muted} />
      <Text
        style={{
          color: text.onPaper.primary,
          fontSize: 16,
          fontWeight: '800',
          letterSpacing: -0.4,
        }}
      >
        Nada coincide con tu búsqueda
      </Text>
      <Pressable
        onPress={onClear}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: radius.md,
          backgroundColor: surface.ink,
        }}
      >
        <Text
          style={{
            color: text.onInk.primary,
            fontSize: 12,
            fontWeight: '900',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          Limpiar filtros
        </Text>
      </Pressable>
    </View>
  );
}
