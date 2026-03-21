import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  View,
  Text
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { VrittHeader } from '@/components/ui/VrittHeader';
import { VrittInput } from '@/components/ui/VrittInput';
import { VrittButton } from '@/components/ui/VrittButton';
import { VrittScreen } from '@/components/ui/VrittScreen';
import { VrittSelect } from '@/components/ui/VrittSelect';
import { VrittCard } from '@/components/ui/VrittCard';
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel';
import { VrittLoader } from '@/components/ui/VrittLoader';

import { staffApi } from '@/api/modules/staff.api';
import { getApiErrorMessage } from '@/utils/error.utils';
import {
  getPayrollFrequencyHint,
  isSemimonthlyAnchorDate,
  isValidPayrollDateInput,
} from '@/lib/payroll-utils';
import {
  CreateStaffCompensationDto,
  PayrollFrequency,
  StaffProfile,
  SystemAccessLevel,
} from '@/types/staff.types';

const SHIFT_OPTIONS = [
  { label: 'Matutino', value: 'Matutino' },
  { label: 'Vespertino', value: 'Vespertino' },
  { label: 'Nocturno', value: 'Nocturno' },
  { label: 'Mixto', value: 'Mixto' },
];

const ACCESS_LEVEL_OPTIONS: {
  label: string;
  value: SystemAccessLevel;
  hint?: string;
}[] = [
  { label: 'Sin acceso', value: 'NONE', hint: 'Solo perfil operativo' },
  { label: 'Operador', value: 'OPERATOR', hint: 'Acceso básico' },
  { label: 'Supervisor', value: 'SUPERVISOR', hint: 'Más control operativo' },
  { label: 'Admin', value: 'ADMIN', hint: 'Acceso amplio' },
];

const PAYROLL_OPTIONS: { label: string; value: PayrollFrequency }[] = [
  { label: 'Diario', value: 'DAILY' },
  { label: 'Semanal', value: 'WEEKLY' },
  { label: 'Cada 14 días', value: 'BIWEEKLY' },
  { label: 'Quincenal (15 y último día)', value: 'SEMIMONTHLY' },
  { label: 'Mensual', value: 'MONTHLY' },
];

function slugUsername(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s._-]/g, '')
    .trim()
    .replace(/\s+/g, '.')
    .replace(/\.{2,}/g, '.');
}

