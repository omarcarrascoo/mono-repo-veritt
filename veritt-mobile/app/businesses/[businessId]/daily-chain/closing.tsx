import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { dailyChainApi } from '@/api/modules/daily-chain.api';
import { inventoryApi } from '@/api/modules/inventory.api';
import { getApiErrorMessage } from '@/utils/error.utils';
import { notify } from '@/lib/notify';
import type { Material } from '@/types/inventory.types';
import type { DailyInventoryOpening } from '@/types/daily-chain.types';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittScreenHeader } from '@/components/ui/VrittScreenHeader';
import { VrittBottomDock } from '@/components/ui/VrittBottomDock';
import { VrittInfoBanner } from '@/components/ui/VrittInfoBanner';
import { VrittFaiCounterSheet } from '@/components/fai/VrittFaiCounterSheet';
import { VrittFaiMaterialRow } from '@/components/fai/VrittFaiMaterialRow';
import { VrittFaiReviewSheet } from '@/components/fai/VrittFaiReviewSheet';
import { useFaiDraft } from '@/hooks/useFaiDraft';
import {
  buildVarianceNote,
  calcProgress,
  findFirstPendingIndex,
  groupByCategory,
  type FaiMaterialDraft,
} from '@/lib/fai-utils';
import {
  hairline,
  palette,
  radius,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';

interface LocationOption {
  id: string;
  name: string;
}

export default function FciClosingScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(
    null,
  );
  const [materials, setMaterials] = useState<Material[]>([]);
  const [opening, setOpening] = useState<DailyInventoryOpening | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [counterIndex, setCounterIndex] = useState<number | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Override de systemQty: la cantidad esperada para FCI es la apertura del día,
  // no el `currentStock` actual. El draft hace merge por materialId.
  const systemQtyOverrides = useMemo(() => {
    if (!opening) return undefined;
    const map: Record<string, number> = {};
    for (const it of opening.items) {
      map[it.materialId] = Number(it.countedQuantity);
    }
    return map;
  }, [opening]);

  // Solo cuentamos materiales que aparecieron en la apertura del día.
  const filteredMaterials = useMemo(() => {
    if (!opening) return [];
    const ids = new Set(opening.items.map((it) => it.materialId));
    return materials.filter((m) => ids.has(m.id));
  }, [materials, opening]);

  const draft = useFaiDraft({
    businessId: businessId ?? null,
    locationId: selectedLocation,
    materials: filteredMaterials,
    ready: !isLoading && !!selectedLocation && !!opening,
    kind: 'fci',
    systemQtyOverrides,
  });

  // ── Bootstrap ────────────────────────────────────────────────────
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const [locs, mats, openingData] = await Promise.all([
          inventoryApi.listLocations(businessId),
          inventoryApi.listMaterials(businessId),
          dailyChainApi.getOpening(businessId),
        ]);
        if (cancelled) return;
        setLocations(locs.map((l) => ({ id: l.id, name: l.name })));
        setMaterials(mats);
        setOpening(openingData);
        if (openingData) {
          setSelectedLocation(openingData.locationId);
        } else {
          // Fallback: ubicación primaria. Aunque luego mostraremos el empty.
          const primary = locs.find((l) => l.isPrimary) ?? locs[0];
          if (primary) setSelectedLocation(primary.id);
        }
      } catch (err) {
        notify.error(
          'No pudimos cargar el cierre',
          getApiErrorMessage(err, 'Verifica tu conexión e intenta de nuevo.'),
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  // ── Derivados ────────────────────────────────────────────────────
  const progress = useMemo(() => calcProgress(draft.items), [draft.items]);
  const groups = useMemo(() => groupByCategory(draft.items), [draft.items]);

  const nextPendingIndex = useMemo(
    () => findFirstPendingIndex(draft.items),
    [draft.items],
  );
  const nextItem: FaiMaterialDraft | null =
    nextPendingIndex >= 0 ? draft.items[nextPendingIndex] : null;

  // ── Handlers ─────────────────────────────────────────────────────
  const onBack = useCallback(() => router.back(), []);

  const openCounterAt = useCallback(
    (materialId: string) => {
      const idx = draft.items.findIndex((i) => i.materialId === materialId);
      if (idx === -1) return;
      setCounterIndex(idx);
    },
    [draft.items],
  );

  const startCounting = useCallback(() => {
    const idx = nextPendingIndex >= 0 ? nextPendingIndex : 0;
    setCounterIndex(idx);
  }, [nextPendingIndex]);

  const closeCounter = useCallback(() => setCounterIndex(null), []);
  const openReview = useCallback(() => setReviewOpen(true), []);
  const closeReview = useCallback(() => setReviewOpen(false), []);

  const jumpFromReview = useCallback(
    (materialId: string) => {
      setReviewOpen(false);
      setTimeout(() => openCounterAt(materialId), 220);
    },
    [openCounterAt],
  );

  const handleSubmit = useCallback(async () => {
    if (!businessId || !selectedLocation) return;
    const counted = draft.items.filter((i) => i.counted !== null);
    if (counted.length === 0) {
      notify.warning('Faltan datos', 'Captura al menos un conteo.');
      return;
    }

    try {
      setIsSubmitting(true);
      await dailyChainApi.createClosing(businessId, {
        locationId: selectedLocation,
        items: counted.map((i) => ({
          materialId: i.materialId,
          countedQuantity: i.counted as number,
        })),
      });
      // Persisten varianceNotes localmente; backend FCI no las acepta hoy,
      // así que sólo limpiamos el draft después de enviar.
      await draft.clearAll();
      setReviewOpen(false);
      notify.success(
        'Cierre enviado',
        'Un gerente debe autorizarlo para cerrar el día.',
      );
      router.replace(`/businesses/${businessId}/daily-chain`);
    } catch (err) {
      notify.error(
        'No se pudo enviar el cierre',
        getApiErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [businessId, draft, selectedLocation]);

  if (isLoading) return <VrittLoader />;

  // Si no hay apertura del día, no podemos cerrar.
  if (!opening) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <VrittScreenHeader
          onBack={onBack}
          title="Cierre"
          eyebrow="FCI · Conteo final"
        />
        <View
          style={{
            flex: 1,
            padding: 22,
            justifyContent: 'center',
            gap: 14,
            alignItems: 'center',
          }}
        >
          <Ionicons
            name="moon-outline"
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
            No hay apertura registrada
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
            Para hacer el conteo de cierre primero hay que registrar y
            autorizar la apertura del día.
          </Text>
        </View>
      </View>
    );
  }

  if (filteredMaterials.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <VrittScreenHeader
          onBack={onBack}
          title="Cierre"
          eyebrow="FCI · Conteo final"
        />
        <View
          style={{
            flex: 1,
            padding: 22,
            justifyContent: 'center',
            gap: 14,
            alignItems: 'center',
          }}
        >
          <Ionicons
            name="cube-outline"
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
            Sin materiales para cerrar
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
            La apertura del día no incluyó materiales activos.
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
        title="Cierre"
        eyebrow="FCI · Conteo final"
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
      >
        {/* Hero ink — qué viene a continuación */}
        <Hero
          totalItems={progress.total}
          resolved={progress.resolved}
          percent={progress.percent}
          variance={progress.variance}
          skipped={progress.skipped}
          nextItem={nextItem}
          hasDraft={draft.hasDraft}
          onStart={startCounting}
        />

        {/* Aclaración: la varianza con apertura es esperable por las ventas */}
        <VrittInfoBanner
          tone="info"
          icon="information-circle-outline"
          title="Solo cuenta lo que ves"
          description="Captura la cantidad física al final del día. La diferencia con la apertura es normal — se explica con las ventas y el consumo del día. No necesitas justificar varianzas aquí: eso se hace en el reporte de desviaciones (FID)."
        />

        {/* Location picker (solo si hay >1) */}
        {locations.length > 1 ? (
          <LocationPicker
            locations={locations}
            selected={selectedLocation}
            onSelect={setSelectedLocation}
          />
        ) : null}

        {/* Listado por categoría */}
        <View style={{ gap: 18 }}>
          {groups.map((group) => (
            <View key={group.name} style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 4,
                }}
              >
                <Text
                  style={{
                    color: text.onPaper.primary,
                    fontSize: 12,
                    fontWeight: '900',
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                  }}
                >
                  {group.name}
                </Text>
                <Text
                  style={{
                    color: text.onPaper.muted,
                    fontSize: 11,
                    fontWeight: '800',
                    fontVariant: ['tabular-nums'],
                    letterSpacing: 0.4,
                  }}
                >
                  {group.count - group.pending} / {group.count}
                </Text>
              </View>
              {group.items.map((item) => (
                <VrittFaiMaterialRow
                  key={item.materialId}
                  item={item}
                  onPress={openCounterAt}
                  referenceLabel="Apertura"
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Dock de revisión */}
      {progress.resolved > 0 ? (
        <ReviewDock
          counted={progress.counted}
          variance={progress.variance}
          skipped={progress.skipped}
          onPress={openReview}
        />
      ) : null}

      {/* Counter sheet */}
      <VrittFaiCounterSheet
        visible={counterIndex !== null}
        items={draft.items}
        index={counterIndex ?? 0}
        onIndexChange={setCounterIndex}
        onClose={closeCounter}
        onSetCount={draft.setCount}
        onSetSkipped={draft.setSkipped}
        onSetCause={draft.setCause}
        onSetNote={draft.setNote}
        referenceLabel="Apertura"
        matchShortcutLabel="Igual a apertura"
        matchHintLabel="Coincide con la apertura"
        varianceSuffixLabel="vs apertura"
        varianceMode="informational"
      />

      {/* Review sheet */}
      <VrittFaiReviewSheet
        visible={reviewOpen}
        items={draft.items}
        isSubmitting={isSubmitting}
        onClose={closeReview}
        onSubmit={handleSubmit}
        onJumpTo={jumpFromReview}
        title="Cierre · FCI"
        perfectMatchLabel="Todos los materiales coinciden con la apertura."
        submitLabel="Enviar cierre"
        varianceMode="informational"
      />
    </View>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────

const Hero = React.memo(function Hero({
  totalItems,
  resolved,
  percent,
  variance,
  skipped,
  nextItem,
  hasDraft,
  onStart,
}: {
  totalItems: number;
  resolved: number;
  percent: number;
  variance: number;
  skipped: number;
  nextItem: FaiMaterialDraft | null;
  hasDraft: boolean;
  onStart: () => void;
}) {
  const isStart = resolved === 0;
  const isDone = resolved === totalItems && totalItems > 0;

  return (
    <View
      style={{
        backgroundColor: surface.ink,
        borderRadius: radius.lg,
        padding: 22,
        gap: 18,
      }}
    >
      <View>
        <Text
          style={{
            color: text.onInk.muted,
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 1.8,
            textTransform: 'uppercase',
          }}
        >
          {isStart
            ? 'Iniciar conteo de cierre'
            : isDone
            ? 'Listo para revisar'
            : 'Continúa el conteo'}
        </Text>
        <Text
          numberOfLines={3}
          ellipsizeMode="tail"
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={{
            color: palette.paper,
            fontSize: 28,
            fontWeight: '800',
            letterSpacing: -1,
            marginTop: 6,
            lineHeight: 32,
          }}
        >
          {isStart
            ? `Cuenta ${totalItems} ${
                totalItems === 1 ? 'material' : 'materiales'
              } para cerrar el día`
            : isDone
            ? 'Revisa y envía al gerente'
            : nextItem
            ? `Sigue: ${nextItem.name}`
            : 'Conteo en progreso'}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={{ gap: 8 }}>
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: 'rgba(245,242,234,0.1)',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${percent}%`,
              height: '100%',
              backgroundColor: palette.paper,
            }}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: text.onInk.muted,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 0.4,
              fontVariant: ['tabular-nums'],
            }}
          >
            {resolved} / {totalItems} resueltos
          </Text>
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            {variance > 0 ? (
              <DotLabel
                color={palette.amber}
                value={variance}
                label="diferencia"
              />
            ) : null}
            {skipped > 0 ? (
              <DotLabel
                color={palette.danger}
                value={skipped}
                label="saltado"
              />
            ) : null}
          </View>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        onPress={onStart}
        activeOpacity={0.92}
        style={{
          backgroundColor: palette.paper,
          borderRadius: radius.md,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text
            style={{
              color: palette.ink,
              fontSize: 15,
              fontWeight: '900',
              letterSpacing: -0.3,
            }}
          >
            {isStart
              ? 'Empezar a contar'
              : isDone
              ? 'Revisar todo'
              : 'Continuar conteo'}
          </Text>
          {hasDraft && !isStart ? (
            <Text
              style={{
                color: withAlpha(palette.ink, 0.55),
                fontSize: 11,
                fontWeight: '700',
                marginTop: 2,
                letterSpacing: 0.2,
              }}
            >
              Borrador guardado automáticamente
            </Text>
          ) : null}
        </View>
        <Ionicons name="arrow-forward" size={18} color={palette.ink} />
      </TouchableOpacity>
    </View>
  );
});

const DotLabel = React.memo(function DotLabel({
  color,
  value,
  label,
}: {
  color: string;
  value: number;
  label: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: color,
        }}
      />
      <Text
        style={{
          color: text.onInk.muted,
          fontSize: 10,
          fontWeight: '900',
          letterSpacing: 0.6,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value} {label}
      </Text>
    </View>
  );
});

// ── Location picker ───────────────────────────────────────────────────

const LocationPicker = React.memo(function LocationPicker({
  locations,
  selected,
  onSelect,
}: {
  locations: LocationOption[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
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
        Ubicación
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
      >
        {locations.map((loc) => {
          const isActive = selected === loc.id;
          return (
            <TouchableOpacity
              key={loc.id}
              onPress={() => onSelect(loc.id)}
              activeOpacity={0.88}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: radius.pill,
                backgroundColor: isActive ? surface.ink : surface.card,
                borderWidth: 1,
                borderColor: isActive ? surface.ink : hairline.onPaper,
              }}
            >
              <Text
                style={{
                  color: isActive
                    ? text.onInk.primary
                    : text.onPaper.primary,
                  fontSize: 12,
                  fontWeight: '800',
                  letterSpacing: -0.2,
                }}
              >
                {loc.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

// ── Review dock ───────────────────────────────────────────────────────

const ReviewDock = React.memo(function ReviewDock({
  counted,
  variance,
  skipped,
  onPress,
}: {
  counted: number;
  variance: number;
  skipped: number;
  onPress: () => void;
}) {
  return (
    <VrittBottomDock>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel="Revisar y enviar conteo"
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
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              color: text.onInk.muted,
              fontSize: 9,
              fontWeight: '900',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            {counted} contado{counted === 1 ? '' : 's'}
            {variance > 0 ? ` · ${variance} con varianza` : ''}
            {skipped > 0
              ? ` · ${skipped} saltado${skipped === 1 ? '' : 's'}`
              : ''}
          </Text>
          <Text
            style={{
              color: text.onInk.primary,
              fontSize: 16,
              fontWeight: '800',
              letterSpacing: -0.3,
            }}
          >
            Revisar y enviar
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
