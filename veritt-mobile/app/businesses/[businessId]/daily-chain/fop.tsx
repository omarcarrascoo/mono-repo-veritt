import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  DailyOperationClose,
  FOPValidationItem,
  FOPValidationType,
} from '@/types/daily-chain.types';
import { MANAGER_ROLES } from '@/types/business.types';
import { useBusinessStore } from '@/store/business.store';
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

const DIFF_EPSILON = 0.005;

interface ValidationMeta {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  unitFormatter: (n: number) => string;
}

const VALIDATION_META: Record<FOPValidationType, ValidationMeta> = {
  INVENTORY: {
    label: 'Inventario',
    description: 'Cierre físico vs. teórico de insumos.',
    icon: 'cube-outline',
    unitFormatter: (n: number) => formatNumber(n),
  },
  CASH: {
    label: 'Caja',
    description: 'Conteo físico vs. ventas registradas.',
    icon: 'cash-outline',
    unitFormatter: (n: number) => formatMoney(n),
  },
  PROCESSES: {
    label: 'Procesos',
    description: 'Pasos completados de la cadena diaria.',
    icon: 'git-network-outline',
    unitFormatter: (n: number) => formatNumber(n),
  },
  HOURS: {
    label: 'Horas',
    description: 'Asistencia y horas trabajadas del equipo.',
    icon: 'time-outline',
    unitFormatter: (n: number) => `${formatNumber(n)} h`,
  },
};

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const fixed = n.toFixed(2);
  return fixed.replace(/\.?0+$/, '') || '0';
}

function statusLabel(status: DailyOperationClose['status']): string {
  switch (status) {
    case 'SIGNED':
      return 'Día firmado';
    case 'BLOCKED':
      return 'Validaciones pendientes';
    case 'PENDING':
    default:
      return 'Listo para firmar';
  }
}

function getMetaFor(item: FOPValidationItem): ValidationMeta {
  return VALIDATION_META[item.validationType] ?? {
    label: item.label,
    description: '',
    icon: 'shield-checkmark-outline',
    unitFormatter: (n: number) => formatNumber(n),
  };
}

// ── Pantalla ──────────────────────────────────────────────────────────

