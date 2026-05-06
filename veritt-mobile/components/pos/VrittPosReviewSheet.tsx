import React, { memo, useCallback } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { PaymentMethod } from '@/types/payment-method.types';
import type { Area } from '@/types/area.types';
import type { StaffProfile } from '@/types/staff.types';
import {
  hairline,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

export type CartItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

type VrittPosReviewSheetProps = {
  visible: boolean;
  items: CartItem[];
  total: number;
  subtotal: number;
  paymentMethods: PaymentMethod[];
  selectedPaymentMethodId: string;
  areas: Area[];
  selectedAreaId: string;
  /** Si null, el operador es el usuario autenticado (implícito). */
  staffOptions?: StaffProfile[] | null;
  selectedOperatorId?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onSelectPaymentMethod: (id: string) => void;
  onSelectArea: (id: string) => void;
  onSelectOperator: (id: string) => void;
  onConfirm: () => void;
};

function Component({
  visible,
  items,
  total,
  subtotal,
  paymentMethods,
  selectedPaymentMethodId,
  areas,
  selectedAreaId,
  staffOptions,
  selectedOperatorId,
  isSubmitting,
  onClose,
  onIncrement,
  onDecrement,
  onRemove,
  onSelectPaymentMethod,
  onSelectArea,
  onSelectOperator,
  onConfirm,
}: VrittPosReviewSheetProps) {
  const canConfirm = items.length > 0 && !!selectedPaymentMethodId;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <View
          style={{
            paddingTop: Platform.OS === 'ios' ? 16 : 20,
            paddingHorizontal: 22,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: hairline.onPaperSoft,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 44,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(11,14,18,0.12)',
              marginBottom: 14,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text
                style={{
                  color: text.onPaper.muted,
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 1.8,
                  textTransform: 'uppercase',
                }}
              >
                Cobro
              </Text>
              <Text
                style={{
                  color: text.onPaper.primary,
                  fontSize: 24,
                  fontWeight: '800',
                  letterSpacing: -0.8,
                  marginTop: 4,
                }}
              >
                Revisar venta
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: hairline.onPaper,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name="close"
                size={18}
                color={text.onPaper.primary}
              />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 18,
            paddingBottom: 160,
            gap: 22,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Cart items */}
          <View
            style={{
              backgroundColor: surface.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: hairline.onPaper,
              overflow: 'hidden',
            }}
          >
            {items.map((item, idx) => (
              <CartRow
                key={item.productId}
                item={item}
                showDivider={idx > 0}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onRemove={onRemove}
              />
            ))}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 14,
                paddingHorizontal: 18,
                borderTopWidth: 1,
                borderTopColor: hairline.onPaperSoft,
              }}
            >
              <Text
                style={{
                  color: text.onPaper.muted,
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Subtotal
              </Text>
              <Text
                style={{
                  color: text.onPaper.primary,
                  fontSize: 14,
                  fontWeight: '800',
                  fontVariant: ['tabular-nums'],
                }}
              >
                ${subtotal.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Payment method */}
          <View style={{ gap: 10 }}>
            <Text
              style={{
                color: text.onPaper.muted,
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.8,
                textTransform: 'uppercase',
              }}
            >
              Método de pago
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {paymentMethods.map((m) => (
                <PaymentPill
                  key={m.id}
                  method={m}
                  isActive={selectedPaymentMethodId === m.id}
                  onSelect={onSelectPaymentMethod}
                />
              ))}
            </View>
          </View>

          {/* Areas (opcional) */}
          {areas.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Text
                style={{
                  color: text.onPaper.muted,
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 1.8,
                  textTransform: 'uppercase',
                }}
              >
                Área
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <AreaPill
                  id=""
                  label="Sin área"
                  isActive={!selectedAreaId}
                  onSelect={onSelectArea}
                />
                {areas.map((a) => (
                  <AreaPill
                    key={a.id}
                    id={a.id}
                    label={a.name}
                    isActive={selectedAreaId === a.id}
                    onSelect={onSelectArea}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Operator (sólo managers) */}
          {staffOptions && staffOptions.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Text
                style={{
                  color: text.onPaper.muted,
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 1.8,
                  textTransform: 'uppercase',
                }}
              >
                Operador
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {staffOptions.map((s) => (
                  <StaffPill
                    key={s.id}
                    id={s.id}
                    label={s.fullName}
                    isActive={selectedOperatorId === s.id}
                    onSelect={onSelectOperator}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Confirm dock */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: 18,
            paddingBottom: 32,
            backgroundColor: surface.paper,
            borderTopWidth: 1,
            borderTopColor: hairline.onPaperSoft,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={onConfirm}
            disabled={!canConfirm || isSubmitting}
            style={{
              opacity: !canConfirm ? 0.35 : 1,
              backgroundColor: surface.ink,
              borderRadius: radius.md,
              paddingVertical: 16,
              paddingHorizontal: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                color: text.onInk.primary,
                fontSize: 15,
                fontWeight: '900',
                letterSpacing: -0.3,
              }}
            >
              {isSubmitting ? 'Procesando...' : 'Confirmar cobro'}
            </Text>
            <Text
              style={{
                color: text.onInk.primary,
                fontSize: 18,
                fontWeight: '900',
                letterSpacing: -0.4,
                fontVariant: ['tabular-nums'],
              }}
            >
              ${total.toFixed(2)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Piezas internas ─────────────────────────────────────────────────

function CartRowInner({
  item,
  showDivider,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  item: CartItem;
  showDivider: boolean;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const inc = useCallback(() => onIncrement(item.productId), [item.productId, onIncrement]);
  const dec = useCallback(() => onDecrement(item.productId), [item.productId, onDecrement]);
  const rem = useCallback(() => onRemove(item.productId), [item.productId, onRemove]);

  const lineTotal = item.quantity * item.unitPrice;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderTopWidth: showDivider ? 1 : 0,
        borderTopColor: hairline.onPaperSoft,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            color: text.onPaper.primary,
            fontSize: 14,
            fontWeight: '800',
            letterSpacing: -0.2,
          }}
        >
          {item.productName}
        </Text>
        <Text
          style={{
            color: text.onPaper.muted,
            fontSize: 11,
            fontWeight: '700',
            marginTop: 2,
            fontVariant: ['tabular-nums'],
          }}
        >
          ${item.unitPrice.toFixed(2)} c/u
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          borderWidth: 1,
          borderColor: hairline.onPaper,
          borderRadius: radius.sm + 2,
          paddingHorizontal: 4,
        }}
      >
        <TouchableOpacity
          onPress={dec}
          hitSlop={8}
          style={{
            width: 26,
            height: 26,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="remove" size={14} color={text.onPaper.primary} />
        </TouchableOpacity>
        <Text
          style={{
            color: text.onPaper.primary,
            fontSize: 13,
            fontWeight: '800',
            width: 22,
            textAlign: 'center',
            fontVariant: ['tabular-nums'],
          }}
        >
          {item.quantity}
        </Text>
        <TouchableOpacity
          onPress={inc}
          hitSlop={8}
          style={{
            width: 26,
            height: 26,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={14} color={text.onPaper.primary} />
        </TouchableOpacity>
      </View>

      <Text
        style={{
          color: text.onPaper.primary,
          fontSize: 14,
          fontWeight: '800',
          letterSpacing: -0.2,
          width: 72,
          textAlign: 'right',
          fontVariant: ['tabular-nums'],
        }}
      >
        ${lineTotal.toFixed(2)}
      </Text>

      <TouchableOpacity onPress={rem} hitSlop={8}>
        <Ionicons
          name="close"
          size={16}
          color={text.onPaper.subtle}
        />
      </TouchableOpacity>
    </View>
  );
}
const CartRow = memo(CartRowInner);

function PillInner({
  label,
  sub,
  isActive,
  onPress,
}: {
  label: string;
  sub?: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={{
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderRadius: radius.md,
        backgroundColor: isActive ? surface.ink : surface.card,
        borderWidth: 1,
        borderColor: isActive ? surface.ink : hairline.onPaper,
      }}
    >
      <Text
        style={{
          color: isActive ? text.onInk.primary : text.onPaper.primary,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: -0.2,
        }}
      >
        {label}
      </Text>
      {sub ? (
        <Text
          style={{
            color: isActive
              ? 'rgba(245,242,234,0.6)'
              : text.onPaper.muted,
            fontSize: 10,
            fontWeight: '700',
            marginTop: 2,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          {sub}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}
const Pill = memo(PillInner);

function PaymentPillInner({
  method,
  isActive,
  onSelect,
}: {
  method: PaymentMethod;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  const onPress = useCallback(() => onSelect(method.id), [method.id, onSelect]);
  return <Pill label={method.name} isActive={isActive} onPress={onPress} />;
}
const PaymentPill = memo(PaymentPillInner);

function AreaPillInner({
  id,
  label,
  isActive,
  onSelect,
}: {
  id: string;
  label: string;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  const onPress = useCallback(() => onSelect(id), [id, onSelect]);
  return <Pill label={label} isActive={isActive} onPress={onPress} />;
}
const AreaPill = memo(AreaPillInner);

function StaffPillInner({
  id,
  label,
  isActive,
  onSelect,
}: {
  id: string;
  label: string;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  const onPress = useCallback(() => onSelect(id), [id, onSelect]);
  return <Pill label={label} isActive={isActive} onPress={onPress} />;
}
const StaffPill = memo(StaffPillInner);

export const VrittPosReviewSheet = memo(Component);
