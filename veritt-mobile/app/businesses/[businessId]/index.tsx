import React, { useCallback, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  View,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';

import { MANAGER_ROLES } from '@/types/business.types';
import { STAGE_ACCENTS } from '@/lib/stage-tokens';
import {
  getDailyChainMoment,
  type ChainTone,
} from '@/lib/daily-chain-home';
import { getPendingOnboardingSteps } from '@/lib/business-onboarding';
import {
  buildDetailFacts,
  buildDetailMetrics,
  buildQuickModules,
} from '@/lib/business-detail-builders';
import { useBusinessDetail } from '@/hooks/useBusinessDetail';
import { surface } from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittDetailHeader } from '@/components/business-detail/VrittDetailHeader';
import { VrittDetailAction } from '@/components/business-detail/VrittDetailAction';
import { VrittQuickModules } from '@/components/business-detail/VrittQuickModules';
import { VrittDetailBento } from '@/components/business-detail/VrittDetailBento';
import { VrittDetailInfo } from '@/components/business-detail/VrittDetailInfo';
import { VrittDetailPending } from '@/components/business-detail/VrittDetailPending';
import { VrittDetailSectionHeader } from '@/components/business-detail/VrittDetailSectionHeader';

export default function BusinessDetailScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const {
    business,
    onboarding,
    chain,
    dailySales,
    activeStaffCount,
    upcomingPayrollTotal,
    inventory,
    role,
    isInitialLoading,
    isRefreshing,
    refresh,
  } = useBusinessDetail(businessId ?? null);

  // Refresca al volver a la pantalla — respeta TTL interno del hook.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // ── Derivados ─────────────────────────────────────────────────────
  const isManager =
    !!role && (MANAGER_ROLES as readonly string[]).includes(role);

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

  // ── Items (puros, memoizables) ─────────────────────────────────────
  const quickModules = useMemo(
    () => (business ? buildQuickModules(business.id, role) : []),
    [business, role],
  );

  const metrics = useMemo(
    () =>
      business
        ? buildDetailMetrics(business.id, role, {
            dailySales,
            activeStaffCount,
            upcomingPayrollTotal,
            inventoryCount: inventory.products + inventory.materials,
            inventoryProducts: inventory.products,
            inventoryMaterials: inventory.materials,
          })
        : [],
    [
      business,
      role,
      dailySales,
      activeStaffCount,
      upcomingPayrollTotal,
      inventory,
    ],
  );

  const facts = useMemo(
    () => (business ? buildDetailFacts(business) : []),
    [business],
  );

  // ── Handlers estables ─────────────────────────────────────────────
  const onNavigate = useCallback((route: string) => {
    router.push(route as never);
  }, []);

  const onBack = useCallback(() => {
    router.back();
  }, []);

  const onPressAction = useCallback(() => {
    if (moment) router.push(moment.ctaRoute as never);
  }, [moment]);

  const onPressPending = useCallback(() => {
    if (business) {
      router.push(`/businesses/${business.id}/daily-chain` as never);
    }
  }, [business]);

  // ── Render ─────────────────────────────────────────────────────────

  if (isInitialLoading || !business || !onboarding || !moment) {
    return <VrittLoader />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <VrittDetailHeader
        name={business.name}
        tone={tone}
        stageLabel={stageLabel}
        onBack={onBack}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={surface.ink}
          />
        }
      >
        <VrittDetailAction
          tone={tone}
          eyebrow={moment.eyebrow}
          title={moment.title}
          description={moment.description}
          ctaLabel={moment.ctaLabel}
          stepCode={moment.stepCode}
          onPress={onPressAction}
        />

        <View style={sectionGap}>
          <VrittDetailSectionHeader
            eyebrow="Accesos"
            title="Todo a la mano"
            trailing={`${quickModules.length} módulos`}
          />
          <VrittQuickModules
            items={quickModules}
            onNavigate={onNavigate}
          />
        </View>

        {pendingSteps.length > 0 ? (
          <VrittDetailPending
            steps={pendingSteps}
            onStart={onPressPending}
          />
        ) : null}

        {metrics.length > 0 ? (
          <View style={sectionGap}>
            <VrittDetailSectionHeader
              eyebrow="Estado del negocio"
              title="Cómo va hoy"
            />
            <VrittDetailBento
              items={metrics}
              tone={tone}
              onNavigate={onNavigate}
            />
          </View>
        ) : null}

        <VrittDetailInfo
          eyebrow="Detalles"
          title="Información del espacio"
          facts={facts}
        />
      </ScrollView>
    </View>
  );
}

// Estilos constantes fuera del render — no se recrean.
const scrollContent = {
  paddingHorizontal: 18,
  paddingTop: 24,
  paddingBottom: 180,
  gap: 40,
};

const sectionGap = { gap: 14 };
