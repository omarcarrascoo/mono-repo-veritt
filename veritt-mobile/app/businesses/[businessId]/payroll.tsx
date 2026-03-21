import React, { useCallback, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { payrollApi } from '@/api/modules/payroll.api';
import { getApiErrorMessage } from '@/utils/error.utils';
import { formatCurrency } from '@/lib/staff-formatters';
import { formatPayrollDate, formatPayrollStatus } from '@/lib/payroll-utils';
import {
  PayrollPayment,
  PayrollPaymentHistoryResponse,
  UpcomingPayrollPaymentsResponse,
} from '@/types/payroll.types';

import { VrittScreen } from '@/components/ui/VrittScreen';
import { VrittHeader } from '@/components/ui/VrittHeader';
import { VrittCard } from '@/components/ui/VrittCard';
import { VrittButton } from '@/components/ui/VrittButton';
import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittEmptyState } from '@/components/ui/VrittEmptyState';
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel';

function ActionChip({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const baseClass =
    variant === 'primary'
      ? 'border-white bg-white'
      : 'border-veritt-border bg-veritt-surfaceSoft';
  const textClass = variant === 'primary' ? 'text-black' : 'text-veritt-text';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={disabled}
      onPress={onPress}
      className={`rounded-full border px-4 py-2 ${baseClass} ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      <Text className={`text-[12px] font-bold uppercase tracking-[0.8px] ${textClass}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function BusinessPayrollScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const [upcoming, setUpcoming] = useState<UpcomingPayrollPaymentsResponse | null>(null);
  const [history, setHistory] = useState<PayrollPaymentHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);

  const loadPayroll = useCallback(async () => {
    if (!businessId) return;

    try {
      setIsLoading(true);

      const [upcomingData, historyData] = await Promise.all([
        payrollApi.getUpcoming(businessId),
        payrollApi.getHistory(businessId),
      ]);

      setUpcoming(upcomingData);
      setHistory(historyData);
    } catch (error) {
      Alert.alert(
        'Error',
        getApiErrorMessage(error, 'No pudimos cargar la nómina del negocio.')
      );
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useFocusEffect(
    useCallback(() => {
      loadPayroll();
    }, [loadPayroll])
  );

  const handleUpdatePayment = async (
    paymentId: string,
    status: 'PAID' | 'SKIPPED'
  ) => {
    if (!businessId) return;

    try {
      setUpdatingPaymentId(paymentId);
      await payrollApi.updatePayment(businessId, paymentId, { status });
      await loadPayroll();
    } catch (error) {
      Alert.alert(
        'Error',
        getApiErrorMessage(error, 'No pudimos actualizar el estado del pago.')
      );
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const confirmPaymentAction = (
    payment: PayrollPayment,
    status: 'PAID' | 'SKIPPED'
  ) => {
    const actionLabel = status === 'PAID' ? 'marcarlo como pagado' : 'omitirlo';

    Alert.alert(
      status === 'PAID' ? 'Confirmar pago' : 'Omitir pago',
      `¿Quieres ${actionLabel} para ${payment.staffProfile.fullName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: status === 'PAID' ? 'Sí, pagado' : 'Sí, omitir',
          onPress: () => {
            void handleUpdatePayment(payment.id, status);
          },
        },
      ]
    );
  };

  const renderPaymentCard = (payment: PayrollPayment, showActions = true) => (
    <VrittCard key={payment.id}>
      <View className="gap-3">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-[18px] font-bold text-veritt-text">
              {payment.staffProfile.fullName}
            </Text>
            <Text className="mt-1 text-[14px] text-veritt-muted">
              {payment.staffProfile.operationalRole}
            </Text>
          </View>

          <Text className="text-[12px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
            {formatPayrollStatus(payment.status)}
          </Text>
        </View>

        <Text className="text-[24px] font-extrabold text-veritt-text">
          {formatCurrency(payment.amount, payment.currency)}
        </Text>

        <View className="gap-1">
          <Text className="text-[13px] text-veritt-muted">
            Fecha programada: {formatPayrollDate(payment.dueDate)}
          </Text>

          {payment.paidAt ? (
            <Text className="text-[13px] text-veritt-muted">
              Pagado el: {formatPayrollDate(payment.paidAt)}
            </Text>
          ) : null}
        </View>

        {showActions ? (
          <View className="mt-1 flex-row flex-wrap gap-2">
            <ActionChip
              label="Marcar pagado"
              disabled={updatingPaymentId === payment.id}
              onPress={() => confirmPaymentAction(payment, 'PAID')}
            />
            <ActionChip
              label="Omitir"
              variant="secondary"
              disabled={updatingPaymentId === payment.id}
              onPress={() => confirmPaymentAction(payment, 'SKIPPED')}
            />
          </View>
        ) : null}
      </View>
    </VrittCard>
  );

  if (isLoading || !upcoming || !history) {
    return <VrittLoader />;
  }

  const pendingCount =
    upcoming.overdue.length + upcoming.dueToday.length + upcoming.upcoming.length;

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Nómina."
          subtitle="Consulta pagos por venir, detecta vencidos y registra lo que ya pagaste."
        />

        <VrittCard>
          <VrittSectionLabel className="mb-3">Resumen</VrittSectionLabel>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-[14px] text-veritt-muted">Vencidos</Text>
              <Text className="text-[18px] font-bold text-veritt-text">
                {upcoming.overdue.length}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-[14px] text-veritt-muted">Tocan hoy</Text>
              <Text className="text-[18px] font-bold text-veritt-text">
                {upcoming.dueToday.length}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-[14px] text-veritt-muted">
                Próximos {upcoming.upcomingWindowDays} días
              </Text>
              <Text className="text-[18px] font-bold text-veritt-text">
                {upcoming.upcoming.length}
              </Text>
            </View>
          </View>
        </VrittCard>

        {pendingCount === 0 ? (
          <VrittEmptyState
            title="No hay pagos pendientes"
            description="Cuando registres salarios y fechas de primer pago, aquí aparecerá el calendario de nómina."
          />
        ) : (
          <View className="gap-6">
            {upcoming.overdue.length > 0 ? (
              <View className="gap-3">
                <VrittSectionLabel>Pagos vencidos</VrittSectionLabel>
                {upcoming.overdue.map((payment) => renderPaymentCard(payment))}
              </View>
            ) : null}

            {upcoming.dueToday.length > 0 ? (
              <View className="gap-3">
                <VrittSectionLabel>Pagos de hoy</VrittSectionLabel>
                {upcoming.dueToday.map((payment) => renderPaymentCard(payment))}
              </View>
            ) : null}

            {upcoming.upcoming.length > 0 ? (
              <View className="gap-3">
                <VrittSectionLabel>Próximos pagos</VrittSectionLabel>
                {upcoming.upcoming.map((payment) => renderPaymentCard(payment))}
              </View>
            ) : null}
          </View>
        )}

        <View className="gap-3">
          <VrittSectionLabel>Historial</VrittSectionLabel>

          {history.items.length === 0 ? (
            <Text className="text-[14px] leading-[22px] text-veritt-muted">
              Aún no hay pagos registrados en el historial.
            </Text>
          ) : (
            history.items.map((payment) => renderPaymentCard(payment, false))
          )}
        </View>

        <View className="gap-3.5">
          <VrittButton
            label="Administrar empleados"
            onPress={() => router.push(`/businesses/${businessId}/staff`)}
          />

          <VrittButton
            label="Volver al negocio"
            variant="secondary"
            onPress={() => router.replace(`/businesses/${businessId}`)}
          />
        </View>
      </View>
    </VrittScreen>
  );
}
