import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { timeTrackingApi } from '@/api/modules/time-tracking.api';
import type { ShiftLog } from '@/types/time-tracking.types';
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

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMinutes(mins: number | null | undefined): string {
  if (!mins || mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function dayKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function startOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayLabel(key: string): { eyebrow: string; title: string } {
  const today = startOfDay(new Date().toISOString());
  const target = startOfDay(`${key}T12:00:00`);
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );

  const formatted = target.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (diffDays === 0) return { eyebrow: 'Hoy', title: capitalize(formatted) };
  if (diffDays === 1) return { eyebrow: 'Ayer', title: capitalize(formatted) };
  return { eyebrow: `Hace ${diffDays} días`, title: capitalize(formatted) };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function staffInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Tipos auxiliares ─────────────────────────────────────────────────

interface DayGroup {
  key: string;
  eyebrow: string;
  title: string;
  shifts: ShiftLog[];
  totalMinutes: number;
  shiftCount: number;
}

interface DaySummary {
  activeCount: number;
  todayShiftCount: number;
  todayTotalMinutes: number;
  uniquePeopleToday: number;
}

interface LeaderboardEntry {
  staffProfileId: string;
  fullName: string;
  totalMinutes: number;
  shiftCount: number;
}

interface FilterOption {
  staffProfileId: string;
  fullName: string;
  count: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// ── Pantalla principal ───────────────────────────────────────────────

export default function ShiftsScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const role = useBusinessStore((s) =>
    businessId ? s.getRole(businessId) : null,
  );
  const canSeeShifts = permissions.canSeeShifts(role);

  const [activeShifts, setActiveShifts] = useState<ShiftLog[]>([]);
  const [recentShifts, setRecentShifts] = useState<ShiftLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [endingShiftId, setEndingShiftId] = useState<string | null>(null);
  const [staffFilter, setStaffFilter] = useState<string>('ALL');

  const loadShifts = useCallback(async () => {
    if (!businessId) return;
    try {
      const [active, recent] = await Promise.all([
        timeTrackingApi.getActive(businessId),
        timeTrackingApi.list(businessId, { status: 'COMPLETED' }),
      ]);
      setActiveShifts(active);
      setRecentShifts(recent.slice(0, 60));
    } catch (err) {
      notify.error(
        'No pudimos cargar los turnos',
        getApiErrorMessage(err, 'Verifica tu conexión e intenta de nuevo.'),
      );
    }
  }, [businessId]);

  useFocusEffect(
    useCallback(() => {
      if (!canSeeShifts) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      loadShifts().finally(() => setIsLoading(false));
    }, [canSeeShifts, loadShifts]),
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadShifts();
    setIsRefreshing(false);
  }, [loadShifts]);

  const onBack = useCallback(() => router.back(), []);
  const onClockIn = useCallback(() => {
    if (businessId) router.push(`/businesses/${businessId}/shifts/clock-in`);
  }, [businessId]);

  const onClockOut = useCallback(
    async (shiftId: string) => {
      if (!businessId) return;
      try {
        setEndingShiftId(shiftId);
        await timeTrackingApi.clockOut(businessId, shiftId);
        notify.success('Salida registrada', 'El turno fue cerrado.');
        await loadShifts();
      } catch (err) {
        notify.error(
          'No pudimos registrar la salida',
          getApiErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
        );
      } finally {
        setEndingShiftId(null);
      }
    },
    [businessId, loadShifts],
  );

  // ── Derivados ───────────────────────────────────────────────────────

  // Resumen del día siempre se calcula sobre TODA la data (no respeta filtro)
  // — el filtro afecta sólo lista activa + historial.
  const summary = useMemo<DaySummary>(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayShifts = recentShifts.filter(
      (s) => dayKey(s.clockInAt) === todayKey,
    );
    const todayTotalMinutes = todayShifts.reduce(
      (acc, s) => acc + (s.totalMinutes ?? 0),
      0,
    );
    const uniquePeopleToday = new Set(
      [...activeShifts, ...todayShifts].map((s) => s.staffProfileId),
    ).size;
    return {
      activeCount: activeShifts.length,
      todayShiftCount: todayShifts.length,
      todayTotalMinutes,
      uniquePeopleToday,
    };
  }, [activeShifts, recentShifts]);

  // Opciones de filtro: lista única de empleados con turnos cerrados o activos.
  const filterOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, FilterOption>();
    const consume = (s: ShiftLog) => {
      if (!s.staffProfile) return;
      const id = s.staffProfileId;
      const existing = map.get(id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(id, {
          staffProfileId: id,
          fullName: s.staffProfile.fullName,
          count: 1,
        });
      }
    };
    activeShifts.forEach(consume);
    recentShifts.forEach(consume);
    return Array.from(map.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName, 'es'),
    );
  }, [activeShifts, recentShifts]);

  // Top semana — leaderboard de las últimas 7 días (sobre data sin filtrar).
  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    const cutoff = Date.now() - WEEK_MS;
    const map = new Map<string, LeaderboardEntry>();
    for (const s of recentShifts) {
      if (new Date(s.clockInAt).getTime() < cutoff) continue;
      const id = s.staffProfileId;
      const name = s.staffProfile?.fullName ?? 'Empleado';
      const minutes = s.totalMinutes ?? 0;
      const existing = map.get(id);
      if (existing) {
        existing.totalMinutes += minutes;
        existing.shiftCount += 1;
      } else {
        map.set(id, {
          staffProfileId: id,
          fullName: name,
          totalMinutes: minutes,
          shiftCount: 1,
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 5);
  }, [recentShifts]);

  // Filtros aplicados a turnos activos.
  const filteredActiveShifts = useMemo(() => {
    if (staffFilter === 'ALL') return activeShifts;
    return activeShifts.filter((s) => s.staffProfileId === staffFilter);
  }, [activeShifts, staffFilter]);

  // Historial filtrado y agrupado por día.
  const groupsByDay = useMemo<DayGroup[]>(() => {
    const filtered =
      staffFilter === 'ALL'
        ? recentShifts
        : recentShifts.filter((s) => s.staffProfileId === staffFilter);

    const map = new Map<string, ShiftLog[]>();
    for (const s of filtered) {
      const k = dayKey(s.clockInAt);
      const list = map.get(k) ?? [];
      list.push(s);
      map.set(k, list);
    }
    const groups: DayGroup[] = [];
    for (const [key, shifts] of map.entries()) {
      const sorted = [...shifts].sort(
        (a, b) =>
          new Date(b.clockInAt).getTime() - new Date(a.clockInAt).getTime(),
      );
      const totalMinutes = sorted.reduce(
        (acc, s) => acc + (s.totalMinutes ?? 0),
        0,
      );
      const labels = dayLabel(key);
      groups.push({
        key,
        eyebrow: labels.eyebrow,
        title: labels.title,
        shifts: sorted,
        totalMinutes,
        shiftCount: sorted.length,
      });
    }
    return groups.sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [recentShifts, staffFilter]);

  const isFiltering = staffFilter !== 'ALL';

  // ── Gates ───────────────────────────────────────────────────────────

  if (!canSeeShifts) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <Header onBack={onBack} onClockIn={() => undefined} hideAction />
        <NoAccess />
      </View>
    );
  }

  if (isLoading && activeShifts.length === 0 && recentShifts.length === 0) {
    return <VrittLoader />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <Header onBack={onBack} onClockIn={onClockIn} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 22,
          paddingBottom: 200,
          gap: 32,
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
        <SummaryHero summary={summary} onClockIn={onClockIn} />

        {leaderboard.length > 0 ? (
          <LeaderboardBlock entries={leaderboard} />
        ) : null}

        {filterOptions.length > 1 ? (
          <FilterBar
            options={filterOptions}
            selected={staffFilter}
            onSelect={setStaffFilter}
          />
        ) : null}

        <ActiveShiftsBlock
          shifts={filteredActiveShifts}
          endingShiftId={endingShiftId}
          onClockOut={onClockOut}
        />

        <HistoryBlock groups={groupsByDay} isFiltering={isFiltering} />
      </ScrollView>
    </View>
  );
}

