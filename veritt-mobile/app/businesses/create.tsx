import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { VrittHeader } from '@/components/ui/VrittHeader';
import { VrittInput } from '@/components/ui/VrittInput';
import { VrittButton } from '@/components/ui/VrittButton';
import { VrittScreen } from '@/components/ui/VrittScreen';
import { VrittSelect } from '@/components/ui/VrittSelect';

import { businessesApi } from '@/api/modules/businesses.api';
import { BusinessType } from '@/types/business.types';
import { getApiErrorMessage } from '@/utils/error.utils';
import { markGeneralInfoCompleted } from '@/lib/update-onboarding';
import { CUTOFF_HOUR_OPTIONS, TIMEZONE_OPTIONS } from '@/constants/business-options';
import { slugify } from '@/utils/utils';

function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City';
  } catch {
    return 'America/Mexico_City';
  }
}

const BUSINESS_TYPES: BusinessType[] = [
  'RESTAURANT',
  'CAFE',
  'BAR',
  'RETAIL',
  'OTHER',
];

export default function CreateBusinessScreen() {
  const detectedTimezone = useMemo(() => getUserTimezone(), []);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('RESTAURANT');
  const [timezone, setTimezone] = useState(detectedTimezone);
  const [operationalDayCutoffHour, setOperationalDayCutoffHour] = useState('4');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateBusiness = async () => {
    if (!name.trim() || !slug.trim()) {
      Alert.alert('Faltan datos', 'Ingresa el nombre y el slug del negocio.');
      return;
    }

    const cutoff = Number(operationalDayCutoffHour);

    if (Number.isNaN(cutoff)) {
      Alert.alert('Dato inválido', 'La hora de corte debe ser numérica.');
      return;
    }

    try {
      setIsSubmitting(true);

      const business = await businessesApi.create({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        businessType,
        timezone: timezone.trim(),
        operationalDayCutoffHour: cutoff,
      });

      await markGeneralInfoCompleted(business.id);

      router.replace(`/businesses/${business.id}`);
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos crear el negocio.'));
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
            title="Crea tu negocio."
            subtitle="Configura la base de tu operación para empezar a administrar equipo, procesos y crecimiento."
          />

          <View className="gap-4">
            <VrittInput
              label="Nombre"
              placeholder="La Taquería de Veritt"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (!slug.trim() || slug === slugify(name)) {
                  setSlug(slugify(text));
                }
              }}
              editable={!isSubmitting}
            />

            <VrittInput
              label="Slug"
              placeholder="taqueria-veritt"
              value={slug}
              onChangeText={setSlug}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />

            <View className="rounded-card border border-veritt-border bg-veritt-surface p-5">
              <Text className="mb-3 text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
                Tipo de negocio
              </Text>

              <View className="flex-row flex-wrap gap-2">
                {BUSINESS_TYPES.map((type) => {
                  const selected = businessType === type;

                  return (
                    <TouchableOpacity
                      key={type}
                      activeOpacity={0.9}
                      disabled={isSubmitting}
                      onPress={() => setBusinessType(type)}
                      className={`rounded-full border px-4 py-2 ${
                        selected
                          ? 'border-veritt-borderStrong bg-[#151515]'
                          : 'border-veritt-border bg-veritt-surfaceSoft'
                      }`}
                    >
                      <Text
                        className={`text-[12px] font-bold uppercase tracking-[1px] ${
                          selected ? 'text-veritt-text' : 'text-veritt-muted'
                        }`}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <VrittSelect
              label="Timezone"
              value={timezone}
              options={TIMEZONE_OPTIONS}
              onChange={setTimezone}
              disabled={isSubmitting}
            />

            <VrittSelect
              label="Hora de corte operativo"
              value={operationalDayCutoffHour}
              options={CUTOFF_HOUR_OPTIONS}
              onChange={setOperationalDayCutoffHour}
              disabled={isSubmitting}
            />
          </View>

          <View className="gap-3.5">
            <VrittButton
              label="Crear negocio"
              loading={isSubmitting}
              onPress={handleCreateBusiness}
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