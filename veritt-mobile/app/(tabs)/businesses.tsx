import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StatusBar,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { useBusinessStore } from '@/store/business.store';
import { useBusinessesSummary } from '@/hooks/useBusinessesSummary';
import { formatCurrency } from '@/lib/staff-formatters';
import { STAGE_ACCENTS } from '@/lib/stage-tokens';
import type { Business } from '@/types/business.types';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittBusinessCard } from '@/components/businesses/VrittBusinessCard';
import { VrittBusinessCreateCard } from '@/components/businesses/VrittBusinessCreateCard';
import { VrittAbstractShapes } from '@/components/home/VrittAbstractShapes';

const INK_BG = '#03050A';
const PAPER = '#F5F2EA';
const PAPER_SOFT = '#EDE8D9';
const SIDE_PADDING = 18;
const CARD_GAP = 14;
const HEADER_TOP = Platform.OS === 'ios' ? 72 : 64;
const CAROUSEL_BOTTOM_SPACE = 140; // indicator + tab bar breathing room

// Item especial que representa la card de "Crear negocio".
type CarouselItem = Business | { id: '__create__'; kind: 'create' };
const CREATE_ITEM: CarouselItem = { id: '__create__', kind: 'create' };
function isCreateItem(
  item: CarouselItem,
): item is { id: '__create__'; kind: 'create' } {
  return (item as { kind?: string }).kind === 'create';
}

export default function BusinessesScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const cardWidth = screenWidth - SIDE_PADDING * 2;
  const snapInterval = cardWidth + CARD_GAP;

  const businesses = useBusinessStore((s) => s.businesses);
  const isLoaded = useBusinessStore((s) => s.isLoaded);
  const activeBusinessId = useBusinessStore((s) => s.activeBusinessId);
  const loadBusinesses = useBusinessStore((s) => s.loadBusinesses);
  const setActiveBusiness = useBusinessStore((s) => s.setActiveBusiness);

  useEffect(() => {
    if (!isLoaded) loadBusinesses();
  }, [isLoaded, loadBusinesses]);

  const { summaries, refresh } = useBusinessesSummary(businesses);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const [activeIndex, setActiveIndex] = useState(0);

  const canSeeAnyFinance = useMemo(
    () => Object.values(summaries).some((s) => s.canSeeFinance),
    [summaries],
  );

  const totalRevenueToday = useMemo(() => {
    return Object.values(summaries).reduce(
      (sum, s) => sum + (s.dailySalesTotal ?? 0),
      0,
    );
  }, [summaries]);

  const totalTicketsToday = useMemo(() => {
    return Object.values(summaries).reduce(
      (sum, s) => sum + (s.ticketCount ?? 0),
      0,
    );
  }, [summaries]);

  const inProgressCount = useMemo(() => {
    return Object.values(summaries).filter(
      (s) => s.tone === 'progress' || s.tone === 'review',
    ).length;
  }, [summaries]);

  const needsAttentionCount = useMemo(() => {
    return Object.values(summaries).filter((s) => s.tone === 'blocker').length;
  }, [summaries]);

  const handleOpen = useCallback(
    (businessId: string) => {
      setActiveBusiness(businessId);
      router.push(`/businesses/${businessId}`);
    },
    [setActiveBusiness],
  );

  const handleCreate = useCallback(() => {
    router.push('/businesses/create');
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = event.nativeEvent.contentOffset.x;
      const idx = Math.round(x / snapInterval);
      if (idx !== activeIndex) setActiveIndex(idx);
    },
    [snapInterval, activeIndex],
  );

  const carouselItems: CarouselItem[] = useMemo(
    () => [...businesses, CREATE_ITEM],
    [businesses],
  );

  if (!isLoaded) {
    return <VrittLoader />;
  }

  // Header (greeting + summary) más compacto para reducir el aire entre texto y carrusel.
  const HEADER_HEIGHT = businesses.length === 0 ? 96 : 156;
  const carouselHeight =
    screenHeight - HEADER_TOP - HEADER_HEIGHT - CAROUSEL_BOTTOM_SPACE;

  return (
    <View style={{ flex: 1, backgroundColor: INK_BG }}>
      <StatusBar barStyle="light-content" backgroundColor={INK_BG} />

      <LinearGradient
        pointerEvents="none"
        colors={['#0D1118', '#050709', '#020305']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(107,122,143,0.22)', 'rgba(107,122,143,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.1, y: 0.65 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 560,
        }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(143,176,157,0.08)', 'rgba(143,176,157,0)']}
        start={{ x: 0, y: 1 }}
        end={{ x: 0.7, y: 0.2 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 560,
        }}
      />

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 620,
          overflow: 'hidden',
        }}
      >
        <VrittAbstractShapes tint={PAPER} variant="hero" />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 340,
          overflow: 'hidden',
        }}
      >
        <VrittAbstractShapes tint={PAPER} variant="wide" />
      </View>

      <View
        style={{
          paddingTop: HEADER_TOP,
          paddingHorizontal: SIDE_PADDING + 4,
          gap: 14,
          paddingBottom: 6,
        }}
      >
        <View>
          <Text
            style={{
              color: 'rgba(245,242,234,0.5)',
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 2.2,
              textTransform: 'uppercase',
            }}
          >
            Tus espacios
          </Text>
          <Text
            style={{
              color: PAPER,
              fontSize: 30,
              fontWeight: '900',
              letterSpacing: -1.2,
              marginTop: 4,
              lineHeight: 34,
            }}
          >
            Negocios.
          </Text>
        </View>

        {businesses.length > 0 ? (
          <View style={{ marginRight: 4 }}>
            <SummaryRow
              total={businesses.length}
              inProgressCount={inProgressCount}
              needsAttentionCount={needsAttentionCount}
              canSeeFinance={canSeeAnyFinance}
              totalRevenueToday={totalRevenueToday}
              totalTicketsToday={totalTicketsToday}
            />
          </View>
        ) : null}
      </View>

      <View style={{  justifyContent: 'flex-start', paddingTop: 36 }}>
        <FlatList<CarouselItem>
          data={carouselItems}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={snapInterval}
          snapToAlignment="start"
          disableIntervalMomentum
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingHorizontal: SIDE_PADDING,
            alignItems: 'center',
          }}
          ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
          renderItem={({ item }) => {
            if (isCreateItem(item)) {
              return (
                <VrittBusinessCreateCard
                  width={cardWidth}
                  height={carouselHeight}
                  onPress={handleCreate}
                />
              );
            }

            const summary = summaries[item.id];
            const tone = summary?.tone ?? 'start';
            const stageLabel = STAGE_ACCENTS[tone].label;
            const stepCode = summary?.moment?.stepCode ?? 'FAI · 1 de 5';
            const dailySalesLabel =
              summary?.dailySalesTotal == null
                ? null
                : formatCurrency(summary.dailySalesTotal);

            return (
              <VrittBusinessCard
                name={item.name}
                businessType={item.businessType}
                role={item.userRole ?? null}
                tone={tone}
                stageLabel={stageLabel}
                stepCode={stepCode}
                dailySalesLabel={dailySalesLabel}
                ticketCount={summary?.ticketCount ?? 0}
                activeStaffCount={summary?.activeStaffCount ?? 0}
                onboardingPercent={summary?.onboardingPercent ?? 0}
                isActive={item.id === activeBusinessId}
                isLoading={summary?.isLoading ?? true}
                width={cardWidth}
                height={carouselHeight}
                onPress={() => handleOpen(item.id)}
              />
            );
          }}
        />

        <View style={{ marginTop: 16 }}>
          <PageIndicator
            total={carouselItems.length}
            activeIndex={activeIndex}
          />
        </View>
      </View>
    </View>
  );
}

