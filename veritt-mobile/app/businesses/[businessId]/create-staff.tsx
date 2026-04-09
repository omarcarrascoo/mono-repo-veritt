import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { VrittHeader } from '@/components/ui/VrittHeader';
import { VrittInput } from '@/components/ui/VrittInput';
import { VrittButton } from '@/components/ui/VrittButton';
import { VrittScreen } from '@/components/ui/VrittScreen';
import { VrittSelect } from '@/components/ui/VrittSelect';
import { VrittCard } from '@/components/ui/VrittCard';
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel';
import { PayrollDateSelector } from '@/components/staff/PayrollDateSelector';

import { staffApi } from '@/api/modules/staff.api';
import { areasApi } from '@/api/modules/areas.api';
import { getApiErrorMessage } from '@/utils/error.utils';
import { markStaffStepCompleted } from '@/lib/update-onboarding';
import {
  getPayrollFrequencyHint,
  isSemimonthlyAnchorDate,
  isValidPayrollDateInput,
  normalizePayrollDateInput,
} from '@/lib/payroll-utils';
import {
  CreateStaffCompensationDto,
  PayrollFrequency,
  SystemAccessLevel,
} from '@/types/staff.types';
import { Area } from '@/types/area.types';

const PRESET_ROLES = [
  { label: 'Cocinero', value: 'Cocinero' },
  { label: 'Mesero', value: 'Mesero' },
  { label: 'Cajero', value: 'Cajero' },
  { label: 'Barista', value: 'Barista' },
  { label: 'Bartender', value: 'Bartender' },
  { label: 'Host / Hostess', value: 'Host' },
  { label: 'Gerente', value: 'Gerente' },
  { label: 'Ayudante de cocina', value: 'Ayudante de cocina' },
  { label: 'Repartidor', value: 'Repartidor' },
  { label: 'Limpieza', value: 'Limpieza' },
  { label: 'Otro', value: '__OTHER__' },
];

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

