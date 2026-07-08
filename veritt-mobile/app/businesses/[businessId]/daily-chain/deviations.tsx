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
  DailyDeviationReport,
  DeviationCause,
  DeviationItem,
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

// ── Constantes ────────────────────────────────────────────────────────

const DEVIATION_EPSILON = 0.005;

interface DeviationCauseOption {
  value: DeviationCause;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CAUSE_OPTIONS: ReadonlyArray<DeviationCauseOption> = [
  {
    value: 'WASTE',
    label: 'Merma',
    hint: 'Producto dañado, caducado o tirado.',
    icon: 'trash-outline',
  },
  {
    value: 'THEFT',
    label: 'Robo',
    hint: 'Faltante sin justificación operativa.',
    icon: 'shield-outline',
  },
  {
    value: 'ERROR',
    label: 'Error de conteo',
    hint: 'El conteo físico no fue preciso.',
    icon: 'calculator-outline',
  },
  {
    value: 'OVERPRODUCTION',
    label: 'Sobreproducción',
    hint: 'Se usó más insumo del que pide la receta.',
    icon: 'trending-up-outline',
  },
  {
    value: 'UNDERPRODUCTION',
    label: 'Subproducción',
    hint: 'Se usó menos insumo del que pide la receta.',
    icon: 'trending-down-outline',
  },
  {
    value: 'ADJUSTMENT',
    label: 'Ajuste',
    hint: 'Corrección administrativa entre ubicaciones.',
    icon: 'swap-horizontal-outline',
  },
  {
    value: 'OTHER',
    label: 'Otra causa',
    hint: 'Explica con detalle en la nota.',
    icon: 'ellipsis-horizontal-outline',
  },
];

const CAUSE_BY_VALUE: Record<DeviationCause, DeviationCauseOption> =
  CAUSE_OPTIONS.reduce(
    (acc, opt) => ({ ...acc, [opt.value]: opt }),
    {} as Record<DeviationCause, DeviationCauseOption>,
  );

const STATUS_LABEL: Record<DailyDeviationReport['status'], string> = {
  PENDING_CLASSIFICATION: 'Pendiente de clasificar',
  CLASSIFIED: 'Pendiente de aprobación',
  APPROVED: 'Aprobado',
};

// ── Borrador local de clasificaciones ─────────────────────────────────

interface ClassificationDraft {
  cause: DeviationCause | null;
  note: string;
}

function buildInitialDraft(
  items: DeviationItem[],
): Record<string, ClassificationDraft> {
  const out: Record<string, ClassificationDraft> = {};
  for (const it of items) {
    if (Math.abs(Number(it.deviationQuantity)) < DEVIATION_EPSILON) continue;
    out[it.materialId] = {
      cause: (it.cause as DeviationCause) ?? null,
      note: it.note ?? '',
    };
  }
  return out;
}

// ── Pantalla ──────────────────────────────────────────────────────────

export default function DeviationsScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const userRole = useBusinessStore((s) => s.getRole(businessId));
  const isManager = !!userRole && MANAGER_ROLES.includes(userRole);

