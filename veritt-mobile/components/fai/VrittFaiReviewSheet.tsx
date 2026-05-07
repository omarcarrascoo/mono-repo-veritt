import React, { memo, useCallback, useMemo } from 'react';
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

import {
  hairline,
  palette,
  radius,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';
import {
  buildVarianceNote,
  calcProgress,
  formatVariance,
  getMaterialStatus,
  getVarianceValue,
  validateForSubmit,
  type FaiMaterialDraft,
} from '@/lib/fai-utils';

// ── Review sheet ──────────────────────────────────────────────────────
// Antes de enviar al gerente: digest del conteo, resaltando varianzas y
// saltados. CTA de envío sólo se activa si la validación pasa.

type Props = {
  visible: boolean;
  items: FaiMaterialDraft[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onJumpTo: (materialId: string) => void;
  /** Texto del estado "todo coincide" (default: "...con el sistema."). */
  perfectMatchLabel?: string;
  /** Eyebrow del header del sheet (default: "Apertura · FAI"). */
  title?: string;
  /** Texto del CTA primario cuando se puede enviar (default: "Enviar para autorización"). */
  submitLabel?: string;
  /**
   * Cómo se trata la varianza:
   * - `explain` (FAI): obliga al operador a justificar cada diferencia.
   * - `informational` (FCI): la varianza con apertura se muestra como
   *   referencia visual, pero no se exige nota — esas diferencias se
   *   explican luego en el reporte FID. Default: "explain".
   */
  varianceMode?: 'explain' | 'informational';
};

function Component({
  visible,
  items,
  isSubmitting,
  onClose,
  onSubmit,
  onJumpTo,
  perfectMatchLabel = 'Todos los materiales coinciden con el sistema.',
  title = 'Apertura · FAI',
  submitLabel = 'Enviar para autorización',
  varianceMode = 'explain',
}: Props) {
  const progress = useMemo(() => calcProgress(items), [items]);
  const validation = useMemo(
    () =>
      validateForSubmit(items, {
        requireVarianceExplanation: varianceMode === 'explain',
      }),
    [items, varianceMode],
  );

  const variances = useMemo(
    () =>
      items.filter((i) => getMaterialStatus(i) === 'counted_variance'),
    [items],
  );
  const skipped = useMemo(
    () => items.filter((i) => getMaterialStatus(i) === 'skipped'),
    [items],
  );
  const pending = useMemo(
    () => items.filter((i) => getMaterialStatus(i) === 'pending'),
    [items],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        {/* Header */}
        <View
          style={{
            paddingTop: Platform.OS === 'ios' ? 14 : 18,
            paddingHorizontal: 22,
            paddingBottom: 16,
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
                  fontWeight: '900',
                  letterSpacing: 1.8,
                  textTransform: 'uppercase',
                }}
              >
                {title}
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
                Revisar y enviar
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
              <Ionicons name="close" size={18} color={text.onPaper.primary} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 18, paddingBottom: 160, gap: 18 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero ink — números clave */}
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
                letterSpacing: 1.8,
                textTransform: 'uppercase',
              }}
            >
              Resumen del conteo
            </Text>
            <Text
              style={{
                color: palette.paper,
                fontSize: 40,
                fontWeight: '800',
                letterSpacing: -1.6,
                fontVariant: ['tabular-nums'],
              }}
            >
              {progress.resolved}
              <Text
                style={{
                  color: text.onInk.muted,
                  fontSize: 24,
                  letterSpacing: -0.6,
                }}
              >
                {' '}
                / {progress.total}
              </Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <HeroMetric
                label="Coincide"
                value={String(progress.counted - progress.variance)}
                accent={palette.sage}
              />
              <HeroMetric
                label="Varianza"
                value={String(progress.variance)}
                accent={palette.amber}
              />
              <HeroMetric
                label="Saltado"
                value={String(progress.skipped)}
                accent={palette.danger}
              />
            </View>
          </View>

          {/* Pending warning */}
          {pending.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: radius.md,
                backgroundColor: withAlpha(palette.ink, 0.04),
                borderWidth: 1,
                borderColor: hairline.onPaper,
              }}
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={text.onPaper.primary}
                style={{ marginTop: 2 }}
              />
              <Text
                style={{
                  flex: 1,
                  color: text.onPaper.primary,
                  fontSize: 13,
                  lineHeight: 18,
                  fontWeight: '700',
                  letterSpacing: -0.1,
                }}
              >
                Quedan {pending.length}{' '}
                {pending.length === 1 ? 'material' : 'materiales'} sin contar.
                Puedes enviar igual: el gerente sabrá qué falta.
              </Text>
            </View>
          ) : null}

          {/* Variances section */}
          {variances.length > 0 ? (
            <Section
              title={`${variances.length} con varianza`}
              caption={
                varianceMode === 'informational'
                  ? 'Diferencia con la apertura. Se clasificará en el reporte de desviaciones (FID).'
                  : 'Estos requieren explicación. Tócalos para editar.'
              }
              accent={palette.amber}
            >
              {variances.map((item) => (
                <ReviewRow
                  key={item.materialId}
                  item={item}
                  highlightTone="review"
                  varianceMode={varianceMode}
                  onPress={onJumpTo}
                />
              ))}
            </Section>
          ) : null}

          {/* Skipped section */}
          {skipped.length > 0 ? (
            <Section
              title={`${skipped.length} saltado${skipped.length === 1 ? '' : 's'}`}
              caption="Sin contar. Vuelve si quieres registrar el valor."
              accent={palette.danger}
            >
              {skipped.map((item) => (
                <ReviewRow
                  key={item.materialId}
                  item={item}
                  highlightTone="blocker"
                  varianceMode={varianceMode}
                  onPress={onJumpTo}
                />
              ))}
            </Section>
          ) : null}

          {/* All clear */}
          {progress.variance === 0 && progress.skipped === 0 && progress.counted > 0 ? (
            <View
              style={{
                paddingVertical: 18,
                paddingHorizontal: 18,
                borderRadius: radius.md,
                backgroundColor: withAlpha(palette.forest, 0.1),
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={palette.forestDeep}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: palette.forestDeep,
                    fontSize: 14,
                    fontWeight: '900',
                    letterSpacing: -0.2,
                  }}
                >
                  Conteo limpio
                </Text>
                <Text
                  style={{
                    color: palette.forestDeep,
                    fontSize: 12,
                    fontWeight: '700',
                    marginTop: 2,
                    opacity: 0.85,
                  }}
                >
                  {perfectMatchLabel}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Validation reasons */}
          {!validation.canSubmit ? (
            <View
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: radius.md,
                backgroundColor: withAlpha(palette.danger, 0.08),
                borderWidth: 1,
                borderColor: withAlpha(palette.danger, 0.2),
                gap: 6,
              }}
            >
              <Text
                style={{
                  color: palette.dangerDeep,
                  fontSize: 11,
                  fontWeight: '900',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Antes de enviar
              </Text>
              {validation.reasons.map((r, idx) => (
                <Text
                  key={idx}
                  style={{
                    color: palette.dangerDeep,
                    fontSize: 13,
                    lineHeight: 18,
                    fontWeight: '700',
                  }}
                >
                  · {r}
                </Text>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {/* Submit dock */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingTop: 14,
            paddingHorizontal: 16,
            paddingBottom: Platform.OS === 'ios' ? 32 : 18,
            backgroundColor: surface.paper,
            borderTopWidth: 1,
            borderTopColor: hairline.onPaperSoft,
          }}
        >
          <TouchableOpacity
            onPress={onSubmit}
            disabled={!validation.canSubmit || isSubmitting}
            activeOpacity={0.92}
            style={{
              backgroundColor: surface.ink,
              borderRadius: radius.md,
              paddingVertical: 16,
              paddingHorizontal: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: !validation.canSubmit ? 0.35 : 1,
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
              {isSubmitting ? 'Enviando...' : submitLabel}
            </Text>
            <Ionicons
              name="paper-plane-outline"
              size={18}
              color={text.onInk.primary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────

function HeroMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: accent,
          }}
        />
        <Text
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

function Section({
  title,
  caption,
  accent,
  children,
}: {
  title: string;
  caption: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ paddingHorizontal: 4 }}>
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
      <View style={{ gap: 6 }}>{children}</View>
    </View>
  );
}

interface ReviewRowProps {
  item: FaiMaterialDraft;
  highlightTone: 'review' | 'blocker';
  varianceMode: 'explain' | 'informational';
  onPress: (materialId: string) => void;
}

function ReviewRowInner({
  item,
  highlightTone,
  varianceMode,
  onPress,
}: ReviewRowProps) {
  const handlePress = useCallback(
    () => onPress(item.materialId),
    [item.materialId, onPress],
  );
  const variance = getVarianceValue(item);
  const status = getMaterialStatus(item);
  const isSkipped = status === 'skipped';
  const accent =
    highlightTone === 'review' ? palette.amber : palette.danger;
  const accentDeep =
    highlightTone === 'review' ? palette.amberDeep : palette.dangerDeep;
  const note = buildVarianceNote(item);
  // En modo informational no pedimos explicación de la varianza con apertura.
  const showCauseHint =
    varianceMode === 'explain' && !isSkipped && !note;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
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
        gap: 6,
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
          {item.name}
        </Text>
        {isSkipped ? (
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 0,
              color: accentDeep,
              fontSize: 11,
              fontWeight: '900',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            Saltado
          </Text>
        ) : (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              flexShrink: 0,
              maxWidth: 120,
              color: accentDeep,
              fontSize: 12,
              fontWeight: '900',
              letterSpacing: -0.2,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatVariance(variance, item.baseUnit)}
          </Text>
        )}
      </View>
      {note ? (
        <Text
          numberOfLines={2}
          style={{
            color: text.onPaper.soft,
            fontSize: 12,
            lineHeight: 16,
            fontWeight: '600',
          }}
        >
          {note}
        </Text>
      ) : showCauseHint ? (
        <Text
          style={{
            color: accentDeep,
            fontSize: 12,
            lineHeight: 16,
            fontWeight: '700',
          }}
        >
          Falta explicar la varianza · tócalo para editar
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}
const ReviewRow = memo(ReviewRowInner);

export const VrittFaiReviewSheet = memo(Component);
