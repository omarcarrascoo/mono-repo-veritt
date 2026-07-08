import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { paymentMethodsApi } from '@/api/modules/payment-methods.api'
import { PaymentMethod, PaymentMethodType } from '@/types/payment-method.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittSelect } from '@/components/ui/VrittSelect'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

const TYPE_OPTIONS = [
  { label: 'Efectivo', value: 'CASH' },
  { label: 'Terminal', value: 'CARD_TERMINAL' },
  { label: 'Transferencia', value: 'BANK_TRANSFER' },
  { label: 'Otro', value: 'OTHER' },
]

const TYPE_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD_TERMINAL: 'Terminal',
  BANK_TRANSFER: 'Transferencia',
  OTHER: 'Otro',
}

export default function PaymentMethodsScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<PaymentMethodType>('CASH')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadMethods = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const data = await paymentMethodsApi.list(businessId)
      setMethods(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar los métodos de pago.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => { loadMethods() }, [loadMethods])
  useFocusEffect(useCallback(() => { loadMethods() }, [loadMethods]))

  const handleCreate = async () => {
    if (!businessId || !name.trim()) {
      Alert.alert('Faltan datos', 'El nombre es obligatorio.')
      return
    }
    try {
      setIsSubmitting(true)
      await paymentMethodsApi.create(businessId, { name: name.trim(), type })
      setName('')
      setType('CASH')
      setShowForm(false)
      loadMethods()
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos crear el método de pago.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (method: PaymentMethod) => {
    if (!businessId) return
    const newStatus = method.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const label = newStatus === 'ACTIVE' ? 'activar' : 'desactivar'
    Alert.alert(
      `¿${label.charAt(0).toUpperCase() + label.slice(1)} método?`,
      `¿Quieres ${label} "${method.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await paymentMethodsApi.update(businessId, method.id, { status: newStatus })
              loadMethods()
            } catch (error) {
              Alert.alert('Error', getApiErrorMessage(error, 'No pudimos actualizar el método.'))
            }
          },
        },
      ],
    )
  }

  if (isLoading) return <VrittLoader />

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Métodos de pago."
          subtitle="Configura cómo recibes pagos en tu negocio."
        />

        {!showForm ? (
          <VrittButton label="Agregar método" onPress={() => setShowForm(true)} />
        ) : (
          <VrittCard>
            <View className="gap-4">
              <VrittSectionLabel>Nuevo método de pago</VrittSectionLabel>
              <VrittInput label="Nombre" placeholder="Ej: Caja principal" value={name} onChangeText={setName} editable={!isSubmitting} />
              <VrittSelect label="Tipo" value={type} options={TYPE_OPTIONS} onChange={(v) => setType(v as PaymentMethodType)} disabled={isSubmitting} />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <VrittButton label="Guardar" loading={isSubmitting} onPress={handleCreate} />
                </View>
                <View className="flex-1">
                  <VrittButton label="Cancelar" variant="secondary" onPress={() => { setShowForm(false); setName('') }} disabled={isSubmitting} />
                </View>
              </View>
            </View>
          </VrittCard>
        )}

        {methods.length > 0 && (
          <View className="gap-4">
            <VrittSectionLabel>Métodos registrados</VrittSectionLabel>
            {methods.map((method) => (
              <TouchableOpacity key={method.id} activeOpacity={0.92} onPress={() => handleToggleStatus(method)}>
                <VrittCard>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-[18px] font-bold text-veritt-text">{method.name}</Text>
                      <Text className="text-[13px] text-veritt-muted mt-1">{TYPE_LABELS[method.type] ?? method.type}</Text>
                    </View>
                    <View className="items-end">
                      <Text className={`text-[13px] font-semibold ${method.status === 'ACTIVE' ? 'text-green-400' : 'text-veritt-muted'}`}>
                        {method.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                      </Text>
                      <Text className="text-[11px] text-veritt-muted mt-1">Toca para cambiar</Text>
                    </View>
                  </View>
                </VrittCard>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <VrittButton
          label="Volver al negocio"
          variant="secondary"
          onPress={() => router.replace(`/businesses/${businessId}`)}
        />
      </View>
    </VrittScreen>
  )
}
