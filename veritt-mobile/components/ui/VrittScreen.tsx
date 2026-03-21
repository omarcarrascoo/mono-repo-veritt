import React from 'react';
import {
  ScrollView,
  View,
  ViewProps,
  ScrollViewProps,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { useIsDesktopWeb } from '@/hooks/useIsDesktopWeb';
import { VrittWebPanel } from '@/components/ui/VrittWebPanel';

type VrittScreenProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  contentClassName?: string;
  contentStyle?: StyleProp<ViewStyle>;
  className?: string;
} & ViewProps &
  ScrollViewProps;

export function VrittScreen({
  children,
  scrollable = false,
  contentClassName = '',
  contentStyle,
  className = '',
  ...props
}: VrittScreenProps) {
  const isDesktopWeb = useIsDesktopWeb();

  if (scrollable) {
    const { contentContainerStyle, ...scrollProps } = props;

    return (
      <ScrollView
        className={`flex-1 bg-veritt-bg ${className}`}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktopWeb && styles.desktopScrollContent,
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        {...scrollProps}
      >
        <View
          className={`w-full px-6 pt-[88px] pb-8 md:items-center ${contentClassName}`}
          style={isDesktopWeb ? styles.desktopViewport : undefined}
        >
          <VrittWebPanel>
            <View
              className="w-full md:max-w-3xl"
              style={[
                isDesktopWeb ? styles.desktopContent : undefined,
                contentStyle,
              ]}
            >
              {children}
            </View>
          </VrittWebPanel>
        </View>
      </ScrollView>
    );
  }

  return (
    <View
      className={`flex-1 bg-veritt-bg px-6 pt-[88px] pb-8 md:items-center ${className}`}
      {...props}
    >
      <VrittWebPanel style={styles.desktopFill}>
        <View
          className={`w-full md:max-w-3xl flex-1 ${contentClassName}`}
          style={[
            isDesktopWeb ? styles.desktopContent : undefined,
            contentStyle,
          ]}
        >
          {children}
        </View>
      </VrittWebPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 140,
  },
  desktopScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  desktopViewport: {
    width: '100%',
    alignSelf: 'center',
  },
  desktopContent: {
    width: '100%',
    maxWidth: 1040,
  },
  desktopFill: {
    flex: 1,
  },
});
