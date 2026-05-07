import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { businessesApi } from '@/api/modules/businesses.api';
import { receiptsApi } from '@/api/modules/receipts.api';
import { useBusinessStore } from '@/store/business.store';
import { permissions } from '@/lib/role-permissions';
import { notify } from '@/lib/notify';
import { getApiErrorMessage } from '@/utils/error.utils';
import { formatInventoryCurrency } from '@/lib/inventory-formatters';
import {
  calcReceiptTotal,
  dayHeaderLabel,
  receiptDayKey,
} from '@/lib/receipts-formatters';
import type { Business } from '@/types/business.types';
import type { Receipt } from '@/types/receipt.types';
import {
  palette,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittInventoryHeader } from '@/components/inventory/VrittInventoryHeader';
import { VrittInventoryHero } from '@/components/inventory/VrittInventoryHero';
import { VrittInventorySectionHeader } from '@/components/inventory/VrittInventorySectionHeader';
import { VrittInventoryEmpty } from '@/components/inventory/VrittInventoryEmpty';
import { VrittReceiptRow } from '@/components/receipts/VrittReceiptRow';

// ── Tipos auxiliares ────────────────────────────────────────────────

interface DayGroup {
  key: string;
  eyebrow: string;
  title: string;
  receipts: Receipt[];
  total: number;
  itemCount: number;
}

// ── Pantalla ────────────────────────────────────────────────────────

