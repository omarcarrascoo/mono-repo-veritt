import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  hairline,
  palette,
  radius,
  stateOnPaper,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';
import {
  buildVarianceNote,
  formatQty,
  formatVariance,
  getMaterialStatus,
  getVarianceValue,
  statusLabel,
  statusTone,
  VARIANCE_CAUSE_OPTIONS,
  type FaiMaterialDraft,
  type FaiVarianceCause,
} from '@/lib/fai-utils';

// ── Counter sheet ─────────────────────────────────────────────────────
// Un material a la vez. Atajos rápidos arriba (igual al sistema, sin
// existencia, saltar). Si hay varianza, aparece bloque de causa con chips.

type Props = {
  visible: boolean;
  items: FaiMaterialDraft[];
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
  onSetCount: (materialId: string, value: number | null) => void;
  onSetSkipped: (materialId: string, skipped: boolean) => void;
  onSetCause: (materialId: string, cause: FaiVarianceCause | null) => void;
  onSetNote: (materialId: string, note: string) => void;
  /** Texto descriptivo del valor de referencia. Default: "Sistema". */
  referenceLabel?: string;
  /** Atajo del valor de referencia. Default: "Igual al sistema". */
  matchShortcutLabel?: string;
  /** Mensaje del bloque de coincidencia. Default: "Coincide con el sistema". */
  matchHintLabel?: string;
  /** Sufijo del label de varianza. Default: "vs sistema". */
  varianceSuffixLabel?: string;
  /**
   * `explain` (FAI): muestra el bloque "¿A qué se debe la varianza?" con
   * causas predefinidas + nota libre.
   * `informational` (FCI): oculta ese bloque — la diferencia con la apertura
   * se explicará después en el reporte de desviaciones (FID).
   * Default: "explain".
   */
  varianceMode?: 'explain' | 'informational';
};

