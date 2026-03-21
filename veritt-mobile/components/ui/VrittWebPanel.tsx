import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { useIsDesktopWeb } from '@/hooks/useIsDesktopWeb';

type VrittWebPanelProps = ViewProps & {
  children: React.ReactNode;
};

export function VrittWebPanel({
  children,
  style,
  ...props
}: VrittWebPanelProps) {
  const isDesktopWeb = useIsDesktopWeb();

  if (!isDesktopWeb) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.panel, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
});
