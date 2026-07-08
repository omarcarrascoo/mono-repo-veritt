import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { dailyChainApi } from '@/api/modules/daily-chain.api';
import { DailyChainStatus } from '@/types/daily-chain.types';
import { MANAGER_ROLES } from '@/types/business.types';
import { useBusinessStore } from '@/store/business.store';
import { getApiErrorMessage } from '@/utils/error.utils';
import { notify } from '@/lib/notify';
import { formatPercent } from '@/lib/format';
import {
  getDailyChainMoment,
  getOperationalDateLabel,
  getSemaphoreSteps,
  type SemaphoreStepInfo,
  type SemaphoreStepState,
} from '@/lib/daily-chain-home';
import {
  hairline,
  heroSkin,
  palette,
  radius,
  stateOnPaper,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittScreenHeader } from '@/components/ui/VrittScreenHeader';
import { VrittStatusChip } from '@/components/ui/VrittStatusChip';

// ── Pasos de la cadena ────────────────────────────────────────────────

type StepKey = 'fai' | 'fci' | 'fid' | 'faf' | 'fop';

interface StepConfig {
  key: StepKey;
  code: string;
  label: string;
  description: string;
  position: number;
  icon: keyof typeof Ionicons.glyphMap;
}

const STEPS: StepConfig[] = [
  {
    key: 'fai',
    code: 'FAI',
    label: 'Apertura',
    description: 'Conteo inicial del inventario para abrir el día.',
    position: 1,
    icon: 'sunny-outline',
  },
  {
    key: 'fci',
    code: 'FCI',
    label: 'Cierre',
    description: 'Conteo final del inventario al cerrar el día.',
    position: 2,
    icon: 'moon-outline',
  },
  {
    key: 'fid',
    code: 'FID',
    label: 'Desviaciones',
    description: 'Causa de las diferencias entre teórico y real.',
    position: 3,
    icon: 'analytics-outline',
  },
  {
    key: 'faf',
    code: 'FAF',
    label: 'Arqueo',
    description: 'Cuadre de efectivo, terminales y transferencias.',
    position: 4,
    icon: 'cash-outline',
  },
  {
    key: 'fop',
    code: 'FOP',
    label: 'Firma',
    description: 'Cierre operativo firmado e inmutable.',
    position: 5,
    icon: 'lock-closed-outline',
  },
];

// ── Resolución de estado por paso ─────────────────────────────────────

type StepUiState = 'done' | 'active' | 'review' | 'blocked' | 'pending';

interface StepUi {
  state: StepUiState;
  statusLabel: string;
  route: string;
  isClickable: boolean;
}

