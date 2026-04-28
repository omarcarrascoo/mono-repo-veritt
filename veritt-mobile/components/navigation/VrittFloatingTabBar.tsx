import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { useBusinessStore } from '@/store/business.store';
import type { ChainTone } from '@/lib/daily-chain-home';

type TabMeta = {
  routeName: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFilled: keyof typeof Ionicons.glyphMap;
};

const TAB_META: TabMeta[] = [
  {
    routeName: 'index',
    label: 'Inicio',
    icon: 'home-outline',
    iconFilled: 'home',
  },
  {
    routeName: 'businesses',
    label: 'Negocios',
    icon: 'briefcase-outline',
    iconFilled: 'briefcase',
  },
  {
    routeName: 'explore',
    label: 'Explora',
    icon: 'sparkles-outline',
    iconFilled: 'sparkles',
  },
  {
    routeName: 'profile',
    label: 'Perfil',
    icon: 'person-outline',
    iconFilled: 'person',
  },
];

// Pill activo = piel según etapa. Comunica en qué está el negocio sin salir
// del home. Paleta alineada con StageMega / NextMove.
type PillSkin = {
  bg: string;
  ink: string;
  dot: string;
};

const PILL_BY_TONE: Record<ChainTone, PillSkin> = {
  start: { bg: '#F5F2EA', ink: '#0A0A0A', dot: '#0A0A0A' },
  progress: { bg: '#F5F2EA', ink: '#0A0A0A', dot: '#8FB09D' },
  review: { bg: '#C48A3A', ink: '#1A0F03', dot: '#1A0F03' },
  blocker: { bg: '#C25450', ink: '#2A0606', dot: '#2A0606' },
  done: { bg: '#4A7C59', ink: '#F5F2EA', dot: '#F5F2EA' },
};

const DEFAULT_PILL: PillSkin = {
  bg: '#F5F2EA',
  ink: '#0A0A0A',
  dot: '#0A0A0A',
};

const AI_DOT_BY_TONE: Record<ChainTone, string> = {
  start: '#4A7C59',
  progress: '#8FB09D',
  review: '#C48A3A',
  blocker: '#C25450',
  done: '#4A7C59',
};

export function VrittFloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const activeBusinessId = useBusinessStore((s) => s.activeBusinessId);
  const businesses = useBusinessStore((s) => s.businesses);
  const chainToneByBusinessId = useBusinessStore(
    (s) => s.chainToneByBusinessId,
  );

  const currentRouteName = state.routes[state.index]?.name;
  const bizId = activeBusinessId ?? businesses[0]?.id ?? null;
  const tone: ChainTone | null = bizId
    ? chainToneByBusinessId[bizId] ?? null
    : null;

  const pillSkin: PillSkin = tone ? PILL_BY_TONE[tone] : DEFAULT_PILL;
  const aiDotColor = tone ? AI_DOT_BY_TONE[tone] : '#4A7C59';

  const handlePress = (routeName: string) => {
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    const isFocused = currentRouteName === routeName;
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const handleChatPress = () => {
    if (!bizId) {
      router.push('/businesses/create');
      return;
    }
    router.push(`/businesses/${bizId}/chat` as never);
  };

  const hasBusiness = !!bizId;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: Platform.OS === 'ios' ? 28 : 18,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <View
        style={{
          flex: 1,
          height: 60,
          borderRadius: 30,
          backgroundColor: '#0A0A0A',
          paddingHorizontal: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.32,
          shadowRadius: 18,
          elevation: 10,
        }}
      >
        {TAB_META.map((tab) => {
          const isActive = currentRouteName === tab.routeName;
          return (
            <Pressable
              key={tab.routeName}
              onPress={() => handlePress(tab.routeName)}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 22,
                backgroundColor: isActive ? pillSkin.bg : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingHorizontal: 10,
              }}
            >
              {isActive && tone ? (
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: pillSkin.dot,
                  }}
                />
              ) : null}
              <Ionicons
                name={isActive ? tab.iconFilled : tab.icon}
                size={18}
                color={isActive ? pillSkin.ink : 'rgba(245,242,234,0.62)'}
              />
              {isActive ? (
                <Text
                  numberOfLines={1}
                  style={{
                    color: pillSkin.ink,
                    fontSize: 12,
                    fontWeight: '800',
                    letterSpacing: -0.1,
                  }}
                >
                  {tab.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={handleChatPress}
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: hasBusiness ? '#F5F2EA' : '#0A0A0A',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.32,
          shadowRadius: 18,
          elevation: 10,
          borderWidth: hasBusiness ? 0 : 1,
          borderColor: hasBusiness ? 'transparent' : '#1A1A1A',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: aiDotColor,
            borderWidth: 2,
            borderColor: hasBusiness ? '#F5F2EA' : '#0A0A0A',
          }}
        />
        <Ionicons
          name="sparkles"
          size={22}
          color={hasBusiness ? '#0A0A0A' : '#F5F2EA'}
        />
      </Pressable>
    </View>
  );
}