export default function FOPScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const userRole = useBusinessStore((s) => s.getRole(businessId));
  const isManager = !!userRole && MANAGER_ROLES.includes(userRole);

  const [fop, setFop] = useState<DailyOperationClose | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmSign, setConfirmSign] = useState(false);
  const [justification, setJustification] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      const data = await dailyChainApi.getFOP(businessId);
      setFop(data);
    } catch (err) {
      notify.error(
        'No pudimos cargar el FOP',
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

  // ── Derivados ────────────────────────────────────────────────────

  const summary = useMemo(() => {
    if (!fop) return null;
    let passed = 0;
    let failed = 0;
    for (const item of fop.validationItems) {
      if (item.isWithinThreshold) passed++;
      else failed++;
    }
    return {
      total: fop.validationItems.length,
      passed,
      failed,
    };
  }, [fop]);

  const groupedValidations = useMemo(() => {
    if (!fop) return [];
    const order: FOPValidationType[] = [
      'INVENTORY',
      'CASH',
      'PROCESSES',
      'HOURS',
    ];
    const map = new Map<FOPValidationType, FOPValidationItem[]>();
    for (const item of fop.validationItems) {
      const arr = map.get(item.validationType) ?? [];
      arr.push(item);
      map.set(item.validationType, arr);
    }
    return order
      .filter((type) => map.has(type))
      .map((type) => ({
        type,
        meta: VALIDATION_META[type],
        items: map.get(type) ?? [],
      }));
  }, [fop]);

  const isSigned = fop?.status === 'SIGNED';
  const isBlocked = fop?.status === 'BLOCKED';
  const isPending = fop?.status === 'PENDING';
  const canSign = (isPending || isBlocked) && isManager;

  // ── Handlers ────────────────────────────────────────────────────

  const openSign = useCallback(() => {
    setActionError(null);
    setJustification('');
    setConfirmSign(true);
  }, []);

  const closeSign = useCallback(() => {
    setActionError(null);
    setConfirmSign(false);
    setJustification('');
  }, []);

  const handleSign = useCallback(async () => {
    if (!businessId || !fop) return;
    const trimmed = justification.trim();
    if (isBlocked && !trimmed) {
      const msg =
        'Debes documentar el motivo para firmar un cierre con discrepancia.';
      setActionError(msg);
      notify.warning('Justificación requerida', msg);
      return;
    }
    try {
      setIsSubmitting(true);
      setActionError(null);
      const updated = await dailyChainApi.signFOP(
        businessId,
        fop.id,
        trimmed || undefined,
      );
      setFop(updated);
      setConfirmSign(false);
      setJustification('');
      notify.success(
        'Día cerrado',
        isBlocked
          ? 'Discrepancia firmada con justificación.'
          : 'El cierre operativo quedó firmado.',
      );
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Intenta de nuevo.');
      setActionError(msg);
      notify.error('No se pudo firmar', msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [businessId, fop, justification, isBlocked]);

  // ── Render ────────────────────────────────────────────────────────

  if (isLoading) return <VrittLoader />;

  if (!fop) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <VrittScreenHeader
          onBack={onBack}
          title="Cierre operativo"
          eyebrow="FOP · Firma final"
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
            name="hourglass-outline"
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
            Aún sin cierre operativo
          </Text>
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 13,
              textAlign: 'center',
              maxWidth: 280,
              lineHeight: 18,
            }}
          >
            El FOP se genera automáticamente cuando el arqueo financiero
            (FAF) es aprobado y conciliado.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
      <VrittScreenHeader
        onBack={onBack}
        title="Cierre operativo"
        eyebrow="FOP · Firma final"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: canSign ? 180 : 60,
          gap: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Hero fop={fop} summary={summary} />

        {/* Banner contextual */}
        {isPending && !isManager ? (
          <VrittInfoBanner
            tone="review"
            icon="time-outline"
            title="Esperando firma del gerente"
            description="Las validaciones pasaron. Un gerente debe firmar para cerrar oficialmente el día."
          />
        ) : null}

        {isBlocked && !isManager ? (
          <VrittInfoBanner
            tone="blocker"
            icon="shield-outline"
            title="Validaciones fuera de umbral"
            description={
              summary
                ? `${summary.failed} de ${summary.total} validaciones requieren atención. Un gerente decidirá si firma con justificación.`
                : 'Un gerente debe revisar las validaciones que no pasaron.'
            }
          />
        ) : null}

        {isBlocked && isManager ? (
          <VrittInfoBanner
            tone="blocker"
            icon="alert-circle"
            title="Hay validaciones que no cuadran"
            description="Puedes firmar con justificación documentada o regresar a corregir los pasos previos. La justificación queda inmutable."
          />
        ) : null}

        {isSigned ? (
          <VrittInfoBanner
            tone="done"
            icon="checkmark-circle"
            title={
              fop.signedWithDiscrepancy
                ? 'Día firmado con discrepancia'
                : 'Día firmado'
            }
            description={
              fop.signedAt
                ? `Firmado: ${new Date(fop.signedAt).toLocaleString('es-MX')}`
                : 'El cierre quedó registrado de forma inmutable.'
            }
          />
        ) : null}

        {/* Justificación si firmado con discrepancia */}
        {isSigned && fop.signedWithDiscrepancy && fop.discrepancyJustification ? (
          <View
            style={{
              backgroundColor: surface.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: withAlpha(palette.amber, 0.25),
              padding: 18,
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: palette.amber,
                }}
              />
              <Text
                style={{
                  color: palette.amberDeep,
                  fontSize: 11,
                  fontWeight: '900',
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                }}
              >
                Justificación documentada
              </Text>
            </View>
            <Text
              style={{
                color: text.onPaper.primary,
                fontSize: 14,
                lineHeight: 20,
                fontWeight: '600',
              }}
            >
              {fop.discrepancyJustification}
            </Text>
          </View>
        ) : null}

        {/* Validaciones agrupadas */}
        <View style={{ gap: 22 }}>
          {groupedValidations.map(({ type, meta, items }) => (
            <ValidationGroup
              key={type}
              meta={meta}
              items={items}
            />
          ))}
        </View>
      </ScrollView>

      {canSign ? (
        <SignDock fop={fop} onPress={openSign} />
      ) : null}

      {/* Sign sheet */}
      <ConfirmSignSheet
        visible={confirmSign}
        fop={fop}
        summary={summary}
        justification={justification}
        onChangeJustification={setJustification}
        isSubmitting={isSubmitting}
        errorMessage={actionError}
        onClose={closeSign}
        onConfirm={handleSign}
      />
    </View>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────

interface SummaryShape {
  total: number;
  passed: number;
  failed: number;
}

const Hero = React.memo(function Hero({
  fop,
  summary,
}: {
  fop: DailyOperationClose;
  summary: SummaryShape | null;
}) {
  const status = fop.status;
  const tone =
    status === 'SIGNED'
      ? 'done'
      : status === 'BLOCKED'
      ? 'blocker'
      : 'progress';

  const totalDifference = useMemo(
    () =>
      fop.validationItems.reduce(
        (sum, i) => sum + Math.abs(Number(i.difference)),
        0,
      ),
    [fop],
  );

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
          {new Date(fop.operationalDate).toLocaleDateString('es-MX', {
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
          Validaciones del día
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 12,
            marginTop: 6,
          }}
        >
          <Text
            style={{
              color:
                status === 'BLOCKED'
                  ? palette.danger
                  : status === 'SIGNED'
                  ? palette.sage
                  : palette.paper,
              fontSize: 56,
              fontWeight: '800',
              letterSpacing: -2.5,
              fontVariant: ['tabular-nums'],
              lineHeight: 56,
            }}
          >
            {summary ? summary.passed : 0}
          </Text>
          <Text
            style={{
              color: text.onInk.soft,
              fontSize: 18,
              fontWeight: '700',
              letterSpacing: -0.4,
              fontVariant: ['tabular-nums'],
            }}
          >
            / {summary ? summary.total : 0}
          </Text>
        </View>
        <Text
          style={{
            color: text.onInk.soft,
            fontSize: 12,
            fontWeight: '700',
            marginTop: 4,
          }}
        >
          {status === 'SIGNED'
            ? 'El día quedó cerrado y registrado.'
            : status === 'BLOCKED'
            ? `${summary ? summary.failed : 0} fuera de umbral · requiere justificación`
            : 'Todo en línea para firmar el cierre.'}
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
          label="Pasaron"
          value={summary ? String(summary.passed) : '—'}
        />
        <HeroMetric
          dot={palette.danger}
          label="Fallaron"
          value={summary ? String(summary.failed) : '—'}
        />
        <HeroMetric
          dot={palette.amber}
          label="Diferencia"
          value={
            totalDifference > 0
              ? formatNumber(totalDifference)
              : '0'
          }
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
});

// ── Validation group ──────────────────────────────────────────────────

function ValidationGroup({
  meta,
  items,
}: {
  meta: ValidationMeta;
  items: FOPValidationItem[];
}) {
  const passed = items.filter((i) => i.isWithinThreshold).length;
  const total = items.length;
  const allPassed = passed === total;

  return (
    <View style={{ gap: 12 }}>
      {/* Header del grupo */}
      <View style={{ paddingHorizontal: 4, gap: 6 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: allPassed
                ? withAlpha(palette.forest, 0.14)
                : withAlpha(palette.danger, 0.14),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={meta.icon}
              size={15}
              color={
                allPassed ? palette.forestDeep : palette.dangerDeep
              }
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{
                color: text.onPaper.primary,
                fontSize: 14,
                fontWeight: '900',
                letterSpacing: -0.3,
              }}
            >
              {meta.label}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                color: text.onPaper.muted,
                fontSize: 11,
                fontWeight: '600',
                marginTop: 2,
                lineHeight: 14,
              }}
            >
              {meta.description}
            </Text>
          </View>
          <Text
            style={{
              flexShrink: 0,
              color: allPassed ? palette.forestDeep : palette.dangerDeep,
              fontSize: 11,
              fontWeight: '900',
              letterSpacing: 0.4,
              fontVariant: ['tabular-nums'],
              textTransform: 'uppercase',
            }}
          >
            {passed}/{total}
          </Text>
        </View>
      </View>

      {/* Items */}
      <View style={{ gap: 8 }}>
        {items.map((item) => (
          <ValidationRow
            key={item.id}
            item={item}
            unitFormatter={meta.unitFormatter}
          />
        ))}
      </View>
    </View>
  );
}

function ValidationRow({
  item,
  unitFormatter,
}: {
  item: FOPValidationItem;
  unitFormatter: (n: number) => string;
}) {
  const operatorValue = Number(item.operatorValue);
  const systemValue = Number(item.systemValue);
  const difference = Number(item.difference);
  const passed = item.isWithinThreshold;
  const hasDiff = Math.abs(difference) > DIFF_EPSILON;

  return (
    <View
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderLeftWidth: 3,
        borderLeftColor: passed ? palette.forest : palette.danger,
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
          gap: 10,
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: passed
              ? withAlpha(palette.forest, 0.14)
              : withAlpha(palette.danger, 0.14),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={passed ? 'checkmark' : 'close'}
            size={14}
            color={passed ? palette.forestDeep : palette.dangerDeep}
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
            fontWeight: '800',
            letterSpacing: -0.2,
          }}
        >
          {item.label}
        </Text>
        {hasDiff ? (
          <View
            style={{
              flexShrink: 0,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: radius.pill,
              backgroundColor: passed
                ? withAlpha(palette.amber, 0.14)
                : withAlpha(palette.danger, 0.14),
            }}
          >
            <Ionicons
              name={difference > 0 ? 'trending-up' : 'trending-down'}
              size={11}
              color={passed ? palette.amberDeep : palette.dangerDeep}
            />
            <Text
              numberOfLines={1}
              style={{
                color: passed ? palette.amberDeep : palette.dangerDeep,
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 0.2,
                fontVariant: ['tabular-nums'],
              }}
            >
              {`${difference > 0 ? '+' : ''}${unitFormatter(difference)}`}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Pair: operador vs sistema */}
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: hairline.onPaperSoft,
        }}
      >
        <Pair
          label="Operador"
          value={unitFormatter(operatorValue)}
          icon="person-outline"
        />
        <Pair
          label="Sistema"
          value={unitFormatter(systemValue)}
          icon="server-outline"
        />
      </View>

      {/* Resolución/nota si existe */}
      {item.resolution ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            backgroundColor: 'rgba(11,14,18,0.04)',
            borderRadius: radius.sm + 2,
            padding: 10,
          }}
        >
          <Ionicons
            name="document-text-outline"
            size={13}
            color={text.onPaper.muted}
            style={{ marginTop: 1 }}
          />
          <Text
            style={{
              flex: 1,
              minWidth: 0,
              color: text.onPaper.soft,
              fontSize: 11,
              lineHeight: 15,
              fontWeight: '600',
            }}
          >
            {item.resolution}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Pair({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Ionicons
          name={icon}
          size={10}
          color={text.onPaper.muted}
        />
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
      </View>
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

// ── Sign dock ─────────────────────────────────────────────────────────

const SignDock = React.memo(function SignDock({
  fop,
  onPress,
}: {
  fop: DailyOperationClose;
  onPress: () => void;
}) {
  const isBlocked = fop.status === 'BLOCKED';
  return (
    <VrittBottomDock>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel={
          isBlocked ? 'Firmar con justificación' : 'Firmar el día'
        }
        style={{
          backgroundColor: isBlocked ? palette.dangerDeep : surface.ink,
          borderRadius: radius.md,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ gap: 4, flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: isBlocked
                ? withAlpha(palette.paper, 0.7)
                : text.onInk.muted,
              fontSize: 9,
              fontWeight: '900',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            {isBlocked ? 'Con discrepancia' : 'Acción del gerente'}
          </Text>
          <Text
            style={{
              color: palette.paper,
              fontSize: 16,
              fontWeight: '800',
              letterSpacing: -0.3,
            }}
          >
            {isBlocked ? 'Firmar con justificación' : 'Firmar el día'}
          </Text>
        </View>
        <Ionicons name="checkmark-done" size={20} color={palette.paper} />
      </TouchableOpacity>
    </VrittBottomDock>
  );
});

// ── Sign sheet ────────────────────────────────────────────────────────

function ConfirmSignSheet({
  visible,
  fop,
  summary,
  justification,
  onChangeJustification,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  fop: DailyOperationClose;
  summary: SummaryShape | null;
  justification: string;
  onChangeJustification: (v: string) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isBlocked = fop.status === 'BLOCKED';
  const canSubmit = isBlocked ? justification.trim().length > 0 : true;

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
          eyebrow="FOP · Acción"
          title={isBlocked ? 'Firmar con discrepancia' : 'Firmar el día'}
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
            {isBlocked
              ? '¿Firmar este cierre con discrepancia?'
              : '¿Cerrar el día oficialmente?'}
          </Text>
          <Text
            style={{
              color: text.onPaper.soft,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: '600',
            }}
          >
            {isBlocked
              ? `Hay ${
                  summary?.failed ?? 0
                } validaciones fuera de umbral. Al firmar, aceptas la discrepancia y queda documentada de forma inmutable.`
              : 'Esto cierra oficialmente el día operativo. No se podrán hacer más modificaciones después de firmar.'}
          </Text>

          {isBlocked ? (
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
                Justificación · obligatoria
              </Text>
              <TextInput
                value={justification}
                onChangeText={onChangeJustification}
                placeholder="Ej: faltante de $20 por error de cambio en venta #124."
                placeholderTextColor={text.onPaper.subtle}
                multiline
                autoFocus
                editable={!isSubmitting}
                style={{
                  color: text.onPaper.primary,
                  fontSize: 14,
                  fontWeight: '600',
                  minHeight: 100,
                  textAlignVertical: 'top',
                  marginTop: 4,
                  padding: 0,
                  letterSpacing: -0.1,
                }}
              />
            </View>
          ) : (
            <VrittInfoBanner
              tone="done"
              icon="checkmark-circle"
              title={`${summary?.passed ?? 0} validaciones en línea`}
              description="Todo cuadró dentro de los umbrales esperados. Listo para firmar."
            />
          )}

          {errorMessage ? (
            <VrittInfoBanner
              tone="blocker"
              icon="alert-circle"
              title="No se pudo firmar"
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
              backgroundColor: isBlocked
                ? palette.dangerDeep
                : surface.ink,
              borderRadius: radius.md,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: !canSubmit ? 0.4 : isSubmitting ? 0.6 : 1,
            }}
          >
            <Ionicons
              name="checkmark-done"
              size={18}
              color={palette.paper}
            />
            <Text
              numberOfLines={1}
              style={{
                color: palette.paper,
                fontSize: 15,
                fontWeight: '900',
                letterSpacing: -0.3,
              }}
            >
              {isSubmitting
                ? 'Firmando…'
                : isBlocked
                ? 'Sí, firmar con ajuste'
                : 'Sí, cerrar el día'}
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
