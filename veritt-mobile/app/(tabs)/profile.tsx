import React, { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useAuthStore } from '@/store/auth.store';
import { VrittScreen } from '@/components/ui/VrittScreen';
import { VrittHeader } from '@/components/ui/VrittHeader';
import { VrittCard } from '@/components/ui/VrittCard';
import { VrittButton } from '@/components/ui/VrittButton';
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel';

function getStatusLabel(status?: string) {
  switch (status) {
    case 'ACTIVE':
      return 'Activa';
    case 'INACTIVE':
      return 'Inactiva';
    case 'PENDING':
      return 'Pendiente';
    default:
      return 'Activa';
  }
}

function formatDate(value?: string) {
  if (!value) {
    return 'Aun sin fecha registrada';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Aun sin fecha registrada';
  }

  return parsed.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const accountDetails = useMemo(
    () => [
      {
        label: 'Correo',
        value: user?.email || 'Sin correo disponible',
      },
      {
        label: 'Estado',
        value: getStatusLabel(user?.status),
      },
      {
        label: 'Miembro desde',
        value: formatDate(user?.createdAt),
      },
    ],
    [user?.createdAt, user?.email, user?.status]
  );

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.replace('/login');
    } catch {
      Alert.alert('Error', 'No pudimos cerrar tu sesion.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Tu perfil."
          subtitle="Aqui vive tu cuenta por ahora: informacion basica, contexto rapido y la salida de sesion en un lugar mas natural."
        />

        <VrittCard className="gap-5">
          <View className="gap-2">
            <VrittSectionLabel>Cuenta</VrittSectionLabel>
            <Text className="text-[28px] font-extrabold text-veritt-text">
              {user?.fullName || 'Usuario VERITT'}
            </Text>
          </View>

          <View className="gap-4">
            {accountDetails.map((detail) => (
              <View
                key={detail.label}
                className="rounded-[20px] border border-veritt-border bg-[#080808] p-4"
              >
                <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-veritt-mutedSoft">
                  {detail.label}
                </Text>
                <Text className="mt-2 text-[16px] font-semibold text-veritt-text">
                  {detail.value}
                </Text>
              </View>
            ))}
          </View>
        </VrittCard>

        <View className="gap-4 md:flex-row">
          <VrittCard className="gap-4 md:flex-1">
            <VrittSectionLabel>Espacio para crecer</VrittSectionLabel>
            <Text className="text-[18px] font-bold text-veritt-text">
              Este tab puede convertirse despues en ajustes, seguridad y
              preferencias.
            </Text>
            <Text className="text-[14px] leading-[22px] text-veritt-muted">
              Hay que meter todo lo de seguridad en un sprindedicado
            </Text>
          </VrittCard>

          <VrittCard className="gap-4 md:flex-1">
            <VrittSectionLabel>Sesion</VrittSectionLabel>
            <Text className="text-[18px] font-bold text-veritt-text">
              Salir cuando lo necesites.
            </Text>
            <Text className="text-[14px] leading-[22px] text-veritt-muted">
              Si compartes dispositivo o solo quieres cambiar de cuenta, este es
              el punto correcto para hacerlo.
            </Text>

            <VrittButton
              label="Cerrar sesion"
              variant="secondary"
              loading={isLoggingOut}
              onPress={handleLogout}
            />
          </VrittCard>
        </View>
      </View>
    </VrittScreen>
  );
}
