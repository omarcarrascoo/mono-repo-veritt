import React, { memo, useMemo } from 'react';
import { View } from 'react-native';

import type { BentoItemData } from '@/lib/home-builders';
import {
  VrittBentoGrid,
  VrittBentoWidget,
} from '@/components/home/VrittBentoGrid';
import { VrittSectionHeader } from '@/components/home/VrittSectionHeader';

type VrittBentoSectionProps = {
  items: BentoItemData[];
  onNavigate: (route: string) => void;
  onPressAnalytics: () => void;
};

function Component({
  items,
  onNavigate,
  onPressAnalytics,
}: VrittBentoSectionProps) {
  const widgets = useMemo<VrittBentoWidget[]>(
    () =>
      items.map((item) => ({
        key: item.key,
        kind: item.kind,
        label: item.label,
        value: item.value,
        sub: item.sub,
        badgeTone: item.badgeTone,
        bullets: item.bullets,
        icon: item.icon,
        palette: item.palette,
        onPress: () => onNavigate(item.route),
      })),
    [items, onNavigate],
  );

  return (
    <View style={{ gap: 10, marginTop: 4 }}>
      <VrittSectionHeader
        eyebrow="Ahora mismo"
        actionLabel="Analíticas"
        onActionPress={onPressAnalytics}
      />
      <VrittBentoGrid widgets={widgets} />
    </View>
  );
}

export const VrittBentoSection = memo(Component);
