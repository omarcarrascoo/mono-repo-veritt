import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StatusBar } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { useAuthStore } from '@/store/auth.store';
import { useBusinessStore } from '@/store/business.store';
import { useActiveBusiness } from '@/hooks/useActiveBusiness';
import { useHomeData } from '@/hooks/useHomeData';

import { MANAGER_ROLES } from '@/types/business.types';
import {
  getDailyChainMoment,
  getOperationalDateLabel,
  getSemaphoreSteps,
  getStageNumber,
} from '@/lib/daily-chain-home';
import {
  getFirstName,
  getGreeting,
  getRoleLabel,
} from '@/lib/home-greeting';
import {
  buildBento,
  buildConfigModules,
  buildNextMoves,
  buildOperationModules,
  buildTimeline,
} from '@/lib/home-builders';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittBusinessSwitcher } from '@/components/home/VrittBusinessSwitcher';
import { VrittGreetingHeader } from '@/components/home/VrittGreetingHeader';
import { VrittActiveBusinessPill } from '@/components/home/VrittActiveBusinessPill';
import { VrittHomeEmptyState } from '@/components/home/VrittHomeEmptyState';
import { VrittStageSection } from '@/components/home/sections/VrittStageSection';
import { VrittBentoSection } from '@/components/home/sections/VrittBentoSection';
import { VrittNextMoveSection } from '@/components/home/sections/VrittNextMoveSection';
import { VrittModulesSection } from '@/components/home/sections/VrittModulesSection';
import { VrittDayTimeline } from '@/components/home/VrittDayTimeline';
import { surface } from '@/constants/design-tokens';

