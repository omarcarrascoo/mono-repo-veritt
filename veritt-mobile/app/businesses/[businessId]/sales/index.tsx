import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
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

import { salesApi } from '@/api/modules/sales.api';
import type { Sale, DailySaleSummary } from '@/types/sale.types';
import { useBusinessStore } from '@/store/business.store';
import { permissions } from '@/lib/role-permissions';
import { formatCurrency } from '@/lib/staff-formatters';
import { getApiErrorMessage } from '@/utils/error.utils';
import {
  hairline,
  palette,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittSaleRow } from '@/components/sales/VrittSaleRow';

export default function SalesScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const role = useBusinessStore((s) =>
    businessId ? s.getRole(businessId) : null,
  );
  const canFinance = permissions.canSeeFinance(role);

  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<DailySaleSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const loadData = useCallback(async () => {
    if (!businessId) return;
    try {
      const [salesResult, summaryResult] = await Promise.allSettled([
        salesApi.list(businessId, { from: today, to: today }),
        canFinance
          ? salesApi.getDailySummary(businessId, today)
          : Promise.resolve(null),
      ]);

      if (salesResult.status === 'fulfilled') setSales(salesResult.value);
      if (summaryResult.status === 'fulfilled')
        setSummary(summaryResult.value);
    } catch (err) {
      Alert.alert(
        'Error',
        getApiErrorMessage(err, 'No pudimos cargar las ventas.'),
      );
    }
  }, [businessId, today, canFinance]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadData().finally(() => setIsLoading(false));
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const onBack = useCallback(() => router.back(), []);
  const onCreate = useCallback(() => {
    if (businessId) router.push(`/businesses/${businessId}/sales/create`);
  }, [businessId]);
  const onAnalytics = useCallback(() => {
    if (businessId)
      router.push(`/businesses/${businessId}/sales/analytics` as never);
  }, [businessId]);
  const onOpenSale = useCallback(
    (saleId: string) => {
      if (businessId)
        router.push(`/businesses/${businessId}/sales/${saleId}` as never);
    },
    [businessId],
  );

  // Stats seguros para OPERATOR (calculados del listado propio — sin dinero).
  const ownTicketCount = useMemo(
    () => sales.filter((s) => s.status === 'COMPLETED').length,
    [sales],
  );

  if (isLoading && sales.length === 0) {
    return <VrittLoader />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <Header onBack={onBack} onCreate={onCreate} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: 160,
          gap: 26,
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
        {canFinance && summary ? (
          <ManagerSummary
            summary={summary}
            onAnalytics={onAnalytics}
          />
        ) : (
          <OperatorSummary ticketCount={ownTicketCount} />
        )}

        <SalesList
          sales={sales}
          canFinance={canFinance}
          onOpenSale={onOpenSale}
          onCreate={onCreate}
        />
      </ScrollView>
    </View>
  );
}

// ── Header ───────────────────────────────────────────────────────────

