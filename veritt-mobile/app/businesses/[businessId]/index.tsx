import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { businessesApi } from '@/api/modules/businesses.api';
import { staffApi } from '@/api/modules/staff.api';
import { payrollApi } from '@/api/modules/payroll.api';
import { inventoryApi } from '@/api/modules/inventory.api';
import { salesApi } from '@/api/modules/sales.api';
import { dailyChainApi } from '@/api/modules/daily-chain.api';
import {
  Business,
  BusinessOnboarding,
  MembershipRole,
} from '@/types/business.types';
import type { DailyChainStatus } from '@/types/daily-chain.types';
import type { DailySaleSummary } from '@/types/sale.types';
import { StaffProfile } from '@/types/staff.types';
import { getApiErrorMessage } from '@/utils/error.utils';
import { formatCurrency } from '@/lib/staff-formatters';
import { permissions } from '@/lib/role-permissions';
import { getPendingOnboardingSteps } from '@/lib/business-onboarding';
import {
  getDailyChainMoment,
  type ChainTone,
} from '@/lib/daily-chain-home';
import { MANAGER_ROLES } from '@/types/business.types';
import { STAGE_ACCENTS } from '@/lib/stage-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittDetailHeader } from '@/components/business-detail/VrittDetailHeader';
import { VrittDetailAction } from '@/components/business-detail/VrittDetailAction';
import {
  VrittQuickModules,
  type QuickModule,
} from '@/components/business-detail/VrittQuickModules';
import {
  VrittDetailBento,
  type DetailMetric,
} from '@/components/business-detail/VrittDetailBento';
import {
  VrittDetailInfo,
  type DetailFact,
} from '@/components/business-detail/VrittDetailInfo';
import { VrittDetailPending } from '@/components/business-detail/VrittDetailPending';
import { surface, text } from '@/constants/design-tokens';