function PageIndicator({
  total,
  activeIndex,
}: {
  total: number;
  activeIndex: number;
}) {
  if (total <= 1) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === activeIndex;
        return (
          <View
            key={i}
            style={{
              width: isActive ? 22 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: isActive
                ? PAPER
                : 'rgba(245,242,234,0.22)',
            }}
          />
        );
      })}
    </View>
  );
}

function SummaryRow({
  total,
  inProgressCount,
  needsAttentionCount,
  canSeeFinance,
  totalRevenueToday,
  totalTicketsToday,
}: {
  total: number;
  inProgressCount: number;
  needsAttentionCount: number;
  canSeeFinance: boolean;
  totalRevenueToday: number;
  totalTicketsToday: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <SummaryPill label="Negocios" value={String(total)} />
      <SummaryPill label="En curso" value={String(inProgressCount)} />
      <SummaryPill
        label={canSeeFinance ? 'Ventas hoy' : 'Tickets hoy'}
        value={
          canSeeFinance
            ? formatCurrency(totalRevenueToday)
            : String(totalTicketsToday)
        }
        highlight={needsAttentionCount > 0 ? 'danger' : undefined}
      />
    </View>
  );
}

function SummaryPill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'danger';
}) {
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: 'rgba(245,242,234,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(245,242,234,0.1)',
      }}
    >
      <Text
        style={{
          color: highlight === 'danger' ? '#C25450' : 'rgba(245,242,234,0.5)',
          fontSize: 9,
          fontWeight: '800',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          color: PAPER_SOFT,
          fontSize: 15,
          fontWeight: '900',
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
