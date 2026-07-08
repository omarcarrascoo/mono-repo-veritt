import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { dailyChainApi } from '@/api/modules/daily-chain.api';
import { paymentMethodsApi } from '@/api/modules/payment-methods.api';
import { DailyCashReconciliation } from '@/types/daily-chain.types';
import { MANAGER_ROLES } from '@/types/business.types';
import { useBusinessStore } from '@/store/business.store';
import { useAuthStore } from '@/store/auth.store';
import { getApiErrorMessage } from '@/utils/error.utils';
import { notify } from '@/lib/notify';
import { formatMoney } from '@/lib/format';
import {
  hairline,
  palette,
  radius,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittScreenHeader } from '@/components/ui/VrittScreenHeader';
import { VrittSheetHeader } from '@/components/ui/VrittSheetHeader';
import { VrittBottomDock } from '@/components/ui/VrittBottomDock';
import { VrittInfoBanner } from '@/components/ui/VrittInfoBanner';
import { VrittStatusChip } from '@/components/ui/VrittStatusChip';

// ── Constantes ────────────────────────────────────────────────────────

const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5];
const DIFF_EPSILON = 0.005;

interface DenomCount {
  denomination: number;
  quantity: string;
}

interface TerminalInput {
  paymentMethodId: string;
  name: string;
  reportedTotal: string;
  reference: string;
}

type ScreenMode = 'input' | 'review' | 'final';

function getMode(recon: DailyCashReconciliation | null): ScreenMode {
  if (!recon) return 'input';
  if (recon.status === 'PENDING_REVIEW') return 'review';
  return 'final';
}

function denominationLabel(value: number): string {
  if (value >= 1) return `$${value}`;
  return `${Math.round(value * 100)}¢`;
}

// ── Pantalla ──────────────────────────────────────────────────────────

export default function ReconciliationScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const userRole = useBusinessStore((s) => s.getRole(businessId));
  const isManager = !!userRole && MANAGER_ROLES.includes(userRole);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [recon, setRecon] = useState<DailyCashReconciliation | null>(null);
  const [denominations, setDenominations] = useState<DenomCount[]>(
    DENOMINATIONS.map((d) => ({ denomination: d, quantity: '' })),
  );
  const [terminals, setTerminals] = useState<TerminalInput[]>([]);
  const [transferTotal, setTransferTotal] = useState('');
  const [transferFolios, setTransferFolios] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);

  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      const existing = await dailyChainApi.getReconciliation(businessId);
      setRecon(existing);
      if (!existing) {
        const methods = await paymentMethodsApi.list(businessId);
        const terminalMethods = methods.filter(
          (m: { type: string; status: string }) =>
            m.type === 'CARD_TERMINAL' && m.status === 'ACTIVE',
        );
        setTerminals(
          terminalMethods.map(
            (m: { id: string; name: string }) => ({
              paymentMethodId: m.id,
              name: m.name,
              reportedTotal: '',
              reference: '',
            }),
          ),
        );
      }
    } catch (err) {
      notify.error(
        'No pudimos cargar el arqueo',
        getApiErrorMessage(err, 'Verifica tu conexión.'),
      );
    }
  }, [businessId]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load().finally(() => setIsLoading(false));
    }, [load]),
  );

  const onBack = useCallback(() => router.back(), []);

  // ── Submitters ────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!businessId) return;

    const cashDenominations = denominations
      .filter(
        (d) => d.quantity.trim() !== '' && Number(d.quantity) > 0,
      )
      .map((d) => ({
        denomination: d.denomination,
        quantity: Number(d.quantity),
      }));

    const terminalTotals = terminals
      .filter((t) => t.reportedTotal.trim() !== '')
      .map((t) => ({
        paymentMethodId: t.paymentMethodId,
        reportedTotal: Number(t.reportedTotal),
        reference: t.reference || undefined,
      }));

    const transferTotals = transferTotal.trim()
      ? [
          {
            reportedTotal: Number(transferTotal),
            folioReferences: transferFolios || undefined,
          },
        ]
      : [];

    if (
      cashDenominations.length === 0 &&
      terminalTotals.length === 0 &&
      transferTotals.length === 0
    ) {
      notify.warning(
        'Sin captura',
        'Captura al menos una denominación, terminal o transferencia.',
      );
      return;
    }

    try {
      setIsActioning(true);
      const result = await dailyChainApi.createReconciliation(businessId, {
        cashDenominations,
        terminalTotals: terminalTotals.length > 0 ? terminalTotals : undefined,
        transferTotals: transferTotals.length > 0 ? transferTotals : undefined,
      });
      setRecon(result);
      notify.success(
        'Arqueo enviado',
        'Un gerente debe aprobarlo para continuar al cierre.',
      );
    } catch (err) {
      notify.error(
        'No pudimos enviar el arqueo',
        getApiErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
      );
    } finally {
      setIsActioning(false);
    }
  }, [businessId, denominations, terminals, transferTotal, transferFolios]);

  const handleApprove = useCallback(async () => {
    if (!businessId || !recon) return;
    try {
      setIsActioning(true);
      setActionError(null);
      const updated = await dailyChainApi.approveReconciliation(
        businessId,
        recon.id,
      );
      setRecon(updated);
      setConfirmApprove(false);
      notify.success(
        'Arqueo aprobado',
        Math.abs(Number(updated.difference)) < DIFF_EPSILON
          ? 'Conciliado al 100%. Procede a firmar el cierre.'
          : 'Discrepancia registrada. Firma el cierre con justificación.',
      );
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Intenta de nuevo.');
      setActionError(msg);
      notify.error('No se pudo aprobar', msg);
    } finally {
      setIsActioning(false);
    }
  }, [businessId, recon]);

  const handleReject = useCallback(async () => {
    if (!businessId || !recon) return;
    const reason = rejectReason.trim();
    if (!reason) {
      const msg =
        'Indica el motivo del rechazo para que el operador pueda recontar.';
      setActionError(msg);
      notify.warning('Faltan datos', msg);
      return;
    }
    try {
      setIsActioning(true);
      setActionError(null);
      await dailyChainApi.rejectReconciliation(
        businessId,
        recon.id,
        reason,
      );
      setConfirmReject(false);
      setRejectReason('');
      await load();
      notify.info(
        'Arqueo rechazado',
        'El operador deberá registrar un nuevo conteo.',
      );
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Intenta de nuevo.');
      setActionError(msg);
      notify.error('No se pudo rechazar', msg);
    } finally {
      setIsActioning(false);
    }
  }, [businessId, load, recon, rejectReason]);

  // ── Render ────────────────────────────────────────────────────────

  if (isLoading) return <VrittLoader />;
  const mode = getMode(recon);

  if (mode === 'input') {
    return (
      <InputMode
        denominations={denominations}
        onDenomChange={(idx, qty) =>
          setDenominations((prev) =>
            prev.map((d, i) => (i === idx ? { ...d, quantity: qty } : d)),
          )
        }
        terminals={terminals}
        onTerminalChange={(idx, field, value) =>
          setTerminals((prev) =>
            prev.map((t, i) =>
              i === idx ? { ...t, [field]: value } : t,
            ),
          )
        }
        transferTotal={transferTotal}
        onTransferTotalChange={setTransferTotal}
        transferFolios={transferFolios}
        onTransferFoliosChange={setTransferFolios}
        isSubmitting={isActioning}
        onSubmit={handleSubmit}
        onBack={onBack}
      />
    );
  }

  if (mode === 'review' && recon) {
    return (
      <ReviewMode
        recon={recon}
        isManager={isManager}
        currentUserId={currentUserId ?? null}
        isActioning={isActioning}
        confirmApprove={confirmApprove}
        confirmReject={confirmReject}
        rejectReason={rejectReason}
        actionError={actionError}
        onOpenApprove={() => {
          setActionError(null);
          setConfirmApprove(true);
        }}
        onCloseApprove={() => {
          setActionError(null);
          setConfirmApprove(false);
        }}
        onOpenReject={() => {
          setActionError(null);
          setConfirmReject(true);
        }}
        onCloseReject={() => {
          setActionError(null);
          setConfirmReject(false);
          setRejectReason('');
        }}
        onChangeRejectReason={setRejectReason}
        onApprove={handleApprove}
        onReject={handleReject}
        onBack={onBack}
      />
    );
  }

  if (recon) {
    return <FinalMode recon={recon} onBack={onBack} />;
  }

  return null;
}

