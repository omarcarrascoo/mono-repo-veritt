// import React, { useMemo, useState } from 'react';
// import {
//   Alert,
//   KeyboardAvoidingView,
//   Platform,
//   View,
// } from 'react-native';
// import { router, useLocalSearchParams } from 'expo-router';

// import { VrittHeader } from '@/components/ui/VrittHeader';
// import { VrittInput } from '@/components/ui/VrittInput';
// import { VrittButton } from '@/components/ui/VrittButton';
// import { VrittScreen } from '@/components/ui/VrittScreen';
// import { VrittSelect } from '@/components/ui/VrittSelect';

// import { staffApi } from '@/api/modules/staff.api';
// import { getApiErrorMessage } from '@/utils/error.utils';
// import { markStaffStepCompleted } from '@/lib/update-onboarding';
// import {
//   CreateStaffCompensationDto,
//   PayrollFrequency,
//   SystemAccessLevel,
// } from '@/types/staff.types';

// const SHIFT_OPTIONS = [
//   { label: 'Matutino', value: 'Matutino' },
//   { label: 'Vespertino', value: 'Vespertino' },
//   { label: 'Nocturno', value: 'Nocturno' },
//   { label: 'Mixto', value: 'Mixto' },
// ];

// const ACCESS_LEVEL_OPTIONS: { label: string; value: SystemAccessLevel }[] = [
//   { label: 'Sin acceso', value: 'NONE' },
//   { label: 'Operador', value: 'OPERATOR' },
//   { label: 'Supervisor', value: 'SUPERVISOR' },
//   { label: 'Admin', value: 'ADMIN' },
// ];

// const PAYROLL_OPTIONS: { label: string; value: PayrollFrequency }[] = [
//   { label: 'Diario', value: 'DAILY' },
//   { label: 'Semanal', value: 'WEEKLY' },
//   { label: 'Quincenal', value: 'BIWEEKLY' },
//   { label: 'Dos veces al mes', value: 'SEMIMONTHLY' },
//   { label: 'Mensual', value: 'MONTHLY' },
// ];

// const WEEK_DAYS = [
//   { label: 'Lunes', value: '1' },
//   { label: 'Martes', value: '2' },
//   { label: 'Miércoles', value: '3' },
//   { label: 'Jueves', value: '4' },
//   { label: 'Viernes', value: '5' },
//   { label: 'Sábado', value: '6' },
//   { label: 'Domingo', value: '7' },
// ];

// const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => ({
//   label: `Día ${i + 1}`,
//   value: String(i + 1),
// }));

// export default function CreateStaffScreen() {
//   const { businessId } = useLocalSearchParams<{ businessId: string }>();

//   const [fullName, setFullName] = useState('');
//   const [operationalRole, setOperationalRole] = useState('');
//   const [shift, setShift] = useState('Matutino');
//   const [area, setArea] = useState('');
//   const [phoneNumber, setPhoneNumber] = useState('');
//   const [email, setEmail] = useState('');
//   const [username, setUsername] = useState('');
//   const [systemAccessLevel, setSystemAccessLevel] = useState<SystemAccessLevel>('NONE');

//   const [salaryAmount, setSalaryAmount] = useState('');
//   const [salaryCurrency, setSalaryCurrency] = useState('MXN');
//   const [payrollFrequency, setPayrollFrequency] = useState<PayrollFrequency>('MONTHLY');
//   const [weeklyPayDay, setWeeklyPayDay] = useState('5');
//   const [monthlyPayDay, setMonthlyPayDay] = useState('15');
//   const [semimonthlyFirstDay, setSemimonthlyFirstDay] = useState('15');
//   const [semimonthlySecondDay, setSemimonthlySecondDay] = useState('30');

//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const shouldShowWeekly = payrollFrequency === 'WEEKLY' || payrollFrequency === 'BIWEEKLY';
//   const shouldShowMonthly = payrollFrequency === 'MONTHLY';
//   const shouldShowSemimonthly = payrollFrequency === 'SEMIMONTHLY';

