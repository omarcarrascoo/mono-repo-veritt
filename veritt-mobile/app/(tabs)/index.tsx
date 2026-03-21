import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuthStore } from '@/store/auth.store';
import { VrittScreen } from '@/components/ui/VrittScreen';
import { VrittHeader } from '@/components/ui/VrittHeader';
import { VrittCard } from '@/components/ui/VrittCard';
import { VrittButton } from '@/components/ui/VrittButton';
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel';

function getFirstName(fullName?: string | null) {
  if (!fullName?.trim()) {
    return 'equipo';
  }

  return fullName.trim().split(/\s+/)[0];
}


export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const firstName = getFirstName(user?.fullName);

  const quickActions = [
    {
      title: 'Crear negocio',
      description: 'Empieza con tu primer espacio operativo y deja la estructura lista.',
      icon: 'add-circle-outline' as const,
      onPress: () => router.push('/businesses/create'),
    },
    {
      title: 'Ver negocios',
      description: 'Entra a tus espacios actuales y revisa cómo va creciendo todo.',
      icon: 'briefcase-outline' as const,
      onPress: () => router.push('/(tabs)/businesses'),
    },
    {
      title: 'Explorar ideas',
      description: 'Usa la pestaña de explora como inspiración mientras aterrizamos más módulos.',
      icon: 'sparkles-outline' as const,
      onPress: () => router.push('/(tabs)/explore'),
    },
    {
      title: 'Abrir perfil',
      description: 'Revisa tu cuenta y cierra sesión desde un lugar más natural.',
      icon: 'person-circle-outline' as const,
      onPress: () => router.push('/(tabs)/profile'),
    },
  ];

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title={`Hola, ${firstName}.`}
          subtitle="Este inicio debe funcionar como una base agradable: te orienta y te da accesos rápidos."
        />

        <VrittCard className="gap-5 overflow-hidden">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-3">
              <VrittSectionLabel>Listo para arrancar</VrittSectionLabel>
              <Text className="text-[26px] font-extrabold leading-[30px] text-veritt-text">
                Tu tablero base ya está en marcha.
              </Text>
              <Text className="text-[15px] leading-[24px] text-veritt-muted">
                Aunque todavía estamos en una etapa temprana, aquí ya tienes una
                llegada más útil: contexto rápido y acciones claras mientras definimos el resto.
              </Text>
            </View>

            <View className="h-14 w-14 items-center justify-center rounded-full border border-veritt-border bg-black/30">
              <Ionicons name="rocket-outline" size={24} color="#FFFFFF" />
            </View>
          </View>

          <View className="rounded-[24px] border border-[#232323] bg-[#080808] px-4 py-4">
            <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-veritt-mutedSoft">
              Siguiente mejor paso
            </Text>
            <Text className="mt-2 text-[18px] font-bold text-veritt-text">
              Crea un negocio y empieza a poblar el sistema con datos reales.
            </Text>
            <Text className="mt-2 text-[14px] leading-[22px] text-veritt-muted">
              En cuanto exista el primer negocio, este home puede convertirse en
              un dashboard de verdad sin cambiar su estructura general.
            </Text>
          </View>

          <View className="gap-3 md:flex-row">
            <VrittButton
              label="Crear negocio"
              className="md:flex-1"
              onPress={() => router.push('/businesses/create')}
            />
            <VrittButton
              label="Ir a perfil"
              variant="secondary"
              className="md:flex-1"
              onPress={() => router.push('/(tabs)/profile')}
            />
          </View>
        </VrittCard>

        <View className="gap-4">
          <VrittSectionLabel>Acciones rápidas</VrittSectionLabel>

          <View className="gap-4 md:flex-row md:flex-wrap">
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.title}
                activeOpacity={0.88}
                className="md:min-w-[48%] md:flex-1"
                onPress={action.onPress}
              >
                <VrittCard className="gap-4">
                  <View className="h-12 w-12 items-center justify-center rounded-full border border-veritt-border bg-black/30">
                    <Ionicons name={action.icon} size={22} color="#FFFFFF" />
                  </View>

                  <View className="gap-2">
                    <Text className="text-[18px] font-bold text-veritt-text">
                      {action.title}
                    </Text>
                    <Text className="text-[14px] leading-[22px] text-veritt-muted">
                      {action.description}
                    </Text>
                  </View>
                </VrittCard>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </View>
    </VrittScreen>
  );
}