function buildStepUi(
  businessId: string,
  chain: DailyChainStatus,
  step: StepConfig,
  isManager: boolean,
): StepUi {
  const base = `/businesses/${businessId}/daily-chain`;
  const { fai, fci, fid, faf, fop } = chain;

  switch (step.key) {
    case 'fai': {
      if (!fai) {
        return {
          state: 'active',
          statusLabel: 'Sin iniciar',
          route: `${base}/opening`,
          isClickable: true,
        };
      }
      if (fai.status === 'AUTHORIZED') {
        return {
          state: 'done',
          statusLabel: 'Autorizado',
          route: `${base}/opening-review`,
          isClickable: true,
        };
      }
      if (fai.status === 'REJECTED') {
        return {
          state: 'blocked',
          statusLabel: 'Rechazado · vuelve a contar',
          route: `${base}/opening`,
          isClickable: true,
        };
      }
      return {
        state: 'review',
        statusLabel: isManager ? 'Pendiente · revisa y autoriza' : 'Pendiente del gerente',
        route: `${base}/opening-review`,
        isClickable: true,
      };
    }
    case 'fci': {
      if (!fci) {
        const ready = fai?.status === 'AUTHORIZED';
        return {
          state: ready ? 'active' : 'pending',
          statusLabel: ready ? 'Listo para registrar' : 'Esperando apertura',
          route: `${base}/closing`,
          isClickable: ready,
        };
      }
      if (fci.status === 'AUTHORIZED' || fci.status === 'COMPLETED') {
        return {
          state: 'done',
          statusLabel: 'Autorizado',
          route: `${base}/closing-review`,
          isClickable: true,
        };
      }
      if (fci.status === 'REJECTED') {
        return {
          state: 'blocked',
          statusLabel: 'Rechazado · vuelve a contar',
          route: `${base}/closing`,
          isClickable: true,
        };
      }
      return {
        state: 'review',
        statusLabel: isManager ? 'Pendiente · revisa y autoriza' : 'Pendiente del gerente',
        route: `${base}/closing-review`,
        isClickable: true,
      };
    }
    case 'fid': {
      if (!fid) {
        const ready = fci?.status === 'AUTHORIZED' || fci?.status === 'COMPLETED';
        return {
          state: ready ? 'active' : 'pending',
          statusLabel: ready ? 'Listo para clasificar' : 'Esperando cierre',
          route: `${base}/deviations`,
          isClickable: ready,
        };
      }
      if (fid.status === 'APPROVED') {
        return {
          state: 'done',
          statusLabel: 'Aprobado',
          route: `${base}/deviations`,
          isClickable: true,
        };
      }
      if (fid.status === 'CLASSIFIED') {
        return {
          state: 'review',
          statusLabel: isManager ? 'Pendiente de aprobación' : 'Pendiente del gerente',
          route: `${base}/deviations`,
          isClickable: true,
        };
      }
      return {
        state: 'active',
        statusLabel: 'Por clasificar',
        route: `${base}/deviations`,
        isClickable: true,
      };
    }
    case 'faf': {
      if (!faf) {
        const ready = fid?.status === 'APPROVED';
        return {
          state: ready ? 'active' : 'pending',
          statusLabel: ready ? 'Listo para arqueo' : 'Esperando desviaciones',
          route: `${base}/reconciliation`,
          isClickable: ready,
        };
      }
      if (faf.status === 'RECONCILED') {
        return {
          state: 'done',
          statusLabel: 'Conciliado',
          route: `${base}/reconciliation`,
          isClickable: true,
        };
      }
      if (faf.status === 'DISCREPANCY') {
        return {
          state: 'blocked',
          statusLabel: 'Con discrepancia',
          route: `${base}/reconciliation`,
          isClickable: true,
        };
      }
      if (faf.status === 'REJECTED') {
        return {
          state: 'blocked',
          statusLabel: 'Rechazado · vuelve a capturar',
          route: `${base}/reconciliation`,
          isClickable: true,
        };
      }
      if (faf.status === 'PENDING_REVIEW') {
        return {
          state: 'review',
          statusLabel: isManager ? 'Pendiente · revisa y aprueba' : 'Pendiente del gerente',
          route: `${base}/reconciliation`,
          isClickable: true,
        };
      }
      return {
        state: 'active',
        statusLabel: 'En captura',
        route: `${base}/reconciliation`,
        isClickable: true,
      };
    }
    case 'fop': {
      const fafReady =
        faf?.status === 'RECONCILED' || faf?.status === 'DISCREPANCY';
      if (!fop) {
        return {
          state: fafReady ? 'active' : 'pending',
          statusLabel: fafReady ? 'Listo para firmar' : 'Esperando arqueo',
          route: `${base}/fop`,
          isClickable: fafReady,
        };
      }
      if (fop.status === 'SIGNED') {
        return {
          state: 'done',
          statusLabel: 'Firmado',
          route: `${base}/fop`,
          isClickable: true,
        };
      }
      if (fop.status === 'BLOCKED') {
        return {
          state: 'blocked',
          statusLabel: isManager ? 'Bloqueado · firma con justificación' : 'Bloqueado',
          route: `${base}/fop`,
          isClickable: true,
        };
      }
      return {
        state: 'active',
        statusLabel: 'Listo para firmar',
        route: `${base}/fop`,
        isClickable: true,
      };
    }
  }
}