//   const compensationPayload = useMemo<CreateStaffCompensationDto | undefined>(() => {
//     if (!salaryAmount.trim()) return undefined;

//     const parsedSalary = Number(salaryAmount);
//     if (Number.isNaN(parsedSalary)) return undefined;

//     return {
//       salaryAmount: parsedSalary,
//       salaryCurrency,
//       payrollFrequency,
//       weeklyPayDay: shouldShowWeekly ? Number(weeklyPayDay) : undefined,
//       monthlyPayDay: shouldShowMonthly ? Number(monthlyPayDay) : undefined,
//       semimonthlyFirstDay: shouldShowSemimonthly ? Number(semimonthlyFirstDay) : undefined,
//       semimonthlySecondDay: shouldShowSemimonthly ? Number(semimonthlySecondDay) : undefined,
//     };
//   }, [
//     salaryAmount,
//     salaryCurrency,
//     payrollFrequency,
//     shouldShowWeekly,
//     shouldShowMonthly,
//     shouldShowSemimonthly,
//     weeklyPayDay,
//     monthlyPayDay,
//     semimonthlyFirstDay,
//     semimonthlySecondDay,
//   ]);

//   const handleCreateStaff = async () => {
//     if (!businessId) return;

//     if (!fullName.trim() || !operationalRole.trim() || !shift.trim()) {
//       Alert.alert('Faltan datos', 'Completa los campos requeridos del empleado.');
//       return;
//     }

//     if (salaryAmount.trim() && !compensationPayload) {
//       Alert.alert('Dato inválido', 'El salario debe ser numérico.');
//       return;
//     }

//     try {
//       setIsSubmitting(true);

//       await staffApi.create(businessId, {
//         fullName: fullName.trim(),
//         operationalRole: operationalRole.trim(),
//         shift,
//         assignedAreasJson: area.trim() ? { area: area.trim() } : undefined,
//         phoneNumber: phoneNumber.trim() || undefined,
//         email: email.trim() || undefined,
//         username: username.trim() || undefined,
//         systemAccessLevel,
//         compensation: compensationPayload,
//       });

//       await markStaffStepCompleted(businessId);

//       router.replace(`/businesses/${businessId}/staff`);
//     } catch (error) {
//       Alert.alert('Error', getApiErrorMessage(error, 'No pudimos agregar al empleado.'));
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <KeyboardAvoidingView
//       className="flex-1 bg-veritt-bg"
//       behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//     >
//       <VrittScreen scrollable>
//         <View className="gap-8">
//           <VrittHeader
//             title="Agrega un empleado."
//             subtitle="Registra perfil, acceso y compensación del miembro del equipo."
//           />

//           <View className="gap-4">
//             <VrittInput
//               label="Nombre completo"
//               placeholder="Juan Pérez"
//               value={fullName}
//               onChangeText={setFullName}
//               editable={!isSubmitting}
//             />

//             <VrittInput
//               label="Rol operativo"
//               placeholder="Mesero Principal"
//               value={operationalRole}
//               onChangeText={setOperationalRole}
//               editable={!isSubmitting}
//             />

//             <VrittSelect
//               label="Turno"
//               value={shift}
//               options={SHIFT_OPTIONS}
//               onChange={setShift}
//               disabled={isSubmitting}
//             />

//             <VrittInput
//               label="Área asignada"
//               placeholder="Terraza"
//               value={area}
//               onChangeText={setArea}
//               editable={!isSubmitting}
//             />

//             <VrittInput
//               label="Teléfono"
//               placeholder="+52 999 123 4567"
//               value={phoneNumber}
//               onChangeText={setPhoneNumber}
//               keyboardType="phone-pad"
//               editable={!isSubmitting}
//             />

//             <VrittInput
//               label="Correo"
//               placeholder="empleado@negocio.com"
//               value={email}
//               onChangeText={setEmail}
//               keyboardType="email-address"
//               autoCapitalize="none"
//               editable={!isSubmitting}
//             />

//             <VrittInput
//               label="Username"
//               placeholder="juan.perez"
//               value={username}
//               onChangeText={setUsername}
//               autoCapitalize="none"
//               editable={!isSubmitting}
//             />

