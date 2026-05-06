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
import {
  DailyInventoryOpening,
  DailyOpeningItem,
} from '@/types/daily-chain.types';
import { MANAGER_ROLES } from '@/types/business.types';
import { useBusinessStore } from '@/store/business.store';
import { getApiErrorMessage } from '@/utils/error.utils';
import { notify } from '@/lib/notify';
import { formatMoney, formatQty, formatVariance } from '@/lib/format';
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

// ── Helpers ───────────────────────────────────────────────────────────

const VARIANCE_EPSILON = 0.005;

type ItemKind = 'match' | 'variance';

function getItemKind(item: DailyOpeningItem): ItemKind {
  return Math.abs(Number(item.variance)) < VARIANCE_EPSILON
    ? 'match'
    : 'variance';
}

function statusLabel(status: DailyInventoryOpening['status']): string {
  switch (status) {
    case 'AUTHORIZED':
      return 'Autorizado';
    case 'REJECTED':
      return 'Rechazado';
    case 'PENDING':
    default:
      return 'Pendiente de autorización';
  }
}

// ── Pantalla ──────────────────────────────────────────────────────────

export default function OpeningReviewScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const userRole = useBusinessStore((s) => s.getRole(businessId));
  const isManager = !!userRole && MANAGER_ROLES.includes(userRole);

  const [opening, setOpening] = useState<DailyInventoryOpening | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);
  const [confirmAuthorize, setConfirmAuthorize] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  // Error visible DENTRO del sheet de acción. Los toasts del root host
  // quedan tapados por el Modal en native, así que duplicamos aquí.
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      const data = await dailyChainApi.getOpening(businessId);
      setOpening(data);
    } catch (err) {
      notify.error(
        'No pudimos cargar el conteo',
        getApiErrorMessage(err, 'Intenta refrescar la pantalla.'),
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

  const openAuthorize = useCallback(() => {
    setActionError(null);
    setConfirmAuthorize(true);
  }, []);

  const closeAuthorize = useCallback(() => {
    setActionError(null);
    setConfirmAuthorize(false);
  }, []);

  const openReject = useCallback(() => {
    setActionError(null);
    setShowReject(true);
  }, []);

  const closeReject = useCallback(() => {
    setActionError(null);
    setShowReject(false);
  }, []);

  const handleAuthorize = useCallback(async () => {
    if (!businessId || !opening) return;
    try {
      setIsActioning(true);
      setActionError(null);
      await dailyChainApi.authorizeOpening(businessId, opening.id);
      setConfirmAuthorize(false);
      notify.success('Apertura autorizada', 'El día operativo está abierto.');
      router.replace(`/businesses/${businessId}/daily-chain`);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Intenta de nuevo.');
      setActionError(msg);
      notify.error('No se pudo autorizar', msg);
    } finally {
      setIsActioning(false);
    }
  }, [businessId, opening]);

  const handleReject = useCallback(async () => {
    if (!businessId || !opening || !rejectReason.trim()) {
      const msg = 'Ingresa el motivo del rechazo.';
      setActionError(msg);
      notify.warning('Faltan datos', msg);
      return;
    }
    try {
      setIsActioning(true);
      setActionError(null);
      await dailyChainApi.rejectOpening(
        businessId,
        opening.id,
        rejectReason.trim(),
      );
      setShowReject(false);
      notify.info('Conteo rechazado', 'El operador deberá registrar uno nuevo.');
      router.replace(`/businesses/${businessId}/daily-chain`);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Intenta de nuevo.');
      setActionError(msg);
      notify.error('No se pudo rechazar', msg);
    } finally {
      setIsActioning(false);
    }
  }, [businessId, opening, rejectReason]);

  const summary = useMemo(() => {
    if (!opening) return null;
    let matched = 0;
    let withVariance = 0;
    let positiveValue = 0;
    let negativeValue = 0;
    for (const item of opening.items) {
      const kind = getItemKind(item);
      if (kind === 'match') matched++;
      else withVariance++;
      const v = Number(item.varianceValueMXN);
      if (v > 0) positiveValue += v;
      else if (v < 0) negativeValue += v;
    }
    return {
      matched,
      withVariance,
      total: opening.items.length,
      positiveValue,
      negativeValue,
      netValue: positiveValue + negativeValue,
      absValue: Math.abs(positiveValue) + Math.abs(negativeValue),
    };
  }, [opening]);

  const variances = useMemo(() => {
    if (!opening) return [];
    return opening.items.filter((i) => getItemKind(i) === 'variance');
  }, [opening]);

  const matches = useMemo(() => {
    if (!opening) return [];
    return opening.items.filter((i) => getItemKind(i) === 'match');
  }, [opening]);

  if (isLoading) return <VrittLoader />;

  if (!opening) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <VrittScreenHeader
          onBack={onBack}
          title="Apertura"
          eyebrow="FAI · Revisión"
        />
        <View
          style={{
            flex: 1,
            padding: 22,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Ionicons
            name="document-text-outline"
            size={32}
            color={text.onPaper.primary}
          />
          <Text
            style={{
              color: text.onPaper.primary,
              fontSize: 18,
              fontWeight: '800',
              textAlign: 'center',
            }}
          >
            Sin conteo registrado
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
            Aún no se ha enviado un conteo de apertura para este día.
          </Text>
        </View>
      </View>
    );
  }

  const isPending = opening.status === 'PENDING';
  const isAuthorized = opening.status === 'AUTHORIZED';
  const isRejected = opening.status === 'REJECTED';

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <VrittScreenHeader
        onBack={onBack}
        title="Apertura"
        eyebrow="FAI · Revisión"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: isPending && isManager ? 180 : 60,
          gap: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Hero
          opening={opening}
          summary={summary}
        />

        {/* Estado para no-managers cuando está pendiente */}
        {isPending && !isManager ? (
          <VrittInfoBanner
            tone="review"
            icon="time-outline"
            title="Esperando autorización"
            description="Un gerente debe autorizar este conteo para abrir el día. Te avisaremos cuando esté listo."
          />
        ) : null}

        {isAuthorized ? (
          <VrittInfoBanner
            tone="done"
            icon="checkmark-circle"
            title="Apertura autorizada"
            description={`El día operativo está abierto. Las ventas y recepciones están habilitadas.${
              opening.authorizedAt
                ? ' Autorizado: ' +
                  new Date(opening.authorizedAt).toLocaleString('es-MX')
                : ''
            }`}
          />
        ) : null}

        {isRejected ? (
          <VrittInfoBanner
            tone="blocker"
            icon="close-circle"
            title="Conteo rechazado"
            description={
              opening.rejectedReason
                ? `Motivo: ${opening.rejectedReason}`
                : 'El conteo fue rechazado. El operador debe registrar uno nuevo.'
            }
          />
        ) : null}

        {/* Varianzas */}
        {variances.length > 0 ? (
          <Section
            accent={palette.amber}
            title={`${variances.length} con varianza`}
            caption="Materiales donde el conteo no coincide con el sistema."
          >
            {variances.map((item) => (
              <VarianceRow key={item.id} item={item} />
            ))}
          </Section>
        ) : null}

        {/* Coinciden */}
        {matches.length > 0 ? (
          <Section
            accent={palette.forest}
            title={`${matches.length} coinciden`}
            caption="Materiales contados que cuadran con el sistema."
            collapsible
          >
            {matches.map((item) => (
              <MatchRow key={item.id} item={item} />
            ))}
          </Section>
        ) : null}
      </ScrollView>

      {/* Action dock — solo manager + pending */}
      {isPending && isManager ? (
        <ActionDock onAuthorize={openAuthorize} onReject={openReject} />
      ) : null}

      {/* Confirm authorize sheet */}
      <ConfirmAuthorizeSheet
        visible={confirmAuthorize}
        isSubmitting={isActioning}
        summary={summary}
        errorMessage={actionError}
        onClose={closeAuthorize}
        onConfirm={handleAuthorize}
      />

      {/* Reject sheet */}
      <RejectSheet
        visible={showReject}
        reason={rejectReason}
        onChangeReason={setRejectReason}
        isSubmitting={isActioning}
        errorMessage={actionError}
        onClose={closeReject}
        onConfirm={handleReject}
      />
    </View>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────

interface SummaryShape {
  matched: number;
  withVariance: number;
  total: number;
  positiveValue: number;
  negativeValue: number;
  netValue: number;
  absValue: number;
}

const Hero = React.memo(function Hero({
  opening,
  summary,
}: {
  opening: DailyInventoryOpening;
  summary: SummaryShape | null;
}) {
  const status = opening.status;
  const tone =
    status === 'AUTHORIZED'
      ? 'done'
      : status === 'REJECTED'
      ? 'blocker'
      : 'review';

  return (
    <View
      style={{
        backgroundColor: surface.ink,
        borderRadius: radius.lg,
        padding: 22,
        gap: 18,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <VrittStatusChip
          tone={tone}
          surface="ink"
          label={statusLabel(status)}
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
          {opening.location.name}
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
          Varianza neta
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={{
            color: palette.paper,
            fontSize: 40,
            fontWeight: '800',
            letterSpacing: -1.6,
            marginTop: 6,
            fontVariant: ['tabular-nums'],
          }}
        >
          {summary ? formatMoney(summary.netValue) : '$0.00'}
        </Text>
        <Text
          style={{
            color: text.onInk.soft,
            fontSize: 12,
            fontWeight: '700',
            marginTop: 4,
          }}
        >
          {summary && summary.absValue > 0
            ? `Movimiento total ${formatMoney(summary.absValue)} · MXN`
            : 'Sin diferencia con sistema · MXN'}
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
        <HeroMetric
          dot={palette.sage}
          label="Coinciden"
          value={summary ? String(summary.matched) : '—'}
        />
        <HeroMetric
          dot={palette.amber}
          label="Varianza"
          value={summary ? String(summary.withVariance) : '—'}
        />
        <HeroMetric
          dot={palette.paper}
          label="Total"
          value={summary ? String(summary.total) : '—'}
        />
      </View>
    </View>
  );
});

const HeroMetric = React.memo(function HeroMetric({
  dot,
  label,
  value,
}: {
  dot: string;
  label: string;
  value: string;
}) {
  return (
    <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
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
});

// ── Section ───────────────────────────────────────────────────────────

function Section({
  accent,
  title,
  caption,
  collapsible,
  children,
}: {
  accent: string;
  title: string;
  caption: string;
  collapsible?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!collapsible);

  return (
    <View style={{ gap: 10 }}>
      <Pressable
        onPress={() => collapsible && setOpen((v) => !v)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
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
          <Text
            numberOfLines={2}
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
        </View>
        {collapsible ? (
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={text.onPaper.muted}
          />
        ) : null}
      </Pressable>
      {open ? <View style={{ gap: 6 }}>{children}</View> : null}
    </View>
  );
}

// ── Variance row ──────────────────────────────────────────────────────

function VarianceRow({ item }: { item: DailyOpeningItem }) {
  const variance = Number(item.variance);
  const valueMXN = Number(item.varianceValueMXN);
  const isNegative = variance < 0;
  const accent = palette.amber;

  return (
    <View
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderLeftWidth: 3,
        borderLeftColor: accent,
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderTopColor: hairline.onPaper,
        borderRightColor: hairline.onPaper,
        borderBottomColor: hairline.onPaper,
        padding: 14,
        gap: 10,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            flex: 1,
            minWidth: 0,
            color: text.onPaper.primary,
            fontSize: 14,
            fontWeight: '800',
            letterSpacing: -0.2,
          }}
        >
          {item.material.name}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 0,
            color: palette.amberDeep,
            fontSize: 13,
            fontWeight: '900',
            letterSpacing: -0.2,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatVariance(variance, item.material.baseUnit)}
        </Text>
      </View>

      {/* Numbers row: sistema vs contado */}
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: hairline.onPaperSoft,
        }}
      >
        <NumberCell
          label="Sistema"
          value={formatQty(
            Number(item.systemQuantity),
            item.material.baseUnit,
          )}
        />
        <NumberCell
          label="Contado"
          value={formatQty(
            Number(item.countedQuantity),
            item.material.baseUnit,
          )}
          emphasis
        />
        <NumberCell
          label={isNegative ? 'Falta' : 'Sobra'}
          value={formatMoney(valueMXN)}
          accent={accent}
        />
      </View>

      {/* Note */}
      {item.varianceNote ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            backgroundColor: withAlpha(palette.amber, 0.06),
            borderRadius: radius.sm + 2,
            padding: 10,
          }}
        >
          <Ionicons
            name="chatbox-ellipses-outline"
            size={14}
            color={palette.amberDeep}
            style={{ marginTop: 1 }}
          />
          <Text
            style={{
              flex: 1,
              minWidth: 0,
              color: palette.amberDeep,
              fontSize: 12,
              lineHeight: 17,
              fontWeight: '700',
            }}
          >
            {item.varianceNote}
          </Text>
        </View>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            gap: 6,
            alignItems: 'center',
          }}
        >
          <Ionicons
            name="alert-circle-outline"
            size={13}
            color={palette.dangerDeep}
          />
          <Text
            style={{
              color: palette.dangerDeep,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 0.2,
            }}
          >
            Sin nota del operador
          </Text>
        </View>
      )}
    </View>
  );
}