export default function CreateStaffScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const [availableAreas, setAvailableAreas] = useState<Area[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(true);

  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [shift, setShift] = useState('Matutino');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const operationalRole = selectedRole === '__OTHER__' ? customRole : selectedRole;
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [systemAccessLevel, setSystemAccessLevel] = useState<SystemAccessLevel>('NONE');

  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState('MXN');
  const [payrollFrequency, setPayrollFrequency] = useState<PayrollFrequency>('MONTHLY');
  const [firstPaymentDate, setFirstPaymentDate] = useState(() =>
    normalizePayrollDateInput('', 'MONTHLY')
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadAreas = async () => {
      if (!businessId) return;
      try {
        setIsLoadingAreas(true);
        const areas = await areasApi.list(businessId);
        setAvailableAreas(areas.filter((a) => a.status === 'ACTIVE'));
      } catch {
        // Areas are optional, don't block the form
      } finally {
        setIsLoadingAreas(false);
      }
    };
    loadAreas();
  }, [businessId]);

  const areaOptions = useMemo(
    () => [
      { label: 'Sin área asignada', value: '' },
      ...availableAreas.map((a) => ({ label: a.name, value: a.id })),
    ],
    [availableAreas],
  );

  const hasSystemAccess = systemAccessLevel !== 'NONE';
  const payrollHint = getPayrollFrequencyHint(payrollFrequency);

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

  const handleFullNameChange = (value: string) => {
    setFullName(value);

    if (!username.trim()) {
      setUsername(slugUsername(value));
    }
  };

  const handleAccessLevelChange = (value: SystemAccessLevel) => {
    setSystemAccessLevel(value);

    if (value === 'NONE') {
      setUsername('');
    } else if (!username.trim() && fullName.trim()) {
      setUsername(slugUsername(fullName));
    }
  };

  const handlePayrollFrequencyChange = (value: PayrollFrequency) => {
    setPayrollFrequency(value);
    setFirstPaymentDate((current) => normalizePayrollDateInput(current, value));
  };

  const handleCreateStaff = async () => {
    if (!businessId) return;

    if (!fullName.trim() || !operationalRole.trim()) {
      Alert.alert('Faltan datos', 'Completa nombre y rol operativo.');
      return;
    }

    if (selectedRole === '__OTHER__' && !customRole.trim()) {
      Alert.alert('Faltan datos', 'Escribe el rol operativo del empleado.');
      return;
    }

    if (hasSystemAccess && !username.trim()) {
      Alert.alert(
        'Falta username',
        'Si este empleado tendrá acceso al sistema, debes asignarle un username.'
      );
      return;
    }

    if (hasSystemAccess && !password.trim()) {
      Alert.alert(
        'Falta contraseña',
        'Crea una contraseña para que este empleado pueda iniciar sesión.'
      );
      return;
    }

    if (hasSystemAccess && password.trim().length < 6) {
      Alert.alert(
        'Contraseña muy corta',
        'La contraseña debe tener al menos 6 caracteres.'
      );
      return;
    }

    if (hasSystemAccess && !email.trim()) {
      Alert.alert(
        'Falta correo',
        'El correo es obligatorio para empleados con acceso al sistema.'
      );
      return;
    }

    if (salaryAmount.trim() && !firstPaymentDate.trim()) {
      Alert.alert(
        'Falta primer pago',
        'Selecciona la fecha en la que debe ocurrir el primer pago de este empleado.'
      );
      return;
    }

    if (firstPaymentDate.trim() && !isValidPayrollDateInput(firstPaymentDate.trim())) {
      Alert.alert('Fecha inválida', 'Selecciona una fecha válida para el primer pago.');
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

      await staffApi.create(businessId, {
        fullName: fullName.trim(),
        operationalRole: operationalRole.trim(),
        shift,
        assignedAreasJson: selectedAreaId
          ? { areaId: selectedAreaId, areaName: availableAreas.find((a) => a.id === selectedAreaId)?.name }
          : undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        email: email.trim() || undefined,
        username: hasSystemAccess ? username.trim() : undefined,
        password: hasSystemAccess ? password.trim() : undefined,
        systemAccessLevel,
        compensation: compensationPayload,
      });

      await markStaffStepCompleted(businessId);

      router.replace(`/businesses/${businessId}/staff`);
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos agregar al empleado.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-veritt-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Agrega un empleado."
            subtitle="Registra perfil, acceso y compensación del miembro del equipo."
          />

          <View className="gap-4">
            <VrittInput
              label="Nombre completo"
              placeholder="Juan Pérez"
              value={fullName}
              onChangeText={handleFullNameChange}
              editable={!isSubmitting}
            />

            <VrittSelect
              label="Rol operativo"
              value={selectedRole}
              options={PRESET_ROLES}
              onChange={setSelectedRole}
              disabled={isSubmitting}
            />

            {selectedRole === '__OTHER__' && (
              <VrittInput
                label="Especifica el rol"
                placeholder="Ej: Sommelier"
                value={customRole}
                onChangeText={setCustomRole}
                editable={!isSubmitting}
              />
            )}

            <VrittSelect
              label="Turno"
              value={shift}
              options={SHIFT_OPTIONS}
              onChange={setShift}
              disabled={isSubmitting}
            />

            {availableAreas.length > 0 && (
              <VrittSelect
                label="Área asignada"
                value={selectedAreaId}
                options={areaOptions}
                onChange={setSelectedAreaId}
                disabled={isSubmitting}
              />
            )}
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
                <>
                  <VrittInput
                    label="Username"
                    placeholder="juan.perez"
                    value={username}
                    onChangeText={(value) => setUsername(slugUsername(value))}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />

                  <VrittInput
                    label="Contraseña"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />

                  <Text className="text-[13px] leading-[20px] text-veritt-muted">
                    Con estas credenciales el empleado podrá iniciar sesión. El correo es obligatorio.
                  </Text>
                </>
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
                onChange={handlePayrollFrequencyChange}
                disabled={isSubmitting}
              />

              <PayrollDateSelector
                value={firstPaymentDate}
                payrollFrequency={payrollFrequency}
                onChange={setFirstPaymentDate}
                disabled={isSubmitting}
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

          <View className="gap-3.5">
            <VrittButton
              label="Guardar empleado"
              loading={isSubmitting}
              onPress={handleCreateStaff}
            />

            <VrittButton
              label="Cancelar"
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