// ╭────────────────────────────────────────────────────────────────────╮
// │  INPUT MODE                                                        │
// ╰────────────────────────────────────────────────────────────────────╯

function InputMode({
  denominations,
  onDenomChange,
  terminals,
  onTerminalChange,
  transferTotal,
  onTransferTotalChange,
  transferFolios,
  onTransferFoliosChange,
  isSubmitting,
  onSubmit,
  onBack,
}: {
  denominations: DenomCount[];
  onDenomChange: (idx: number, qty: string) => void;
  terminals: TerminalInput[];
  onTerminalChange: (
    idx: number,
    field: 'reportedTotal' | 'reference',
    value: string,
  ) => void;
  transferTotal: string;
  onTransferTotalChange: (v: string) => void;
  transferFolios: string;
  onTransferFoliosChange: (v: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const cashTotal = useMemo(
    () =>
      denominations.reduce(
        (sum, d) => sum + d.denomination * (Number(d.quantity) || 0),
        0,
      ),
    [denominations],
  );

  const terminalTotal = useMemo(
    () =>
      terminals.reduce(
        (sum, t) => sum + (Number(t.reportedTotal) || 0),
        0,
      ),
    [terminals],
  );

  const transferTotalNum = Number(transferTotal) || 0;
  const grandTotal = cashTotal + terminalTotal + transferTotalNum;

  const denomFilledCount = denominations.filter(
    (d) => d.quantity.trim() !== '' && Number(d.quantity) > 0,
  ).length;

  const terminalFilledCount = terminals.filter(
    (t) => t.reportedTotal.trim() !== '',
  ).length;

  const hasAnyInput =
    denomFilledCount > 0 ||
    terminalFilledCount > 0 ||
    transferTotal.trim() !== '';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: surface.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
      <VrittScreenHeader
        onBack={onBack}
        title="Arqueo"
        eyebrow="FAF · Conteo ciego"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: 180,
          gap: 22,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero ink — total en vivo */}
        <View
          style={{
            backgroundColor: surface.ink,
            borderRadius: radius.lg,
            padding: 22,
            gap: 14,
          }}
        >
          <Text
            style={{
              color: text.onInk.muted,
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            Total contado
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{
              color: palette.paper,
              fontSize: 44,
              fontWeight: '800',
              letterSpacing: -1.8,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatMoney(grandTotal)}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 14,
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: 'rgba(245,242,234,0.1)',
            }}
          >
            <HeroInputMetric
              dot={palette.paper}
              label="Efectivo"
              value={formatMoney(cashTotal)}
            />
            {terminals.length > 0 ? (
              <HeroInputMetric
                dot={palette.sage}
                label="Terminal"
                value={formatMoney(terminalTotal)}
              />
            ) : null}
            <HeroInputMetric
              dot={palette.amber}
              label="Transfer."
              value={formatMoney(transferTotalNum)}
            />
          </View>
        </View>

        {/* Banner explicativo */}
        <VrittInfoBanner
          tone="info"
          icon="eye-off-outline"
          title="Conteo ciego"
          description="No mostramos lo que el sistema espera. Cuenta lo que tienes físicamente y captura los totales reportados — el gerente comparará al revisar."
        />

        {/* Efectivo */}
        <View style={{ gap: 12 }}>
          <SectionHeader
            accent={palette.paper}
            title="Efectivo"
            caption="Cuenta los billetes y monedas. Ingresa cantidad de piezas por denominación."
            metaLabel={`${denomFilledCount} de ${denominations.length}`}
          />

          <View style={{ gap: 8 }}>
            {denominations.map((d, idx) => (
              <DenominationRow
                key={d.denomination}
                denomination={d.denomination}
                quantity={d.quantity}
                onChange={(v) => onDenomChange(idx, v)}
                disabled={isSubmitting}
              />
            ))}
          </View>

          <View
            style={{
              backgroundColor: surface.card,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: hairline.onPaper,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                color: text.onPaper.muted,
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              Subtotal en efectivo
            </Text>
            <Text
              style={{
                color: text.onPaper.primary,
                fontSize: 18,
                fontWeight: '900',
                letterSpacing: -0.4,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatMoney(cashTotal)}
            </Text>
          </View>
        </View>

        {/* Terminales */}
        {terminals.length > 0 ? (
          <View style={{ gap: 12 }}>
            <SectionHeader
              accent={palette.sage}
              title="Terminales"
              caption="Captura el total reportado por cada terminal. La referencia (no. de corte) es opcional."
              metaLabel={`${terminalFilledCount} de ${terminals.length}`}
            />
            <View style={{ gap: 10 }}>
              {terminals.map((t, idx) => (
                <TerminalCard
                  key={t.paymentMethodId}
                  terminal={t}
                  onChange={(field, value) =>
                    onTerminalChange(idx, field, value)
                  }
                  disabled={isSubmitting}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Transferencias */}
        <View style={{ gap: 12 }}>
          <SectionHeader
            accent={palette.amber}
            title="Transferencias"
            caption="Suma todas las transferencias recibidas en el día."
          />
          <View
            style={{
              backgroundColor: surface.card,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: hairline.onPaper,
              padding: 14,
              gap: 14,
            }}
          >
            <PaperField
              label="Total"
              placeholder="0.00"
              value={transferTotal}
              onChangeText={onTransferTotalChange}
              keyboardType="decimal-pad"
              editable={!isSubmitting}
              prefix="$"
              size="lg"
            />
            <PaperField
              label="Folios (opcional)"
              placeholder="Folio1, Folio2…"
              value={transferFolios}
              onChangeText={onTransferFoliosChange}
              editable={!isSubmitting}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom dock — enviar */}
      <VrittBottomDock>
        <TouchableOpacity
          onPress={onSubmit}
          disabled={!hasAnyInput || isSubmitting}
          activeOpacity={0.92}
          accessibilityRole="button"
          accessibilityLabel="Enviar arqueo"
          style={{
            backgroundColor: hasAnyInput ? surface.ink : 'rgba(11,14,18,0.18)',
            borderRadius: radius.md,
            paddingVertical: 14,
            paddingHorizontal: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          <View style={{ gap: 4, flex: 1, minWidth: 0 }}>
            <Text
              style={{
                color: hasAnyInput
                  ? text.onInk.muted
                  : 'rgba(245,242,234,0.5)',
                fontSize: 9,
                fontWeight: '900',
                letterSpacing: 1.6,
                textTransform: 'uppercase',
              }}
            >
              Total {formatMoney(grandTotal)}
            </Text>
            <Text
              style={{
                color: text.onInk.primary,
                fontSize: 16,
                fontWeight: '800',
                letterSpacing: -0.3,
              }}
            >
              {isSubmitting ? 'Enviando…' : 'Enviar arqueo'}
            </Text>
          </View>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={text.onInk.primary}
          />
        </TouchableOpacity>
      </VrittBottomDock>
    </KeyboardAvoidingView>
  );
}

function HeroInputMetric({
  dot,
  label,
  value,
}: {
  dot: string;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flexBasis: '30%',
        flexGrow: 1,
        minWidth: 100,
        gap: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: dot,
          }}
        />
        <Text
          numberOfLines={1}
          style={{
            color: text.onInk.muted,
            fontSize: 9,
            fontWeight: '900',
            letterSpacing: 1.4,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{
          color: palette.paper,
          fontSize: 14,
          fontWeight: '800',
          letterSpacing: -0.3,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Denomination row con stepper +/- ──────────────────────────────

function DenominationRow({
  denomination,
  quantity,
  onChange,
  disabled,
}: {
  denomination: number;
  quantity: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const qty = Number(quantity) || 0;
  const subtotal = denomination * qty;
  const hasValue = quantity.trim() !== '' && qty > 0;

  const onIncrement = useCallback(() => {
    if (disabled) return;
    onChange(String(qty + 1));
  }, [disabled, onChange, qty]);

  const onDecrement = useCallback(() => {
    if (disabled || qty <= 0) return;
    onChange(qty <= 1 ? '' : String(qty - 1));
  }, [disabled, onChange, qty]);

  return (
    <View
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: hasValue
          ? withAlpha(palette.ink, 0.35)
          : hairline.onPaper,
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 10,
      }}
    >
      {/* Fila 1: pill de denominación + subtotal */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: radius.sm + 2,
            backgroundColor: hasValue
              ? withAlpha(palette.ink, 0.08)
              : 'rgba(11,14,18,0.04)',
          }}
        >
          <Text
            style={{
              color: text.onPaper.primary,
              fontSize: 13,
              fontWeight: '900',
              letterSpacing: -0.3,
              fontVariant: ['tabular-nums'],
            }}
          >
            {denominationLabel(denomination)}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            flex: 1,
            textAlign: 'right',
            color: hasValue ? text.onPaper.primary : text.onPaper.muted,
            fontSize: 14,
            fontWeight: hasValue ? '900' : '700',
            letterSpacing: -0.2,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatMoney(subtotal)}
        </Text>
      </View>

      {/* Fila 2: stepper full-width */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Pressable
          onPress={onDecrement}
          disabled={disabled || qty <= 0}
          accessibilityRole="button"
          accessibilityLabel="Restar uno"
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: hairline.onPaper,
            backgroundColor: surface.card,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: qty <= 0 ? 0.3 : 1,
          }}
        >
          <Ionicons name="remove" size={14} color={text.onPaper.primary} />
        </Pressable>

        <TextInput
          value={quantity}
          onChangeText={onChange}
          placeholder="0"
          placeholderTextColor={text.onPaper.subtle}
          keyboardType="number-pad"
          editable={!disabled}
          selectTextOnFocus
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: 'center',
            color: text.onPaper.primary,
            fontSize: 20,
            fontWeight: '900',
            letterSpacing: -0.3,
            fontVariant: ['tabular-nums'],
            padding: 0,
          }}
        />

        <Pressable
          onPress={onIncrement}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Sumar uno"
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: surface.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={14} color={text.onInk.primary} />
        </Pressable>
      </View>
    </View>
  );
}

// ── Terminal card ──────────────────────────────────────────────────

function TerminalCard({
  terminal,
  onChange,
  disabled,
}: {
  terminal: TerminalInput;
  onChange: (field: 'reportedTotal' | 'reference', value: string) => void;
  disabled?: boolean;
}) {
  const hasValue = terminal.reportedTotal.trim() !== '';
  return (
    <View
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: hasValue
          ? withAlpha(palette.sage, 0.5)
          : hairline.onPaper,
        padding: 14,
        gap: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.sm + 2,
            backgroundColor: withAlpha(palette.sage, 0.18),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="card-outline" size={15} color={palette.forestDeep} />
        </View>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: text.onPaper.primary,
            fontSize: 14,
            fontWeight: '800',
            letterSpacing: -0.2,
          }}
        >
          {terminal.name}
        </Text>
      </View>

      <PaperField
        label="Total reportado"
        placeholder="0.00"
        value={terminal.reportedTotal}
        onChangeText={(v) => onChange('reportedTotal', v)}
        keyboardType="decimal-pad"
        editable={!disabled}
        prefix="$"
        size="lg"
      />
      <PaperField
        label="Referencia (opcional)"
        placeholder="No. de corte"
        value={terminal.reference}
        onChangeText={(v) => onChange('reference', v)}
        editable={!disabled}
      />
    </View>
  );
}

// ── Paper field reutilizable ────────────────────────────────────────

function PaperField({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  editable,
  prefix,
  size = 'md',
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric';
  editable?: boolean;
  prefix?: string;
  size?: 'md' | 'lg';
}) {
  const isLg = size === 'lg';
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          color: text.onPaper.muted,
          fontSize: 10,
          fontWeight: '900',
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(11,14,18,0.04)',
          borderRadius: radius.sm + 2,
          paddingHorizontal: 12,
          gap: 6,
          opacity: editable === false ? 0.5 : 1,
        }}
      >
        {prefix ? (
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: isLg ? 18 : 14,
              fontWeight: '800',
              letterSpacing: -0.3,
            }}
          >
            {prefix}
          </Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={text.onPaper.subtle}
          keyboardType={keyboardType}
          editable={editable}
          selectTextOnFocus
          style={{
            flex: 1,
            paddingVertical: isLg ? 12 : 10,
            color: text.onPaper.primary,
            fontSize: isLg ? 18 : 14,
            fontWeight: isLg ? '900' : '700',
            letterSpacing: -0.3,
            fontVariant: ['tabular-nums'],
            padding: 0,
          }}
        />
      </View>
    </View>
  );
}

