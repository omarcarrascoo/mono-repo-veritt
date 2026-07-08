import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { timeTrackingApi } from '@/api/modules/time-tracking.api';
import { staffApi } from '@/api/modules/staff.api';
import { areasApi } from '@/api/modules/areas.api';
import type { StaffProfile } from '@/types/staff.types';
import type { Area } from '@/types/area.types';
import { useBusinessStore } from '@/store/business.store';
import { permissions } from '@/lib/role-permissions';
import { notify } from '@/lib/notify';
import { getApiErrorMessage } from '@/utils/error.utils';

import {
  hairline,
  navbar,
  palette,
  radius,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittAbstractShapes } from '@/components/home/VrittAbstractShapes';

// ── Helpers ──────────────────────────────────────────────────────────

function staffInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatNow(): string {
  return new Date().toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLongDate(): string {
  return new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// ── Pantalla principal ───────────────────────────────────────────────

export default function ClockInScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const role = useBusinessStore((s) =>
    businessId ? s.getRole(businessId) : null,
  );
  const canSeeShifts = permissions.canSeeShifts(role);

  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(formatNow);

  // Reloj en vivo
  useEffect(() => {
    const t = setInterval(() => setNow(formatNow()), 30000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async () => {
    if (!businessId) return;
    try {
      setIsLoading(true);
      const [staffData, areasData] = await Promise.all([
        staffApi.getByBusinessId(businessId),
        areasApi.list(businessId),
      ]);
      setStaff(staffData.filter((s) => s.status === 'ACTIVE'));
      setAreas(areasData.filter((a) => a.status === 'ACTIVE'));
    } catch (err) {
      notify.error(
        'No pudimos cargar los datos',
        getApiErrorMessage(err, 'Verifica tu conexión e intenta de nuevo.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (canSeeShifts) loadData();
    else setIsLoading(false);
  }, [canSeeShifts, loadData]);

  const onBack = useCallback(() => router.back(), []);

  const handleClockIn = useCallback(async () => {
    if (!businessId || !selectedStaffId) {
      notify.warning('Faltan datos', 'Selecciona un empleado.');
      return;
    }
    try {
      setIsSubmitting(true);
      await timeTrackingApi.clockIn(businessId, {
        staffProfileId: selectedStaffId,
        areaId: selectedAreaId || undefined,
      });
      notify.success(
        'Entrada registrada',
        'El turno está activo en el módulo de asistencia.',
      );
      router.replace(`/businesses/${businessId}/shifts`);
    } catch (err) {
      notify.error(
        'No pudimos registrar la entrada',
        getApiErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [businessId, selectedStaffId, selectedAreaId]);

  const selectedStaff = useMemo(
    () => staff.find((s) => s.id === selectedStaffId) ?? null,
    [staff, selectedStaffId],
  );

  // ── Gates ───────────────────────────────────────────────────────────

  if (!canSeeShifts) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <Header onBack={onBack} />
        <NoAccess />
      </View>
    );
  }

  if (isLoading) return <VrittLoader />;

  if (staff.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <Header onBack={onBack} />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 30,
            gap: 12,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: 'rgba(11,14,18,0.05)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name="people-outline"
              size={22}
              color={text.onPaper.primary}
            />
          </View>
          <Text
            style={{
              color: text.onPaper.primary,
              fontSize: 17,
              fontWeight: '800',
              letterSpacing: -0.4,
              textAlign: 'center',
            }}
          >
            No hay empleados activos
          </Text>
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 13,
              lineHeight: 18,
              textAlign: 'center',
              maxWidth: 270,
            }}
          >
            Da de alta a tu equipo para poder registrar entradas en el módulo
            de asistencia.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: surface.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <Header onBack={onBack} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 22,
          paddingBottom: 160,
          gap: 22,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ClockHero now={now} dateLabel={formatLongDate()} />

        <View style={{ gap: 12 }}>
          <SectionHeader
            eyebrow="Empleado"
            title="¿Quién entra al turno?"
            trailing={`${staff.length} disponibles`}
          />
          <StaffPicker
            staff={staff}
            selectedId={selectedStaffId}
            onSelect={setSelectedStaffId}
          />
        </View>

        {areas.length > 0 ? (
          <View style={{ gap: 12 }}>
            <SectionHeader
              eyebrow="Área"
              title="¿Dónde trabajará?"
              trailing="Opcional"
            />
            <AreaPicker
              areas={areas}
              selectedId={selectedAreaId}
              onSelect={setSelectedAreaId}
            />
          </View>
        ) : null}

        <ConfirmCard
          selectedStaff={selectedStaff}
          isSubmitting={isSubmitting}
          onSubmit={handleClockIn}
          onCancel={onBack}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Header ───────────────────────────────────────────────────────────

const Header = React.memo(function Header({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <View
      style={{
        paddingTop: Platform.OS === 'ios' ? 60 : 52,
        paddingHorizontal: 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: hairline.onPaperSoft,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          onPress={onBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.sm + 2,
            borderWidth: 1,
            borderColor: hairline.onPaper,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name="arrow-back"
            size={16}
            color={text.onPaper.primary}
          />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            Asistencia
          </Text>
          <Text
            style={{
              color: text.onPaper.primary,
              fontSize: 18,
              fontWeight: '800',
              letterSpacing: -0.5,
              marginTop: 2,
            }}
          >
            Registrar entrada
          </Text>
        </View>
      </View>
    </View>
  );
});

// ── Hero del reloj ────────────────────────────────────────────────────

const ClockHero = React.memo(function ClockHero({
  now,
  dateLabel,
}: {
  now: string;
  dateLabel: string;
}) {
  return (
    <View
      style={{
        borderRadius: radius.xl,
        overflow: 'hidden',
        backgroundColor: surface.ink,
      }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[palette.inkTinted, surface.ink, palette.inkDeep]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[...navbar.steelOverlay]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.9 }}
        style={absoluteFill}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -90,
          right: -60,
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: withAlpha(palette.sage, 0.16),
        }}
      />
      <VrittAbstractShapes tint={palette.paper} variant="hero" />

      <View style={{ padding: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: palette.sage,
            }}
          />
          <Text
            style={{
              color: text.onInk.muted,
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1.8,
              textTransform: 'uppercase',
            }}
          >
            En este momento
          </Text>
        </View>

        <Text
          style={{
            color: palette.paper,
            fontSize: 56,
            fontWeight: '800',
            letterSpacing: -2.5,
            marginTop: 12,
            fontVariant: ['tabular-nums'],
          }}
        >
          {now}
        </Text>

        <Text
          style={{
            color: text.onInk.soft,
            fontSize: 13,
            fontWeight: '700',
            marginTop: 4,
            letterSpacing: -0.1,
            textTransform: 'capitalize',
          }}
        >
          {dateLabel}
        </Text>
      </View>
    </View>
  );
});

// ── Section header (paper) ────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  trailing,
}: {
  eyebrow: string;
  title: string;
  trailing?: string;
}) {
  return (
    <View style={{ paddingHorizontal: 4 }}>
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
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.8,
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </Text>
        {trailing ? (
          <Text
            style={{
              color: text.onPaper.subtle,
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            {trailing}
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          color: text.onPaper.primary,
          fontSize: 20,
          fontWeight: '800',
          letterSpacing: -0.7,
          marginTop: 4,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

// ── Staff picker (lista de cards) ────────────────────────────────────

const StaffPicker = React.memo(function StaffPicker({
  staff,
  selectedId,
  onSelect,
}: {
  staff: StaffProfile[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      {staff.map((s) => {
        const isSelected = s.id === selectedId;
        const initials = staffInitials(s.fullName);
        return (
          <TouchableOpacity
            key={s.id}
            activeOpacity={0.88}
            onPress={() => onSelect(s.id)}
            style={{
              backgroundColor: surface.card,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: isSelected
                ? withAlpha(palette.ink, 0.85)
                : hairline.onPaper,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isSelected
                  ? surface.ink
                  : 'rgba(11,14,18,0.06)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: isSelected
                    ? text.onInk.primary
                    : text.onPaper.primary,
                  fontSize: 12,
                  fontWeight: '900',
                  letterSpacing: -0.2,
                }}
              >
                {initials}
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{
                  color: text.onPaper.primary,
                  fontSize: 14,
                  fontWeight: '800',
                  letterSpacing: -0.3,
                }}
              >
                {s.fullName}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: text.onPaper.muted,
                  fontSize: 11,
                  fontWeight: '700',
                  marginTop: 2,
                  letterSpacing: -0.1,
                }}
              >
                {s.operationalRole}
                {s.shift ? ` · ${s.shift}` : ''}
              </Text>
            </View>

            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: isSelected
                  ? surface.ink
                  : 'rgba(11,14,18,0.06)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSelected ? (
                <Ionicons name="checkmark" size={13} color={palette.paper} />
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

// ── Area picker (chips horizontales) ─────────────────────────────────

const AreaPicker = React.memo(function AreaPicker({
  areas,
  selectedId,
  onSelect,
}: {
  areas: Area[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 4, gap: 8 }}
    >
      <AreaChip
        label="Sin área"
        icon="ellipse-outline"
        isSelected={selectedId === ''}
        onPress={() => onSelect('')}
      />
      {areas.map((a) => (
        <AreaChip
          key={a.id}
          label={a.name}
          icon="map-outline"
          isSelected={selectedId === a.id}
          onPress={() => onSelect(a.id)}
        />
      ))}
    </ScrollView>
  );
});

function AreaChip({
  label,
  icon,
  isSelected,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radius.pill,
        backgroundColor: isSelected ? surface.ink : surface.card,
        borderWidth: 1,
        borderColor: isSelected
          ? withAlpha(palette.ink, 0.85)
          : hairline.onPaper,
      }}
    >
      <Ionicons
        name={icon}
        size={13}
        color={isSelected ? text.onInk.primary : text.onPaper.primary}
      />
      <Text
        numberOfLines={1}
        style={{
          color: isSelected ? text.onInk.primary : text.onPaper.primary,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Confirm card ──────────────────────────────────────────────────────

const ConfirmCard = React.memo(function ConfirmCard({
  selectedStaff,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  selectedStaff: StaffProfile | null;
  isSubmitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const isReady = !!selectedStaff;

  return (
    <View style={{ gap: 10, marginTop: 4 }}>
      <TouchableOpacity
        activeOpacity={0.92}
        disabled={!isReady || isSubmitting}
        onPress={onSubmit}
        style={{
          backgroundColor: isReady ? surface.ink : 'rgba(11,14,18,0.18)',
          borderRadius: radius.md,
          paddingVertical: 17,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: isSubmitting ? 0.7 : 1,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: isReady
                ? withAlpha(palette.paper, 0.12)
                : 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={isSubmitting ? 'hourglass-outline' : 'log-in-outline'}
              size={15}
              color={palette.paper}
            />
          </View>
          <View>
            <Text
              style={{
                color: palette.paper,
                fontSize: 14,
                fontWeight: '900',
                letterSpacing: -0.2,
              }}
            >
              {isSubmitting ? 'Registrando…' : 'Confirmar entrada'}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: withAlpha(palette.paper, 0.65),
                fontSize: 11,
                fontWeight: '700',
                marginTop: 2,
                letterSpacing: -0.1,
                maxWidth: 220,
              }}
            >
              {selectedStaff
                ? selectedStaff.fullName
                : 'Selecciona un empleado para continuar'}
            </Text>
          </View>
        </View>
        <Ionicons name="arrow-forward" size={16} color={palette.paper} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.88}
        disabled={isSubmitting}
        onPress={onCancel}
        style={{
          backgroundColor: surface.card,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: hairline.onPaper,
          paddingVertical: 14,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: text.onPaper.primary,
            fontSize: 12,
            fontWeight: '900',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          Cancelar
        </Text>
      </TouchableOpacity>
    </View>
  );
});

// ── No-access state (OPERATOR) ───────────────────────────────────────

function NoAccess() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
        gap: 14,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: 'rgba(11,14,18,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name="lock-closed-outline"
          size={26}
          color={text.onPaper.primary}
        />
      </View>
      <Text
        style={{
          color: text.onPaper.primary,
          fontSize: 18,
          fontWeight: '800',
          letterSpacing: -0.4,
          textAlign: 'center',
        }}
      >
        Este módulo es para supervisores
      </Text>
      <Text
        style={{
          color: text.onPaper.muted,
          fontSize: 13,
          lineHeight: 19,
          textAlign: 'center',
          maxWidth: 280,
        }}
      >
        Solo los administradores y supervisores pueden registrar entradas
        en este módulo.
      </Text>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => router.back()}
        style={{
          marginTop: 8,
          paddingVertical: 11,
          paddingHorizontal: 18,
          borderRadius: radius.md,
          backgroundColor: surface.ink,
        }}
      >
        <Text
          style={{
            color: text.onInk.primary,
            fontSize: 12,
            fontWeight: '900',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          Volver
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Style constants ──────────────────────────────────────────────────

const absoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