const PAPER_BG = surface.paper;

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);

  const businesses = useBusinessStore((state) => state.businesses);
  const isLoaded = useBusinessStore((state) => state.isLoaded);
  const loadBusinesses = useBusinessStore((state) => state.loadBusinesses);
  const setChainTone = useBusinessStore((state) => state.setChainTone);

  const activeBusiness = useActiveBusiness();
  const userRole = activeBusiness?.userRole ?? null;
  const isManager = !!userRole && MANAGER_ROLES.includes(userRole);

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  useEffect(() => {
    if (!isLoaded) loadBusinesses();
  }, [isLoaded, loadBusinesses]);

  const {
    chain,
    dailySales,
    activeStaffCount,
    upcomingPayrollTotal,
    isInitialLoading,
    refresh,
  } = useHomeData(activeBusiness?.id ?? null);

  // Refresco al volver al Home (usa TTL de la caché internamente).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const moment = useMemo(
    () =>
      activeBusiness
        ? getDailyChainMoment(activeBusiness.id, chain, isManager)
        : null,
    [activeBusiness, chain, isManager],
  );

  useEffect(() => {
    if (activeBusiness?.id && moment) {
      setChainTone(activeBusiness.id, moment.tone);
    }
  }, [activeBusiness?.id, moment?.tone, moment, setChainTone]);

  const semaphoreSteps = useMemo(() => getSemaphoreSteps(chain), [chain]);
  const timelineItems = useMemo(
    () => buildTimeline(chain, dailySales),
    [chain, dailySales],
  );
  const bentoItems = useMemo(
    () =>
      activeBusiness
        ? buildBento(
            activeBusiness.id,
            dailySales,
            upcomingPayrollTotal,
            activeStaffCount,
            userRole,
          )
        : [],
    [
      activeBusiness,
      dailySales,
      upcomingPayrollTotal,
      activeStaffCount,
      userRole,
    ],
  );
  const nextMoves = useMemo(
    () =>
      activeBusiness
        ? buildNextMoves(activeBusiness.id, chain, userRole)
        : [],
    [activeBusiness, chain, userRole],
  );
  const operationModules = useMemo(
    () =>
      activeBusiness
        ? buildOperationModules(activeBusiness.id, userRole)
        : [],
    [activeBusiness, userRole],
  );
  const configModules = useMemo(
    () =>
      activeBusiness ? buildConfigModules(activeBusiness.id, userRole) : [],
    [activeBusiness, userRole],
  );

  const onNavigate = useCallback((route: string) => {
    router.push(route as never);
  }, []);

  const firstName = useMemo(
    () => getFirstName(user?.fullName),
    [user?.fullName],
  );
  const greeting = useMemo(() => getGreeting(), []);
  const roleLabel = useMemo(() => getRoleLabel(userRole), [userRole]);

  const timelineEvents = useMemo(
    () =>
      timelineItems.map((t) => ({
        key: t.key,
        time: '',
        title: t.title,
        detail: t.detail,
        state: t.state,
        icon: t.icon,
      })),
    [timelineItems],
  );

  const handlePressAvatar = useCallback(() => {
    router.push('/(tabs)/profile');
  }, []);
  const handleOpenSwitcher = useCallback(() => setIsSwitcherOpen(true), []);
  const handleCloseSwitcher = useCallback(() => setIsSwitcherOpen(false), []);
  const handleCreateBusiness = useCallback(() => {
    router.push('/businesses/create');
  }, []);
  const handlePressAnalytics = useCallback(() => {
    if (!activeBusiness) return;
    router.push(`/businesses/${activeBusiness.id}/sales/analytics` as never);
  }, [activeBusiness]);
  const handlePressStageCta = useCallback(() => {
    if (moment) router.push(moment.ctaRoute as never);
  }, [moment]);
  const handlePressChainDetail = useCallback(() => {
    if (!activeBusiness) return;
    router.push(`/businesses/${activeBusiness.id}/daily-chain` as never);
  }, [activeBusiness]);

  if (!isLoaded) {
    return <VrittLoader />;
  }

  if (businesses.length === 0) {
    return (
      <VrittHomeEmptyState
        firstName={firstName}
        year={new Date().getFullYear()}
        onCreateBusiness={handleCreateBusiness}
      />
    );
  }

  if (!activeBusiness || !moment) {
    return <VrittLoader />;
  }

  const stageNumber = getStageNumber(chain);
  const dateLabel = getOperationalDateLabel(chain?.operationalDate);

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: PAPER_BG }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: Platform.OS === 'ios' ? 80 : 72,
          paddingBottom: 160,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle="dark-content" backgroundColor={PAPER_BG} />

        <VrittGreetingHeader
          greeting={greeting}
          firstName={firstName}
          onPressAvatar={handlePressAvatar}
        />

        <VrittActiveBusinessPill
          businessName={activeBusiness.name}
          roleLabel={roleLabel}
          canSwitch={businesses.length > 1}
          onPress={handleOpenSwitcher}
        />

        <VrittStageSection
          moment={moment}
          stepNumber={stageNumber}
          dateLabel={dateLabel}
          semaphoreSteps={semaphoreSteps}
          isLoading={isInitialLoading}
          onPressCta={handlePressStageCta}
          onPressChainDetail={handlePressChainDetail}
        />

        <VrittBentoSection
          items={bentoItems}
          onNavigate={onNavigate}
          onPressAnalytics={handlePressAnalytics}
        />

        <VrittNextMoveSection
          tone={moment.tone}
          items={nextMoves}
          onNavigate={onNavigate}
        />

        <VrittDayTimeline events={timelineEvents} />

        <VrittModulesSection
          eyebrow="Operación"
          title="Módulos del negocio"
          items={operationModules}
          variant="paper"
          onNavigate={onNavigate}
        />

        <VrittModulesSection
          eyebrow="Configuración"
          title="Ajustes del espacio"
          items={configModules}
          variant="ink"
          onNavigate={onNavigate}
        />
      </ScrollView>

      <VrittBusinessSwitcher
        visible={isSwitcherOpen}
        businesses={businesses}
        activeBusinessId={activeBusiness.id}
        onClose={handleCloseSwitcher}
        onSelect={(id) => {
          useBusinessStore.getState().setActiveBusiness(id);
          setIsSwitcherOpen(false);
        }}
        onCreateNew={() => {
          setIsSwitcherOpen(false);
          router.push('/businesses/create');
        }}
      />
    </>
  );
}
