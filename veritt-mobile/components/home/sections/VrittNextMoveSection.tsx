import React, { memo, useMemo } from 'react';

import type { ChainTone } from '@/lib/daily-chain-home';
import type { NextMoveItemData } from '@/lib/home-builders';
import {
  VrittNextMove,
  VrittNextMoveItem,
} from '@/components/home/VrittNextMove';

type VrittNextMoveSectionProps = {
  tone: ChainTone;
  items: NextMoveItemData[];
  onNavigate: (route: string) => void;
};

function Component({ tone, items, onNavigate }: VrittNextMoveSectionProps) {
  const resolvedItems = useMemo<VrittNextMoveItem[]>(
    () =>
      items.map((item) => ({
        key: item.key,
        label: item.label,
        hint: item.hint,
        icon: item.icon,
        skin: item.skin,
        onPress: () => onNavigate(item.route),
      })),
    [items, onNavigate],
  );

  if (resolvedItems.length === 0) return null;

  return <VrittNextMove tone={tone} items={resolvedItems} />;
}

export const VrittNextMoveSection = memo(Component);