export default function EditStaffScreen() {
  const { businessId, staffId } = useLocalSearchParams<{
    businessId: string;
    staffId: string;
  }>();

  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fullName, setFullName] = useState('');
  const [operationalRole, setOperationalRole] = useState('');
  const [shift, setShift] = useState('Matutino');
  const [area, setArea] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [systemAccessLevel, setSystemAccessLevel] = useState<SystemAccessLevel>('NONE');

  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState('MXN');
  const [payrollFrequency, setPayrollFrequency] = useState<PayrollFrequency>('MONTHLY');
  const [firstPaymentDate, setFirstPaymentDate] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const hasSystemAccess = systemAccessLevel !== 'NONE';
  const payrollHint = getPayrollFrequencyHint(payrollFrequency);

  useEffect(() => {
    const loadStaff = async () => {
      if (!businessId || !staffId) return;

      try {
        setIsLoading(true);
        const data = await staffApi.getById(businessId, staffId);

        setStaff(data);
        setFullName(data.fullName);
        setOperationalRole(data.operationalRole);
        setShift(data.shift || 'Matutino');
        setArea((data.assignedAreasJson as { area?: string } | undefined)?.area || '');
        setPhoneNumber(data.phoneNumber || '');
        setEmail(data.email || '');
        setUsername(data.username || '');
        setSystemAccessLevel(data.systemAccessLevel || 'NONE');
        setStatus(data.status || 'ACTIVE');

        if (data.compensation) {
          setSalaryAmount(String(data.compensation.salaryAmount ?? ''));
          setSalaryCurrency(data.compensation.salaryCurrency || 'MXN');
          setPayrollFrequency(data.compensation.payrollFrequency);
          setFirstPaymentDate(data.compensation.firstPaymentDate?.slice(0, 10) || '');
        }
      } catch (error) {
        Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar el empleado.'));
      } finally {
        setIsLoading(false);
      }
    };

    loadStaff();
  }, [businessId, staffId]);

  const compensationPayload = useMemo<CreateStaffCompensationDto | undefined>(() => {
    if (!salaryAmount.trim()) return undefined;
    if (!firstPaymentDate.trim()) return undefined;

    const parsedSalary = Number(salaryAmount);
    if (Number.isNaN(parsedSalary) || !isValidPayrollDateInput(firstPaymentDate)) {
      return undefined;
    }

    return {
      salaryAmount: parsedSalary,
      salaryCurrency,
      payrollFrequency,
      firstPaymentDate: firstPaymentDate.trim(),
    };
  }, [salaryAmount, salaryCurrency, payrollFrequency, firstPaymentDate]);

  const handleAccessLevelChange = (value: SystemAccessLevel) => {
    setSystemAccessLevel(value);

    if (value === 'NONE') {
      setUsername('');
    } else if (!username.trim() && fullName.trim()) {
      setUsername(slugUsername(fullName));
    }
  };

  const handleSave = async () => {
    if (!businessId || !staffId) return;

    if (!fullName.trim() || !operationalRole.trim()) {
      Alert.alert('Faltan datos', 'Completa nombre y rol operativo.');
      return;
    }

    if (hasSystemAccess && !username.trim()) {
      Alert.alert(
        'Falta username',
        'Si este empleado tendrá acceso al sistema, debes asignarle un username.'
      );
      return;
    }

    if (salaryAmount.trim() && !firstPaymentDate.trim()) {
      Alert.alert(
        'Falta primer pago',
        'Indica la fecha en la que debe ocurrir el primer pago de este empleado.'
      );
      return;
    }

    if (firstPaymentDate.trim() && !isValidPayrollDateInput(firstPaymentDate.trim())) {
      Alert.alert('Fecha inválida', 'Usa el formato YYYY-MM-DD para el primer pago.');
      return;
    }

    if (
      salaryAmount.trim() &&
      payrollFrequency === 'SEMIMONTHLY' &&
      !isSemimonthlyAnchorDate(firstPaymentDate.trim())
    ) {
      Alert.alert(
        'Fecha inválida para quincena',
        'Para nómina quincenal el primer pago debe ser el día 15 o el último día del mes.'
      );
      return;
    }

    if (salaryAmount.trim() && !compensationPayload) {
      Alert.alert(
        'Dato inválido',
        'Revisa que el salario sea numérico y que la fecha del primer pago sea válida.'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await staffApi.update(businessId, staffId, {
        fullName: fullName.trim(),
        operationalRole: operationalRole.trim(),
        shift,
        assignedAreasJson: area.trim() ? { area: area.trim() } : undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        email: email.trim() || undefined,
        username: hasSystemAccess ? username.trim() : undefined,
        systemAccessLevel,
        status,
        compensation: compensationPayload,
      });

      router.replace(`/businesses/${businessId}/staff`);
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos actualizar el empleado.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!businessId || !staffId || !staff) return;

    const nextStatus = status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      setIsSubmitting(true);

      await staffApi.update(businessId, staffId, {
        status: nextStatus,
      });

      setStatus(nextStatus);
      setStaff((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos actualizar el estado.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <VrittLoader />;
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-veritt-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Editar empleado."
            subtitle="Actualiza perfil, acceso, compensación y estado del miembro del equipo."
          />

          <View className="gap-4">
            <VrittInput
              label="Nombre completo"
              placeholder="Juan Pérez"
              value={fullName}
              onChangeText={setFullName}
              editable={!isSubmitting}
            />

            <VrittInput
              label="Rol operativo"
              placeholder="Mesero Principal"
              value={operationalRole}
              onChangeText={setOperationalRole}
              editable={!isSubmitting}
            />

            <VrittSelect
              label="Turno"
              value={shift}
              options={SHIFT_OPTIONS}
              onChange={setShift}
              disabled={isSubmitting}
            />

            <VrittInput
              label="Área asignada"
              placeholder="Terraza"
              value={area}
              onChangeText={setArea}
              editable={!isSubmitting}
            />
          </View>

          <VrittCard>
            <VrittSectionLabel className="mb-3">Contacto</VrittSectionLabel>

            <View className="gap-4">
              <VrittInput
                label="Teléfono"
                placeholder="+52 999 123 4567"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                editable={!isSubmitting}
              />

              <VrittInput
                label="Correo"
                placeholder="empleado@negocio.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isSubmitting}
              />
            </View>
          </VrittCard>

          <VrittCard>
            <VrittSectionLabel className="mb-3">Acceso al sistema</VrittSectionLabel>

            <View className="gap-4">
              <VrittSelect
                label="Nivel de acceso"
                value={systemAccessLevel}
                options={ACCESS_LEVEL_OPTIONS}
                onChange={handleAccessLevelChange}
                disabled={isSubmitting}
              />

              {hasSystemAccess ? (
                <VrittInput
                  label="Username"
                  placeholder="juan.perez"
                  value={username}
                  onChangeText={(value) => setUsername(slugUsername(value))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              ) : (
                <Text className="text-[13px] leading-[20px] text-veritt-muted">
                  Este empleado no tendrá acceso al sistema por ahora.
                </Text>
              )}
            </View>
          </VrittCard>

          <VrittCard>
            <VrittSectionLabel className="mb-3">Compensación</VrittSectionLabel>

            <View className="gap-4">
              <VrittInput
                label="Salario"
                placeholder="12000"
                value={salaryAmount}
                onChangeText={setSalaryAmount}
                keyboardType="numeric"
                editable={!isSubmitting}
              />

              <VrittInput
                label="Moneda"
                placeholder="MXN"
                value={salaryCurrency}
                onChangeText={setSalaryCurrency}
                autoCapitalize="characters"
                editable={!isSubmitting}
              />

              <VrittSelect
                label="Frecuencia de pago"
                value={payrollFrequency}
                options={PAYROLL_OPTIONS}
                onChange={setPayrollFrequency}
                disabled={isSubmitting}
              />

              <VrittInput
                label="Primer pago"
                placeholder="2026-03-31"
                value={firstPaymentDate}
                onChangeText={setFirstPaymentDate}
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                editable={!isSubmitting}
              />

              <Text className="text-[13px] leading-[20px] text-veritt-muted">
                {payrollHint}
              </Text>

              {payrollFrequency === 'SEMIMONTHLY' ? (
                <Text className="text-[13px] leading-[20px] text-veritt-mutedSoft">
                  Usa una fecha que caiga el día 15 o el último día del mes.
                </Text>
              ) : null}
            </View>
          </VrittCard>

          <VrittCard>
            <VrittSectionLabel className="mb-3">Estado</VrittSectionLabel>

            <Text className="text-[15px] text-veritt-text">
              Estado actual: {status}
            </Text>
          </VrittCard>

          <View className="gap-3.5">
            <VrittButton
              label="Guardar cambios"
              loading={isSubmitting}
              onPress={handleSave}
            />

            <VrittButton
              label={status === 'ACTIVE' ? 'Inactivar empleado' : 'Reactivar empleado'}
              variant="secondary"
              onPress={handleToggleStatus}
              disabled={isSubmitting}
            />

            <VrittButton
              label="Volver"
              variant="secondary"
              onPress={() => router.back()}
              disabled={isSubmitting}
            />
          </View>
        </View>
      </VrittScreen>
    </KeyboardAvoidingView>
  );
}
