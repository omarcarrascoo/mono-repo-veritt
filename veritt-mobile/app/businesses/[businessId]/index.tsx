import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { businessesApi } from '@/api/modules/businesses.api';
import { Business, BusinessOnboarding } from '@/types/business.types';
import { getApiErrorMessage } from '@/utils/error.utils';

import { VrittScreen } from '@/components/ui/VrittScreen';
import { VrittHeader } from '@/components/ui/VrittHeader';
import { VrittCard } from '@/components/ui/VrittCard';
import { VrittButton } from '@/components/ui/VrittButton';
import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel';

import {
  getPendingOnboardingSteps,
  ONBOARDING_CHECKLIST,
} from '@/lib/business-onboarding';

export default function BusinessDetailScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const [business, setBusiness] = useState<Business | null>(null);
  const [onboarding, setOnboarding] = useState<BusinessOnboarding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBusinessData = async () => {
    if (!businessId) return;

    try {
      setIsLoading(true);

      const [businesses, onboardingData] = await Promise.all([
        businessesApi.getMine(),
        businessesApi.getOnboarding(businessId),
      ]);

      const foundBusiness = businesses.find((item) => item.id === businessId) ?? null;

      setBusiness(foundBusiness);
      setOnboarding(onboardingData);
    } catch (error) {
      Alert.alert(
        'Error',
        getApiErrorMessage(error, 'No pudimos cargar el negocio.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBusinessData();
  }, [businessId]);

  const pendingSteps = useMemo(() => {
    if (!onboarding) return [];
    return getPendingOnboardingSteps(onboarding);
  }, [onboarding]);

  if (isLoading) {
    return <VrittLoader />;
  }

  if (!business || !onboarding) {
    return (
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Negocio no encontrado."
            subtitle="No pudimos cargar la información de este negocio."
          />

          <VrittButton
            label="Volver a negocios"
            onPress={() => router.replace('/(tabs)/businesses')}
          />
        </View>
      </VrittScreen>
    );
  }

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          eyebrow={business.businessType}
          title={business.name}
          subtitle="Administra la configuración base y sigue avanzando en el onboarding operativo."
        />

        <VrittCard>
          <VrittSectionLabel className="mb-3">Resumen</VrittSectionLabel>

          <View className="gap-3">
            <View>
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
                Slug
              </Text>
              <Text className="mt-1 text-[16px] text-veritt-text">{business.slug}</Text>
            </View>

            <View>
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
                Timezone
              </Text>
              <Text className="mt-1 text-[16px] text-veritt-text">{business.timezone}</Text>
            </View>

            <View>
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
                Corte operativo
              </Text>
              <Text className="mt-1 text-[16px] text-veritt-text">
                {business.operationalDayCutoffHour}:00
              </Text>
            </View>
          </View>
        </VrittCard>

        <VrittCard>
          <VrittSectionLabel className="mb-3">Onboarding</VrittSectionLabel>

          <View className="gap-4">
            <View>
              <Text className="text-[28px] font-extrabold text-veritt-text">
                {onboarding.completionPercentage}%
              </Text>
              <Text className="mt-1 text-[14px] text-veritt-muted">
                Progreso actual
              </Text>
            </View>

            <View className="h-3 overflow-hidden rounded-full bg-veritt-surfaceSoft">
              <View
                className="h-3 rounded-full bg-white"
                style={{ width: `${onboarding.completionPercentage}%` }}
              />
            </View>

            <View>
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
                Paso actual
              </Text>
              <Text className="mt-1 text-[16px] text-veritt-text">
                {onboarding.currentStep}
              </Text>
            </View>
          </View>
        </VrittCard>

        <VrittCard>
          <VrittSectionLabel className="mb-3">Checklist</VrittSectionLabel>

          <View className="gap-3">
            {ONBOARDING_CHECKLIST.map((item) => {
              const completed = Boolean(onboarding[item.key]);

              return (
                <View
                  key={item.key}
                  className="flex-row items-center justify-between rounded-veritt border border-veritt-border bg-veritt-surfaceSoft px-4 py-3"
                >
                  <Text className="text-[14px] font-medium text-veritt-text">
                    {item.label}
                  </Text>

                  <Text
                    className={`text-[12px] font-bold uppercase tracking-[1px] ${
                      completed ? 'text-white' : 'text-veritt-muted'
                    }`}
                  >
                    {completed ? 'Listo' : 'Pendiente'}
                  </Text>
                </View>
              );
            })}
          </View>
        </VrittCard>

        <VrittCard>
          <VrittSectionLabel className="mb-3">Falta por hacer</VrittSectionLabel>

          {pendingSteps.length === 0 ? (
            <Text className="text-[14px] leading-[22px] text-veritt-text">
              Todo el onboarding está completo.
            </Text>
          ) : (
            <View className="gap-2">
              {pendingSteps.map((step) => (
                <Text key={step} className="text-[14px] leading-[22px] text-veritt-muted">
                  • {step}
                </Text>
              ))}
            </View>
          )}
        </VrittCard>

        <View className="gap-3.5">
          <VrittButton
            label="Administrar empleados"
            onPress={() => router.push(`/businesses/${business.id}/staff`)}
          />

          <VrittButton
            label="Volver a negocios"
            variant="secondary"
            onPress={() => router.replace('/(tabs)/businesses')}
          />
        </View>
      </View>
    </VrittScreen>
  );
}