// ── Section header ──────────────────────────────────────────────────

function SectionHeader({
  accent,
  title,
  caption,
  metaLabel,
}: {
  accent: string;
  title: string;
  caption?: string;
  metaLabel?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        gap: 12,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: accent,
            }}
          />
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.primary,
              fontSize: 12,
              fontWeight: '900',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Text>
        </View>
        {caption ? (
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 12,
              marginTop: 4,
              lineHeight: 16,
              fontWeight: '600',
            }}
          >
            {caption}
          </Text>
        ) : null}
      </View>
      {metaLabel ? (
        <Text
          style={{
            color: text.onPaper.subtle,
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            fontVariant: ['tabular-nums'],
            marginTop: 2,
          }}
        >
          {metaLabel}
        </Text>
      ) : null}
    </View>
  );
}

// ╭────────────────────────────────────────────────────────────────────╮
// │  REVIEW MODE                                                       │
// ╰────────────────────────────────────────────────────────────────────╯

function ReviewMode({
  recon,
  isManager,
  currentUserId,
  isActioning,
  confirmApprove,
  confirmReject,
  rejectReason,
  actionError,
  onOpenApprove,
  onCloseApprove,
  onOpenReject,
  onCloseReject,
  onChangeRejectReason,
  onApprove,
  onReject,
  onBack,
}: {
  recon: DailyCashReconciliation;
  isManager: boolean;
  currentUserId: string | null;
  isActioning: boolean;
  confirmApprove: boolean;
  confirmReject: boolean;
  rejectReason: string;
  actionError: string | null;
  onOpenApprove: () => void;
  onCloseApprove: () => void;
  onOpenReject: () => void;
  onCloseReject: () => void;
  onChangeRejectReason: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onBack: () => void;
}) {
  const diff = Number(recon.difference);
  const absDiff = Math.abs(diff);
  const hasDiff = absDiff > DIFF_EPSILON;
  const isShort = diff < 0;
  const canApprove = isManager && recon.createdByUserId !== currentUserId;
  const isOwnSubmission = isManager && recon.createdByUserId === currentUserId;

  const cashSubtotal = useMemo(
    () =>
      recon.cashDenominations.reduce(
        (sum, d) => sum + Number(d.subtotal),
        0,
      ),
    [recon],
  );
  const terminalReportedTotal = useMemo(
    () =>
      recon.terminalReconciliations.reduce(
        (sum, t) => sum + Number(t.reportedTotal),
        0,
      ),
    [recon],
  );
  const transferReportedTotal = useMemo(
    () =>
      recon.transferReconciliations.reduce(
        (sum, t) => sum + Number(t.reportedTotal),
        0,
      ),
    [recon],
  );

  const terminalExpectedTotal = useMemo(
    () =>
      recon.terminalReconciliations.reduce(
        (sum, t) => sum + Number(t.expectedTotal),
        0,
      ),
    [recon],
  );
  const transferExpectedTotal = useMemo(
    () =>
      recon.transferReconciliations.reduce(
        (sum, t) => sum + Number(t.expectedTotal),
        0,
      ),
    [recon],
  );
  // El backend no expone el "esperado de efectivo" por separado — lo
  // derivamos restando lo que ya conocemos del total esperado.
  const cashExpectedTotal = useMemo(
    () =>
      Math.max(
        0,
        Number(recon.totalExpected) -
          terminalExpectedTotal -
          transferExpectedTotal,
      ),
    [recon, terminalExpectedTotal, transferExpectedTotal],
  );

  const cashDiff = cashSubtotal - cashExpectedTotal;
  const terminalDiff = terminalReportedTotal - terminalExpectedTotal;
  const transferDiff = transferReportedTotal - transferExpectedTotal;

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
      <VrittScreenHeader
        onBack={onBack}
        title="Arqueo"
        eyebrow="FAF · Revisión"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: canApprove ? 180 : 60,
          gap: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ReviewHero
          recon={recon}
          diff={diff}
          hasDiff={hasDiff}
          isShort={isShort}
        />

        {/* Banners contextuales */}
        {isOwnSubmission ? (
          <VrittInfoBanner
            tone="review"
            icon="people-outline"
            title="Otro gerente debe aprobar"
            description="Por separación de responsabilidades, no puedes aprobar tu propio arqueo. Pídele a otro gerente que lo revise."
          />
        ) : null}

        {!isManager ? (
          <VrittInfoBanner
            tone="review"
            icon="time-outline"
            title="Esperando aprobación"
            description="Un gerente debe aprobar este arqueo. Si hay diferencias, podrá rechazarlo y permitirte recontar."
          />
        ) : null}

        {/* Efectivo */}
        {recon.cashDenominations.length > 0 ? (
          <CategoryCard
            accent={palette.paper}
            icon="cash-outline"
            title="Efectivo"
            reported={cashSubtotal}
            expected={cashExpectedTotal}
            diff={cashDiff}
          >
            <View style={{ gap: 6 }}>
              {recon.cashDenominations.map((d) => (
                <View
                  key={d.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    borderTopWidth: 1,
                    borderTopColor: hairline.onPaperSoft,
                  }}
                >
                  <Text
                    style={{
                      color: text.onPaper.primary,
                      fontSize: 13,
                      fontWeight: '700',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {denominationLabel(Number(d.denomination))}
                    <Text
                      style={{
                        color: text.onPaper.muted,
                        fontWeight: '600',
                      }}
                    >
                      {' '}
                      × {d.quantity}
                    </Text>
                  </Text>
                  <Text
                    style={{
                      color: text.onPaper.primary,
                      fontSize: 13,
                      fontWeight: '800',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {formatMoney(Number(d.subtotal))}
                  </Text>
                </View>
              ))}
            </View>
          </CategoryCard>
        ) : null}

        {/* Terminales */}
        {recon.terminalReconciliations.length > 0 ? (
          <CategoryCard
            accent={palette.sage}
            icon="card-outline"
            title="Terminales"
            reported={terminalReportedTotal}
            expected={terminalExpectedTotal}
            diff={terminalDiff}
          >
            <View style={{ gap: 8 }}>
              {recon.terminalReconciliations.map((t) => {
                const tDiff = Number(t.difference);
                const tHasDiff = Math.abs(tDiff) > DIFF_EPSILON;
                return (
                  <View
                    key={t.id}
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: hairline.onPaperSoft,
                      paddingTop: 10,
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          color: text.onPaper.primary,
                          fontSize: 13,
                          fontWeight: '800',
                          letterSpacing: -0.2,
                        }}
                      >
                        {t.paymentMethod.name}
                      </Text>
                      {tHasDiff ? (
                        <DiffPill diff={tDiff} />
                      ) : (
                        <MatchPill />
                      )}
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 12,
                      }}
                    >
                      <ComparePair
                        label="Reportado"
                        value={formatMoney(Number(t.reportedTotal))}
                      />
                      <ComparePair
                        label="Esperado"
                        value={formatMoney(Number(t.expectedTotal))}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </CategoryCard>
        ) : null}

        {/* Transferencias */}
        {recon.transferReconciliations.length > 0 ? (
          <CategoryCard
            accent={palette.amber}
            icon="swap-horizontal-outline"
            title="Transferencias"
            reported={transferReportedTotal}
            expected={transferExpectedTotal}
            diff={transferDiff}
          >
            <View style={{ gap: 8 }}>
              {recon.transferReconciliations.map((t) => {
                const trDiff = Number(t.difference);
                const trHasDiff = Math.abs(trDiff) > DIFF_EPSILON;
                return (
                  <View
                    key={t.id}
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: hairline.onPaperSoft,
                      paddingTop: 10,
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                      }}
                    >
                      {trHasDiff ? (
                        <DiffPill diff={trDiff} />
                      ) : (
                        <MatchPill />
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <ComparePair
                        label="Reportado"
                        value={formatMoney(Number(t.reportedTotal))}
                      />
                      <ComparePair
                        label="Esperado"
                        value={formatMoney(Number(t.expectedTotal))}
                      />
                    </View>
                    {t.folioReferences ? (
                      <Text
                        style={{
                          color: text.onPaper.muted,
                          fontSize: 11,
                          fontWeight: '600',
                          marginTop: 2,
                        }}
                      >
                        Folios: {t.folioReferences}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </CategoryCard>
        ) : null}
      </ScrollView>

      {canApprove ? (
        <VrittBottomDock>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onOpenReject}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Rechazar arqueo"
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: withAlpha(palette.danger, 0.4),
                backgroundColor: withAlpha(palette.danger, 0.08),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={20} color={palette.dangerDeep} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onOpenApprove}
              activeOpacity={0.92}
              accessibilityRole="button"
              accessibilityLabel="Aprobar arqueo"
              style={{
                flex: 1,
                height: 56,
                borderRadius: radius.md,
                backgroundColor: surface.ink,
                paddingHorizontal: 18,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: text.onInk.primary,
                  fontSize: 15,
                  fontWeight: '900',
                  letterSpacing: -0.3,
                }}
              >
                {hasDiff ? 'Aprobar con discrepancia' : 'Aprobar arqueo'}
              </Text>
              <Ionicons
                name="checkmark"
                size={20}
                color={text.onInk.primary}
              />
            </TouchableOpacity>
          </View>
        </VrittBottomDock>
      ) : null}

      {/* Approve sheet */}
      <ConfirmApproveSheet
        visible={confirmApprove}
        diff={diff}
        hasDiff={hasDiff}
        isSubmitting={isActioning}
        errorMessage={actionError}
        onClose={onCloseApprove}
        onConfirm={onApprove}
      />

      {/* Reject sheet */}
      <ConfirmRejectSheet
        visible={confirmReject}
        reason={rejectReason}
        onChangeReason={onChangeRejectReason}
        isSubmitting={isActioning}
        errorMessage={actionError}
        onClose={onCloseReject}
        onConfirm={onReject}
      />
    </View>
  );
}

function ReviewHero({
  recon,
  diff,
  hasDiff,
  isShort,
}: {
  recon: DailyCashReconciliation;
  diff: number;
  hasDiff: boolean;
  isShort: boolean;
}) {
  const tone = hasDiff ? 'review' : 'done';
  return (
    <View
      style={{
        backgroundColor: surface.ink,
        borderRadius: radius.lg,
        padding: 22,
        gap: 18,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <VrittStatusChip
          tone={tone}
          surface="ink"
          label={hasDiff ? 'Hay diferencia' : 'Cuadrado'}
        />
        <Text
          numberOfLines={1}
          style={{
            color: text.onInk.muted,
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 0.4,
          }}
        >
          {new Date(recon.operationalDate).toLocaleDateString('es-MX', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
        </Text>
      </View>

      <View>
        <Text
          style={{
            color: text.onInk.muted,
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          {hasDiff ? (isShort ? 'Faltante' : 'Sobrante') : 'Diferencia'}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={{
            color: hasDiff
              ? isShort
                ? palette.danger
                : palette.amber
              : palette.sage,
            fontSize: 44,
            fontWeight: '800',
            letterSpacing: -1.8,
            marginTop: 6,
            fontVariant: ['tabular-nums'],
          }}
        >
          {hasDiff
            ? `${diff > 0 ? '+' : ''}${formatMoney(diff)}`
            : formatMoney(0)}
        </Text>
        <Text
          style={{
            color: text.onInk.soft,
            fontSize: 12,
            fontWeight: '700',
            marginTop: 4,
          }}
        >
          {hasDiff
            ? 'El gerente decide aprobar con discrepancia o pedir recontar.'
            : 'Conteo cuadra con lo que esperaba el sistema.'}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: 14,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: 'rgba(245,242,234,0.1)',
        }}
      >
        <ReviewHeroMetric
          label="Tu conteo"
          value={formatMoney(Number(recon.totalCounted))}
        />
        <ReviewHeroMetric
          label="Sistema"
          value={formatMoney(Number(recon.totalExpected))}
        />
      </View>
    </View>
  );
}

function ReviewHeroMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
      <Text
        numberOfLines={1}
        style={{
          color: text.onInk.muted,
          fontSize: 9,
          fontWeight: '900',
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{
          color: palette.paper,
          fontSize: 18,
          fontWeight: '800',
          letterSpacing: -0.5,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Category card ─────────────────────────────────────────────────────

function CategoryCard({
  accent,
  icon,
  title,
  reported,
  expected,
  diff,
  children,
}: {
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  reported: number;
  expected?: number;
  diff?: number;
  children: React.ReactNode;
}) {
  const hasDiff = diff !== undefined && Math.abs(diff) > DIFF_EPSILON;
  return (
    <View
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        padding: 14,
        gap: 12,
      }}
    >
      {/* Header con título + dot accent + ícono + chip de diff */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            flex: 1,
            minWidth: 0,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: accent,
            }}
          />
          <Ionicons name={icon} size={15} color={text.onPaper.primary} />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              minWidth: 0,
              color: text.onPaper.primary,
              fontSize: 12,
              fontWeight: '900',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Text>
        </View>
        {diff !== undefined ? (
          hasDiff ? (
            <DiffPill diff={diff} />
          ) : (
            <MatchPill />
          )
        ) : null}
      </View>

      {/* Reportado vs esperado — siempre visible para que el gerente lo vea */}
      {expected !== undefined ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: radius.sm + 2,
            backgroundColor: 'rgba(11,14,18,0.04)',
          }}
        >
          <ComparePair
            label="Reportado"
            value={formatMoney(reported)}
          />
          <ComparePair
            label="Esperado"
            value={formatMoney(expected)}
          />
        </View>
      ) : (
        <Text
          style={{
            color: text.onPaper.primary,
            fontSize: 15,
            fontWeight: '900',
            letterSpacing: -0.4,
            fontVariant: ['tabular-nums'],
            textAlign: 'right',
          }}
        >
          {formatMoney(reported)}
        </Text>
      )}

      {children}
    </View>
  );
}

function ComparePair({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text
        numberOfLines={1}
        style={{
          color: text.onPaper.muted,
          fontSize: 9,
          fontWeight: '900',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          color: text.onPaper.primary,
          fontSize: 13,
          fontWeight: '800',
          letterSpacing: -0.2,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function DiffPill({ diff }: { diff: number }) {
  const isShort = diff < 0;
  const accent = isShort ? palette.danger : palette.amber;
  const accentDeep = isShort ? palette.dangerDeep : palette.amberDeep;
  return (
    <View
      style={{
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: withAlpha(accent, 0.16),
      }}
    >
      <Ionicons
        name={isShort ? 'trending-down' : 'trending-up'}
        size={11}
        color={accentDeep}
      />
      <Text
        numberOfLines={1}
        style={{
          color: accentDeep,
          fontSize: 10,
          fontWeight: '900',
          letterSpacing: 0.2,
          fontVariant: ['tabular-nums'],
        }}
      >
        {`${diff > 0 ? '+' : ''}${formatMoney(diff)}`}
      </Text>
    </View>
  );
}

function MatchPill() {
  return (
    <View
      style={{
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: withAlpha(palette.forest, 0.14),
      }}
    >
      <Ionicons name="checkmark" size={11} color={palette.forestDeep} />
      <Text
        numberOfLines={1}
        style={{
          color: palette.forestDeep,
          fontSize: 10,
          fontWeight: '900',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        Cuadra
      </Text>
    </View>
  );
}

// ── Approve sheet ─────────────────────────────────────────────────────

function ConfirmApproveSheet({
  visible,
  diff,
  hasDiff,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  diff: number;
  hasDiff: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <VrittSheetHeader
          eyebrow="FAF · Acción"
          title={hasDiff ? 'Aprobar con discrepancia' : 'Aprobar arqueo'}
          onClose={onClose}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 22, gap: 18 }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              color: text.onPaper.primary,
              fontSize: 22,
              fontWeight: '800',
              letterSpacing: -0.6,
              lineHeight: 28,
            }}
          >
            {hasDiff
              ? '¿Aprobar este arqueo con discrepancia?'
              : '¿Aprobar el arqueo?'}
          </Text>
          <Text
            style={{
              color: text.onPaper.soft,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: '600',
            }}
          >
            {hasDiff
              ? `Hay una diferencia de ${formatMoney(
                  Math.abs(diff),
                )}. Se marcará como discrepancia y el FOP quedará bloqueado hasta firmar con justificación.`
              : 'El conteo cuadra. Se generará el FOP para que firmes el cierre operativo.'}
          </Text>

          {errorMessage ? (
            <VrittInfoBanner
              tone="blocker"
              icon="alert-circle"
              title="No se pudo aprobar"
              description={errorMessage}
            />
          ) : null}
        </ScrollView>

        <View
          style={{
            paddingTop: 14,
            paddingHorizontal: 16,
            paddingBottom: Platform.OS === 'ios' ? 32 : 18,
            backgroundColor: surface.paper,
            borderTopWidth: 1,
            borderTopColor: hairline.onPaperSoft,
            gap: 10,
          }}
        >
          <TouchableOpacity
            onPress={onConfirm}
            disabled={isSubmitting}
            activeOpacity={0.92}
            style={{
              backgroundColor: surface.ink,
              borderRadius: radius.md,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            <Ionicons name="checkmark" size={18} color={text.onInk.primary} />
            <Text
              numberOfLines={1}
              style={{
                color: text.onInk.primary,
                fontSize: 15,
                fontWeight: '900',
                letterSpacing: -0.3,
              }}
            >
              {isSubmitting ? 'Aprobando…' : 'Sí, aprobar'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            disabled={isSubmitting}
            activeOpacity={0.88}
            style={{
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: hairline.onPaper,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: text.onPaper.primary,
                fontSize: 14,
                fontWeight: '800',
                letterSpacing: -0.2,
              }}
            >
              Volver
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Reject sheet ──────────────────────────────────────────────────────

function ConfirmRejectSheet({
  visible,
  reason,
  onChangeReason,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  reason: string;
  onChangeReason: (v: string) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const canSubmit = reason.trim().length > 0;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: surface.paper }}
      >
        <VrittSheetHeader
          eyebrow="FAF · Acción"
          title="Pedir recontar"
          onClose={onClose}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 22, gap: 18 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              color: text.onPaper.primary,
              fontSize: 22,
              fontWeight: '800',
              letterSpacing: -0.6,
              lineHeight: 28,
            }}
          >
            ¿Por qué pides recontar?
          </Text>
          <Text
            style={{
              color: text.onPaper.soft,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: '600',
            }}
          >
            El operador podrá registrar un nuevo conteo desde cero. Úsalo
            cuando la diferencia parezca un error humano.
          </Text>

          <View
            style={{
              backgroundColor: surface.card,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: hairline.onPaper,
              padding: 14,
              gap: 6,
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
              Motivo
            </Text>
            <TextInput
              value={reason}
              onChangeText={onChangeReason}
              placeholder="Ej: faltan billetes en el conteo de $500."
              placeholderTextColor={text.onPaper.subtle}
              multiline
              autoFocus
              editable={!isSubmitting}
              style={{
                color: text.onPaper.primary,
                fontSize: 14,
                fontWeight: '600',
                minHeight: 80,
                textAlignVertical: 'top',
                marginTop: 4,
                padding: 0,
              }}
            />
          </View>

          {errorMessage ? (
            <VrittInfoBanner
              tone="blocker"
              icon="alert-circle"
              title="No se pudo rechazar"
              description={errorMessage}
            />
          ) : null}
        </ScrollView>

        <View
          style={{
            paddingTop: 14,
            paddingHorizontal: 16,
            paddingBottom: Platform.OS === 'ios' ? 32 : 18,
            backgroundColor: surface.paper,
            borderTopWidth: 1,
            borderTopColor: hairline.onPaperSoft,
            gap: 10,
          }}
        >
          <TouchableOpacity
            onPress={onConfirm}
            disabled={!canSubmit || isSubmitting}
            activeOpacity={0.92}
            style={{
              backgroundColor: palette.dangerDeep,
              borderRadius: radius.md,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: !canSubmit ? 0.4 : isSubmitting ? 0.6 : 1,
            }}
          >
            <Ionicons name="close" size={18} color={palette.paper} />
            <Text
              numberOfLines={1}
              style={{
                color: palette.paper,
                fontSize: 15,
                fontWeight: '900',
                letterSpacing: -0.3,
              }}
            >
              {isSubmitting ? 'Enviando…' : 'Pedir recontar'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            disabled={isSubmitting}
            activeOpacity={0.88}
            style={{
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: hairline.onPaper,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: text.onPaper.primary,
                fontSize: 14,
                fontWeight: '800',
                letterSpacing: -0.2,
              }}
            >
              Volver
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ╭────────────────────────────────────────────────────────────────────╮
// │  FINAL MODE (RECONCILED / DISCREPANCY)                             │
// ╰────────────────────────────────────────────────────────────────────╯

function FinalMode({
  recon,
  onBack,
}: {
  recon: DailyCashReconciliation;
  onBack: () => void;
}) {
  const diff = Number(recon.difference);
  const isReconciled = recon.status === 'RECONCILED';
  const tone = isReconciled ? 'done' : 'review';

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
      <VrittScreenHeader
        onBack={onBack}
        title="Arqueo"
        eyebrow="FAF · Resultado"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: 60,
          gap: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: surface.ink,
            borderRadius: radius.lg,
            padding: 22,
            gap: 18,
          }}
        >
          <VrittStatusChip
            tone={tone}
            surface="ink"
            label={isReconciled ? 'Conciliado' : 'Discrepancia'}
          />
          <View>
            <Text
              style={{
                color: text.onInk.muted,
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 1.6,
                textTransform: 'uppercase',
              }}
            >
              Diferencia
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{
                color: isReconciled ? palette.sage : palette.amber,
                fontSize: 44,
                fontWeight: '800',
                letterSpacing: -1.8,
                marginTop: 6,
                fontVariant: ['tabular-nums'],
              }}
            >
              {`${diff > 0 ? '+' : ''}${formatMoney(diff)}`}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              gap: 14,
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: 'rgba(245,242,234,0.1)',
            }}
          >
            <ReviewHeroMetric
              label="Conteo"
              value={formatMoney(Number(recon.totalCounted))}
            />
            <ReviewHeroMetric
              label="Sistema"
              value={formatMoney(Number(recon.totalExpected))}
            />
          </View>
        </View>

        {isReconciled ? (
          <VrittInfoBanner
            tone="done"
            icon="checkmark-circle"
            title="Arqueo conciliado"
            description="El conteo cuadra al 100% con lo que esperaba el sistema. Continúa al cierre operativo (FOP) para firmar el día."
          />
        ) : (
          <VrittInfoBanner
            tone="review"
            icon="document-text-outline"
            title="Discrepancia documentada"
            description="Continúa al FOP para firmar el cierre con una justificación documentada. La discrepancia quedará registrada en el día operativo."
          />
        )}
      </ScrollView>
    </View>
  );
}
