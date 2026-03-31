import React, { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'

import { inventoryApi } from '@/api/modules/inventory.api'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittSelect } from '@/components/ui/VrittSelect'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'
import { InventoryLocationType } from '@/types/inventory.types'
import { getApiErrorMessage } from '@/utils/error.utils'

const LOCATION_TYPE_OPTIONS: { label: string; value: InventoryLocationType; hint?: string }[] = [
  { label: 'Almacén', value: 'WAREHOUSE', hint: 'Ideal para CEDIS o bodega' },
  { label: 'Restaurante', value: 'RESTAURANT', hint: 'Punto de venta o sucursal' },
  { label: 'Cocina', value: 'KITCHEN', hint: 'Producción o preparación' },
  { label: 'Otro', value: 'OTHER', hint: 'Ubicación operativa adicional' },
]

export default function CreateInventoryLocationScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()

  const [name, setName] = useState('')
  const [type, setType] = useState<InventoryLocationType>('WAREHOUSE')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateLocation = async () => {
    if (!businessId) return

    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Asigna un nombre para esta ubicación.')
      return
    }

    try {
      setIsSubmitting(true)
      await inventoryApi.createLocation(businessId, {
        name: name.trim(),
        type,
      })

      router.replace(`/businesses/${businessId}/inventory`)
    } catch (error) {
      Alert.alert(
        'Error',
        getApiErrorMessage(error, 'No pudimos crear la ubicación.')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-veritt-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Agrega una ubicación."
            subtitle="Crea almacenes, cocinas o restaurantes dentro del mismo negocio para mover stock entre ellos."
          />

          <VrittCard>
            <VrittSectionLabel className="mb-3">Contexto</VrittSectionLabel>
            <Text className="text-[14px] leading-[22px] text-veritt-muted">
              Tu negocio ya cuenta con una ubicación principal creada automáticamente.
              Usa esta pantalla para agregar ubicaciones opcionales como CEDIS, cocinas
              o sucursales.
            </Text>
          </VrittCard>

          <View className="gap-4">
            <VrittInput
              label="Nombre"
              placeholder="CEDIS Norte"
              value={name}
              onChangeText={setName}
              editable={!isSubmitting}
            />

            <VrittSelect
              label="Tipo de ubicación"
              value={type}
              options={LOCATION_TYPE_OPTIONS}
              onChange={setType}
              disabled={isSubmitting}
            />
          </View>

          <View className="gap-3.5">
            <VrittButton
              label="Guardar ubicación"
              loading={isSubmitting}
              onPress={handleCreateLocation}
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
  )
}
