import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { businessesApi } from '@/api/modules/businesses.api';
import { receiptsApi } from '@/api/modules/receipts.api';
import { useBusinessStore } from '@/store/business.store';
import { permissions } from '@/lib/role-permissions';
import { notify } from '@/lib/notify';
import { getApiErrorMessage } from '@/utils/error.utils';
import { formatInventoryCurrency } from '@/lib/inventory-formatters';
import {
  RECEIPT_STATUS_LABEL,
  calcReceiptTotal,
  shortTime,
} from '@/lib/receipts-formatters';
import type { Business } from '@/types/business.types';
import type { Receipt } from '@/types/receipt.types';
import {
  hairline,
  palette,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittInventoryHeader } from '@/components/inventory/VrittInventoryHeader';
import { VrittInventoryCard } from '@/components/inventory/VrittInventoryCard';
import { VrittInventoryFacts } from '@/components/inventory/VrittInventoryFacts';
import { VrittInventoryHero } from '@/components/inventory/VrittInventoryHero';
import { VrittInventoryFooterActions } from '@/components/inventory/VrittInventoryFooterActions';
import { VrittReceiptStatusChip } from '@/components/receipts/VrittReceiptStatusChip';
import { VrittReceiptItemReadRow } from '@/components/receipts/VrittReceiptItemReadRow';
import { VrittCancelReceiptSheet } from '@/components/receipts/VrittCancelReceiptSheet';
import { VrittRejectReceiptSheet } from '@/components/receipts/VrittRejectReceiptSheet';
import { VrittInfoBanner } from '@/components/ui/VrittInfoBanner';

function formatLongDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ReceiptDetailScreen() {
  const { businessId, receiptId } = useLocalSearchParams<{
    businessId: string;
    receiptId: string;
  }>();

  const role = useBusinessStore((s) =>
    businessId ? s.getRole(businessId) : null,
  );
  const canManage = permissions.canManageSupply(role);

  const [business, setBusiness] = useState<Business | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelComment, setCancelComment] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const loadAll = useCallback(async () => {
    if (!businessId || !receiptId) return;
    try {
      setIsLoading(true);
      const [businessData, receiptData] = await Promise.all([
        businessesApi.getById(businessId),
        receiptsApi.get(businessId, receiptId),
      ]);
      setBusiness(businessData);
      setReceipt(receiptData);
    } catch (err) {
      notify.error(
        'No pudimos cargar la recepción',
        getApiErrorMessage(err, 'Verifica tu conexión.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [businessId, receiptId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onBack = useCallback(() => router.back(), []);

  const handleConfirmCancel = useCallback(async () => {
    if (!businessId || !receiptId) return;
    if (!cancelReason.trim()) {
      notify.warning(
        'Falta el motivo',
        'El motivo de cancelación es obligatorio.',
      );
      return;
    }
    try {
      setIsCancelling(true);
      const updated = await receiptsApi.cancel(businessId, receiptId, {
        reason: cancelReason.trim(),
        comment: cancelComment.trim() || undefined,
      });
      setReceipt(updated);
      setShowCancelForm(false);
      setCancelReason('');
      setCancelComment('');
      notify.success(
        'Recepción cancelada',
        'El stock fue revertido en inventario.',
      );
    } catch (err) {
      notify.error(
        'No pudimos cancelar la recepción',
        getApiErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
      );
    } finally {
      setIsCancelling(false);
    }
  }, [businessId, receiptId, cancelReason, cancelComment]);

  const handleAuthorize = useCallback(async () => {
    if (!businessId || !receiptId) return;
    try {
      setIsAuthorizing(true);
      const updated = await receiptsApi.authorize(businessId, receiptId);
      setReceipt(updated);
      notify.success(
        'Recepción autorizada',
        'El stock ya entró al inventario.',
      );
    } catch (err) {
      notify.error(
        'No pudimos autorizar la recepción',
        getApiErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
      );
    } finally {
      setIsAuthorizing(false);
    }
  }, [businessId, receiptId]);

  const handleConfirmReject = useCallback(async () => {
    if (!businessId || !receiptId) return;
    if (!rejectReason.trim()) {
      notify.warning('Falta el motivo', 'El motivo del rechazo es obligatorio.');
      return;
    }
    try {
      setIsRejecting(true);
      const updated = await receiptsApi.reject(
        businessId,
        receiptId,
        rejectReason.trim(),
      );
      setReceipt(updated);
      setShowRejectForm(false);
      setRejectReason('');
      notify.success(
        'Recepción rechazada',
        'No se movió inventario. Quien la registró deberá corregirla.',
      );
    } catch (err) {
      notify.error(
        'No pudimos rechazar la recepción',
        getApiErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
      );
    } finally {
      setIsRejecting(false);
    }
  }, [businessId, receiptId, rejectReason]);

  const totalCost = useMemo(
    () => (receipt ? calcReceiptTotal(receipt.items ?? []) : 0),
    [receipt],
  );

  if (isLoading) return <VrittLoader />;

  if (!receipt) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <VrittInventoryHeader
          eyebrow="Recepciones"
          title="No encontrada"
          onBack={onBack}
        />
      </View>
    );
  }

  const currency = business?.defaultCurrency || 'MXN';
  const supplierName =
    receipt.purchaseOrder?.supplier?.name ?? 'Recepción directa';
  const orderLabel = receipt.purchaseOrder
    ? `OC-${receipt.purchaseOrder.orderNumber}`
    : 'Recepción directa';
  const heroTone =
    receipt.status === 'CANCELLED' || receipt.status === 'REJECTED'
      ? 'danger'
      : receipt.status === 'PARTIAL' || receipt.status === 'PENDING_REVIEW'
      ? 'warning'
      : 'neutral';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: surface.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <VrittInventoryHeader
        eyebrow={supplierName}
        title={orderLabel}
        onBack={onBack}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 32,
          paddingBottom: 240,
          gap: 36,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <VrittInventoryHero
          eyebrow={`Estado · ${RECEIPT_STATUS_LABEL[receipt.status]}`}
          primaryValue={formatInventoryCurrency(totalCost, currency)}
          primaryLabel={`${
            receipt.items?.length ?? 0
          } ${
            (receipt.items?.length ?? 0) === 1 ? 'artículo' : 'artículos'
          } recibidos`}
          tone={heroTone}
          metrics={[
            {
              label: 'Fecha',
              value: receipt.receivedAt
                ? new Date(receipt.receivedAt).toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                  })
                : '—',
            },
            {
              label: 'Hora',
              value: receipt.receivedAt
                ? shortTime(receipt.receivedAt)
                : '—',
            },
            {
              label: 'Ubicación',
              value: receipt.location?.name ?? '—',
            },
          ]}
        />

        <VrittInventoryCard eyebrow="Información">
          <View style={{ gap: 14 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  color: text.onPaper.muted,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                Estado
              </Text>
              <VrittReceiptStatusChip status={receipt.status} />
            </View>
            <VrittInventoryFacts
              facts={[
                { label: 'Proveedor', value: supplierName },
                {
                  label: 'Orden de compra',
                  value: receipt.purchaseOrder
                    ? `OC-${receipt.purchaseOrder.orderNumber}`
                    : 'Sin OC',
                },
                {
                  label: 'Ubicación',
                  value: receipt.location?.name ?? '—',
                },
                {
                  label: 'Fecha',
                  value: formatLongDate(receipt.receivedAt),
                },
                {
                  label: 'Recibido por',
                  value: receipt.receivedBy?.fullName ?? '—',
                },
              ]}
            />
          </View>
        </VrittInventoryCard>

        {receipt.notes ? (
          <VrittInventoryCard eyebrow="Notas">
            <Text
              style={{
                color: text.onPaper.primary,
                fontSize: 13,
                fontWeight: '600',
                lineHeight: 19,
              }}
            >
              {receipt.notes}
            </Text>
          </VrittInventoryCard>
        ) : null}

        {(receipt.items?.length ?? 0) > 0 ? (
          <View style={{ gap: 18 }}>
            <View style={{ paddingHorizontal: 4 }}>
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
                {receipt.items!.length === 1
                  ? '1 artículo'
                  : `${receipt.items!.length} artículos`}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: surface.card,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: hairline.onPaper,
                overflow: 'hidden',
              }}
            >
              {receipt.items!.map((item, idx) => (
                <VrittReceiptItemReadRow
                  key={item.id}
                  item={item}
                  currency={currency}
                  isFirst={idx === 0}
                />
              ))}
              <View
                style={{
                  paddingHorizontal: 22,
                  paddingVertical: 18,
                  borderTopWidth: 1,
                  borderTopColor: hairline.onPaper,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(11,14,18,0.04)',
                }}
              >
                <Text
                  style={{
                    color: text.onPaper.muted,
                    fontSize: 10,
                    fontWeight: '900',
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                  }}
                >
                  Total
                </Text>
                <Text
                  style={{
                    color: text.onPaper.primary,
                    fontSize: 18,
                    fontWeight: '900',
                    letterSpacing: -0.5,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatInventoryCurrency(totalCost, currency)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {receipt.status === 'CANCELLED' ? (
          <View
            style={{
              backgroundColor: surface.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: 'rgba(194,84,80,0.2)',
              padding: 26,
              gap: 18,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: palette.danger,
                }}
              />
              <Text
                style={{
                  color: palette.dangerDeep,
                  fontSize: 11,
                  fontWeight: '900',
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                }}
              >
                Recepción cancelada
              </Text>
            </View>
            <VrittInventoryFacts
              facts={[
                {
                  label: 'Motivo',
                  value: receipt.cancellationReason ?? '—',
                },
                ...(receipt.cancellationComment
                  ? [
                      {
                        label: 'Comentario',
                        value: receipt.cancellationComment,
                      },
                    ]
                  : []),
                {
                  label: 'Cancelada por',
                  value: receipt.cancelledBy?.fullName ?? '—',
                },
                {
                  label: 'Fecha',
                  value: formatLongDate(receipt.cancelledAt),
                },
              ]}
            />
          </View>
        ) : null}

        {receipt.status === 'REJECTED' ? (
          <View
            style={{
              backgroundColor: surface.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: 'rgba(194,84,80,0.2)',
              padding: 26,
              gap: 18,
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: palette.danger,
                }}
              />
              <Text
                style={{
                  color: palette.dangerDeep,
                  fontSize: 11,
                  fontWeight: '900',
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                }}
              >
                Recepción rechazada
              </Text>
            </View>
            <VrittInventoryFacts
              facts={[
                { label: 'Motivo', value: receipt.rejectionReason ?? '—' },
                { label: 'Fecha', value: formatLongDate(receipt.rejectedAt) },
              ]}
            />
          </View>
        ) : null}

        {/* Candado C3 — borrador esperando visto bueno del gerente */}
        {receipt.status === 'PENDING_REVIEW' ? (
          <VrittInfoBanner
            tone="review"
            icon="hourglass-outline"
            title="Pendiente de autorizar"
            description={
              canManage
                ? 'Revisa los artículos y costos. Al autorizar, el stock entra al inventario; si algo no cuadra, recházala.'
                : 'Un administrador debe revisar esta recepción. El stock no entra al inventario hasta que la autorice.'
            }
          />
        ) : null}

        {showCancelForm ? (
          <VrittCancelReceiptSheet
            reason={cancelReason}
            comment={cancelComment}
            onReasonChange={setCancelReason}
            onCommentChange={setCancelComment}
            onConfirm={handleConfirmCancel}
            onClose={() => {
              setShowCancelForm(false);
              setCancelReason('');
              setCancelComment('');
            }}
            isSubmitting={isCancelling}
          />
        ) : showRejectForm ? (
          <VrittRejectReceiptSheet
            reason={rejectReason}
            onReasonChange={setRejectReason}
            onConfirm={handleConfirmReject}
            onClose={() => {
              setShowRejectForm(false);
              setRejectReason('');
            }}
            isSubmitting={isRejecting}
          />
        ) : receipt.status === 'PENDING_REVIEW' && canManage ? (
          <VrittInventoryFooterActions
            primary={{
              label: 'Autorizar recepción',
              icon: 'checkmark-circle-outline',
              onPress: handleAuthorize,
              loading: isAuthorizing,
            }}
            destructive={{
              label: 'Rechazar recepción',
              onPress: () => setShowRejectForm(true),
              disabled: isAuthorizing,
            }}
          />
        ) : receipt.status === 'COMPLETED' && canManage ? (
          <VrittInventoryFooterActions
            primary={{
              label: 'Volver',
              icon: 'arrow-back',
              onPress: onBack,
            }}
            destructive={{
              label: 'Cancelar recepción',
              onPress: () => setShowCancelForm(true),
            }}
          />
        ) : (
          <VrittInventoryFooterActions
            primary={{
              label: 'Volver al historial',
              icon: 'arrow-back',
              onPress: onBack,
            }}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
