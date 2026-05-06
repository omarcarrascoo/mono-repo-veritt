import React, { memo, useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  hairline,
  palette,
  radius,
  shadow,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';
import {
  useDismissNotify,
  useNotifyToasts,
  type NotifyToast,
  type NotifyTone,
} from '@/lib/notify';

const DEFAULT_DURATION_MS = 4500;
const TOP_OFFSET = 8;

// ── Host ──────────────────────────────────────────────────────────────

function Host() {
  const toasts = useNotifyToasts();
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + TOP_OFFSET,
        left: 0,
        right: 0,
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        zIndex: 9999,
        elevation: 9999,
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </View>
  );
}

export const VrittToastHost = memo(Host);

// ── Item ──────────────────────────────────────────────────────────────

function ToastItemInner({ toast }: { toast: NotifyToast }) {
  const dismiss = useDismissNotify();
  const skin = toneSkin(toast.tone);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const duration = toast.durationMs ?? DEFAULT_DURATION_MS;
    if (duration > 0) {
      const timer = setTimeout(() => dismiss(toast.id), duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [dismiss, opacity, toast.durationMs, toast.id, translateY]);

  const handleDismiss = useCallback(() => dismiss(toast.id), [dismiss, toast.id]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        width: '100%',
        maxWidth: 520,
      }}
    >
      <Pressable
        onPress={handleDismiss}
        accessibilityRole="alert"
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderRadius: radius.md,
          backgroundColor: skin.bg,
          borderWidth: 1,
          borderColor: skin.border,
          ...shadow.floating,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: skin.iconBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 1,
          }}
        >
          <Ionicons
            name={skin.icon}
            size={15}
            color={skin.iconInk}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            numberOfLines={2}
            style={{
              color: skin.titleInk,
              fontSize: 13,
              fontWeight: '900',
              letterSpacing: -0.2,
              lineHeight: 17,
            }}
          >
            {toast.title}
          </Text>
          {toast.description ? (
            <Text
              numberOfLines={4}
              style={{
                color: skin.bodyInk,
                fontSize: 12,
                lineHeight: 17,
                fontWeight: '600',
                letterSpacing: -0.1,
              }}
            >
              {toast.description}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={handleDismiss}
          hitSlop={8}
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={14} color={skin.bodyInk} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
const ToastItem = memo(ToastItemInner);

// ── Skins ─────────────────────────────────────────────────────────────

interface ToneSkin {
  bg: string;
  border: string;
  iconBg: string;
  iconInk: string;
  titleInk: string;
  bodyInk: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function toneSkin(tone: NotifyTone): ToneSkin {
  switch (tone) {
    case 'error':
      return {
        bg: surface.card,
        border: withAlpha(palette.danger, 0.35),
        iconBg: withAlpha(palette.danger, 0.14),
        iconInk: palette.dangerDeep,
        titleInk: palette.dangerDeep,
        bodyInk: text.onPaper.primary,
        icon: 'alert-circle',
      };
    case 'success':
      return {
        bg: surface.card,
        border: withAlpha(palette.forest, 0.35),
        iconBg: withAlpha(palette.forest, 0.14),
        iconInk: palette.forestDeep,
        titleInk: palette.forestDeep,
        bodyInk: text.onPaper.primary,
        icon: 'checkmark-circle',
      };
    case 'warning':
      return {
        bg: surface.card,
        border: withAlpha(palette.amber, 0.4),
        iconBg: withAlpha(palette.amber, 0.16),
        iconInk: palette.amberDeep,
        titleInk: palette.amberDeep,
        bodyInk: text.onPaper.primary,
        icon: 'warning',
      };
    case 'info':
    default:
      return {
        bg: surface.card,
        border: hairline.onPaper,
        iconBg: withAlpha(palette.ink, 0.06),
        iconInk: text.onPaper.primary,
        titleInk: text.onPaper.primary,
        bodyInk: text.onPaper.soft,
        icon: 'information-circle',
      };
  }
}

