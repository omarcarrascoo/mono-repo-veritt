import React, { memo, useMemo } from 'react';

import type { ModuleItemData } from '@/lib/home-builders';
import {
  VrittModuleList,
  VrittModuleRow,
} from '@/components/home/VrittModuleList';

type VrittModulesSectionProps = {
  eyebrow: string;
  title: string;
  items: ModuleItemData[];
  variant?: 'paper' | 'ink';
  onNavigate: (route: string) => void;
};

function Component({
  eyebrow,
  title,
  items,
  variant = 'paper',
  onNavigate,
}: VrittModulesSectionProps) {
  const modules = useMemo<VrittModuleRow[]>(
    () =>
      items.map((item) => ({
        key: item.key,
        label: item.label,
        hint: item.hint,
        icon: item.icon,
        onPress: () => onNavigate(item.route),
      })),
    [items, onNavigate],
  );

  return (
    <VrittModuleList
      eyebrow={eyebrow}
      title={title}
      modules={modules}
      variant={variant}
    />
  );
}

export const VrittModulesSection = memo(Component);