// ── Pantalla principal ────────────────────────────────────────────────

export default function DailyChainScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const userRole = useBusinessStore((s) => s.getRole(businessId));
  const isStoreLoaded = useBusinessStore((s) => s.isLoaded);
  const loadStore = useBusinessStore((s) => s.loadBusinesses);
  const isManager = !!userRole && MANAGER_ROLES.includes(userRole);

  const [chain, setChain] = useState<DailyChainStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!isStoreLoaded) await loadStore();
    if (!businessId) return;
    try {
      const data = await dailyChainApi.getStatus(businessId);
      setChain(data);
    } catch (err) {
      notify.error(
        'No pudimos cargar la cadena',
        getApiErrorMessage(err, 'Intenta refrescar la pantalla.'),
      );
    }
  }, [businessId, isStoreLoaded, loadStore]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load().finally(() => setIsLoading(false));
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  const moment = useMemo(
    () =>
      businessId
        ? getDailyChainMoment(businessId, chain, isManager)
        : null,
    [businessId, chain, isManager],
  );

  const semaphore = useMemo(() => getSemaphoreSteps(chain), [chain]);

  const onBack = useCallback(() => router.back(), []);
  const onCta = useCallback(() => {
    if (moment) router.push(moment.ctaRoute as never);
  }, [moment]);

  const onStepPress = useCallback(
    (route: string) => router.push(route as never),
    [],
  );

  if (isLoading && !chain) return <VrittLoader />;

  const dateLabel = getOperationalDateLabel(chain?.operationalDate);

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <VrittScreenHeader
        onBack={onBack}
        eyebrow="Cadena diaria"
        title={dateLabel}
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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={surface.ink}
          />
        }
      >
        {moment ? <Hero moment={moment} onCta={onCta} /> : null}

        <Semaphore steps={semaphore} />

        {chain ? (
          <View style={{ gap: 10 }}>
            <Text
              style={{
                color: text.onPaper.muted,
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                paddingHorizontal: 4,
              }}
            >
              Pasos del día
            </Text>
            {STEPS.map((step) => {
              const ui = buildStepUi(businessId!, chain, step, isManager);
              return (
                <StepRow
                  key={step.key}
                  step={step}
                  ui={ui}
                  onPress={onStepPress}
                />
              );
            })}

            {/* AMD — visible cuando FOP firmado */}
            {chain.fop?.status === 'SIGNED' ? (
              <AmdCard
                onPress={() =>
                  router.push(
                    `/businesses/${businessId}/daily-chain/amd` as never,
                  )
                }
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ── AMD card (acceso al archivo certificado) ─────────────────────────

const AmdCard = React.memo(function AmdCard({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel="Abrir Archivo Maestro Diario"
      style={{
        marginTop: 14,
        backgroundColor: surface.ink,
        borderRadius: radius.lg,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: withAlpha(palette.paper, 0.12),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="shield-checkmark" size={18} color={palette.paper} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: 'rgba(245,242,234,0.6)',
            fontSize: 9,
            fontWeight: '900',
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          Archivo Maestro Diario
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: palette.paper,
            fontSize: 16,
            fontWeight: '800',
            letterSpacing: -0.3,
            marginTop: 4,
          }}
        >
          Día certificado · ver AMD
        </Text>
      </View>
      <Ionicons name="arrow-forward" size={18} color={palette.paper} />
    </TouchableOpacity>
  );
});

// ── Hero ──────────────────────────────────────────────────────────────

const Hero = React.memo(function Hero({
  moment,
  onCta,
}: {
  moment: NonNullable<ReturnType<typeof getDailyChainMoment>>;
  onCta: () => void;
}) {
  const skin = heroSkin[moment.tone];

  return (
    <View
      style={{
        backgroundColor: skin.bg,
        borderRadius: radius.lg,
        padding: 22,
        gap: 18,
        overflow: 'hidden',
      }}
    >
      <View>
        <VrittStatusChip
          tone={moment.tone}
          label={moment.stepCode}
          surface="ink"
        />

        <Text
          style={{
            color: skin.bodySoft,
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            marginTop: 14,
          }}
        >
          {moment.eyebrow}
        </Text>
        <Text
          numberOfLines={3}
          ellipsizeMode="tail"
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{
            color: palette.paper,
            fontSize: 26,
            fontWeight: '800',
            letterSpacing: -0.8,
            lineHeight: 30,
            marginTop: 6,
          }}
        >
          {moment.title}
        </Text>
        <Text
          style={{
            color: skin.bodyMuted,
            fontSize: 14,
            lineHeight: 20,
            fontWeight: '600',
            marginTop: 8,
          }}
        >
          {moment.description}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={{ gap: 6 }}>
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: 'rgba(245,242,234,0.1)',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${moment.progress}%`,
              height: '100%',
              backgroundColor: skin.chipInk,
            }}
          />
        </View>
        <Text
          style={{
            color: skin.bodySoft,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.4,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatPercent(moment.progress)} del día completo
        </Text>
      </View>

      {/* CTA */}
      <TouchableOpacity
        onPress={onCta}
        activeOpacity={0.92}
        style={{
          backgroundColor: skin.cta,
          borderRadius: radius.md,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: skin.ctaInk,
            fontSize: 15,
            fontWeight: '900',
            letterSpacing: -0.3,
          }}
        >
          {moment.ctaLabel}
        </Text>
        <Ionicons name="arrow-forward" size={18} color={skin.ctaInk} />
      </TouchableOpacity>
    </View>
  );
});

// ── Semáforo ──────────────────────────────────────────────────────────

const Semaphore = React.memo(function Semaphore({
  steps,
}: {
  steps: SemaphoreStepInfo[];
}) {
  return (
    <View
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        paddingVertical: 14,
        paddingHorizontal: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}
      >
        {steps.map((step, idx) => (
          <SemaphoreCell
            key={step.code}
            step={step}
            isLast={idx === steps.length - 1}
          />
        ))}
      </View>
    </View>
  );
});

function SemaphoreCell({
  step,
  isLast,
}: {
  step: SemaphoreStepInfo;
  isLast: boolean;
}) {
  const palette_ = semaphoreColors(step.state);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor:
              step.state === 'pending'
                ? 'transparent'
                : hairline.onPaperSoft,
          }}
        />
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: palette_.dotBg,
            borderWidth: palette_.dotBorder ? 1.5 : 0,
            borderColor: palette_.dotBorder ?? 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {palette_.icon ? (
            <Ionicons name={palette_.icon} size={11} color={palette_.iconInk!} />
          ) : (
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: palette_.dotInner,
              }}
            />
          )}
        </View>
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor: isLast
              ? 'transparent'
              : hairline.onPaperSoft,
          }}
        />
      </View>
      <View style={{ alignItems: 'center', gap: 1, paddingHorizontal: 2 }}>
        <Text
          numberOfLines={1}
          style={{
            color: palette_.codeInk,
            fontSize: 9,
            fontWeight: '900',
            letterSpacing: 0.6,
            fontVariant: ['tabular-nums'],
          }}
        >
          {step.code}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: text.onPaper.muted,
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: -0.1,
          }}
        >
          {step.label}
        </Text>
      </View>
    </View>
  );
}

function semaphoreColors(state: SemaphoreStepState) {
  switch (state) {
    case 'done':
      return {
        dotBg: palette.forest,
        dotInner: palette.paper,
        dotBorder: null as string | null,
        icon: 'checkmark' as keyof typeof Ionicons.glyphMap | null,
        iconInk: palette.paper,
        codeInk: palette.forestDeep,
      };
    case 'review':
      return {
        dotBg: withAlpha(palette.amber, 0.15),
        dotInner: palette.amberDeep,
        dotBorder: palette.amber,
        icon: null,
        iconInk: null,
        codeInk: palette.amberDeep,
      };
    case 'blocked':
      return {
        dotBg: withAlpha(palette.danger, 0.15),
        dotInner: palette.dangerDeep,
        dotBorder: palette.danger,
        icon: null,
        iconInk: null,
        codeInk: palette.dangerDeep,
      };
    case 'active':
      return {
        dotBg: palette.ink,
        dotInner: palette.paper,
        dotBorder: null,
        icon: null,
        iconInk: null,
        codeInk: palette.ink,
      };
    case 'pending':
    default:
      return {
        dotBg: surface.card,
        dotInner: withAlpha(palette.ink, 0.18),
        dotBorder: hairline.onPaper,
        icon: null,
        iconInk: null,
        codeInk: text.onPaper.muted,
      };
  }
}

// ── Step Row ──────────────────────────────────────────────────────────

function StepRow({
  step,
  ui,
  onPress,
}: {
  step: StepConfig;
  ui: StepUi;
  onPress: (route: string) => void;
}) {
  const handlePress = useCallback(() => {
    if (ui.isClickable) onPress(ui.route);
  }, [onPress, ui.isClickable, ui.route]);

  const colors = stepRowColors(ui.state);

  return (
    <TouchableOpacity
      activeOpacity={ui.isClickable ? 0.88 : 1}
      onPress={handlePress}
      disabled={!ui.isClickable}
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        opacity: ui.state === 'pending' ? 0.72 : 1,
      }}
    >
      {/* Mark */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.markBg,
          borderWidth: colors.markBorder ? 1.5 : 0,
          borderColor: colors.markBorder ?? 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {ui.state === 'done' ? (
          <Ionicons name="checkmark" size={20} color={palette.paper} />
        ) : ui.state === 'review' ? (
          <Ionicons name="time-outline" size={18} color={palette.amberDeep} />
        ) : ui.state === 'blocked' ? (
          <Ionicons name="alert" size={18} color={palette.dangerDeep} />
        ) : ui.state === 'active' ? (
          <Ionicons name={step.icon} size={18} color={palette.paper} />
        ) : (
          <Ionicons name={step.icon} size={18} color={text.onPaper.muted} />
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            color: colors.codeInk,
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 1.4,
            textTransform: 'uppercase',
          }}
        >
          {step.code} · paso {step.position} de 5
        </Text>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            color: text.onPaper.primary,
            fontSize: 15,
            fontWeight: '800',
            letterSpacing: -0.3,
            marginTop: 2,
          }}
        >
          {step.label}
        </Text>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            color: colors.statusInk,
            fontSize: 12,
            fontWeight: '700',
            marginTop: 4,
            letterSpacing: -0.1,
          }}
        >
          {ui.statusLabel}
        </Text>
      </View>

      {ui.isClickable ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={text.onPaper.subtle}
        />
      ) : (
        <Ionicons
          name="lock-closed"
          size={14}
          color={text.onPaper.subtle}
        />
      )}
    </TouchableOpacity>
  );
}

function stepRowColors(state: StepUiState) {
  switch (state) {
    case 'done':
      return {
        markBg: palette.forest,
        markBorder: null as string | null,
        codeInk: palette.forestDeep,
        statusInk: palette.forestDeep,
      };
    case 'review':
      return {
        markBg: stateOnPaper.review.chipBg,
        markBorder: withAlpha(palette.amber, 0.4),
        codeInk: palette.amberDeep,
        statusInk: palette.amberDeep,
      };
    case 'blocked':
      return {
        markBg: stateOnPaper.blocker.chipBg,
        markBorder: withAlpha(palette.danger, 0.4),
        codeInk: palette.dangerDeep,
        statusInk: palette.dangerDeep,
      };
    case 'active':
      return {
        markBg: palette.ink,
        markBorder: null,
        codeInk: palette.ink,
        statusInk: text.onPaper.primary,
      };
    case 'pending':
    default:
      return {
        markBg: withAlpha(palette.ink, 0.04),
        markBorder: hairline.onPaper,
        codeInk: text.onPaper.muted,
        statusInk: text.onPaper.muted,
      };
  }
}