  const [report, setReport] = useState<DailyDeviationReport | null>(null);
  const [draft, setDraft] = useState<
    Record<string, ClassificationDraft>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);

  // Editor sheet
  const [editorMaterialId, setEditorMaterialId] = useState<string | null>(
    null,
  );

  // Approve sheet
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      const data = await dailyChainApi.getDeviations(businessId);
      setReport(data);
      if (data) setDraft(buildInitialDraft(data.items));
    } catch (err) {
      notify.error(
        'No pudimos cargar el reporte',
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

  const deviatingItems = useMemo(() => {
    if (!report) return [];
    return report.items.filter(
      (i) => Math.abs(Number(i.deviationQuantity)) >= DEVIATION_EPSILON,
    );
  }, [report]);

  const onTrackItems = useMemo(() => {
    if (!report) return [];
    return report.items.filter(
      (i) => Math.abs(Number(i.deviationQuantity)) < DEVIATION_EPSILON,
    );
  }, [report]);

  const summary = useMemo(() => {
    if (!report) return null;
    let positive = 0;
    let negative = 0;
    let classified = 0;
    let pending = 0;
    for (const it of deviatingItems) {
      const v = Number(it.deviationValueMXN);
      if (v > 0) positive += v;
      else negative += v;
      const d = draft[it.materialId];
      if (d && d.cause) classified++;
      else pending++;
    }
    return {
      total: deviatingItems.length,
      classified,
      pending,
      positive,
      negative,
      net: positive + negative,
      gross: Math.abs(positive) + Math.abs(negative),
    };
  }, [deviatingItems, draft, report]);

  const isPendingClassification =
    report?.status === 'PENDING_CLASSIFICATION';
  const isClassified = report?.status === 'CLASSIFIED';
  const isApproved = report?.status === 'APPROVED';

  const allClassified = useMemo(() => {
    if (!isPendingClassification) return false;
    return Object.values(draft).every((d) => d.cause !== null);
  }, [draft, isPendingClassification]);

  const editorItem = useMemo(() => {
    if (!editorMaterialId || !report) return null;
    return (
      report.items.find((i) => i.materialId === editorMaterialId) ?? null
    );
  }, [editorMaterialId, report]);

  const editorDraft = editorMaterialId
    ? draft[editorMaterialId] ?? { cause: null, note: '' }
    : null;

  // ── Handlers ─────────────────────────────────────────────────────

  const updateDraft = useCallback(
    (materialId: string, patch: Partial<ClassificationDraft>) => {
      setDraft((prev) => ({
        ...prev,
        [materialId]: { ...prev[materialId], ...patch } as ClassificationDraft,
      }));
    },
    [],
  );

  const openEditor = useCallback(
    (materialId: string) => setEditorMaterialId(materialId),
    [],
  );

  const closeEditor = useCallback(
    () => setEditorMaterialId(null),
    [],
  );

  const handleSubmitClassification = useCallback(async () => {
    if (!businessId || !report) return;
    const incomplete = Object.values(draft).filter((d) => !d.cause);
    if (incomplete.length > 0) {
      notify.warning(
        'Faltan causas',
        `Asigna causa a ${incomplete.length} ${
          incomplete.length === 1 ? 'desviación' : 'desviaciones'
        }.`,
      );
      return;
    }
    try {
      setIsActioning(true);
      const updated = await dailyChainApi.classifyDeviations(
        businessId,
        report.id,
        {
          items: Object.entries(draft).map(([materialId, d]) => ({
            materialId,
            cause: d.cause as DeviationCause,
            note: d.note.trim() || undefined,
          })),
        },
      );
      setReport(updated);
      setDraft(buildInitialDraft(updated.items));
      notify.success(
        'Desviaciones clasificadas',
        'Un gerente puede aprobar el reporte.',
      );
    } catch (err) {
      notify.error(
        'No pudimos clasificar',
        getApiErrorMessage(err, 'Intenta de nuevo.'),
      );
    } finally {
      setIsActioning(false);
    }
  }, [businessId, draft, report]);

  const openApprove = useCallback(() => {
    setActionError(null);
    setConfirmApprove(true);
  }, []);

  const closeApprove = useCallback(() => {
    setActionError(null);
    setConfirmApprove(false);
  }, []);

  const handleApprove = useCallback(async () => {
    if (!businessId || !report) return;
    try {
      setIsActioning(true);
      setActionError(null);
      const updated = await dailyChainApi.approveDeviations(
        businessId,
        report.id,
      );
      setReport(updated);
      setConfirmApprove(false);
      notify.success(
        'Reporte aprobado',
        'Continúa con el arqueo de caja (FAF).',
      );
      router.replace(`/businesses/${businessId}/daily-chain`);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Intenta de nuevo.');
      setActionError(msg);
      notify.error('No pudimos aprobar', msg);
    } finally {
      setIsActioning(false);
    }
  }, [businessId, report]);

  // ── Render ────────────────────────────────────────────────────────

  if (isLoading) return <VrittLoader />;

  if (!report) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <VrittScreenHeader
          onBack={onBack}
          title="Desviaciones"
          eyebrow="FID · Reporte"
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
            Aún sin reporte de desviaciones
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
            El reporte FID se genera al autorizar el cierre del día. Termina
            primero el FCI para continuar.
          </Text>
        </View>
      </View>
    );
  }

  const showClassifyDock =
    isPendingClassification && deviatingItems.length > 0;
  const showApproveDock = isClassified && isManager;

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <VrittScreenHeader
        onBack={onBack}
        title="Desviaciones"
        eyebrow="FID · Reporte"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: showClassifyDock || showApproveDock ? 180 : 60,
          gap: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Hero report={report} summary={summary} />

        {/* Banner informativo según estado */}
        {isPendingClassification ? (
          <VrittInfoBanner
            tone="review"
            icon="clipboard-outline"
            title={
              summary && summary.pending > 0
                ? `Falta clasificar ${summary.pending} ${
                    summary.pending === 1 ? 'desviación' : 'desviaciones'
                  }`
                : 'Todo listo para enviar a aprobación'
            }
            description="Asigna una causa a cada material. Un gerente las aprobará para continuar al arqueo de caja."
          />
        ) : null}

        {isClassified && !isManager ? (
          <VrittInfoBanner
            tone="review"
            icon="time-outline"
            title="Esperando aprobación del gerente"
            description="Las clasificaciones están listas. Un gerente debe aprobar para continuar con el arqueo (FAF)."
          />
        ) : null}

        {isApproved ? (
          <VrittInfoBanner
            tone="done"
            icon="checkmark-circle"
            title="Reporte aprobado"
            description={
              report.approvedAt
                ? `Aprobado: ${new Date(report.approvedAt).toLocaleString(
                    'es-MX',
                  )}`
                : 'Las desviaciones fueron registradas en el día operativo.'
            }
          />
        ) : null}

        {/* Sección con desviación */}
        {deviatingItems.length > 0 ? (
          <Section
            accent={palette.amber}
            title={`${deviatingItems.length} con desviación`}
            caption={
              isPendingClassification
                ? 'Tócalas para asignar causa y nota.'
                : 'Materiales donde el consumo real difiere del teórico.'
            }
          >
            {deviatingItems.map((item) => (
              <DeviationRow
                key={item.id}
                item={item}
                draft={draft[item.materialId]}
                editable={isPendingClassification}
                onPress={openEditor}
              />
            ))}
          </Section>
        ) : (
          <View
            style={{
              backgroundColor: surface.card,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: hairline.onPaper,
              padding: 22,
              alignItems: 'center',
              gap: 10,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: withAlpha(palette.forest, 0.14),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name="checkmark"
                size={20}
                color={palette.forestDeep}
              />
            </View>
            <Text
              style={{
                color: text.onPaper.primary,
                fontSize: 15,
                fontWeight: '800',
                letterSpacing: -0.3,
                textAlign: 'center',
              }}
            >
              Día sin desviaciones
            </Text>
            <Text
              style={{
                color: text.onPaper.muted,
                fontSize: 12,
                textAlign: 'center',
                maxWidth: 260,
                lineHeight: 17,
              }}
            >
              El consumo real cuadró con el teórico de las recetas.
            </Text>
          </View>
        )}

        {/* Sección on-track */}
        {onTrackItems.length > 0 ? (
          <Section
            accent={palette.forest}
            title={`${onTrackItems.length} en línea`}
            caption="Materiales donde el consumo real cuadró con el teórico."
            collapsible
          >
            {onTrackItems.map((item) => (
              <OnTrackRow key={item.id} item={item} />
            ))}
          </Section>
        ) : null}
      </ScrollView>

      {/* Action dock — clasificar */}
      {showClassifyDock ? (
        <ClassifyDock
          allClassified={allClassified}
          isSubmitting={isActioning}
          pendingCount={summary?.pending ?? 0}
          onSubmit={handleSubmitClassification}
        />
      ) : null}

      {/* Action dock — aprobar (manager) */}
      {showApproveDock ? <ApproveDock onApprove={openApprove} /> : null}

      {/* Editor sheet */}
      <ClassifyEditorSheet
        visible={!!editorItem}
        item={editorItem}
        draft={editorDraft}
        onChangeCause={(cause) => {
          if (!editorMaterialId) return;
          updateDraft(editorMaterialId, { cause });
        }}
        onChangeNote={(note) => {
          if (!editorMaterialId) return;
          updateDraft(editorMaterialId, { note });
        }}
        onClose={closeEditor}
      />

      {/* Approve sheet */}
      <ConfirmApproveSheet
        visible={confirmApprove}
        isSubmitting={isActioning}
        summary={summary}
        errorMessage={actionError}
        onClose={closeApprove}
        onConfirm={handleApprove}
      />
    </View>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────

interface SummaryShape {
  total: number;
  classified: number;
  pending: number;
  positive: number;
  negative: number;
  net: number;
  gross: number;
}

const Hero = React.memo(function Hero({
  report,
  summary,
}: {
  report: DailyDeviationReport;
  summary: SummaryShape | null;
}) {
  const status = report.status;
  const tone =
    status === 'APPROVED'
      ? 'done'
      : status === 'CLASSIFIED'
      ? 'progress'
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
          label={STATUS_LABEL[status]}
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
          {new Date(report.operationalDate).toLocaleDateString('es-MX', {
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
          Valor neto de desviaciones
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
          {summary
            ? formatMoney(summary.net)
            : formatMoney(Number(report.totalDeviationValueMXN))}
        </Text>
        <Text
          style={{
            color: text.onInk.soft,
            fontSize: 12,
            fontWeight: '700',
            marginTop: 4,
          }}
        >
          {summary && summary.gross > 0
            ? `Movimiento total ${formatMoney(summary.gross)} · MXN`
            : 'Sin desviaciones · MXN'}
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
          dot={palette.amber}
          label="Total"
          value={summary ? String(summary.total) : '—'}
        />
        <HeroMetric
          dot={palette.sage}
          label="Clasificadas"
          value={summary ? String(summary.classified) : '—'}
        />
        <HeroMetric
          dot={palette.danger}
          label="Pendientes"
          value={summary ? String(summary.pending) : '—'}
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

// ── Deviation row ─────────────────────────────────────────────────────

function DeviationRow({
  item,
  draft,
  editable,
  onPress,
}: {
  item: DeviationItem;
  draft: ClassificationDraft | undefined;
  editable: boolean;
  onPress: (materialId: string) => void;
}) {
  const handlePress = useCallback(
    () => editable && onPress(item.materialId),
    [editable, item.materialId, onPress],
  );

  const deviation = Number(item.deviationQuantity);
  const valueMXN = Number(item.deviationValueMXN);
  const isShortage = deviation > 0; // Real > teórico → consumió de más → faltante.
  const accent = palette.amber;
  const accentDeep = palette.amberDeep;

  // Causa final: backend (read-only) > draft local
  const cause = (item.cause as DeviationCause | undefined) ?? draft?.cause ?? null;
  const note = item.note ?? draft?.note ?? '';
  const causeOption = cause ? CAUSE_BY_VALUE[cause] : null;
  const showHint = editable && !cause;

  return (
    <TouchableOpacity
      activeOpacity={editable ? 0.88 : 1}
      onPress={handlePress}
      disabled={!editable}
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
            color: accentDeep,
            fontSize: 13,
            fontWeight: '900',
            letterSpacing: -0.2,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatVariance(deviation, item.material.baseUnit)}
        </Text>
      </View>

      {/* Numbers row: teórico vs real */}
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: hairline.onPaperSoft,
        }}
      >
        <NumberCell
          label="Teórico"
          value={formatQty(
            Number(item.theoreticalConsumption),
            item.material.baseUnit,
          )}
        />
        <NumberCell
          label="Real"
          value={formatQty(
            Number(item.realConsumption),
            item.material.baseUnit,
          )}
        />
        <NumberCell
          label={isShortage ? 'Faltante' : 'Sobrante'}
          value={formatMoney(Math.abs(valueMXN))}
          emphasis
          accent={accentDeep}
        />
      </View>

      {/* Causa asignada o hint */}
      {causeOption ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: withAlpha(palette.amber, 0.08),
            borderRadius: radius.sm + 2,
            paddingVertical: 9,
            paddingHorizontal: 12,
          }}
        >
          <Ionicons
            name={causeOption.icon}
            size={14}
            color={accentDeep}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{
                color: accentDeep,
                fontSize: 12,
                fontWeight: '900',
                letterSpacing: 0.2,
              }}
            >
              {causeOption.label}
            </Text>
            {note ? (
              <Text
                numberOfLines={2}
                style={{
                  color: text.onPaper.soft,
                  fontSize: 11,
                  fontWeight: '600',
                  marginTop: 2,
                  lineHeight: 14,
                }}
              >
                {note}
              </Text>
            ) : null}
          </View>
          {editable ? (
            <Ionicons
              name="chevron-forward"
              size={14}
              color={text.onPaper.muted}
            />
          ) : null}
        </View>
      ) : showHint ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: withAlpha(palette.danger, 0.08),
            borderRadius: radius.sm + 2,
            paddingVertical: 9,
            paddingHorizontal: 12,
          }}
        >
          <Ionicons
            name="alert-circle-outline"
            size={14}
            color={palette.dangerDeep}
          />
          <Text
            style={{
              flex: 1,
              minWidth: 0,
              color: palette.dangerDeep,
              fontSize: 12,
              fontWeight: '800',
              letterSpacing: 0.2,
            }}
          >
            Falta clasificar · tócalo para asignar causa
          </Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={palette.dangerDeep}
          />
        </View>
      ) : null}
    </TouchableOpacity>
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

