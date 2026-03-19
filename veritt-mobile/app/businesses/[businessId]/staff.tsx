import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { staffApi } from '@/api/modules/staff.api';
import { StaffProfile } from '@/types/staff.types';
import { getApiErrorMessage } from '@/utils/error.utils';
import { formatPayroll } from '@/lib/staff-formatters';

import { VrittScreen } from '@/components/ui/VrittScreen';
import { VrittHeader } from '@/components/ui/VrittHeader';
import { VrittCard } from '@/components/ui/VrittCard';
import { VrittButton } from '@/components/ui/VrittButton';
import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittEmptyState } from '@/components/ui/VrittEmptyState';
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel';

export default function BusinessStaffScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStaff = async () => {
    if (!businessId) return;

    try {
      setIsLoading(true);
      const data = await staffApi.getByBusinessId(businessId);
      setStaff(data);
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar el equipo.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [businessId]);

  useFocusEffect(
    useCallback(() => {
      loadStaff();
    }, [businessId])
  );

  if (isLoading) {
    return <VrittLoader />;
  }

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Tu equipo."
          subtitle="Agrega y administra a las personas que forman parte de la operación diaria."
        />

        {staff.length === 0 ? (
          <VrittEmptyState
            title="Aún no hay empleados"
            description="Agrega a la primera persona de tu equipo para continuar con el onboarding operativo."
            actionLabel="Agregar empleado"
            onActionPress={() => router.push(`/businesses/${businessId}/create-staff`)}
          />
        ) : (
          <>
            <VrittButton
              label="Agregar empleado"
              onPress={() => router.push(`/businesses/${businessId}/create-staff`)}
            />

            <View className="gap-4">
              <VrittSectionLabel>Equipo actual</VrittSectionLabel>

              {staff.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  activeOpacity={0.92}
                  onPress={() => router.push(`/businesses/${businessId}/staff/${member.id}`)}
                >
                  <VrittCard>
                    <Text className="text-[18px] font-bold text-veritt-text">
                      {member.fullName}
                    </Text>

                    <Text className="mt-2 text-[14px] text-veritt-muted">
                      {member.operationalRole}
                    </Text>

                    {member.shift ? (
                      <Text className="mt-1 text-[13px] text-veritt-mutedSoft">
                        Turno: {member.shift}
                      </Text>
                    ) : null}

                    {member.phoneNumber ? (
                      <Text className="mt-3 text-[13px] text-veritt-text">
                        Tel: {member.phoneNumber}
                      </Text>
                    ) : null}

                    {member.email ? (
                      <Text className="mt-1 text-[13px] text-veritt-text">
                        Email: {member.email}
                      </Text>
                    ) : null}

                    <Text className="mt-1 text-[13px] text-veritt-text">
                      Acceso: {member.systemAccessLevel}
                    </Text>

                    {member.systemAccessLevel !== 'NONE' && member.username ? (
                      <Text className="mt-1 text-[13px] text-veritt-text">
                        Username: {member.username}
                      </Text>
                    ) : null}

                    <Text className="mt-3 text-[13px] leading-[20px] text-veritt-muted">
                      {formatPayroll(member.compensation)}
                    </Text>
                  </VrittCard>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <VrittButton
          label="Volver al negocio"
          variant="secondary"
          onPress={() => router.replace(`/businesses/${businessId}`)}
        />
      </View>
    </VrittScreen>
  );
}