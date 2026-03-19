import React, { useEffect } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';

import { VrittScreen } from '@/components/ui/VrittScreen';
import { VrittHeader } from '@/components/ui/VrittHeader';
import { VrittCard } from '@/components/ui/VrittCard';
import { VrittButton } from '@/components/ui/VrittButton';
import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel';

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated]);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch {
      Alert.alert('Error', 'No pudimos cerrar tu sesión.');
    }
  };

  if (!isHydrated) {
    return <VrittLoader />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title={
            user?.fullName
              ? `Bienvenido de vuelta, ${user.fullName}.`
              : 'Bienvenido de vuelta.'
          }
          subtitle="Tu operación empieza aquí. Clara, controlada y lista para crecer."
        />

        <VrittCard>
          <VrittSectionLabel className="mb-2">Cuenta</VrittSectionLabel>
          <Text className="text-[18px] font-semibold text-veritt-text">
            {user?.email ?? 'Sin correo disponible'}
          </Text>
        </VrittCard>

        <View className="gap-3.5">
          <VrittButton
            label="Crear negocio"
            onPress={() => router.push('/businesses/create')}
          />

          <VrittButton
            label="Cerrar sesión"
            variant="secondary"
            onPress={handleLogout}
          />
        </View>

        <View className="rounded-card border border-veritt-border bg-veritt-surface p-5">
          <VrittSectionLabel className="mb-2">Siguiente paso</VrittSectionLabel>
          <Text className="text-[16px] font-semibold text-veritt-text">
            Crea tu primer negocio
          </Text>
          <Text className="mt-2 text-[14px] leading-[22px] text-veritt-muted">
            Configura la base de tu operación para empezar a administrar equipo,
            procesos y crecimiento desde VERITT.
          </Text>
        </View>
      </View>
    </VrittScreen>
  );
}