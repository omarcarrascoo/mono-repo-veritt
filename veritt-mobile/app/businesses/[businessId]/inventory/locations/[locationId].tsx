import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { inventoryApi } from '@/api/modules/inventory.api';
import { notify } from '@/lib/notify';
import { getApiErrorMessage } from '@/utils/error.utils';
import {
  formatInventoryStatus,
  formatLocationType,
} from '@/lib/inventory-formatters';
import type {
  InventoryLocation,
  InventoryLocationType,
} from '@/types/inventory.types';
import { surface } from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittInventoryHeader } from '@/components/inventory/VrittInventoryHeader';
import { VrittInventoryCard } from '@/components/inventory/VrittInventoryCard';
import { VrittInventoryFacts } from '@/components/inventory/VrittInventoryFacts';
import {
  VrittPaperInput,
  VrittPaperOptionPicker,
} from '@/components/inventory/VrittPaperInput';
import { VrittInventoryFooterActions } from '@/components/inventory/VrittInventoryFooterActions';

const TYPE_OPTIONS: {
  label: string;
  value: InventoryLocationType;
  icon:
    | 'star-outline'
    | 'archive-outline'
    | 'storefront-outline'
    | 'restaurant-outline'
    | 'location-outline';
}[] = [
  { label: 'Principal', value: 'MAIN', icon: 'star-outline' },
  { label: 'Almacén', value: 'WAREHOUSE', icon: 'archive-outline' },
  { label: 'Restaurante', value: 'RESTAURANT', icon: 'storefront-outline' },
  { label: 'Cocina', value: 'KITCHEN', icon: 'restaurant-outline' },
  { label: 'Otro', value: 'OTHER', icon: 'location-outline' },
];

export default function LocationDetailScreen() {
  const { businessId, locationId } = useLocalSearchParams<{
    businessId: string;
    locationId: string;
  }>();

  const [location, setLocation] = useState<InventoryLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<InventoryLocationType>('MAIN');

  const loadLocation = useCallback(async () => {
    if (!businessId || !locationId) return;
    try {
      setIsLoading(true);
      const list = await inventoryApi.listLocations(businessId);
      const found = list.find((l) => l.id === locationId);
      if (found) {
        setLocation(found);
        setEditName(found.name);
        setEditType(found.type);
      } else {
        setLocation(null);
      }
    } catch (err) {
      notify.error(
        'No pudimos cargar la ubicación',
        getApiErrorMessage(err, 'Verifica tu conexión.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [businessId, locationId]);

  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  const onBack = useCallback(() => router.back(), []);

  const handleSave = useCallback(async () => {
    if (!businessId || !locationId || !editName.trim()) return;
    try {
      setIsSubmitting(true);
      await inventoryApi.updateLocation(businessId, locationId, {
        name: editName.trim(),
        type: editType,
      });
      notify.success('Cambios guardados', 'La ubicación fue actualizada.');
      setIsEditing(false);
      loadLocation();
    } catch (err) {
      notify.error(
        'No pudimos actualizar',
        getApiErrorMessage(err, 'Intenta de nuevo en unos segundos.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [businessId, locationId, editName, editType, loadLocation]);

  const handleToggleStatus = useCallback(() => {
    if (!businessId || !locationId || !location) return;
    const newStatus = location.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const verb = newStatus === 'ACTIVE' ? 'activar' : 'desactivar';

    Alert.alert(
      `¿${verb.charAt(0).toUpperCase() + verb.slice(1)} ubicación?`,
      `¿Quieres ${verb} "${location.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: newStatus === 'INACTIVE' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await inventoryApi.updateLocation(businessId, locationId, {
                status: newStatus,
              });
              notify.success(
                'Listo',
                `Ubicación ${
                  newStatus === 'ACTIVE' ? 'reactivada' : 'desactivada'
                }.`,
              );
              loadLocation();
            } catch (err) {
              notify.error(
                'No pudimos actualizar',
                getApiErrorMessage(err, 'Intenta de nuevo.'),
              );
            }
          },
        },
      ],
    );
  }, [businessId, locationId, location, loadLocation]);

  if (isLoading) return <VrittLoader />;

  if (!location) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <VrittInventoryHeader
          eyebrow="Ubicación"
          title="No encontrada"
          onBack={onBack}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: surface.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />

      <VrittInventoryHeader
        eyebrow={
          location.isPrimary
            ? 'Ubicación principal'
            : 'Ubicación de inventario'
        }
        title={location.name}
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
        {!isEditing ? (
          <>
            <VrittInventoryCard eyebrow="Información">
              <VrittInventoryFacts
                facts={[
                  { label: 'Tipo', value: formatLocationType(location.type) },
                  {
                    label: 'Estado',
                    value: formatInventoryStatus(location.status),
                  },
                  {
                    label: 'Principal',
                    value: location.isPrimary ? 'Sí' : 'No',
                  },
                  ...(location.area
                    ? [{ label: 'Área', value: location.area.name }]
                    : []),
                ]}
              />
            </VrittInventoryCard>

            <VrittInventoryFooterActions
              primary={{
                label: 'Editar ubicación',
                icon: 'create-outline',
                onPress: () => setIsEditing(true),
              }}
              secondary={
                !location.isPrimary
                  ? {
                      label:
                        location.status === 'ACTIVE'
                          ? 'Desactivar'
                          : 'Reactivar',
                      onPress: handleToggleStatus,
                    }
                  : undefined
              }
            />
          </>
        ) : (
          <>
            <VrittInventoryCard eyebrow="Editar datos">
              <View style={{ gap: 14 }}>
                <VrittPaperInput
                  label="Nombre"
                  value={editName}
                  onChangeText={setEditName}
                  editable={!isSubmitting}
                  required
                />
                <VrittPaperOptionPicker
                  label="Tipo"
                  options={TYPE_OPTIONS}
                  value={editType}
                  onChange={setEditType}
                />
              </View>
            </VrittInventoryCard>

            <VrittInventoryFooterActions
              primary={{
                label: 'Guardar cambios',
                icon: 'save-outline',
                onPress: handleSave,
                loading: isSubmitting,
                disabled: !editName.trim(),
              }}
              secondary={{
                label: 'Cancelar',
                onPress: () => {
                  setIsEditing(false);
                  setEditName(location.name);
                  setEditType(location.type);
                },
                disabled: isSubmitting,
              }}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