function NumberCell({
  label,
  value,
  emphasis,
  accent,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  accent?: string;
}) {
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
        ellipsizeMode="tail"
        style={{
          color: accent ?? text.onPaper.primary,
          fontSize: emphasis ? 14 : 13,
          fontWeight: emphasis ? '900' : '800',
          letterSpacing: -0.2,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Match row (compacto) ──────────────────────────────────────────────

function MatchRow({ item }: { item: DailyOpeningItem }) {
  return (
    <View
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: withAlpha(palette.forest, 0.14),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name="checkmark"
          size={14}
          color={palette.forestDeep}
        />
      </View>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          flex: 1,
          minWidth: 0,
          color: text.onPaper.primary,
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: -0.2,
        }}
      >
        {item.material.name}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 0,
          color: text.onPaper.muted,
          fontSize: 12,
          fontWeight: '800',
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatQty(Number(item.countedQuantity), item.material.baseUnit)}
      </Text>
    </View>
  );
}

// ── Action dock ───────────────────────────────────────────────────────

const ActionDock = React.memo(function ActionDock({
  onAuthorize,
  onReject,
}: {
  onAuthorize: () => void;
  onReject: () => void;
}) {
  return (
    <VrittBottomDock>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={onReject}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Rechazar conteo"
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
          onPress={onAuthorize}
          activeOpacity={0.92}
          accessibilityRole="button"
          accessibilityLabel="Autorizar y abrir el día"
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
            Autorizar y abrir el día
          </Text>
          <Ionicons name="checkmark" size={20} color={text.onInk.primary} />
        </TouchableOpacity>
      </View>
    </VrittBottomDock>
  );
});

