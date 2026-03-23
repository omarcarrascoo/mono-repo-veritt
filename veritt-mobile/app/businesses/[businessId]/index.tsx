import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { businessesApi } from '@/api/modules/businesses.api';
import { staffApi } from '@/api/modules/staff.api';
import { payrollApi } from '@/api/modules/payroll.api';
import { Business, BusinessOnboarding } from '@/types/business.types';
import { StaffProfile } from '@/types/staff.types';
import { getApiErrorMessage } from '@/utils/error.utils';
import { formatCurrency } from '@/lib/staff-formatters';

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
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [upcomingPayrollTotal, setUpcomingPayrollTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadBusinessData = async () => {
    if (!businessId) return;

    try {
      setIsLoading(true);

      const [businesses, onboardingData, staffData, payrollData] = await Promise.all([
        businessesApi.getMine(),
        businessesApi.getOnboarding(businessId),
        staffApi.getByBusinessId(businessId),
        payrollApi.getUpcoming(businessId).catch(() => ({ 
          todayDate: new Date().toISOString(),
          upcomingWindowDays: 7,
          overdue: [],
          dueToday: [],
          upcoming: [] 
        })),
      ]);

      const foundBusiness = businesses.find((item) => item.id === businessId) ?? null;

      // Calculate total upcoming payroll amount
      const upcomingPayments = [
        ...(payrollData.overdue || []),
        ...(payrollData.dueToday || []),
        ...(payrollData.upcoming || [])
      ];
      const totalAmount = upcomingPayments.reduce((sum, payment) => {
        const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount || 0;
        return sum + amount;
      }, 0);

      setBusiness(foundBusiness);
      setOnboarding(onboardingData);
      setStaff(staffData);
      setUpcomingPayrollTotal(totalAmount);
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

  const getBusinessTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      RESTAURANT: 'Restaurante',
      CAFE: 'Cafetería',
      BAR: 'Bar',
      RETAIL: 'Retail',
      OTHER: 'Otro',
    };
    return labels[type] || type;
  };

  const activeStaffCount = staff.filter(s => s.status === 'ACTIVE').length;

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        {/* Hero Section */}
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
                {getBusinessTypeLabel(business.businessType)}
              </Text>
              <Text className="mt-1 text-[26px] font-extrabold text-veritt-text">
                {business.name}
              </Text>
            </View>
            <View className="rounded-full bg-veritt-surfaceSoft px-4 py-2">
              <Text className="text-[12px] font-bold uppercase tracking-[1px] text-veritt-text">
                {onboarding.completionPercentage}% completo
              </Text>
            </View>
          </View>

          {business.description && (
            <Text className="text-[16px] leading-[24px] text-veritt-muted">
              {business.description}
            </Text>
          )}

          {(business.city || business.state) && (
            <View className="flex-row items-center gap-2">
              <Ionicons name="location-outline" size={16} color="#8B8B8B" />
              <Text className="text-[14px] text-veritt-muted">
                {[business.city, business.state].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* Business Stats */}
        <View className="flex-row gap-4">
          <View className="flex-1 rounded-card border border-veritt-border bg-veritt-surface p-4">
            <Text className="text-[24px] font-extrabold text-veritt-text">
              {activeStaffCount}
            </Text>
            <Text className="mt-1 text-[12px] font-medium uppercase tracking-[0.8px] text-veritt-mutedSoft">
              Empleados activos
            </Text>
          </View>

          <View className="flex-1 rounded-card border border-veritt-border bg-veritt-surface p-4">
            <Text className="text-[24px] font-extrabold text-veritt-text">
              {formatCurrency(upcomingPayrollTotal)}
            </Text>
            <Text className="mt-1 text-[12px] font-medium uppercase tracking-[0.8px] text-veritt-mutedSoft">
              Nómina próxima
            </Text>
          </View>
        </View>

        {/* Business Details */}
        <VrittCard>
          <VrittSectionLabel className="mb-4">Detalles del negocio</VrittSectionLabel>

          <View className="gap-4">
            <View className="flex-row gap-6">
              <View className="flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
                  Identificador
                </Text>
                <Text className="mt-1 text-[16px] text-veritt-text">{business.slug}</Text>
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
                  Zona horaria
                </Text>
                <Text className="mt-1 text-[16px] text-veritt-text">{business.timezone}</Text>
              </View>
            </View>

            <View>
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
                Corte operativo diario
              </Text>
              <Text className="mt-1 text-[16px] text-veritt-text">
                {business.operationalDayCutoffHour}:00 hrs
              </Text>
              <Text className="mt-1 text-[13px] text-veritt-muted">
                Hora en que termina el día operativo para cálculos de nómina y reportes
              </Text>
            </View>

            {business.createdAt && (
              <View>
                <Text className="text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
                  Creado el
                </Text>
                <Text className="mt-1 text-[16px] text-veritt-text">
                  {new Date(business.createdAt).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            )}
          </View>
        </VrittCard>

        {/* Onboarding Progress */}
        <VrittCard>
          <VrittSectionLabel className="mb-4">Progreso de configuración</VrittSectionLabel>

          <View className="gap-6">
            <View>
              <View className="flex-row items-center justify-between">
                <Text className="text-[24px] font-extrabold text-veritt-text">
                  {onboarding.completionPercentage}%
                </Text>
                <Text className="text-[14px] font-medium text-veritt-muted">
                  {onboarding.currentStep}
                </Text>
              </View>
              <Text className="mt-1 text-[14px] text-veritt-muted">
                Completado del onboarding operativo
              </Text>
            </View>

            <View className="gap-2">
              <View className="h-4 overflow-hidden rounded-full bg-veritt-surfaceSoft">
                <View
                  className="h-4 rounded-full bg-gradient-to-r from-veritt-primary to-veritt-accent"
                  style={{ width: `${onboarding.completionPercentage}%` }}
                />
              </View>
              <View className="flex-row justify-between">
                <Text className="text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
                  Inicio
                </Text>
                <Text className="text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
                  Completado
                </Text>
              </View>
            </View>
          </View>
        </VrittCard>

        {/* Onboarding Checklist */}
        <VrittCard>
          <VrittSectionLabel className="mb-4">Checklist de configuración</VrittSectionLabel>

          <View className="gap-3">
            {ONBOARDING_CHECKLIST.map((item) => {
              const completed = Boolean(onboarding[item.key]);

              return (
                <View
                  key={item.key}
                  className="flex-row items-center justify-between rounded-veritt border border-veritt-border bg-veritt-surfaceSoft px-4 py-3"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`h-6 w-6 items-center justify-center rounded-full ${
                        completed ? 'bg-white' : 'bg-veritt-border'
                      }`}
                    >
                      {completed && (
                        <Ionicons name="checkmark" size={14} color="#000000" />
                      )}
                    </View>
                    <Text className="text-[14px] font-medium text-veritt-text">
                      {item.label}
                    </Text>
                  </View>

                  <Text
                    className={`text-[11px] font-bold uppercase tracking-[1px] px-3 py-1 rounded-full ${
                      completed
                        ? 'bg-white text-black'
                        : 'bg-veritt-border text-veritt-muted'
                    }`}
                  >
                    {completed ? 'Completado' : 'Pendiente'}
                  </Text>
                </View>
              );
            })}
          </View>
        </VrittCard>

        {/* Quick Actions */}
        <VrittCard>
          <VrittSectionLabel className="mb-4">Acciones rápidas</VrittSectionLabel>

          <View className="gap-3">
            <TouchableOpacity
              className="flex-row items-center justify-between rounded-veritt border border-veritt-border bg-veritt-surfaceSoft px-4 py-4 active:opacity-90"
              activeOpacity={0.9}
              onPress={() => router.push(`/businesses/${business.id}/staff`)}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                  <Ionicons name="people-outline" size={20} color="#000000" />
                </View>
                <View>
                  <Text className="text-[16px] font-bold text-veritt-text">
                    Administrar equipo
                  </Text>
                  <Text className="mt-1 text-[13px] text-veritt-muted">
                    {activeStaffCount} empleados activos
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8B8B8B" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between rounded-veritt border border-veritt-border bg-veritt-surfaceSoft px-4 py-4 active:opacity-90"
              activeOpacity={0.9}
              onPress={() => router.push(`/businesses/${business.id}/payroll`)}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                  <Ionicons name="cash-outline" size={20} color="#000000" />
                </View>
                <View>
                  <Text className="text-[16px] font-bold text-veritt-text">
                    Ver nómina
                  </Text>
                  <Text className="mt-1 text-[13px] text-veritt-muted">
                    Próximo pago: {formatCurrency(upcomingPayrollTotal)}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8B8B8B" />
            </TouchableOpacity>
          </View>
        </VrittCard>

        {/* Pending Steps */}
        {pendingSteps.length > 0 && (
          <VrittCard>
            <VrittSectionLabel className="mb-4">Próximos pasos</VrittSectionLabel>

            <View className="gap-3">
              {pendingSteps.map((step, index) => (
                <View
                  key={step}
                  className="flex-row items-start gap-3 rounded-veritt border border-veritt-border bg-veritt-surfaceSoft px-4 py-3"
                >
                  <View className="mt-1 h-6 w-6 items-center justify-center rounded-full bg-veritt-border">
                    <Text className="text-[12px] font-bold text-veritt-text">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="flex-1 text-[14px] leading-[22px] text-veritt-text">
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </VrittCard>
        )}

        <View className="gap-3.5">
          <VrittButton
            label="Editar información del negocio"
            variant="secondary"
            onPress={() => {
              // TODO: Implement edit business screen
              Alert.alert('Próximamente', 'La edición del negocio estará disponible pronto.');
            }}
          />

          <VrittButton
            label="Volver a mis negocios"
            variant="secondary"
            onPress={() => router.replace('/(tabs)/businesses')}
          />
        </View>
      </View>
    </VrittScreen>
  );
}
