import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { inventoryApi } from '@/api/modules/inventory.api';
import { useBusinessStore } from '@/store/business.store';
import { permissions } from '@/lib/role-permissions';
import { notify } from '@/lib/notify';
import { getApiErrorMessage } from '@/utils/error.utils';
import type { InventoryLocationType } from '@/types/inventory.types';
import { surface } from '@/constants/design-tokens';

import { VrittInventoryHeader } from '@/components/inventory/VrittInventoryHeader';
import { VrittInventoryCard } from '@/components/inventory/VrittInventoryCard';
import {
  VrittPaperInput,
  VrittPaperOptionPicker,
} from '@/components/inventory/VrittPaperInput';
import { VrittInventoryFooterActions } from '@/components/inventory/VrittInventoryFooterActions';

const TYPE_OPTIONS: {
  label: string;
  value: InventoryLocationType;
  icon: 'archive-outline' | 'storefront-outline' | 'restaurant-outline' | 'location-outline';
}[] = [
  { label: 'Almacén', value: 'WAREHOUSE', icon: 'archive-outline' },
  { label: 'Restaurante', value: 'RESTAURANT', icon: 'storefront-outline' },
  { label: 'Cocina', value: 'KITCHEN', icon: 'restaurant-outline' },
  { label: 'Otro', value: 'OTHER', icon: 'location-outline' },
];

export default function CreateInventoryLocationScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const role = useBusinessStore((s) =>
    businessId ? s.getRole(businessId) : null,
  );
  const canManageInventory = permissions.canManageInventory(role);

  useEffect(() => {
    if (!canManageInventory && businessId) {
      router.replace(`/businesses/${businessId}/inventory`);
    }
  }, [canManageInventory, businessId]);

  const [name, setName] = useState('');
  const [type, setType] = useState<InventoryLocationType>('WAREHOUSE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onBack = useCallback(() => router.back(), []);

  const handleCreate = useCallback(async () => {
    if (!businessId) return;
    if (!name.trim()) {
      notify.warning(
        'Falta el nombre',
        'Asigna un nombre para esta ubicación.',
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await inventoryApi.createLocation(businessId, {
        name: name.trim(),
        type,
      });
      notify.success('Ubicación creada', 'Ya puedes asignar stock aquí.');
      router.replace(`/businesses/${businessId}/inventory`);
    } catch (err) {
      notify.error(
        'No pudimos crear la ubicación',
        getApiErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [businessId, name, type]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: surface.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <VrittInventoryHeader
        eyebrow="Inventario"
        title="Nueva ubicación"
        onBack={onBack}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 28,
          paddingBottom: 220,
          gap: 28,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <VrittInventoryCard
          eyebrow="Contexto"
          description="Tu negocio ya tiene una ubicación principal. Usa esta pantalla para crear sucursales, CEDIS o cocinas adicionales y mover stock entre ellas."
        />

        <View style={{ gap: 16 }}>
          <VrittPaperInput
            label="Nombre"
            placeholder="CEDIS Norte"
            value={name}
            onChangeText={setName}
            editable={!isSubmitting}
            required
          />

          <VrittPaperOptionPicker
            label="Tipo de ubicación"
            options={TYPE_OPTIONS}
            value={type}
            onChange={setType}
            required
          />
        </View>

        <VrittInventoryFooterActions
          primary={{
            label: 'Guardar ubicación',
            icon: 'save-outline',
            onPress: handleCreate,
            loading: isSubmitting,
            disabled: !name.trim(),
          }}
          secondary={{
            label: 'Cancelar',
            onPress: onBack,
            disabled: isSubmitting,
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