//             <VrittSelect
//               label="Nivel de acceso"
//               value={systemAccessLevel}
//               options={ACCESS_LEVEL_OPTIONS}
//               onChange={setSystemAccessLevel}
//               disabled={isSubmitting}
//             />

//             <VrittInput
//               label="Salario"
//               placeholder="12000"
//               value={salaryAmount}
//               onChangeText={setSalaryAmount}
//               keyboardType="numeric"
//               editable={!isSubmitting}
//             />

//             <VrittInput
//               label="Moneda"
//               placeholder="MXN"
//               value={salaryCurrency}
//               onChangeText={setSalaryCurrency}
//               autoCapitalize="characters"
//               editable={!isSubmitting}
//             />

//             <VrittSelect
//               label="Frecuencia de pago"
//               value={payrollFrequency}
//               options={PAYROLL_OPTIONS}
//               onChange={setPayrollFrequency}
//               disabled={isSubmitting}
//             />

//             {shouldShowWeekly ? (
//               <VrittSelect
//                 label="Día de pago"
//                 value={weeklyPayDay}
//                 options={WEEK_DAYS}
//                 onChange={setWeeklyPayDay}
//                 disabled={isSubmitting}
//               />
//             ) : null}

//             {shouldShowMonthly ? (
//               <VrittSelect
//                 label="Día del mes para pagar"
//                 value={monthlyPayDay}
//                 options={MONTH_DAYS}
//                 onChange={setMonthlyPayDay}
//                 disabled={isSubmitting}
//               />
//             ) : null}

//             {shouldShowSemimonthly ? (
//               <>
//                 <VrittSelect
//                   label="Primer día de pago"
//                   value={semimonthlyFirstDay}
//                   options={MONTH_DAYS}
//                   onChange={setSemimonthlyFirstDay}
//                   disabled={isSubmitting}
//                 />
//                 <VrittSelect
//                   label="Segundo día de pago"
//                   value={semimonthlySecondDay}
//                   options={MONTH_DAYS}
//                   onChange={setSemimonthlySecondDay}
//                   disabled={isSubmitting}
//                 />
//               </>
//             ) : null}
//           </View>

//           <View className="gap-3.5">
//             <VrittButton
//               label="Guardar empleado"
//               loading={isSubmitting}
//               onPress={handleCreateStaff}
//             />

//             <VrittButton
//               label="Cancelar"
//               variant="secondary"
//               onPress={() => router.back()}
//               disabled={isSubmitting}
//             />
//           </View>
//         </View>
//       </VrittScreen>
//     </KeyboardAvoidingView>
//   );
// }


import React, { useMemo, useState } from 'react';
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

import { staffApi } from '@/api/modules/staff.api';
import { getApiErrorMessage } from '@/utils/error.utils';
import { markStaffStepCompleted } from '@/lib/update-onboarding';
import {
  CreateStaffCompensationDto,
  PayrollFrequency,
  SystemAccessLevel,
} from '@/types/staff.types';

const SHIFT_OPTIONS = [
  { label: 'Matutino', value: 'Matutino' },
  { label: 'Vespertino', value: 'Vespertino' },
  { label: 'Nocturno', value: 'Nocturno' },
  { label: 'Mixto', value: 'Mixto' },
];

const ACCESS_LEVEL_OPTIONS: { label: string; value: SystemAccessLevel }[] = [
  { label: 'Sin acceso', value: 'NONE', hint: 'Solo perfil operativo' },
  { label: 'Operador', value: 'OPERATOR', hint: 'Acceso básico' },
  { label: 'Supervisor', value: 'SUPERVISOR', hint: 'Más control operativo' },
  { label: 'Admin', value: 'ADMIN', hint: 'Acceso amplio' },
];

const PAYROLL_OPTIONS: { label: string; value: PayrollFrequency }[] = [
  { label: 'Diario', value: 'DAILY' },
  { label: 'Semanal', value: 'WEEKLY' },
  { label: 'Quincenal', value: 'BIWEEKLY' },
  { label: 'Dos veces al mes', value: 'SEMIMONTHLY' },
  { label: 'Mensual', value: 'MONTHLY' },
];

