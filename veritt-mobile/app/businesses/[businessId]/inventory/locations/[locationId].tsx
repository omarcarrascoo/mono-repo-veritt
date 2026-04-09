import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { inventoryApi } from '@/api/modules/inventory.api'
import { InventoryLocation, InventoryLocationType } from '@/types/inventory.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittSelect } from '@/components/ui/VrittSelect'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

const LOCATION_TYPE_OPTIONS: { label: string; value: InventoryLocationType }[] = [
  { label: 'Principal', value: 'MAIN' },
  { label: 'Almacén', value: 'WAREHOUSE' },
  { label: 'Restaurante', value: 'RESTAURANT' },
  { label: 'Cocina', value: 'KITCHEN' },
  { label: 'Otro', value: 'OTHER' },
]

function formatLocationType(type: string) {
  const map: Record<string, string> = {
    MAIN: 'Principal',
    WAREHOUSE: 'Almacén',
    RESTAURANT: 'Restaurante',
    KITCHEN: 'Cocina',
    OTHER: 'Otro',
  }
  return map[type] || type
}

export default function LocationDetailScreen() {
  const { businessId, locationId } = useLocalSearchParams<{ businessId: string; locationId: string }>()
  const [location, setLocation] = useState<InventoryLocation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<InventoryLocationType>('MAIN')

  const loadLocation = useCallback(async () => {
    if (!businessId || !locationId) return
    try {
      setIsLoading(true)
      const locations = await inventoryApi.listLocations(businessId)
      const found = locations.find((l) => l.id === locationId)
      if (found) {
        setLocation(found)
        setEditName(found.name)
        setEditType(found.type)
      }
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar la ubicación.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId, locationId])

  useEffect(() => { loadLocation() }, [loadLocation])

  const handleSave = async () => {
    if (!businessId || !locationId || !editName.trim()) return
    try {
      setIsSubmitting(true)
      await inventoryApi.updateLocation(businessId, locationId, {
        name: editName.trim(),
        type: editType,
      })
      setIsEditing(false)
      loadLocation()
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos actualizar la ubicación.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = () => {
    if (!businessId || !locationId) return
    const newStatus = location?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const label = newStatus === 'ACTIVE' ? 'activar' : 'desactivar'

    Alert.alert(
      `¿${label.charAt(0).toUpperCase() + label.slice(1)} ubicación?`,
      `¿Quieres ${label} "${location?.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: newStatus === 'INACTIVE' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await inventoryApi.updateLocation(businessId, locationId, { status: newStatus })
              loadLocation()
            } catch (error) {
              Alert.alert('Error', getApiErrorMessage(error, 'No pudimos actualizar el status.'))
            }
          },
        },
      ],
    )
  }

  if (isLoading) return <VrittLoader />
  if (!location) return <VrittScreen><VrittHeader title="Ubicación no encontrada." /></VrittScreen>

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title={location.name}
          subtitle={`${formatLocationType(location.type)} · ${location.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}${location.isPrimary ? ' · Principal' : ''}`}
        />

        {!isEditing ? (
          <>
            <VrittCard>
              <VrittSectionLabel className="mb-3">Información</VrittSectionLabel>
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Tipo</Text>
                  <Text className="text-veritt-text text-[15px]">{formatLocationType(location.type)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Estado</Text>
                  <Text className="text-veritt-text text-[15px]">{location.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Principal</Text>
                  <Text className="text-veritt-text text-[15px]">{location.isPrimary ? 'Sí' : 'No'}</Text>
                </View>
                {location.area && (
                  <View className="flex-row justify-between">
                    <Text className="text-veritt-muted text-[15px]">Área</Text>
                    <Text className="text-veritt-text text-[15px]">{location.area.name}</Text>
                  </View>
                )}
              </View>
            </VrittCard>

            <View className="gap-3.5">
              <VrittButton label="Editar" onPress={() => setIsEditing(true)} />
              {!location.isPrimary && (
                <VrittButton
                  label={location.status === 'ACTIVE' ? 'Desactivar ubicación' : 'Activar ubicación'}
                  variant="secondary"
                  onPress={handleToggleStatus}
                />
              )}
              <VrittButton
                label="Volver al inventario"
                variant="secondary"
                onPress={() => router.replace(`/businesses/${businessId}/inventory`)}
              />
            </View>
          </>
        ) : (
          <>
            <View className="gap-4">
              <VrittInput label="Nombre" value={editName} onChangeText={setEditName} editable={!isSubmitting} />
              <VrittSelect
                label="Tipo"
                value={editType}
                options={LOCATION_TYPE_OPTIONS}
                onChange={setEditType}
                disabled={isSubmitting}
              />
            </View>

            <View className="gap-3.5">
              <VrittButton label="Guardar cambios" loading={isSubmitting} onPress={handleSave} />
              <VrittButton label="Cancelar" variant="secondary" onPress={() => setIsEditing(false)} disabled={isSubmitting} />
            </View>
          </>
        )}
      </View>
    </VrittScreen>
  )
}