// ── On-track row ──────────────────────────────────────────────────────

function OnTrackRow({ item }: { item: DeviationItem }) {
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
        <Ionicons name="checkmark" size={14} color={palette.forestDeep} />
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
        {formatQty(
          Number(item.realConsumption),
          item.material.baseUnit,
        )}
      </Text>
    </View>
  );
}

// ── Classify dock ─────────────────────────────────────────────────────

const ClassifyDock = React.memo(function ClassifyDock({
  allClassified,
  isSubmitting,
  pendingCount,
  onSubmit,
}: {
  allClassified: boolean;
  isSubmitting: boolean;
  pendingCount: number;
  onSubmit: () => void;
}) {
  return (
    <VrittBottomDock>
      <TouchableOpacity
        onPress={onSubmit}
        disabled={!allClassified || isSubmitting}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel="Enviar clasificación"
        style={{
          backgroundColor: allClassified ? surface.ink : 'rgba(11,14,18,0.18)',
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
            numberOfLines={1}
            style={{
              color: allClassified
                ? text.onInk.muted
                : 'rgba(245,242,234,0.5)',
              fontSize: 9,
              fontWeight: '900',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            {allClassified
              ? 'Listo para enviar'
              : `Faltan ${pendingCount} ${
                  pendingCount === 1 ? 'desviación' : 'desviaciones'
                }`}
          </Text>
          <Text
            style={{
              color: text.onInk.primary,
              fontSize: 16,
              fontWeight: '800',
              letterSpacing: -0.3,
            }}
          >
            {isSubmitting ? 'Enviando…' : 'Enviar clasificación'}
          </Text>
        </View>
        <Ionicons
          name="arrow-forward"
          size={18}
          color={text.onInk.primary}
        />
      </TouchableOpacity>
    </VrittBottomDock>
  );
});

// ── Approve dock (manager) ────────────────────────────────────────────

const ApproveDock = React.memo(function ApproveDock({
  onApprove,
}: {
  onApprove: () => void;
}) {
  return (
    <VrittBottomDock>
      <TouchableOpacity
        onPress={onApprove}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel="Aprobar reporte"
        style={{
          backgroundColor: surface.ink,
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
              color: text.onInk.muted,
              fontSize: 9,
              fontWeight: '900',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            Acción del gerente
          </Text>
          <Text
            style={{
              color: text.onInk.primary,
              fontSize: 16,
              fontWeight: '800',
              letterSpacing: -0.3,
            }}
          >
            Aprobar y continuar al arqueo
          </Text>
        </View>
        <Ionicons
          name="checkmark"
          size={20}
          color={text.onInk.primary}
        />
      </TouchableOpacity>
    </VrittBottomDock>
  );
});

// ── Classify editor sheet ─────────────────────────────────────────────

function ClassifyEditorSheet({
  visible,
  item,
  draft,
  onChangeCause,
  onChangeNote,
  onClose,
}: {
  visible: boolean;
  item: DeviationItem | null;
  draft: ClassificationDraft | null;
  onChangeCause: (cause: DeviationCause) => void;
  onChangeNote: (note: string) => void;
  onClose: () => void;
}) {
  if (!item || !draft) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      />
    );
  }

  const deviation = Number(item.deviationQuantity);
  const valueMXN = Number(item.deviationValueMXN);
  const isShortage = deviation > 0;

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
          eyebrow="FID · Clasificar"
          title={item.material.name}
          onClose={onClose}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 22,
            paddingBottom: 120,
            gap: 18,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Resumen del item */}
          <View
            style={{
              backgroundColor: withAlpha(palette.amber, 0.06),
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: withAlpha(palette.amber, 0.2),
              padding: 14,
              gap: 10,
            }}
          >
            <Text
              style={{
                color: palette.amberDeep,
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 1.6,
                textTransform: 'uppercase',
              }}
            >
              Desviación detectada
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <NumberCell
                label="Teórico"
                value={formatQty(
                  Number(item.theoreticalConsumption),
                  item.material.baseUnit,
                )}
              />
              <NumberCell
                label="Real"
                value={formatQty(
                  Number(item.realConsumption),
                  item.material.baseUnit,
                )}
              />
              <NumberCell
                label="Diferencia"
                value={formatVariance(deviation, item.material.baseUnit)}
                emphasis
                accent={palette.amberDeep}
              />
              <NumberCell
                label={isShortage ? 'Faltante' : 'Sobrante'}
                value={formatMoney(Math.abs(valueMXN))}
                emphasis
                accent={palette.amberDeep}
              />
            </View>
          </View>

          {/* Causa selector */}
          <View style={{ gap: 10 }}>
            <Text
              style={{
                color: text.onPaper.primary,
                fontSize: 17,
                fontWeight: '800',
                letterSpacing: -0.4,
              }}
            >
              ¿A qué se debe esta desviación?
            </Text>
            <Text
              style={{
                color: text.onPaper.soft,
                fontSize: 13,
                lineHeight: 18,
                fontWeight: '600',
              }}
            >
              Elige la causa principal. El gerente verá tu selección al
              aprobar el reporte.
            </Text>
            <View style={{ gap: 8, marginTop: 4 }}>
              {CAUSE_OPTIONS.map((opt) => (
                <CauseRow
                  key={opt.value}
                  option={opt}
                  isActive={draft.cause === opt.value}
                  onPress={() => onChangeCause(opt.value)}
                />
              ))}
            </View>
          </View>

          {/* Nota */}
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
              Nota libre (opcional)
            </Text>
            <TextInput
              value={draft.note}
              onChangeText={onChangeNote}
              placeholder="Ej: la merma viene de la prueba de la nueva receta el viernes."
              placeholderTextColor={text.onPaper.subtle}
              multiline
              style={{
                color: text.onPaper.primary,
                fontSize: 14,
                fontWeight: '600',
                minHeight: 80,
                textAlignVertical: 'top',
                marginTop: 4,
                padding: 0,
                letterSpacing: -0.1,
              }}
            />
          </View>
        </ScrollView>

        {/* Footer del sheet */}
        <View
          style={{
            paddingTop: 14,
            paddingHorizontal: 16,
            paddingBottom: Platform.OS === 'ios' ? 32 : 18,
            backgroundColor: surface.paper,
            borderTopWidth: 1,
            borderTopColor: hairline.onPaperSoft,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.92}
            style={{
              backgroundColor: surface.ink,
              borderRadius: radius.md,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Ionicons
              name="checkmark"
              size={18}
              color={text.onInk.primary}
            />
            <Text
              style={{
                color: text.onInk.primary,
                fontSize: 15,
                fontWeight: '900',
                letterSpacing: -0.3,
              }}
            >
              Listo
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CauseRow({
  option,
  isActive,
  onPress,
}: {
  option: DeviationCauseOption;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={{
        backgroundColor: isActive ? surface.ink : surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: isActive ? surface.ink : hairline.onPaper,
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: isActive
            ? withAlpha(palette.paper, 0.14)
            : 'rgba(11,14,18,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={option.icon}
          size={15}
          color={isActive ? palette.paper : text.onPaper.primary}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: isActive ? palette.paper : text.onPaper.primary,
            fontSize: 14,
            fontWeight: '800',
            letterSpacing: -0.2,
          }}
        >
          {option.label}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            color: isActive
              ? withAlpha(palette.paper, 0.7)
              : text.onPaper.muted,
            fontSize: 12,
            fontWeight: '600',
            marginTop: 2,
            lineHeight: 15,
          }}
        >
          {option.hint}
        </Text>
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: isActive
            ? withAlpha(palette.paper, 0.18)
            : 'rgba(11,14,18,0.06)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isActive ? (
          <Ionicons name="checkmark" size={13} color={palette.paper} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ── Confirm approve sheet ─────────────────────────────────────────────

function ConfirmApproveSheet({
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
          eyebrow="FID · Acción"
          title="Aprobar reporte"
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
            ¿Apruebas las clasificaciones?
          </Text>
          <Text
            style={{
              color: text.onPaper.soft,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: '600',
            }}
          >
            Las desviaciones quedarán registradas en el día operativo. Después
            de aprobar podrás continuar con el arqueo de caja (FAF).
          </Text>

          {summary && summary.total > 0 ? (
            <VrittInfoBanner
              tone="review"
              icon="information-circle-outline"
              title={`${summary.total} ${
                summary.total === 1 ? 'desviación' : 'desviaciones'
              } clasificadas`}
              description={`Movimiento total ${formatMoney(
                summary.gross,
              )} · Valor neto ${formatMoney(summary.net)}.`}
            />
          ) : null}

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
