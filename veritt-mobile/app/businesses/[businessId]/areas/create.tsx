import React, { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { areasApi } from '@/api/modules/areas.api'
import { AreaType } from '@/types/area.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { markAreasStepCompleted } from '@/lib/update-onboarding'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittSelect } from '@/components/ui/VrittSelect'
import { VrittButton } from '@/components/ui/VrittButton'

const AREA_TYPE_OPTIONS = [
  { label: 'Cocina', value: 'KITCHEN' },
  { label: 'Barra', value: 'BAR' },
  { label: 'Comedor', value: 'DINING' },
  { label: 'Caja', value: 'CASH_REGISTER' },
  { label: 'Almacén', value: 'WAREHOUSE' },
  { label: 'Oficina', value: 'OFFICE' },
  { label: 'Producción', value: 'PRODUCTION' },
  { label: 'Otro', value: 'OTHER' },
]

export default function CreateAreaScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [name, setName] = useState('')
  const [type, setType] = useState<AreaType>('OTHER')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!businessId) return
    if (!name.trim()) {
      Alert.alert('Faltan datos', 'El nombre del área es obligatorio.')
      return
    }

    try {
      setIsSubmitting(true)
      await areasApi.create(businessId, {
        name: name.trim(),
        type,
        description: description.trim() || undefined,
      })
      await markAreasStepCompleted(businessId).catch(() => {})
      router.replace(`/businesses/${businessId}/areas`)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos crear el área.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-veritt-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Crear área."
            subtitle="Define un espacio físico o funcional de tu negocio."
          />

          <View className="gap-4">
            <VrittInput label="Nombre" placeholder="Cocina principal" value={name} onChangeText={setName} editable={!isSubmitting} />
            <VrittSelect label="Tipo" value={type} options={AREA_TYPE_OPTIONS} onChange={(v) => setType(v as AreaType)} disabled={isSubmitting} />
            <VrittInput label="Descripción (opcional)" placeholder="Describe el área..." value={description} onChangeText={setDescription} editable={!isSubmitting} />
          </View>

          <View className="gap-3.5">
            <VrittButton label="Guardar área" loading={isSubmitting} onPress={handleCreate} />
            <VrittButton label="Cancelar" variant="secondary" onPress={() => router.back()} disabled={isSubmitting} />
          </View>
        </View>
      </VrittScreen>
    </KeyboardAvoidingView>
  )
}
