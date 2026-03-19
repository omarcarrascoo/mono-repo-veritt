import React, { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { businessesApi } from '@/api/modules/businesses.api';
import { Business } from '@/types/business.types';
import { getApiErrorMessage } from '@/utils/error.utils';

import { VrittScreen } from '@/components/ui/VrittScreen';
import { VrittHeader } from '@/components/ui/VrittHeader';
import { VrittCard } from '@/components/ui/VrittCard';
import { VrittButton } from '@/components/ui/VrittButton';
import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittEmptyState } from '@/components/ui/VrittEmptyState';
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel';

export default function BusinessesScreen() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBusinesses = async () => {
    try {
      setIsLoading(true);
      const data = await businessesApi.getMine();
      setBusinesses(data);
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar tus negocios.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  if (isLoading) {
    return <VrittLoader />;
  }

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Tus negocios."
          subtitle="Administra tus espacios operativos y entra al detalle de cada uno."
        />

        {businesses.length === 0 ? (
          <VrittEmptyState
            title="Aún no tienes negocios"
            description="Crea el primero para empezar a organizar tu operación dentro de VERITT."
            actionLabel="Crear negocio"
            onActionPress={() => router.push('/businesses/create')}
          />
        ) : (
          <>
            <VrittButton
              label="Crear otro negocio"
              onPress={() => router.push('/businesses/create')}
            />

            <View className="gap-4">
              <VrittSectionLabel>Tus espacios</VrittSectionLabel>

              {businesses.map((business) => (
                <TouchableOpacity
                  key={business.id}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/businesses/${business.id}`)}
                >
                  <VrittCard>
                    <Text className="text-[20px] font-bold text-veritt-text">
                      {business.name}
                    </Text>
                    <Text className="mt-2 text-[14px] text-veritt-muted">
                      {business.businessType}
                    </Text>
                    <Text className="mt-1 text-[13px] text-veritt-mutedSoft">
                      {business.slug}
                    </Text>
                  </VrittCard>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>
    </VrittScreen>
  );
}