import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';

import { useBusinessStore } from '@/store/business.store';
import type { ChainTone } from '@/lib/daily-chain-home';
import {
  aiDotByTone,
  defaultPill,
  navbar,
  palette,
  pillByTone,
} from '@/constants/design-tokens';

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
// del home. Fuente en `constants/design-tokens.ts` → `pillByTone`.

function adjustLightness(hex: string, delta: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const shift = Math.round((delta / 100) * 255);
  const toHex = (n: number) => clamp(n + shift).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

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

  const pillSkin = tone ? pillByTone[tone] : defaultPill;
  const aiDotColor = tone ? aiDotByTone[tone] : palette.forest;

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
          paddingHorizontal: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.32,
          shadowRadius: 18,
          elevation: 10,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: navbar.border,
        }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[...navbar.gradient]}
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
          colors={[...navbar.steelOverlay]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.2, y: 0.9 }}
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
          colors={[...navbar.forestOverlay]}
          start={{ x: 0, y: 1 }}
          end={{ x: 0.6, y: 0.2 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 12,
            right: 12,
            height: 1,
            backgroundColor: 'rgba(245,242,234,0.06)',
          }}
        />
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
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingHorizontal: 10,
                borderWidth: isActive ? 1 : 0,
                borderColor: navbar.pillBorder,
                shadowColor: isActive ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isActive ? 0.25 : 0,
                shadowRadius: 6,
                overflow: 'hidden',
              }}
            >
              {isActive ? (
                <LinearGradient
                  pointerEvents="none"
                  colors={[pillSkin.bg, adjustLightness(pillSkin.bg, -6)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                />
              ) : null}
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
                size={20}
                color={isActive ? pillSkin.ink : navbar.iconInactive}
              />
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
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.32,
          shadowRadius: 18,
          elevation: 10,
          borderWidth: 1,
          borderColor: hasBusiness ? 'rgba(11,14,18,0.12)' : navbar.border,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={
            hasBusiness
              ? [...navbar.chatGradient]
              : [...navbar.gradient]
          }
          locations={[0, 0.55, 1]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        {!hasBusiness ? (
          <LinearGradient
            pointerEvents="none"
            colors={[...navbar.steelOverlay]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.2, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        ) : null}
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
            borderColor: hasBusiness ? palette.paper : palette.ink,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.12,
            shadowRadius: 2,
          }}
        />
        <Ionicons
          name="sparkles"
          size={22}
          color={hasBusiness ? palette.ink : palette.paper}
        />
      </Pressable>
    </View>
  );
}