const Header = React.memo(function Header({
  onBack,
  onCreate,
}: {
  onBack: () => void;
  onCreate: () => void;
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
            Registro
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
            Ventas de hoy
          </Text>
        </View>

        <Pressable
          onPress={onCreate}
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
            Nueva
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

// ── Manager summary (revenue + margen + mix) ─────────────────────────

const ManagerSummary = React.memo(function ManagerSummary({
  summary,
  onAnalytics,
}: {
  summary: DailySaleSummary;
  onAnalytics: () => void;
}) {
  const mix = summary.byPaymentMethod ?? [];

  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          borderRadius: radius.lg,
          backgroundColor: surface.ink,
          padding: 22,
          overflow: 'hidden',
        }}
      >
        <Text
          style={{
            color: text.onInk.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.8,
            textTransform: 'uppercase',
          }}
        >
          Caja del día
        </Text>
        <Text
          style={{
            color: palette.paper,
            fontSize: 40,
            fontWeight: '800',
            letterSpacing: -1.8,
            marginTop: 8,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatCurrency(summary.totalRevenue)}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            gap: 16,
            marginTop: 14,
          }}
        >
          <Metric
            label="Tickets"
            value={String(summary.saleCount)}
            inverted
          />
          <Metric
            label="Ticket prom."
            value={formatCurrency(summary.avgTicket)}
            inverted
          />
          <Metric
            label="Margen"
            value={`${Math.round(summary.grossMarginPercent)}%`}
            inverted
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onAnalytics}
          style={{
            marginTop: 18,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: radius.sm + 2,
            borderWidth: 1,
            borderColor: hairline.onInk,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(245,242,234,0.05)',
          }}
        >
          <Text
            style={{
              color: palette.paper,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            Ver analítica
          </Text>
          <Ionicons name="arrow-forward" size={14} color={palette.paper} />
        </TouchableOpacity>
      </View>

      {mix.length > 0 ? (
        <View
          style={{
            backgroundColor: surface.card,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: hairline.onPaper,
            paddingHorizontal: 18,
            paddingVertical: 8,
          }}
        >
          {mix.map((m, idx) => (
            <View
              key={m.paymentMethodId}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: hairline.onPaperSoft,
              }}
            >
              <Text
                style={{
                  color: text.onPaper.primary,
                  fontSize: 13,
                  fontWeight: '700',
                }}
              >
                {m.paymentMethodName}
              </Text>
              <Text
                style={{
                  color: text.onPaper.primary,
                  fontSize: 13,
                  fontWeight: '800',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatCurrency(m.total)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
});

function Metric({
  label,
  value,
  inverted,
}: {
  label: string;
  value: string;
  inverted?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          color: inverted ? text.onInk.muted : text.onPaper.muted,
          fontSize: 9,
          fontWeight: '800',
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          color: inverted ? palette.paper : text.onPaper.primary,
          fontSize: 14,
          fontWeight: '800',
          letterSpacing: -0.3,
          marginTop: 4,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Operator summary (sin dinero) ────────────────────────────────────

const OperatorSummary = React.memo(function OperatorSummary({
  ticketCount,
}: {
  ticketCount: number;
}) {
  return (
    <View
      style={{
        borderRadius: radius.lg,
        backgroundColor: surface.ink,
        padding: 22,
        overflow: 'hidden',
      }}
    >
      <Text
        style={{
          color: text.onInk.muted,
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 1.8,
          textTransform: 'uppercase',
        }}
      >
        Tus ventas de hoy
      </Text>
      <Text
        style={{
          color: palette.paper,
          fontSize: 40,
          fontWeight: '800',
          letterSpacing: -1.8,
          marginTop: 8,
          fontVariant: ['tabular-nums'],
        }}
      >
        {ticketCount === 0 ? 'Sin tickets' : `${ticketCount} tickets`}
      </Text>
      <Text
        style={{
          color: text.onInk.soft,
          fontSize: 13,
          marginTop: 8,
          lineHeight: 18,
          maxWidth: 280,
        }}
      >
        El resumen financiero del día lo ve tu administrador.
      </Text>
    </View>
  );
});

// ── Lista de ventas ──────────────────────────────────────────────────

const SalesList = React.memo(function SalesList({
  sales,
  canFinance,
  onOpenSale,
  onCreate,
}: {
  sales: Sale[];
  canFinance: boolean;
  onOpenSale: (saleId: string) => void;
  onCreate: () => void;
}) {
  if (sales.length === 0) {
    return (
      <View
        style={{
          alignItems: 'center',
          paddingVertical: 40,
          gap: 10,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: 'rgba(11,14,18,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="receipt-outline" size={22} color={text.onPaper.primary} />
        </View>
        <Text
          style={{
            color: text.onPaper.primary,
            fontSize: 16,
            fontWeight: '800',
            letterSpacing: -0.3,
          }}
        >
          Sin ventas hoy
        </Text>
        <Text
          style={{
            color: text.onPaper.muted,
            fontSize: 13,
            textAlign: 'center',
            maxWidth: 240,
            lineHeight: 18,
          }}
        >
          Registra la primera venta del día para empezar a ver actividad aquí.
        </Text>
        <Pressable
          onPress={onCreate}
          style={{
            marginTop: 6,
            paddingVertical: 10,
            paddingHorizontal: 16,
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
            Registrar venta
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={{ paddingHorizontal: 4 }}>
        <Text
          style={{
            color: text.onPaper.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.8,
            textTransform: 'uppercase',
          }}
        >
          {canFinance ? 'Tickets del día' : 'Mis tickets'}
        </Text>
        <Text
          style={{
            color: text.onPaper.primary,
            fontSize: 22,
            fontWeight: '800',
            letterSpacing: -0.8,
            marginTop: 4,
          }}
        >
          {sales.length === 1 ? '1 venta' : `${sales.length} ventas`}
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        {sales.map((s) => (
          <VrittSaleRow key={s.id} sale={s} onPress={onOpenSale} />
        ))}
      </View>
    </View>
  );
});
