import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { purchaseOrdersApi } from '@/api/modules/purchase-orders.api'
import { PurchaseOrder } from '@/types/purchase-order.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittEmptyState } from '@/components/ui/VrittEmptyState'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  PARTIALLY_RECEIVED: 'Parcial',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
}

export default function PurchaseOrdersScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadOrders = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const data = await purchaseOrdersApi.list(businessId)
      setOrders(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar las órdenes de compra.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => { loadOrders() }, [loadOrders])
  useFocusEffect(useCallback(() => { loadOrders() }, [loadOrders]))

  if (isLoading) return <VrittLoader />

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Órdenes de compra."
          subtitle="Gestiona tus pedidos a proveedores."
        />

        {orders.length === 0 ? (
          <VrittEmptyState
            title="Aún no hay órdenes"
            description="Crea una orden de compra para solicitar materia prima a tus proveedores."
            actionLabel="Crear orden"
            onActionPress={() => router.push(`/businesses/${businessId}/purchase-orders/create`)}
          />
        ) : (
          <>
            <VrittButton
              label="Crear orden"
              onPress={() => router.push(`/businesses/${businessId}/purchase-orders/create`)}
            />

            <View className="gap-4">
              <VrittSectionLabel>Órdenes registradas</VrittSectionLabel>
              {orders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  activeOpacity={0.92}
                  onPress={() => router.push(`/businesses/${businessId}/purchase-orders/${order.id}`)}
                >
                  <VrittCard>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-[18px] font-bold text-veritt-text">OC-{order.orderNumber}</Text>
                        <Text className="text-[13px] text-veritt-muted mt-1">
                          {order.supplier?.name ?? 'Proveedor'} · ${Number(order.totalEstimated).toFixed(2)}
                        </Text>
                      </View>
                      <Text className="text-[13px] text-veritt-muted">{STATUS_LABELS[order.status] ?? order.status}</Text>
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
