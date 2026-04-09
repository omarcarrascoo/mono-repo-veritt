import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { receiptsApi } from '@/api/modules/receipts.api'
import { Receipt } from '@/types/receipt.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'
import { VrittInput } from '@/components/ui/VrittInput'

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completada',
  PARTIAL: 'Parcial',
  CANCELLED: 'Cancelada',
}

export default function ReceiptDetailScreen() {
  const { businessId, receiptId } = useLocalSearchParams<{ businessId: string; receiptId: string }>()
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelComment, setCancelComment] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  const loadReceipt = useCallback(async () => {
    if (!businessId || !receiptId) return
    try {
      setIsLoading(true)
      const data = await receiptsApi.get(businessId, receiptId)
      setReceipt(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar la recepción.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId, receiptId])

  useEffect(() => { loadReceipt() }, [loadReceipt])

  const handleCancel = async () => {
    if (!businessId || !receiptId) return
    if (!cancelReason.trim()) {
      Alert.alert('Faltan datos', 'El motivo de cancelación es obligatorio.')
      return
    }

    try {
      setIsCancelling(true)
      const updated = await receiptsApi.cancel(businessId, receiptId, {
        reason: cancelReason.trim(),
        comment: cancelComment.trim() || undefined,
      })
      setReceipt(updated)
      setShowCancelForm(false)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cancelar la recepción.'))
    } finally {
      setIsCancelling(false)
    }
  }

  if (isLoading) return <VrittLoader />
  if (!receipt) return null

  const totalCost = (receipt.items ?? []).reduce(
    (sum, item) => sum + Number(item.quantityReceived) * Number(item.actualUnitCost),
    0
  )

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title={receipt.purchaseOrder ? `OC-${receipt.purchaseOrder.orderNumber}` : 'Recepción directa'}
          subtitle={STATUS_LABELS[receipt.status] ?? receipt.status}
        />

        <VrittCard>
          <View className="gap-3">
            {receipt.purchaseOrder?.supplier && (
              <View>
                <Text className="text-[13px] text-veritt-muted">Proveedor</Text>
                <Text className="text-veritt-text text-[15px]">{receipt.purchaseOrder.supplier.name}</Text>
              </View>
            )}
            <View>
              <Text className="text-[13px] text-veritt-muted">Ubicación</Text>
              <Text className="text-veritt-text text-[15px]">{receipt.location?.name ?? '—'}</Text>
            </View>
            <View>
              <Text className="text-[13px] text-veritt-muted">Costo total</Text>
              <Text className="text-veritt-text text-[15px]">${totalCost.toFixed(2)}</Text>
            </View>
            <View>
              <Text className="text-[13px] text-veritt-muted">Fecha</Text>
              <Text className="text-veritt-text text-[15px]">
                {receipt.receivedAt ? new Date(receipt.receivedAt).toLocaleDateString('es-MX') : '—'}
              </Text>
            </View>
            {receipt.notes && (
              <View>
                <Text className="text-[13px] text-veritt-muted">Notas</Text>
                <Text className="text-veritt-text text-[15px]">{receipt.notes}</Text>
              </View>
            )}
          </View>
        </VrittCard>

        {receipt.status === 'CANCELLED' && (
          <VrittCard>
            <View className="gap-3">
              <Text className="text-[15px] font-bold text-red-400">Recepción cancelada</Text>
              {receipt.cancellationReason && (
                <View>
                  <Text className="text-[13px] text-veritt-muted">Motivo</Text>
                  <Text className="text-veritt-text text-[15px]">{receipt.cancellationReason}</Text>
                </View>
              )}
              {receipt.cancellationComment && (
                <View>
                  <Text className="text-[13px] text-veritt-muted">Comentario</Text>
                  <Text className="text-veritt-text text-[15px]">{receipt.cancellationComment}</Text>
                </View>
              )}
              {receipt.cancelledAt && (
                <View>
                  <Text className="text-[13px] text-veritt-muted">Fecha de cancelación</Text>
                  <Text className="text-veritt-text text-[15px]">{new Date(receipt.cancelledAt).toLocaleDateString('es-MX')}</Text>
                </View>
              )}
            </View>
          </VrittCard>
        )}

        {(receipt.items?.length ?? 0) > 0 && (
          <View className="gap-4">
            <VrittSectionLabel>Artículos recibidos ({receipt.items!.length})</VrittSectionLabel>
            {receipt.items!.map((item) => (
              <VrittCard key={item.id}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-veritt-text font-bold">{item.material?.name ?? item.materialId}</Text>
                    <Text className="text-[13px] text-veritt-muted mt-1">
                      {Number(item.quantityReceived)} {item.material?.unit ?? ''} × ${Number(item.actualUnitCost).toFixed(2)}
                    </Text>
                  </View>
                  <Text className="text-veritt-text font-bold">
                    ${(Number(item.quantityReceived) * Number(item.actualUnitCost)).toFixed(2)}
                  </Text>
                </View>
              </VrittCard>
            ))}
          </View>
        )}

        {receipt.status === 'COMPLETED' && !showCancelForm && (
          <VrittButton
            label="Cancelar recepción"
            variant="secondary"
            onPress={() => setShowCancelForm(true)}
          />
        )}

        {showCancelForm && (
          <VrittCard>
            <View className="gap-4">
              <Text className="text-[15px] font-bold text-veritt-text">Cancelar recepción</Text>
              <Text className="text-[13px] text-veritt-muted">
                Se revertirá todo el inventario agregado por esta recepción.
              </Text>
              <VrittInput
                label="Motivo de cancelación"
                placeholder="¿Por qué se cancela esta recepción?"
                value={cancelReason}
                onChangeText={setCancelReason}
                editable={!isCancelling}
              />
              <VrittInput
                label="Comentario adicional (opcional)"
                placeholder="Detalles adicionales..."
                value={cancelComment}
                onChangeText={setCancelComment}
                editable={!isCancelling}
              />
              <View className="gap-3.5">
                <VrittButton
                  label="Confirmar cancelación"
                  onPress={handleCancel}
                  loading={isCancelling}
                />
                <VrittButton
                  label="Volver"
                  variant="secondary"
                  onPress={() => setShowCancelForm(false)}
                  disabled={isCancelling}
                />
              </View>
            </View>
          </VrittCard>
        )}

        <VrittButton
          label="Volver a recepciones"
          variant="secondary"
          onPress={() => router.replace(`/businesses/${businessId}/receipts`)}
        />
      </View>
    </VrittScreen>
  )
}
