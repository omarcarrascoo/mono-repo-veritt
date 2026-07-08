import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { purchaseOrdersApi } from '@/api/modules/purchase-orders.api'
import { PurchaseOrder } from '@/types/purchase-order.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  PARTIALLY_RECEIVED: 'Parcialmente recibida',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
}

export default function PurchaseOrderDetailScreen() {
  const { businessId, poId } = useLocalSearchParams<{ businessId: string; poId: string }>()
  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActioning, setIsActioning] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'send' | 'cancel' | null>(null)

  const loadOrder = useCallback(async () => {
    if (!businessId || !poId) return
    try {
      setIsLoading(true)
      const data = await purchaseOrdersApi.get(businessId, poId)
      setOrder(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar la orden.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId, poId])

  useEffect(() => { loadOrder() }, [loadOrder])

  const handleSend = async () => {
    if (!businessId || !poId) return
    try {
      setIsActioning(true)
      const updated = await purchaseOrdersApi.send(businessId, poId)
      setOrder(updated)
      setConfirmAction(null)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos enviar la orden.'))
    } finally {
      setIsActioning(false)
    }
  }

  const handleCancel = async () => {
    if (!businessId || !poId) return
    try {
      setIsActioning(true)
      const updated = await purchaseOrdersApi.cancel(businessId, poId)
      setOrder(updated)
      setConfirmAction(null)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cancelar la orden.'))
    } finally {
      setIsActioning(false)
    }
  }

  if (isLoading) return <VrittLoader />
  if (!order) return null

  const canSend = order.status === 'DRAFT'
  const canCancel = order.status === 'DRAFT' || order.status === 'SENT'

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title={`OC-${order.orderNumber}`}
          subtitle={STATUS_LABELS[order.status] ?? order.status}
        />

        <VrittCard>
          <View className="gap-3">
            <View>
              <Text className="text-[13px] text-veritt-muted">Proveedor</Text>
              <Text className="text-veritt-text text-[15px]">{order.supplier?.name ?? '—'}</Text>
            </View>
            <View>
              <Text className="text-[13px] text-veritt-muted">Total estimado</Text>
              <Text className="text-veritt-text text-[15px]">${Number(order.totalEstimated).toFixed(2)} {order.currency}</Text>
            </View>
            <View>
              <Text className="text-[13px] text-veritt-muted">Estado</Text>
              <Text className="text-veritt-text text-[15px]">{STATUS_LABELS[order.status] ?? order.status}</Text>
            </View>
            {order.sentAt && (
              <View>
                <Text className="text-[13px] text-veritt-muted">Fecha de envío</Text>
                <Text className="text-veritt-text text-[15px]">{new Date(order.sentAt).toLocaleDateString('es-MX')}</Text>
              </View>
            )}
            {order.notes && (
              <View>
                <Text className="text-[13px] text-veritt-muted">Notas</Text>
                <Text className="text-veritt-text text-[15px]">{order.notes}</Text>
              </View>
            )}
          </View>
        </VrittCard>

        {(order.items?.length ?? 0) > 0 && (
          <View className="gap-4">
            <VrittSectionLabel>Artículos ({order.items!.length})</VrittSectionLabel>
            {order.items!.map((item) => (
              <VrittCard key={item.id}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-veritt-text font-bold">{item.material?.name ?? item.materialId}</Text>
                    <Text className="text-[13px] text-veritt-muted mt-1">
                      {Number(item.quantityOrdered)} {item.material?.unit ?? ''} × ${Number(item.estimatedUnitCost).toFixed(2)}
                    </Text>
                  </View>
                  <Text className="text-veritt-text font-bold">
                    ${(Number(item.quantityOrdered) * Number(item.estimatedUnitCost)).toFixed(2)}
                  </Text>
                </View>
              </VrittCard>
            ))}
          </View>
        )}

        {/* Inline confirm: send */}
        {confirmAction === 'send' && (
          <VrittCard>
            <View className="gap-4">
              <Text className="text-[15px] font-bold text-veritt-text">¿Enviar orden al proveedor?</Text>
              <Text className="text-[13px] text-veritt-muted">La orden pasará a estado "Enviada" y podrá recibir mercancía.</Text>
              <View className="gap-3.5">
                <VrittButton label="Sí, enviar" onPress={handleSend} loading={isActioning} />
                <VrittButton label="Volver" variant="secondary" onPress={() => setConfirmAction(null)} disabled={isActioning} />
              </View>
            </View>
          </VrittCard>
        )}

        {/* Inline confirm: cancel */}
        {confirmAction === 'cancel' && (
          <VrittCard>
            <View className="gap-4">
              <Text className="text-[15px] font-bold text-veritt-text">¿Cancelar esta orden de compra?</Text>
              <Text className="text-[13px] text-veritt-muted">La orden será cancelada permanentemente.</Text>
              <View className="gap-3.5">
                <VrittButton label="Sí, cancelar orden" onPress={handleCancel} loading={isActioning} />
                <VrittButton label="Volver" variant="secondary" onPress={() => setConfirmAction(null)} disabled={isActioning} />
              </View>
            </View>
          </VrittCard>
        )}

        {/* Action buttons (only when no confirm dialog open) */}
        {confirmAction === null && (canSend || canCancel) && (
          <View className="gap-3.5">
            {canSend && (
              <VrittButton label="Enviar orden al proveedor" onPress={() => setConfirmAction('send')} />
            )}
            {canCancel && (
              <VrittButton label="Cancelar orden" variant="secondary" onPress={() => setConfirmAction('cancel')} />
            )}
          </View>
        )}

        <VrittButton
          label="Volver a órdenes"
          variant="secondary"
          onPress={() => router.replace(`/businesses/${businessId}/purchase-orders`)}
        />
      </View>
    </VrittScreen>
  )
}
