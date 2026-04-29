import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
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
import { getRoleLabel } from '@/lib/home-greeting';
import { STAGE_ACCENTS } from '@/lib/stage-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittDetailHero } from '@/components/business-detail/VrittDetailHero';
import {
  VrittDetailBento,
  type DetailMetric,
} from '@/components/business-detail/VrittDetailBento';
import {
  VrittDetailModuleGrid,
  type DetailModule,
} from '@/components/business-detail/VrittDetailModuleGrid';
import {
  VrittDetailInfo,
  type DetailFact,
} from '@/components/business-detail/VrittDetailInfo';
import { VrittDetailPending } from '@/components/business-detail/VrittDetailPending';
import { surface } from '@/constants/design-tokens';

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
  const stepCode = moment?.stepCode ?? 'FAI · 1 de 5';

  const activeStaffCount = staff.filter((s) => s.status === 'ACTIVE').length;

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
        variant: 'ink',
        onPress: () => router.push(`${base}/sales/analytics` as never),
      });
    } else {
      out.push({
        key: 'chain-hero',
        label: 'Cadena del día',
        value: dailySales ? `${dailySales.saleCount} tickets` : stageLabel,
        hint: stepCode,
        icon: 'layers-outline',
        variant: 'ink',
        onPress: () => router.push(`${base}/daily-chain` as never),
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
    out.push({
      key: 'shifts',
      label: canStaff ? 'Turnos' : 'Mi asistencia',
      value: 'Abrir',
      hint: canStaff ? 'Entradas / salidas' : 'Tu jornada',
      icon: 'time-outline',
      variant: 'paper',
      onPress: () => router.push(`${base}/shifts` as never),
    });

    return out;
  }, [
    business,
    canFinance,
    canStaff,
    canPayroll,
    dailySales,
    stageLabel,
    stepCode,
    activeStaffCount,
    upcomingPayrollTotal,
    inventoryStats,
  ]);

  const operationModules: DetailModule[] = useMemo(() => {
    if (!business) return [];
    const base = `/businesses/${business.id}`;
    const list: DetailModule[] = [
      {
        key: 'sales',
        label: canFinance ? 'Ventas' : 'Registrar venta',
        icon: 'cart-outline',
        onPress: () =>
          router.push(
            canFinance
              ? (`${base}/sales` as never)
              : (`${base}/sales/create` as never),
          ),
      },
      {
        key: 'inventory',
        label: 'Inventario',
        icon: 'cube-outline',
        onPress: () => router.push(`${base}/inventory` as never),
      },
      {
        key: 'receipts',
        label: 'Recepciones',
        icon: 'archive-outline',
        onPress: () => router.push(`${base}/receipts` as never),
      },
    ];

    if (canStaff) {
      list.push({
        key: 'staff',
        label: 'Equipo',
        icon: 'people-outline',
        onPress: () => router.push(`${base}/staff` as never),
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
      );
    }
    if (canConfig) {
      list.push({
        key: 'processes',
        label: 'Procesos',
        icon: 'git-network-outline',
        onPress: () => router.push(`${base}/processes` as never),
      });
    }
    list.push({
      key: 'shifts',
      label: 'Asistencia',
      icon: 'time-outline',
      onPress: () => router.push(`${base}/shifts` as never),
    });
    list.push({
      key: 'chat',
      label: 'Chat',
      icon: 'sparkles-outline',
      onPress: () => router.push(`${base}/chat` as never),
    });
    return list;
  }, [business, canFinance, canStaff, canSupply, canConfig]);

  const configModules: DetailModule[] = useMemo(() => {
    if (!business || !canConfig) return [];
    const base = `/businesses/${business.id}`;
    return [
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
      {
        key: 'supplier-invoices',
        label: 'Facturas',
        icon: 'receipt-outline',
        onPress: () => router.push(`${base}/supplier-invoices` as never),
      },
    ];
  }, [business, canConfig]);

  const facts: DetailFact[] = useMemo(() => {
    if (!business) return [];
    return [
      {
        key: 'timezone',
        label: 'Zona horaria',
        value: business.timezone,
      },
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

  const onboardingPercent = onboarding.completionPercentage;

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="light-content" backgroundColor={surface.ink} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={surface.ink}
          />
        }
      >
        <VrittDetailHero
          name={business.name}
          businessType={business.businessType}
          role={role}
          roleLabel={getRoleLabel(role)}
          tone={tone}
          stageLabel={stageLabel}
          stepCode={stepCode}
          city={business.city}
          state={business.state}
          description={business.description}
          onboardingPercent={onboardingPercent}
          onBack={() => router.back()}
          onOpenChain={() =>
            router.push(`/businesses/${business.id}/daily-chain` as never)
          }
        />

        {/* Drawer que sube sobre el hero con esquinas redondeadas */}
        <View
          style={{
            backgroundColor: surface.paper,
            marginTop: -28,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 22,
            paddingHorizontal: 18,
            gap: 22,
            minHeight: 500,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 44,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(11,14,18,0.1)',
              marginBottom: 4,
            }}
          />

          <VrittDetailBento metrics={metrics} />

          <VrittDetailPending
            steps={pendingSteps}
            onStart={() =>
              router.push(`/businesses/${business.id}/daily-chain` as never)
            }
          />

          <VrittDetailModuleGrid
            eyebrow="Operación"
            title="Módulos del negocio"
            modules={operationModules}
          />

          {configModules.length > 0 ? (
            <VrittDetailModuleGrid
              eyebrow="Configuración"
              title="Ajustes del espacio"
              modules={configModules}
            />
          ) : null}

          <VrittDetailInfo
            eyebrow="Detalles"
            title="Información del espacio"
            facts={facts}
          />
        </View>
      </ScrollView>
    </View>
  );
}