export default function ReceiptsScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const role = useBusinessStore((s) =>
    businessId ? s.getRole(businessId) : null,
  );
  const canCreate = permissions.canManageSupply(role);

  const [business, setBusiness] = useState<Business | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    if (!businessId) return;
    try {
      const [businessData, receiptData] = await Promise.all([
        businessesApi.getById(businessId),
        receiptsApi.list(businessId),
      ]);
      setBusiness(businessData);
      setReceipts(receiptData);
    } catch (err) {
      notify.error(
        'No pudimos cargar las recepciones',
        getApiErrorMessage(err, 'Verifica tu conexión.'),
      );
    }
  }, [businessId]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadAll().finally(() => setIsLoading(false));
    }, [loadAll]),
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAll();
    setIsRefreshing(false);
  }, [loadAll]);

  // ── Derivados ─────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const todayKey = receiptDayKey(new Date().toISOString());
    let totalToday = 0;
    let countToday = 0;
    let cancelledCount = 0;
    let valueAllTime = 0;

    for (const r of receipts) {
      const total = calcReceiptTotal(r.items ?? []);
      if (r.status === 'CANCELLED') {
        cancelledCount += 1;
        continue;
      }
      valueAllTime += total;
      if (r.receivedAt && receiptDayKey(r.receivedAt) === todayKey) {
        totalToday += total;
        countToday += 1;
      }
    }

    return {
      totalToday,
      countToday,
      cancelledCount,
      valueAllTime,
      total: receipts.length,
    };
  }, [receipts]);

  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, Receipt[]>();
    for (const r of receipts) {
      if (!r.receivedAt) continue;
      const k = receiptDayKey(r.receivedAt);
      const list = map.get(k) ?? [];
      list.push(r);
      map.set(k, list);
    }
    const out: DayGroup[] = [];
    for (const [key, list] of map.entries()) {
      const sorted = [...list].sort(
        (a, b) =>
          new Date(b.receivedAt ?? 0).getTime() -
          new Date(a.receivedAt ?? 0).getTime(),
      );
      const itemCount = sorted.reduce(
        (acc, r) => acc + (r.items?.length ?? 0),
        0,
      );
      const total = sorted
        .filter((r) => r.status !== 'CANCELLED')
        .reduce((acc, r) => acc + calcReceiptTotal(r.items ?? []), 0);
      const labels = dayHeaderLabel(key);
      out.push({
        key,
        eyebrow: labels.eyebrow,
        title: labels.title,
        receipts: sorted,
        total,
        itemCount,
      });
    }
    return out.sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [receipts]);

  // ── Handlers ──────────────────────────────────────────────────────

  const onBack = useCallback(() => router.back(), []);

  const goToCreate = useCallback(() => {
    if (businessId)
      router.push(`/businesses/${businessId}/receipts/create`);
  }, [businessId]);

  const onOpen = useCallback(
    (receiptId: string) => {
      if (businessId)
        router.push(`/businesses/${businessId}/receipts/${receiptId}`);
    },
    [businessId],
  );

  // ── Render ────────────────────────────────────────────────────────

  if (isLoading && receipts.length === 0) return <VrittLoader />;

  const currency = business?.defaultCurrency || 'MXN';

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <VrittInventoryHeader
        eyebrow={business?.name ?? 'Negocio'}
        title="Recepciones"
        onBack={onBack}
        rightAction={
          canCreate
            ? { label: 'Nueva', icon: 'add', onPress: goToCreate }
            : undefined
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 32,
          paddingBottom: 240,
          gap: 44,
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
        <VrittInventoryHero
          eyebrow="Hoy"
          primaryValue={formatInventoryCurrency(summary.totalToday, currency)}
          primaryLabel={
            summary.countToday === 0
              ? 'sin recepciones todavía'
              : summary.countToday === 1
              ? '1 recepción registrada hoy'
              : `${summary.countToday} recepciones registradas`
          }
          tone={summary.cancelledCount > 0 ? 'warning' : 'neutral'}
          metrics={[
            {
              label: 'Total registradas',
              value: String(summary.total),
            },
            {
              label: 'Valor histórico',
              value: formatInventoryCurrency(
                summary.valueAllTime,
                currency,
              ),
            },
            {
              label: 'Canceladas',
              value: String(summary.cancelledCount),
              tone:
                summary.cancelledCount > 0 ? 'warning' : 'neutral',
            },
          ]}
        />

        {receipts.length === 0 ? (
          <VrittInventoryEmpty
            icon="archive-outline"
            title="Aún no hay recepciones"
            description={
              canCreate
                ? 'Registra una recepción cuando llegue mercancía de un proveedor para acumular stock real.'
                : 'Aún no se han registrado recepciones. Pide a un administrador que las registre.'
            }
            actionLabel={canCreate ? 'Registrar recepción' : undefined}
            onAction={canCreate ? goToCreate : undefined}
          />
        ) : (
          <View style={{ gap: 36 }}>
            <VrittInventorySectionHeader
              eyebrow="Historial"
              title={
                groups.length === 1
                  ? 'Último día con movimientos'
                  : `Últimos ${groups.length} días`
              }
              trailing={`${receipts.length} ${
                receipts.length === 1 ? 'recepción' : 'recepciones'
              }`}
            />

            {groups.map((g) => (
              <DayGroupBlock
                key={g.key}
                group={g}
                currency={currency}
                onOpen={onOpen}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Day group ─────────────────────────────────────────────────────

const DayGroupBlock = React.memo(function DayGroupBlock({
  group,
  currency,
  onOpen,
}: {
  group: DayGroup;
  currency: string;
  onOpen: (receiptId: string) => void;
}) {
  return (
    <View style={{ gap: 18 }}>
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

        <Pill icon="archive-outline" label={`${group.receipts.length}`} />
        <Pill
          icon="cash-outline"
          label={formatInventoryCurrency(group.total, currency)}
        />
      </View>

      <View style={{ gap: 14 }}>
        {group.receipts.map((r) => (
          <VrittReceiptRow
            key={r.id}
            receipt={r}
            currency={currency}
            onPress={onOpen}
          />
        ))}
      </View>
    </View>
  );
});

function Pill({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
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
      <Ionicons name={icon} size={11} color={text.onPaper.primary} />
      <Text
        style={{
          color: palette.ink,
          fontSize: 10,
          fontWeight: '900',
          letterSpacing: 0.4,
          fontVariant: ['tabular-nums'],
        }}
      >
        {label}
      </Text>
    </View>
  );
}
