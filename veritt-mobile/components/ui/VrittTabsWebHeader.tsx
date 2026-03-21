import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Href, router } from 'expo-router';

type VrittTabsHeaderNavProps = {
  activeRouteName: string;
};

const TAB_ITEMS: {
  href: Href;
  label: string;
  routeName: string;
}[] = [
  { href: '/(tabs)', label: 'Inicio', routeName: 'index' },
  { href: '/(tabs)/businesses', label: 'Negocios', routeName: 'businesses' },
  { href: '/(tabs)/explore', label: 'Explora', routeName: 'explore' },
];

function VrittTabsHeaderBrand() {
  return (
    <View style={styles.brandWrap}>
      <Text style={styles.brandText}>VERITT</Text>
    </View>
  );
}

function VrittTabsHeaderNav({
  activeRouteName,
}: VrittTabsHeaderNavProps) {
  return (
    <View style={styles.navWrap}>
      {TAB_ITEMS.map((item) => {
        const isActive = item.routeName === activeRouteName;

        return (
          <Pressable
            key={item.routeName}
            accessibilityRole="button"
            onPress={() => router.replace(item.href)}
            style={({ hovered, pressed }) => [
              styles.navItem,
              isActive && styles.navItemActive,
              hovered && !isActive && styles.navItemHover,
              pressed && styles.navItemPressed,
            ]}
          >
            <Text style={[styles.navText, isActive && styles.navTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function VrittTabsWebHeader({
  activeRouteName,
}: VrittTabsHeaderNavProps) {
  return (
    <View style={styles.headerShell}>
      <View style={styles.headerInner}>
        <VrittTabsHeaderBrand />
        <VrittTabsHeaderNav activeRouteName={activeRouteName} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerShell: {
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#151515',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 16,
  },
  headerInner: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  brandWrap: {
    justifyContent: 'center',
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3.2,
  },
  navWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navItem: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
  },
  navItemActive: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  navItemHover: {
    backgroundColor: '#0B0B0B',
  },
  navItemPressed: {
    opacity: 0.88,
  },
  navText: {
    color: '#7A7A7A',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  navTextActive: {
    color: '#FFFFFF',
  },
});
