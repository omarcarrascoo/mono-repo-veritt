import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { DailyCashOpening } from '@/types/daily-chain.types';
import { useBusinessStore } from '@/store/business.store';
import { permissions } from '@/lib/role-permissions';
import { getApiErrorMessage } from '@/utils/error.utils';
import { notify } from '@/lib/notify';
import { formatMoney } from '@/lib/format';
import {
  hairline,
  palette,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittScreenHeader } from '@/components/ui/VrittScreenHeader';
import { VrittBottomDock } from '@/components/ui/VrittBottomDock';
import { VrittInfoBanner } from '@/components/ui/VrittInfoBanner';
import { VrittStatusChip } from '@/components/ui/VrittStatusChip';

// ── Pantalla ──────────────────────────────────────────────────────────
// Candado C2: el encargado de caja (R2) declara el efectivo con el que abre
// la caja antes de la 1ª venta. El FAF parte de este saldo al cuadrar el día.

export default function CashOpeningScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const userRole = useBusinessStore((s) => s.getRole(businessId));
  const canOperate = permissions.canOperateCash(userRole);

  const [opening, setOpening] = useState<DailyCashOpening | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      const existing = await dailyChainApi.getCashOpening(businessId);
      setOpening(existing);
    } catch (err) {
      notify.error(
        'No pudimos cargar el saldo de caja',
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

  const amountNum = Number(amount);
  const canSubmit =
    amount.trim() !== '' && Number.isFinite(amountNum) && amountNum >= 0;

  const handleSubmit = useCallback(async () => {
    if (!businessId || !canSubmit) return;
    try {
      setIsSubmitting(true);
      const result = await dailyChainApi.declareCashOpening(businessId, {
        openingBalance: amountNum,
        notes: notes.trim() || undefined,
      });
      setOpening(result);
      notify.success(
        'Saldo de caja declarado',
        'La caja quedó abierta. Ya puedes registrar ventas.',
      );
    } catch (err) {
      notify.error(
        'No pudimos declarar el saldo',
        getApiErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [amountNum, businessId, canSubmit, notes]);

  if (isLoading) return <VrittLoader />;

  // Ya declarado — vista de resultado (uno por día, no se re-declara).
  if (opening) {
    return <DeclaredView opening={opening} onBack={onBack} />;
  }

  // Sin saldo aún y el rol no opera caja — sólo informativo.
  if (!canOperate) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <VrittScreenHeader
          onBack={onBack}
          title="Saldo inicial"
          eyebrow="Caja · Apertura"
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
          <VrittInfoBanner
            tone="review"
            icon="lock-closed-outline"
            title="Falta el saldo inicial"
            description="El encargado de caja debe declarar el efectivo de apertura antes de la primera venta. Pídele que lo registre desde su sesión."
          />
        </ScrollView>
      </View>
    );
  }

  // Captura del saldo inicial.
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: surface.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
      <VrittScreenHeader
        onBack={onBack}
        title="Saldo inicial"
        eyebrow="Caja · Apertura"
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
        {/* Hero ink — saldo en vivo */}
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
            Efectivo de apertura
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
            {formatMoney(canSubmit ? amountNum : 0)}
          </Text>
          <Text
            style={{
              color: text.onInk.soft,
              fontSize: 12,
              fontWeight: '700',
              lineHeight: 18,
            }}
          >
            El dinero se queda físicamente en la caja. Al cierre, el arqueo
            (FAF) parte de este saldo para cuadrar el día.
          </Text>
        </View>

        {/* Banner explicativo */}
        <VrittInfoBanner
          tone="info"
          icon="wallet-outline"
          title="Antes de la 1ª venta"
          description="Cuenta el fondo con el que abres la caja y decláralo aquí. Sin este saldo, el sistema no permite registrar ventas del día."
        />

        {/* Captura */}
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
            label="Saldo de apertura"
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            editable={!isSubmitting}
            prefix="$"
            size="lg"
            autoFocus
          />
          <PaperField
            label="Notas (opcional)"
            placeholder="Ej: fondo fijo del turno matutino."
            value={notes}
            onChangeText={setNotes}
            editable={!isSubmitting}
          />
        </View>
      </ScrollView>

      {/* Bottom dock — declarar */}
      <VrittBottomDock>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          activeOpacity={0.92}
          accessibilityRole="button"
          accessibilityLabel="Declarar saldo inicial de caja"
          style={{
            backgroundColor: canSubmit ? surface.ink : 'rgba(11,14,18,0.18)',
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
                color: canSubmit ? text.onInk.muted : 'rgba(245,242,234,0.5)',
                fontSize: 9,
                fontWeight: '900',
                letterSpacing: 1.6,
                textTransform: 'uppercase',
              }}
            >
              Saldo {formatMoney(canSubmit ? amountNum : 0)}
            </Text>
            <Text
              style={{
                color: text.onInk.primary,
                fontSize: 16,
                fontWeight: '800',
                letterSpacing: -0.3,
              }}
            >
              {isSubmitting ? 'Declarando…' : 'Declarar saldo'}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={text.onInk.primary} />
        </TouchableOpacity>
      </VrittBottomDock>
    </KeyboardAvoidingView>
  );
}

// ── Vista de saldo ya declarado ────────────────────────────────────────

function DeclaredView({
  opening,
  onBack,
}: {
  opening: DailyCashOpening;
  onBack: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
      <VrittScreenHeader
        onBack={onBack}
        title="Saldo inicial"
        eyebrow="Caja · Apertura"
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
          <VrittStatusChip tone="done" surface="ink" label="Caja abierta" />
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
              Saldo de apertura
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{
                color: palette.sage,
                fontSize: 44,
                fontWeight: '800',
                letterSpacing: -1.8,
                marginTop: 6,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatMoney(Number(opening.openingBalance))}
            </Text>
          </View>
          {opening.notes ? (
            <View
              style={{
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: 'rgba(245,242,234,0.1)',
                gap: 4,
              }}
            >
              <Text
                style={{
                  color: text.onInk.muted,
                  fontSize: 9,
                  fontWeight: '900',
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                }}
              >
                Notas
              </Text>
              <Text
                style={{
                  color: text.onInk.primary,
                  fontSize: 14,
                  fontWeight: '600',
                  lineHeight: 20,
                }}
              >
                {opening.notes}
              </Text>
            </View>
          ) : null}
        </View>

        <VrittInfoBanner
          tone="done"
          icon="checkmark-circle"
          title="Saldo declarado"
          description="La caja quedó abierta con este fondo. Las ventas del día ya están habilitadas y el arqueo (FAF) partirá de este saldo."
        />
      </ScrollView>
    </View>
  );
}

// ── Paper field reutilizable ────────────────────────────────────────────
// Mismo patrón que el arqueo (FAF) para consistencia visual en la cadena.

function PaperField({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  editable,
  prefix,
  size = 'md',
  autoFocus,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric';
  editable?: boolean;
  prefix?: string;
  size?: 'md' | 'lg';
  autoFocus?: boolean;
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
          autoFocus={autoFocus}
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