// ── Confirm authorize sheet ───────────────────────────────────────────

function ConfirmAuthorizeSheet({
  visible,
  isSubmitting,
  summary,
  errorMessage,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  isSubmitting: boolean;
  summary: SummaryShape | null;
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
          eyebrow="FAI · Acción"
          title="Autorizar apertura"
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
            ¿Confirmas la autorización del FAI?
          </Text>
          <Text
            style={{
              color: text.onPaper.soft,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: '600',
            }}
          >
            Al autorizar abres el día operativo. Las ventas, recepciones y el
            cierre se habilitarán inmediatamente.
          </Text>

          {summary && summary.withVariance > 0 ? (
            <VrittInfoBanner
              tone="review"
              icon="information-circle-outline"
              title={`${summary.withVariance} ${
                summary.withVariance === 1 ? 'material' : 'materiales'
              } con varianza`}
              description={`Estás autorizando un conteo con ${formatMoney(
                summary.netValue,
              )} de varianza neta. Asegúrate de que las explicaciones del operador son válidas.`}
            />
          ) : null}

          {errorMessage ? (
            <VrittInfoBanner
              tone="blocker"
              icon="alert-circle"
              title="No se pudo autorizar"
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
              {isSubmitting ? 'Autorizando...' : 'Sí, autorizar'}
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

function RejectSheet({
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
          eyebrow="FAI · Acción"
          title="Rechazar conteo"
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
            ¿Por qué se rechaza este conteo?
          </Text>
          <Text
            style={{
              color: text.onPaper.soft,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: '600',
            }}
          >
            Al rechazar, el operador deberá registrar un nuevo conteo. El
            motivo será visible en el dashboard.
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
              placeholder="Ej: faltan notas en varianzas grandes, conteo incorrecto en barras secas..."
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
              {isSubmitting ? 'Rechazando...' : 'Confirmar rechazo'}
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

