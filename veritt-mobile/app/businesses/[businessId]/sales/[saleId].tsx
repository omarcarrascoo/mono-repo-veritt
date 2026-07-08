import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { salesApi } from '@/api/modules/sales.api'
import { Sale } from '@/types/sale.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

function formatCurrency(val: number | string) {
  return `$${Number(val).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function SaleDetailScreen() {
  const { businessId, saleId } = useLocalSearchParams<{ businessId: string; saleId: string }>()
  const [sale, setSale] = useState<Sale | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadSale = useCallback(async () => {
    if (!businessId || !saleId) return
    try {
      setIsLoading(true)
      const data = await salesApi.get(businessId, saleId)
      setSale(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar la venta.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId, saleId])

  useEffect(() => { loadSale() }, [loadSale])

  if (isLoading) return <VrittLoader />
  if (!sale) return null

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title={`Venta #${sale.saleNumber}`}
          subtitle={`${sale.operator?.fullName ?? 'Operador'}${sale.area ? ` · ${sale.area.name}` : ''}`}
        />

        <VrittCard>
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-veritt-muted text-[15px]">Subtotal</Text>
              <Text className="text-veritt-text text-[15px]">{formatCurrency(sale.subtotal)}</Text>
            </View>
            {Number(sale.taxAmount) > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[15px]">Impuesto</Text>
                <Text className="text-veritt-text text-[15px]">{formatCurrency(sale.taxAmount)}</Text>
              </View>
            )}
            <View className="flex-row justify-between border-t border-veritt-border pt-2 mt-1">
              <Text className="text-veritt-text text-[18px] font-extrabold">Total</Text>
              <Text className="text-veritt-text text-[18px] font-extrabold">{formatCurrency(sale.total)}</Text>
            </View>
            <Text className={`text-[13px] mt-1 ${sale.status === 'CANCELLED' ? 'text-red-400' : 'text-green-400'}`}>
              {sale.status === 'COMPLETED' ? 'Completada' : sale.status === 'CANCELLED' ? 'Cancelada' : sale.status}
            </Text>
          </View>
        </VrittCard>

        {(sale.items?.length ?? 0) > 0 && (
          <View className="gap-4">
            <VrittSectionLabel>Productos</VrittSectionLabel>
            {sale.items!.map((item) => (
              <VrittCard key={item.id}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-veritt-text font-bold">{item.product?.name ?? 'Producto'}</Text>
                    <Text className="text-veritt-muted text-[13px] mt-1">
                      {Number(item.quantity)} × {formatCurrency(item.unitPrice)}
                    </Text>
                  </View>
                  <Text className="text-veritt-text font-bold">{formatCurrency(item.totalPrice)}</Text>
                </View>
              </VrittCard>
            ))}
          </View>
        )}

        {(sale.payments?.length ?? 0) > 0 && (
          <View className="gap-4">
            <VrittSectionLabel>Pagos</VrittSectionLabel>
            {sale.payments!.map((payment) => (
              <VrittCard key={payment.id}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-veritt-text">{payment.paymentMethod?.name ?? 'Método'}</Text>
                  <Text className="text-veritt-text font-bold">{formatCurrency(payment.amount)}</Text>
                </View>
              </VrittCard>
            ))}
          </View>
        )}

        {(sale.theoreticalConsumptions?.length ?? 0) > 0 && (
          <View className="gap-4">
            <VrittSectionLabel>Consumo teórico</VrittSectionLabel>
            {sale.theoreticalConsumptions!.map((tc) => (
              <VrittCard key={tc.id}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-veritt-text">{tc.material?.name ?? 'Material'}</Text>
                    <Text className="text-veritt-muted text-[13px] mt-1">{tc.material?.baseUnit ?? ''}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-veritt-text font-bold">{Number(tc.expectedQuantity).toFixed(4)}</Text>
                    <Text className="text-veritt-muted text-[13px]">{formatCurrency(tc.expectedCost)}</Text>
                  </View>
                </View>
              </VrittCard>
            ))}
          </View>
        )}

        <VrittButton
          label="Volver a ventas"
          variant="secondary"
          onPress={() => router.replace(`/businesses/${businessId}/sales`)}
        />
      </View>
    </VrittScreen>
  )
}