// ── Header ───────────────────────────────────────────────────────────

const Header = React.memo(function Header({
  onBack,
  onClockIn,
  hideAction,
}: {
  onBack: () => void;
  onClockIn: () => void;
  hideAction?: boolean;
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
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
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
            Equipo
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
            Asistencia
          </Text>
        </View>

        {!hideAction ? (
          <Pressable
            onPress={onClockIn}
            style={{
              height: 36,
              paddingHorizontal: 14,
              borderRadius: radius.sm + 2,
              backgroundColor: surface.ink,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Ionicons name="add" size={14} color={text.onInk.primary} />
            <Text
              style={{
                color: text.onInk.primary,
                fontSize: 12,
                fontWeight: '900',
                letterSpacing: -0.2,
              }}
            >
              Entrada
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

// ── Summary hero (ink card) ──────────────────────────────────────────

const SummaryHero = React.memo(function SummaryHero({
  summary,
  onClockIn,
}: {
  summary: DaySummary;
  onClockIn: () => void;
}) {
  const isActive = summary.activeCount > 0;

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
          backgroundColor: isActive
            ? withAlpha(palette.sage, 0.18)
            : withAlpha(palette.steel, 0.16),
        }}
      />
      <VrittAbstractShapes tint={palette.paper} variant="hero" />

      <View style={{ padding: 24 }}>
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
              backgroundColor: isActive ? palette.sage : palette.paper,
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
            Hoy
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 12,
            marginTop: 16,
          }}
        >
          <Text
            style={{
              color: palette.paper,
              fontSize: 56,
              fontWeight: '800',
              letterSpacing: -2.5,
              fontVariant: ['tabular-nums'],
              lineHeight: 56,
            }}
          >
            {summary.activeCount}
          </Text>
          <Text
            style={{
              color: text.onInk.soft,
              fontSize: 14,
              fontWeight: '700',
              letterSpacing: -0.2,
              flex: 1,
            }}
          >
            {summary.activeCount === 1 ? 'persona en turno' : 'personas en turno'}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            marginTop: 24,
            paddingTop: 20,
            borderTopWidth: 1,
            borderTopColor: withAlpha(palette.paper, 0.1),
          }}
        >
          <HeroMetric
            label="Tickets"
            value={String(summary.todayShiftCount)}
          />
          <View style={{ width: 1, backgroundColor: withAlpha(palette.paper, 0.1) }} />
          <HeroMetric
            label="Horas"
            value={formatMinutes(summary.todayTotalMinutes)}
          />
          <View style={{ width: 1, backgroundColor: withAlpha(palette.paper, 0.1) }} />
          <HeroMetric
            label="Personas"
            value={String(summary.uniquePeopleToday)}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          onPress={onClockIn}
          style={{
            marginTop: 24,
            backgroundColor: palette.paper,
            borderRadius: radius.md,
            paddingVertical: 14,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: palette.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="time" size={14} color={palette.paper} />
            </View>
            <Text
              style={{
                color: palette.ink,
                fontSize: 14,
                fontWeight: '900',
                letterSpacing: -0.2,
              }}
            >
              Registrar entrada
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={palette.ink} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
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
        style={{
          color: palette.paper,
          fontSize: 18,
          fontWeight: '800',
          letterSpacing: -0.4,
          fontVariant: ['tabular-nums'],
          marginTop: 6,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Active shifts ────────────────────────────────────────────────────

const ActiveShiftsBlock = React.memo(function ActiveShiftsBlock({
  shifts,
  endingShiftId,
  onClockOut,
}: {
  shifts: ShiftLog[];
  endingShiftId: string | null;
  onClockOut: (shiftId: string) => void;
}) {
  if (shifts.length === 0) return null;

  return (
    <View style={{ gap: 14 }}>
      <SectionHeader
        eyebrow="En turno"
        title={
          shifts.length === 1
            ? '1 persona activa'
            : `${shifts.length} personas activas`
        }
        trailing="En vivo"
      />

      <View style={{ gap: 10 }}>
        {shifts.map((s) => (
          <ActiveShiftRow
            key={s.id}
            shift={s}
            isEnding={endingShiftId === s.id}
            onClockOut={onClockOut}
          />
        ))}
      </View>
    </View>
  );
});

const ActiveShiftRow = React.memo(function ActiveShiftRow({
  shift,
  isEnding,
  onClockOut,
}: {
  shift: ShiftLog;
  isEnding: boolean;
  onClockOut: (shiftId: string) => void;
}) {
  const handleClockOut = useCallback(
    () => onClockOut(shift.id),
    [shift.id, onClockOut],
  );
  const fullName = shift.staffProfile?.fullName ?? 'Empleado';
  const areaName = shift.area?.name;
  const initials = staffInitials(fullName);

  // Cuánto lleva en turno (minutos vivos)
  const liveMinutes = Math.max(
    0,
    Math.round(
      (Date.now() - new Date(shift.clockInAt).getTime()) / 60000,
    ),
  );

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
      <View
        style={{
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
            backgroundColor: withAlpha(palette.forest, 0.14),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: palette.forestDeep,
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
            {fullName}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 3,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: palette.forest,
              }}
            />
            <Text
              numberOfLines={1}
              style={{
                color: palette.forestDeep,
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              {formatMinutes(liveMinutes)} · entrada {formatTime(shift.clockInAt)}
              {areaName ? ` · ${areaName}` : ''}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handleClockOut}
        disabled={isEnding}
        style={{
          backgroundColor: surface.ink,
          borderRadius: radius.sm + 2,
          paddingVertical: 11,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: isEnding ? 0.6 : 1,
        }}
      >
        <Ionicons name="exit-outline" size={14} color={palette.paper} />
        <Text
          style={{
            color: palette.paper,
            fontSize: 12,
            fontWeight: '900',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {isEnding ? 'Cerrando…' : 'Registrar salida'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

// ── Historial por día ────────────────────────────────────────────────

const HistoryBlock = React.memo(function HistoryBlock({
  groups,
  isFiltering,
}: {
  groups: DayGroup[];
  isFiltering: boolean;
}) {
  if (groups.length === 0) {
    return (
      <View style={{ gap: 14 }}>
        <SectionHeader
          eyebrow="Historial"
          title={isFiltering ? 'Sin turnos para este filtro' : 'Sin turnos cerrados'}
        />
        <View
          style={{
            backgroundColor: surface.card,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: hairline.onPaper,
            padding: 24,
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(11,14,18,0.05)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={isFiltering ? 'funnel-outline' : 'hourglass-outline'}
              size={18}
              color={text.onPaper.primary}
            />
          </View>
          <Text
            style={{
              color: text.onPaper.primary,
              fontSize: 14,
              fontWeight: '800',
              letterSpacing: -0.2,
            }}
          >
            {isFiltering ? 'Nada que mostrar' : 'Aún no hay actividad'}
          </Text>
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 12,
              textAlign: 'center',
              maxWidth: 240,
              lineHeight: 17,
            }}
          >
            {isFiltering
              ? 'Cambia el filtro para ver turnos de otra persona.'
              : 'En cuanto alguien cierre su turno, lo verás aquí agrupado por día.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 28 }}>
      <SectionHeader
        eyebrow="Historial"
        title={
          groups.length === 1
            ? 'Último día con turnos'
            : `Últimos ${groups.length} días`
        }
      />
      {groups.map((g) => (
        <DayGroupBlock key={g.key} group={g} />
      ))}
    </View>
  );
});

const DayGroupBlock = React.memo(function DayGroupBlock({
  group,
}: {
  group: DayGroup;
}) {
  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 4,
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 9,
              fontWeight: '900',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            {group.eyebrow}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.primary,
              fontSize: 18,
              fontWeight: '800',
              letterSpacing: -0.5,
              marginTop: 4,
            }}
          >
            {group.title}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(11,14,18,0.05)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Ionicons
              name="time-outline"
              size={11}
              color={text.onPaper.primary}
            />
            <Text
              style={{
                color: text.onPaper.primary,
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 0.4,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatMinutes(group.totalMinutes)}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(11,14,18,0.05)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Ionicons
              name="people-outline"
              size={11}
              color={text.onPaper.primary}
            />
            <Text
              style={{
                color: text.onPaper.primary,
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 0.4,
                fontVariant: ['tabular-nums'],
              }}
            >
              {group.shiftCount}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          backgroundColor: surface.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: hairline.onPaper,
          overflow: 'hidden',
          paddingVertical: 4,
        }}
      >
        {group.shifts.map((s, idx) => (
          <ShiftHistoryRow
            key={s.id}
            shift={s}
            isFirst={idx === 0}
          />
        ))}
      </View>
    </View>
  );
});

const ShiftHistoryRow = React.memo(function ShiftHistoryRow({
  shift,
  isFirst,
}: {
  shift: ShiftLog;
  isFirst: boolean;
}) {
  const fullName = shift.staffProfile?.fullName ?? 'Empleado';
  const areaName = shift.area?.name;
  const initials = staffInitials(fullName);

  const inLabel = formatTime(shift.clockInAt);
  const outLabel = shift.clockOutAt ? formatTime(shift.clockOutAt) : '—';

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderTopWidth: isFirst ? 0 : 1,
        borderTopColor: hairline.onPaperSoft,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: 'rgba(11,14,18,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: text.onPaper.primary,
            fontSize: 11,
            fontWeight: '900',
            letterSpacing: -0.2,
          }}
        >
          {initials}
        </Text>
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <Text
          numberOfLines={1}
          style={{
            color: text.onPaper.primary,
            fontSize: 14,
            fontWeight: '800',
            letterSpacing: -0.2,
          }}
        >
          {fullName}
        </Text>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 0.8,
              fontVariant: ['tabular-nums'],
            }}
          >
            {inLabel}
          </Text>
          <View
            style={{
              width: 12,
              height: 1,
              backgroundColor: hairline.onPaperStrong,
            }}
          />
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 0.8,
              fontVariant: ['tabular-nums'],
            }}
          >
            {outLabel}
          </Text>
          {areaName ? (
            <>
              <View
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: 1.5,
                  backgroundColor: text.onPaper.subtle,
                }}
              />
              <Text
                numberOfLines={1}
                style={{
                  color: text.onPaper.muted,
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 0.4,
                  flexShrink: 1,
                }}
              >
                {areaName}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: 11,
          paddingVertical: 6,
          borderRadius: radius.pill,
          backgroundColor: withAlpha(palette.forest, 0.12),
        }}
      >
        <Text
          style={{
            color: palette.forestDeep,
            fontSize: 12,
            fontWeight: '900',
            letterSpacing: -0.2,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatMinutes(shift.totalMinutes)}
        </Text>
      </View>
    </View>
  );
});

// ── Leaderboard semanal ──────────────────────────────────────────────

const LeaderboardBlock = React.memo(function LeaderboardBlock({
  entries,
}: {
  entries: LeaderboardEntry[];
}) {
  const topMinutes = entries[0]?.totalMinutes ?? 0;

  return (
    <View style={{ gap: 14 }}>
      <SectionHeader
        eyebrow="Últimos 7 días"
        title="Quién ha trabajado más"
        trailing={entries.length === 1 ? '1 persona' : `${entries.length} top`}
      />

      <View
        style={{
          backgroundColor: surface.card,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: hairline.onPaper,
          overflow: 'hidden',
        }}
      >
        {entries.map((entry, idx) => (
          <LeaderboardRow
            key={entry.staffProfileId}
            entry={entry}
            rank={idx + 1}
            topMinutes={topMinutes}
            isFirst={idx === 0}
          />
        ))}
      </View>
    </View>
  );
});

function LeaderboardRow({
  entry,
  rank,
  topMinutes,
  isFirst,
}: {
  entry: LeaderboardEntry;
  rank: number;
  topMinutes: number;
  isFirst: boolean;
}) {
  const initials = staffInitials(entry.fullName);
  const ratio =
    topMinutes > 0 ? Math.min(1, entry.totalMinutes / topMinutes) : 0;
  const isLeader = rank === 1;

  // Tonos: 1° forest, 2° sage, otros neutros.
  const accent =
    rank === 1
      ? palette.forestDeep
      : rank === 2
      ? palette.forest
      : palette.steelDeep;
  const barColor =
    rank === 1
      ? withAlpha(palette.forest, 0.85)
      : rank === 2
      ? withAlpha(palette.forest, 0.55)
      : withAlpha(palette.steel, 0.4);

  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderTopWidth: isFirst ? 0 : 1,
        borderTopColor: hairline.onPaperSoft,
        gap: 10,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Rank pill */}
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: isLeader
              ? withAlpha(palette.forest, 0.16)
              : 'rgba(11,14,18,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: isLeader ? palette.forestDeep : text.onPaper.primary,
              fontSize: 11,
              fontWeight: '900',
              letterSpacing: -0.2,
            }}
          >
            {rank}
          </Text>
        </View>

        {/* Avatar */}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isLeader
              ? withAlpha(palette.forest, 0.14)
              : 'rgba(11,14,18,0.06)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: isLeader ? palette.forestDeep : text.onPaper.primary,
              fontSize: 11,
              fontWeight: '900',
              letterSpacing: -0.2,
            }}
          >
            {initials}
          </Text>
        </View>

        {/* Nombre + meta */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              numberOfLines={1}
              style={{
                color: text.onPaper.primary,
                fontSize: 13,
                fontWeight: '800',
                letterSpacing: -0.2,
                flexShrink: 1,
              }}
            >
              {entry.fullName}
            </Text>
            {isLeader ? (
              <Ionicons
                name="trophy"
                size={11}
                color={palette.amber}
              />
            ) : null}
          </View>
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.muted,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginTop: 2,
              fontVariant: ['tabular-nums'],
            }}
          >
            {entry.shiftCount}{' '}
            {entry.shiftCount === 1 ? 'turno' : 'turnos'}
          </Text>
        </View>

        {/* Total horas */}
        <Text
          style={{
            color: accent,
            fontSize: 14,
            fontWeight: '900',
            letterSpacing: -0.3,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatMinutes(entry.totalMinutes)}
        </Text>
      </View>

      {/* Barra proporcional */}
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: 'rgba(11,14,18,0.06)',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.max(6, ratio * 100)}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: 2,
          }}
        />
      </View>
    </View>
  );
}