export default function BusinessDetailScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const [business, setBusiness] = useState<Business | null>(null);
  const [onboarding, setOnboarding] = useState<BusinessOnboarding | null>(null);
  const [chain, setChain] = useState<DailyChainStatus | null>(null);
  const [dailySales, setDailySales] = useState<DailySaleSummary | null>(null);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [upcomingPayrollTotal, setUpcomingPayrollTotal] = useState<number>(0);
  const [inventoryStats, setInventoryStats] = useState({
    locations: 0,
    materials: 0,
    products: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const role: MembershipRole | null = business?.userRole ?? null;
  const isManager =
    !!role && (MANAGER_ROLES as MembershipRole[]).includes(role);
  const canFinance = permissions.canSeeFinance(role);
  const canStaff = permissions.canManageStaff(role);
  const canPayroll = permissions.canSeePayroll(role);
  const canConfig = permissions.canAccessConfig(role);
  const canSupply = permissions.canManageSupply(role);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadAll = useCallback(async () => {
    if (!businessId) return;

    const base = await Promise.all([
      businessesApi.getMine().catch(() => []),
      businessesApi.getOnboarding(businessId).catch(() => null),
      dailyChainApi.getStatus(businessId).catch(() => null),
      inventoryApi.listLocations(businessId).catch(() => []),
      inventoryApi.listMaterials(businessId).catch(() => []),
      inventoryApi.listProducts(businessId).catch(() => []),
    ]);

    const [
      businessesList,
      onboardingData,
      chainData,
      locationData,
      materialData,
      productData,
    ] = base;

    const foundBusiness =
      businessesList.find((item) => item.id === businessId) ?? null;
    const roleForScoped = foundBusiness?.userRole ?? null;
    const canFin = permissions.canSeeFinance(roleForScoped);
    const canSt = permissions.canManageStaff(roleForScoped);
    const canPay = permissions.canSeePayroll(roleForScoped);

    const [salesData, staffData, payrollData] = await Promise.all([
      canFin
        ? salesApi.getDailySummary(businessId, today).catch(() => null)
        : Promise.resolve(null),
      canSt
        ? staffApi.getByBusinessId(businessId).catch(() => [])
        : Promise.resolve([]),
      canPay
        ? payrollApi.getUpcoming(businessId).catch(() => null)
        : Promise.resolve(null),
    ]);

    const payrollTotal = payrollData
      ? [
          ...(payrollData.overdue ?? []),
          ...(payrollData.dueToday ?? []),
          ...(payrollData.upcoming ?? []),
        ].reduce((sum, p) => {
          const amount =
            typeof p.amount === 'string' ? parseFloat(p.amount) : p.amount || 0;
          return sum + amount;
        }, 0)
      : 0;

    setBusiness(foundBusiness);
    setOnboarding(onboardingData);
    setChain(chainData);
    setDailySales(salesData);
    setStaff(staffData);
    setUpcomingPayrollTotal(payrollTotal);
    setInventoryStats({
      locations: locationData.length,
      materials: materialData.length,
      products: productData.length,
    });
  }, [businessId, today]);

  useEffect(() => {
    setIsLoading(true);
    loadAll()
      .catch((err) =>
        Alert.alert(
          'Error',
          getApiErrorMessage(err, 'No pudimos cargar el negocio.'),
        ),
      )
      .finally(() => setIsLoading(false));
  }, [loadAll]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAll().catch(() => {});
    setIsRefreshing(false);
  }, [loadAll]);

  const moment = useMemo(
    () =>
      business ? getDailyChainMoment(business.id, chain, isManager) : null,
    [business, chain, isManager],
  );

  const pendingSteps = useMemo(
    () => (onboarding ? getPendingOnboardingSteps(onboarding) : []),
    [onboarding],
  );

  const tone: ChainTone = moment?.tone ?? 'start';
  const stageLabel = STAGE_ACCENTS[tone].label;

  const activeStaffCount = staff.filter((s) => s.status === 'ACTIVE').length;

  // ── Quick modules: accesos grandes siempre visibles ────────────────
  const quickModules: QuickModule[] = useMemo(() => {
    if (!business) return [];
    const base = `/businesses/${business.id}`;
    const list: QuickModule[] = [];

    // El primero siempre es el "golden path" del rol.
    list.push({
      key: 'sales',
      label: canFinance ? 'Ventas' : 'Vender',
      icon: canFinance ? 'cart-outline' : 'add-circle-outline',
      highlight: !canFinance, // operador ve el CTA destacado
      onPress: () =>
        router.push(
          canFinance
            ? (`${base}/sales` as never)
            : (`${base}/sales/create` as never),
        ),
    });

    list.push({
      key: 'inventory',
      label: 'Inventario',
      icon: 'cube-outline',
      onPress: () => router.push(`${base}/inventory` as never),
    });

    list.push({
      key: 'receipts',
      label: 'Recepciones',
      icon: 'archive-outline',
      onPress: () => router.push(`${base}/receipts` as never),
    });

    list.push({
      key: 'shifts',
      label: 'Asistencia',
      icon: 'time-outline',
      onPress: () => router.push(`${base}/shifts` as never),
    });

    if (canStaff) {
      list.push({
        key: 'staff',
        label: 'Equipo',
        icon: 'people-outline',
        onPress: () => router.push(`${base}/staff` as never),
      });
    }

    if (canPayroll) {
      list.push({
        key: 'payroll',
        label: 'Nómina',
        icon: 'cash-outline',
        onPress: () => router.push(`${base}/payroll` as never),
      });
    }

    if (canSupply) {
      list.push(
        {
          key: 'suppliers',
          label: 'Proveedores',
          icon: 'business-outline',
          onPress: () => router.push(`${base}/suppliers` as never),
        },
        {
          key: 'pos',
          label: 'Órdenes',
          icon: 'document-text-outline',
          onPress: () => router.push(`${base}/purchase-orders` as never),
        },
        {
          key: 'supplier-invoices',
          label: 'Facturas',
          icon: 'receipt-outline',
          onPress: () => router.push(`${base}/supplier-invoices` as never),
        },
      );
    }

    if (canConfig) {
      list.push(
        {
          key: 'processes',
          label: 'Procesos',
          icon: 'git-network-outline',
          onPress: () => router.push(`${base}/processes` as never),
        },
        {
          key: 'areas',
          label: 'Áreas',
          icon: 'map-outline',
          onPress: () => router.push(`${base}/areas` as never),
        },
        {
          key: 'payment-methods',
          label: 'Pagos',
          icon: 'card-outline',
          onPress: () => router.push(`${base}/payment-methods` as never),
        },
      );
    }

    list.push({
      key: 'chat',
      label: 'Chat IA',
      icon: 'sparkles-outline',
      onPress: () => router.push(`${base}/chat` as never),
    });

    return list;
  }, [business, canFinance, canStaff, canPayroll, canSupply, canConfig]);

  // ── Métricas (compactas, sólo lo que el rol puede ver) ─────────────
  const metrics: DetailMetric[] = useMemo(() => {
    if (!business) return [];
    const base = `/businesses/${business.id}`;
    const out: DetailMetric[] = [];

    if (canFinance) {
      const salesValue = dailySales
        ? formatCurrency(dailySales.totalRevenue)
        : '—';
      out.push({
        key: 'sales-hero',
        label: 'Caja del día',
        value: salesValue,
        hint: dailySales
          ? `${dailySales.saleCount} tickets · prom. ${formatCurrency(
              dailySales.avgTicket,
            )}`
          : 'Aún sin movimientos',
        icon: 'wallet-outline',
        variant: 'paper',
        onPress: () => router.push(`${base}/sales/analytics` as never),
      });
    }

    if (canStaff) {
      out.push({
        key: 'staff',
        label: 'Equipo',
        value: `${activeStaffCount}`,
        hint: activeStaffCount === 1 ? 'persona activa' : 'personas activas',
        icon: 'people-outline',
        variant: 'paper',
        onPress: () => router.push(`${base}/staff` as never),
      });
    }
    if (canPayroll) {
      out.push({
        key: 'payroll',
        label: 'Nómina',
        value: formatCurrency(upcomingPayrollTotal),
        hint: 'próxima',
        icon: 'cash-outline',
        variant: 'paper',
        onPress: () => router.push(`${base}/payroll` as never),
      });
    }
    out.push({
      key: 'inventory',
      label: 'Inventario',
      value: `${inventoryStats.products + inventoryStats.materials}`,
      hint: `${inventoryStats.products} productos · ${inventoryStats.materials} insumos`,
      icon: 'cube-outline',
      variant: 'paper',
      onPress: () => router.push(`${base}/inventory` as never),
    });

    return out;
  }, [
    business,
    canFinance,
    canStaff,
    canPayroll,
    dailySales,
    activeStaffCount,
    upcomingPayrollTotal,
    inventoryStats,
  ]);

  const facts: DetailFact[] = useMemo(() => {
    if (!business) return [];
    return [
      { key: 'timezone', label: 'Zona horaria', value: business.timezone },
      {
        key: 'cutoff',
        label: 'Corte operativo',
        value: `${String(business.operationalDayCutoffHour).padStart(2, '0')}:00 hrs`,
        hint: 'Hora de cierre del día',
      },
      ...(business.createdAt
        ? [
            {
              key: 'createdAt',
              label: 'Creado',
              value: new Date(business.createdAt).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }),
            },
          ]
        : []),
    ];
  }, [business]);

  if (isLoading || !business || !onboarding || !moment) {
    return <VrittLoader />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <VrittDetailHeader
        name={business.name}
        tone={tone}
        stageLabel={stageLabel}
        onBack={() => router.back()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 24,
          paddingBottom: 180,
          gap: 40,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={surface.ink}
          />
        }
      >
        {/* 1. ActionHero: foco del día */}
        <VrittDetailAction
          tone={tone}
          eyebrow={moment.eyebrow}
          title={moment.title}
          description={moment.description}
          ctaLabel={moment.ctaLabel}
          stepCode={moment.stepCode}
          onPress={() => router.push(moment.ctaRoute as never)}
        />

        {/* 2. Módulos accesibles — siempre visibles justo debajo de la acción */}
        <View style={{ gap: 14 }}>
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
                Accesos
              </Text>
              <Text
                style={{
                  color: text.onPaper.subtle,
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                {quickModules.length} módulos
              </Text>
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
              Todo a la mano
            </Text>
          </View>
          <VrittQuickModules modules={quickModules} />
        </View>

        {/* 3. Pending (si aplica) — manager/supervisor verá cómo avanzar */}
        {pendingSteps.length > 0 ? (
          <VrittDetailPending
            steps={pendingSteps}
            onStart={() =>
              router.push(`/businesses/${business.id}/daily-chain` as never)
            }
          />
        ) : null}

        {/* 4. Metrics — datos sintetizados, sólo los del rol */}
        {metrics.length > 0 ? (
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
                Estado del negocio
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
                Cómo va hoy
              </Text>
            </View>
            <VrittDetailBento metrics={metrics} tone={tone} />
          </View>
        ) : null}

        {/* 5. Info del espacio */}
        <VrittDetailInfo
          eyebrow="Detalles"
          title="Información del espacio"
          facts={facts}
        />
      </ScrollView>
    </View>
  );
}