const WEEK_DAYS = [
  { label: 'Lunes', value: '1' },
  { label: 'Martes', value: '2' },
  { label: 'Miércoles', value: '3' },
  { label: 'Jueves', value: '4' },
  { label: 'Viernes', value: '5' },
  { label: 'Sábado', value: '6' },
  { label: 'Domingo', value: '7' },
];

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => ({
  label: `Día ${i + 1}`,
  value: String(i + 1),
}));

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
  const [weeklyPayDay, setWeeklyPayDay] = useState('5');
  const [monthlyPayDay, setMonthlyPayDay] = useState('15');
  const [semimonthlyFirstDay, setSemimonthlyFirstDay] = useState('15');
  const [semimonthlySecondDay, setSemimonthlySecondDay] = useState('30');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasSystemAccess = systemAccessLevel !== 'NONE';
  const shouldShowWeekly = payrollFrequency === 'WEEKLY' || payrollFrequency === 'BIWEEKLY';
  const shouldShowMonthly = payrollFrequency === 'MONTHLY';
  const shouldShowSemimonthly = payrollFrequency === 'SEMIMONTHLY';

  const compensationPayload = useMemo<CreateStaffCompensationDto | undefined>(() => {
    if (!salaryAmount.trim()) return undefined;

    const parsedSalary = Number(salaryAmount);

    if (Number.isNaN(parsedSalary)) return undefined;

    return {
      salaryAmount: parsedSalary,
      salaryCurrency,
      payrollFrequency,
      weeklyPayDay: shouldShowWeekly ? Number(weeklyPayDay) : undefined,
      monthlyPayDay: shouldShowMonthly ? Number(monthlyPayDay) : undefined,
      semimonthlyFirstDay: shouldShowSemimonthly ? Number(semimonthlyFirstDay) : undefined,
      semimonthlySecondDay: shouldShowSemimonthly ? Number(semimonthlySecondDay) : undefined,
    };
  }, [
    salaryAmount,
    salaryCurrency,
    payrollFrequency,
    shouldShowWeekly,
    shouldShowMonthly,
    shouldShowSemimonthly,
    weeklyPayDay,
    monthlyPayDay,
    semimonthlyFirstDay,
    semimonthlySecondDay,
  ]);

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

  const handleCreateStaff = async () => {
    if (!businessId) return;

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

    if (salaryAmount.trim() && !compensationPayload) {
      Alert.alert('Dato inválido', 'El salario debe ser numérico.');
      return;
    }

    try {
      setIsSubmitting(true);

      await staffApi.create(businessId, {
        fullName: fullName.trim(),
        operationalRole: operationalRole.trim(),
        shift,
        assignedAreasJson: area.trim() ? { area: area.trim() } : undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        email: email.trim() || undefined,
        username: hasSystemAccess ? username.trim() : undefined,
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

              {shouldShowWeekly ? (
                <VrittSelect
                  label="Día de pago"
                  value={weeklyPayDay}
                  options={WEEK_DAYS}
                  onChange={setWeeklyPayDay}
                  disabled={isSubmitting}
                />
              ) : null}

              {shouldShowMonthly ? (
                <VrittSelect
                  label="Día del mes para pagar"
                  value={monthlyPayDay}
                  options={MONTH_DAYS}
                  onChange={setMonthlyPayDay}
                  disabled={isSubmitting}
                />
              ) : null}

              {shouldShowSemimonthly ? (
                <>
                  <VrittSelect
                    label="Primer día de pago"
                    value={semimonthlyFirstDay}
                    options={MONTH_DAYS}
                    onChange={setSemimonthlyFirstDay}
                    disabled={isSubmitting}
                  />
                  <VrittSelect
                    label="Segundo día de pago"
                    value={semimonthlySecondDay}
                    options={MONTH_DAYS}
                    onChange={setSemimonthlySecondDay}
                    disabled={isSubmitting}
                  />
                </>
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