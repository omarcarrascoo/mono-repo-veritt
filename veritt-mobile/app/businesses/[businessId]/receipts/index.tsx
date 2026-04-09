import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { receiptsApi } from '@/api/modules/receipts.api'
import { Receipt } from '@/types/receipt.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittEmptyState } from '@/components/ui/VrittEmptyState'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

export default function ReceiptsScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadReceipts = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const data = await receiptsApi.list(businessId)
      setReceipts(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar las recepciones.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => { loadReceipts() }, [loadReceipts])
  useFocusEffect(useCallback(() => { loadReceipts() }, [loadReceipts]))

  if (isLoading) return <VrittLoader />

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Recepciones."
          subtitle="Registra la llegada de materia prima."
        />

        {receipts.length === 0 ? (
          <VrittEmptyState
            title="Aún no hay recepciones"
            description="Registra una recepción cuando llegue mercancía de un proveedor."
            actionLabel="Registrar recepción"
            onActionPress={() => router.push(`/businesses/${businessId}/receipts/create`)}
          />
        ) : (
          <>
            <VrittButton
              label="Registrar recepción"
              onPress={() => router.push(`/businesses/${businessId}/receipts/create`)}
            />

            <View className="gap-4">
              <VrittSectionLabel>Recepciones registradas</VrittSectionLabel>
              {receipts.map((receipt) => (
                <TouchableOpacity
                  key={receipt.id}
                  activeOpacity={0.92}
                  onPress={() => router.push(`/businesses/${businessId}/receipts/${receipt.id}`)}
                >
                  <VrittCard>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-[18px] font-bold text-veritt-text">
                          {receipt.purchaseOrder ? `OC-${receipt.purchaseOrder.orderNumber}` : 'Sin orden'}
                        </Text>
                        <Text className="text-[13px] text-veritt-muted mt-1">
                          {receipt.purchaseOrder?.supplier?.name ?? 'Recepción directa'} · {receipt.location?.name ?? ''}
                        </Text>
                      </View>
                      <View className="items-end">
                        {receipt.status === 'CANCELLED' && (
                          <Text className="text-[12px] text-red-400 font-bold">Cancelada</Text>
                        )}
                        <Text className="text-[13px] text-veritt-muted">
                          {receipt.receivedAt ? new Date(receipt.receivedAt).toLocaleDateString('es-MX') : ''}
                        </Text>
                      </View>
                    </View>
                  </VrittCard>
                </TouchableOpacity>
              ))}
            </View>
          </>
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