function Component({
  visible,
  items,
  index,
  onIndexChange,
  onClose,
  onSetCount,
  onSetSkipped,
  onSetCause,
  onSetNote,
  referenceLabel = 'Sistema',
  matchShortcutLabel = 'Igual al sistema',
  matchHintLabel = 'Coincide con el sistema',
  varianceSuffixLabel = 'vs sistema',
  varianceMode = 'explain',
}: Props) {
  const item = items[index];

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: surface.paper }}
      >
        <CounterBody
          key={item.materialId}
          items={items}
          index={index}
          item={item}
          onIndexChange={onIndexChange}
          onClose={onClose}
          onSetCount={onSetCount}
          onSetSkipped={onSetSkipped}
          onSetCause={onSetCause}
          onSetNote={onSetNote}
          referenceLabel={referenceLabel}
          matchShortcutLabel={matchShortcutLabel}
          matchHintLabel={matchHintLabel}
          varianceSuffixLabel={varianceSuffixLabel}
          varianceMode={varianceMode}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CounterBody({
  items,
  index,
  item,
  onIndexChange,
  onClose,
  onSetCount,
  onSetSkipped,
  onSetCause,
  onSetNote,
  referenceLabel,
  matchShortcutLabel,
  matchHintLabel,
  varianceSuffixLabel,
  varianceMode,
}: {
  items: FaiMaterialDraft[];
  index: number;
  item: FaiMaterialDraft;
  onIndexChange: (next: number) => void;
  onClose: () => void;
  onSetCount: (materialId: string, value: number | null) => void;
  onSetSkipped: (materialId: string, skipped: boolean) => void;
  onSetCause: (materialId: string, cause: FaiVarianceCause | null) => void;
  onSetNote: (materialId: string, note: string) => void;
  referenceLabel: string;
  matchShortcutLabel: string;
  matchHintLabel: string;
  varianceSuffixLabel: string;
  varianceMode: 'explain' | 'informational';
}) {
  // Local state del input — se "compromete" al borrador con onBlur o navegación
  const [draftText, setDraftText] = useState<string>(
    item.counted !== null ? String(item.counted) : '',
  );

  useEffect(() => {
    setDraftText(item.counted !== null ? String(item.counted) : '');
  }, [item.materialId, item.counted]);

  const status = getMaterialStatus(item);
  const tone = statusTone(status);
  const onPaper = stateOnPaper[tone];
  const variance = getVarianceValue(item);
  const hasVariance = status === 'counted_variance';

  const total = items.length;
  const isLast = index === total - 1;
  const isFirst = index === 0;

  const commitText = useCallback(
    (raw: string) => {
      const cleaned = raw.replace(',', '.').trim();
      if (cleaned === '') {
        onSetCount(item.materialId, null);
        return;
      }
      const n = Number(cleaned);
      if (!Number.isFinite(n) || n < 0) {
        onSetCount(item.materialId, null);
        return;
      }
      onSetCount(item.materialId, n);
    },
    [item.materialId, onSetCount],
  );

  const handleMatchSystem = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setDraftText(String(item.systemQty));
    onSetCount(item.materialId, item.systemQty);
  }, [item.materialId, item.systemQty, onSetCount]);

  const handleZero = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setDraftText('0');
    onSetCount(item.materialId, 0);
  }, [item.materialId, onSetCount]);

  const handleSkip = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    onSetSkipped(item.materialId, true);
  }, [item.materialId, onSetSkipped]);

  const handleNext = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    commitText(draftText);
    if (!isLast) onIndexChange(index + 1);
    else onClose();
  }, [commitText, draftText, index, isLast, onClose, onIndexChange]);

  const handlePrev = useCallback(() => {
    if (isFirst) return;
    Haptics.selectionAsync().catch(() => {});
    commitText(draftText);
    onIndexChange(index - 1);
  }, [commitText, draftText, index, isFirst, onIndexChange]);

  const handleClose = useCallback(() => {
    commitText(draftText);
    onClose();
  }, [commitText, draftText, onClose]);

  const handlePickCause = useCallback(
    (cause: FaiVarianceCause) => {
      Haptics.selectionAsync().catch(() => {});
      onSetCause(
        item.materialId,
        item.cause === cause ? null : cause,
      );
    },
    [item.cause, item.materialId, onSetCause],
  );

  const handleNoteChange = useCallback(
    (value: string) => onSetNote(item.materialId, value),
    [item.materialId, onSetNote],
  );

  const isMatch = status === 'counted_match';
  const isSkipped = status === 'skipped';

  return (
    <View style={{ flex: 1 }}>
      {/* Header con cierre + progreso */}
      <View
        style={{
          paddingTop: Platform.OS === 'ios' ? 14 : 18,
          paddingBottom: 14,
          paddingHorizontal: 18,
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
            gap: 12,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{
                color: text.onPaper.muted,
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.6,
                textTransform: 'uppercase',
              }}
            >
              Material {index + 1} de {total}
            </Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{
                color: text.onPaper.primary,
                fontSize: 14,
                fontWeight: '700',
                marginTop: 4,
                opacity: 0.7,
              }}
            >
              {item.category ?? 'Sin categoría'}
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
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

        {/* Progress bar */}
        <View
          style={{
            marginTop: 16,
            height: 4,
            borderRadius: 2,
            backgroundColor: hairline.onPaperSoft,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${((index + 1) / total) * 100}%`,
              height: '100%',
              backgroundColor: surface.ink,
            }}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 22,
          paddingBottom: 160,
          gap: 22,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Material name + sistema */}
        <View style={{ gap: 12 }}>
          <Text
            numberOfLines={3}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{
              color: text.onPaper.primary,
              fontSize: 28,
              fontWeight: '800',
              letterSpacing: -1,
              lineHeight: 32,
            }}
          >
            {item.name}
          </Text>

          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: radius.pill,
              backgroundColor: withAlpha(palette.ink, 0.06),
            }}
          >
            <Ionicons
              name="cube-outline"
              size={13}
              color={text.onPaper.primary}
            />
            <Text
              style={{
                color: text.onPaper.primary,
                fontSize: 12,
                fontWeight: '800',
                letterSpacing: -0.2,
              }}
            >
              {referenceLabel}: {formatQty(item.systemQty, item.baseUnit)}
            </Text>
          </View>

          {/* Status chip */}
          {status !== 'pending' ? (
            <View
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: radius.pill,
                backgroundColor: onPaper.chipBg,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: onPaper.accent,
                }}
              />
              <Text
                style={{
                  color: onPaper.chipInk,
                  fontSize: 10,
                  fontWeight: '900',
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                }}
              >
                {statusLabel(status)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Atajos rápidos */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ShortcutPill
            icon="checkmark-circle-outline"
            label={matchShortcutLabel}
            isActive={isMatch}
            onPress={handleMatchSystem}
          />
          <ShortcutPill
            icon="close-circle-outline"
            label="Sin existencia"
            isActive={item.counted === 0}
            onPress={handleZero}
          />
          <ShortcutPill
            icon="play-skip-forward-outline"
            label="Saltar"
            isActive={isSkipped}
            onPress={handleSkip}
          />
        </View>

        {/* Input grande */}
        <View
          style={{
            backgroundColor: surface.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: hasVariance
              ? withAlpha(palette.amber, 0.4)
              : isMatch
              ? withAlpha(palette.forest, 0.35)
              : hairline.onPaper,
            padding: 22,
            gap: 14,
          }}
        >
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1.8,
              textTransform: 'uppercase',
            }}
          >
            Cantidad contada
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: 10,
            }}
          >
            <TextInput
              value={draftText}
              onChangeText={setDraftText}
              onBlur={() => commitText(draftText)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={withAlpha(palette.ink, 0.2)}
              autoFocus={!isSkipped && item.counted === null}
              selectTextOnFocus
              style={{
                flex: 1,
                minWidth: 0,
                color: text.onPaper.primary,
                fontSize: 56,
                fontWeight: '800',
                letterSpacing: -2,
                fontVariant: ['tabular-nums'],
                padding: 0,
              }}
            />
            <Text
              numberOfLines={1}
              style={{
                color: text.onPaper.muted,
                fontSize: 18,
                fontWeight: '800',
                letterSpacing: -0.4,
                maxWidth: 80,
              }}
            >
              {item.baseUnit}
            </Text>
          </View>

          {hasVariance ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: hairline.onPaperSoft,
              }}
            >
              <Ionicons
                name="trending-up-outline"
                size={14}
                color={palette.amberDeep}
                style={
                  variance < 0
                    ? { transform: [{ scaleY: -1 }] }
                    : undefined
                }
              />
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  flex: 1,
                  color: palette.amberDeep,
                  fontSize: 13,
                  fontWeight: '800',
                  letterSpacing: -0.2,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatVariance(variance, item.baseUnit)} {varianceSuffixLabel}
              </Text>
            </View>
          ) : isMatch ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: hairline.onPaperSoft,
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={palette.forest}
              />
              <Text
                style={{
                  color: palette.forestDeep,
                  fontSize: 13,
                  fontWeight: '800',
                  letterSpacing: -0.2,
                }}
              >
                {matchHintLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bloque de varianza — solo en modo "explain" (FAI). En FCI la
            diferencia con la apertura se explicará en el FID. */}
        {hasVariance && varianceMode === 'explain' ? (
          <View style={{ gap: 14 }}>
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
                ¿A qué se debe la varianza?
              </Text>
              <Text
                style={{
                  color: text.onPaper.soft,
                  fontSize: 13,
                  marginTop: 4,
                  lineHeight: 18,
                }}
              >
                Selecciona una causa o describe lo que pasó. El gerente la verá
                al revisar.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {VARIANCE_CAUSE_OPTIONS.map((opt) => (
                <CauseChip
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  isActive={item.cause === opt.value}
                  onPress={handlePickCause}
                />
              ))}
            </View>

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
                  fontWeight: '800',
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                }}
              >
                Nota libre (opcional)
              </Text>
              <TextInput
                value={item.note}
                onChangeText={handleNoteChange}
                placeholder="Cuéntale al gerente qué viste o por qué crees que pasó."
                placeholderTextColor={text.onPaper.subtle}
                multiline
                style={{
                  color: text.onPaper.primary,
                  fontSize: 14,
                  fontWeight: '600',
                  minHeight: 48,
                  textAlignVertical: 'top',
                  padding: 0,
                  marginTop: 4,
                  letterSpacing: -0.1,
                }}
              />
            </View>

            {buildVarianceNote(item) ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                <Ionicons
                  name="checkmark"
                  size={12}
                  color={palette.forestDeep}
                />
                <Text
                  style={{
                    color: palette.forestDeep,
                    fontSize: 11,
                    fontWeight: '800',
                    letterSpacing: 0.3,
                  }}
                >
                  Varianza explicada
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Dock de navegación */}
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
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <TouchableOpacity
          onPress={handlePrev}
          disabled={isFirst}
          activeOpacity={0.85}
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: hairline.onPaper,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isFirst ? 0.3 : 1,
          }}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={text.onPaper.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.92}
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
            style={{
              color: text.onInk.primary,
              fontSize: 15,
              fontWeight: '900',
              letterSpacing: -0.3,
            }}
          >
            {isLast ? 'Terminar conteo' : 'Siguiente material'}
          </Text>
          <Ionicons
            name={isLast ? 'checkmark' : 'arrow-forward'}
            size={20}
            color={text.onInk.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────

function ShortcutPillInner({
  icon,
  label,
  isActive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        gap: 6,
        borderRadius: radius.md,
        backgroundColor: isActive ? surface.ink : surface.card,
        borderWidth: 1,
        borderColor: isActive ? surface.ink : hairline.onPaper,
      }}
    >
      <Ionicons
        name={icon}
        size={18}
        color={isActive ? text.onInk.primary : text.onPaper.primary}
      />
      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={{
          color: isActive ? text.onInk.primary : text.onPaper.primary,
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: -0.2,
          textAlign: 'center',
          lineHeight: 13,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
const ShortcutPill = memo(ShortcutPillInner);

function CauseChipInner({
  value,
  label,
  isActive,
  onPress,
}: {
  value: FaiVarianceCause;
  label: string;
  isActive: boolean;
  onPress: (value: FaiVarianceCause) => void;
}) {
  const handlePress = useCallback(() => onPress(value), [onPress, value]);
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: isActive
          ? withAlpha(palette.amber, 0.16)
          : surface.card,
        borderWidth: 1,
        borderColor: isActive
          ? withAlpha(palette.amber, 0.45)
          : hairline.onPaper,
      }}
    >
      <Text
        style={{
          color: isActive ? palette.amberDeep : text.onPaper.primary,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: -0.2,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
const CauseChip = memo(CauseChipInner);

export const VrittFaiCounterSheet = memo(Component);
