import React, { useCallback, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { processesApi } from '@/api/modules/processes.api'
import { areasApi } from '@/api/modules/areas.api'
import { Area } from '@/types/area.types'
import { ProcessStepDto, MembershipRole } from '@/types/process.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittSelect } from '@/components/ui/VrittSelect'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'
import { useFocusEffect } from 'expo-router'

const ROLE_OPTIONS = [
  { label: 'Sin rol requerido', value: '' },
  { label: 'R1 · Encargado de Inventario', value: 'R1_INVENTORY' },
  { label: 'R2 · Encargado de Caja', value: 'R2_CASH' },
  { label: 'R3 · Operador POS', value: 'R3_POS' },
  { label: 'R4 · Gerente de Turno', value: 'R4_MANAGER' },
  { label: 'R5 · Administrador', value: 'R5_ADMIN' },
  { label: 'R6 · Dueño', value: 'R6_OWNER' },
]

export default function CreateProcessScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isBlocking, setIsBlocking] = useState(false)
  const [steps, setSteps] = useState<ProcessStepDto[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // New step form
  const [stepName, setStepName] = useState('')
  const [stepRole, setStepRole] = useState('')
  const [stepAreaId, setStepAreaId] = useState('')

  useFocusEffect(
    useCallback(() => {
      if (!businessId) return
      areasApi.list(businessId).then(setAreas).catch(() => {})
    }, [businessId])
  )

  const areaOptions = [
    { label: 'Sin área asignada', value: '' },
    ...areas.map((a) => ({ label: a.name, value: a.id })),
  ]

  const addStep = () => {
    if (!stepName.trim()) {
      Alert.alert('Faltan datos', 'El nombre del paso es obligatorio.')
      return
    }
    const newStep: ProcessStepDto = {
      name: stepName.trim(),
      stepOrder: steps.length + 1,
      requiredRole: stepRole ? (stepRole as MembershipRole) : undefined,
      assignedAreaId: stepAreaId || undefined,
    }
    setSteps([...steps, newStep])
    setStepName('')
    setStepRole('')
    setStepAreaId('')
  }

  const removeStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 }))
    setSteps(updated)
  }

  const handleCreate = async () => {
    if (!businessId) return
    if (!name.trim()) {
      Alert.alert('Faltan datos', 'El nombre del proceso es obligatorio.')
      return
    }
    if (steps.length === 0) {
      Alert.alert('Faltan datos', 'Agrega al menos un paso al proceso.')
      return
    }

    try {
      setIsSubmitting(true)
      await processesApi.create(businessId, {
        name: name.trim(),
        description: description.trim() || undefined,
        isBlocking,
        steps,
      })
      router.replace(`/businesses/${businessId}/processes`)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos crear el proceso.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-veritt-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Crear proceso."
            subtitle="Define un proceso operativo con sus pasos."
          />

          <View className="gap-4">
            <VrittInput label="Nombre" placeholder="Apertura de cocina" value={name} onChangeText={setName} editable={!isSubmitting} />
            <VrittInput label="Descripción (opcional)" placeholder="Describe el proceso..." value={description} onChangeText={setDescription} editable={!isSubmitting} />

            <TouchableOpacity
              className="flex-row items-center gap-3 py-3"
              onPress={() => setIsBlocking(!isBlocking)}
              disabled={isSubmitting}
            >
              <View className={`w-6 h-6 rounded-md border items-center justify-center ${isBlocking ? 'bg-red-500 border-red-500' : 'border-veritt-border'}`}>
                {isBlocking && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </View>
              <Text className="text-veritt-text text-[15px]">Proceso bloqueante (impide cierre si no se completa)</Text>
            </TouchableOpacity>
          </View>

          {/* Steps list */}
          <View className="gap-4">
            <VrittSectionLabel>Pasos del proceso ({steps.length})</VrittSectionLabel>

            {steps.map((step, index) => (
              <VrittCard key={index}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-veritt-text font-bold text-[15px]">
                      {step.stepOrder}. {step.name}
                    </Text>
                    {step.requiredRole && (
                      <Text className="text-veritt-muted text-[12px] mt-1">Rol: {step.requiredRole}</Text>
                    )}
                    {step.assignedAreaId && (
                      <Text className="text-veritt-muted text-[12px]">
                        Área: {areas.find((a) => a.id === step.assignedAreaId)?.name ?? 'N/A'}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => removeStep(index)} disabled={isSubmitting}>
                    <Ionicons name="trash-outline" size={20} color="#8C8C8C" />
                  </TouchableOpacity>
                </View>
              </VrittCard>
            ))}

            {/* Add step form */}
            <VrittCard>
              <View className="gap-3">
                <Text className="text-veritt-muted text-[13px] font-semibold">Agregar paso</Text>
                <VrittInput label="Nombre del paso" placeholder="Verificar temperaturas" value={stepName} onChangeText={setStepName} editable={!isSubmitting} />
                <VrittSelect label="Rol requerido" value={stepRole} options={ROLE_OPTIONS} onChange={setStepRole} disabled={isSubmitting} />
                <VrittSelect label="Área asignada" value={stepAreaId} options={areaOptions} onChange={setStepAreaId} disabled={isSubmitting} />
                <VrittButton label="Agregar paso" variant="secondary" onPress={addStep} disabled={isSubmitting} />
              </View>
            </VrittCard>
          </View>

          <View className="gap-3.5">
            <VrittButton label="Guardar proceso" loading={isSubmitting} onPress={handleCreate} />
            <VrittButton label="Cancelar" variant="secondary" onPress={() => router.back()} disabled={isSubmitting} />
          </View>
        </View>
      </VrittScreen>
    </KeyboardAvoidingView>
  )
}