// ── Filtro por empleado (chips horizontales) ─────────────────────────

const FilterBar = React.memo(function FilterBar({
  options,
  selected,
  onSelect,
}: {
  options: FilterOption[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const totalShifts = options.reduce((acc, o) => acc + o.count, 0);

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 4,
          gap: 8,
        }}
      >
        <Ionicons
          name="funnel-outline"
          size={12}
          color={text.onPaper.muted}
        />
        <Text
          style={{
            color: text.onPaper.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.8,
            textTransform: 'uppercase',
          }}
        >
          Filtrar por persona
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingHorizontal: 4 }}
      >
        <FilterChip
          label="Todos"
          count={totalShifts}
          isSelected={selected === 'ALL'}
          onPress={() => onSelect('ALL')}
        />
        {options.map((opt) => (
          <FilterChip
            key={opt.staffProfileId}
            label={opt.fullName}
            count={opt.count}
            isSelected={selected === opt.staffProfileId}
            onPress={() => onSelect(opt.staffProfileId)}
          />
        ))}
      </ScrollView>
    </View>
  );
});

function FilterChip({
  label,
  count,
  isSelected,
  onPress,
}: {
  label: string;
  count: number;
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
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: radius.pill,
        backgroundColor: isSelected ? surface.ink : surface.card,
        borderWidth: 1,
        borderColor: isSelected
          ? withAlpha(palette.ink, 0.85)
          : hairline.onPaper,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: isSelected ? text.onInk.primary : text.onPaper.primary,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: -0.1,
          maxWidth: 140,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          minWidth: 20,
          paddingHorizontal: 6,
          height: 18,
          borderRadius: 9,
          backgroundColor: isSelected
            ? withAlpha(palette.paper, 0.16)
            : 'rgba(11,14,18,0.06)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: isSelected ? palette.paper : text.onPaper.primary,
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: -0.1,
            fontVariant: ['tabular-nums'],
          }}
        >
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: palette.forest,
              }}
            />
            <Text
              style={{
                color: palette.forestDeep,
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              {trailing}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        style={{
          color: text.onPaper.primary,
          fontSize: 22,
          fontWeight: '800',
          letterSpacing: -0.8,
          marginTop: 4,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

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
        Solo los administradores y supervisores pueden ver la asistencia
        completa del equipo. Habla con tu encargado si necesitas registrar
        tu hora de entrada.
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
