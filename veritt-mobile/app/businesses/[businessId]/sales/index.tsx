import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { salesApi } from '@/api/modules/sales.api'
import { Sale, DailySaleSummary } from '@/types/sale.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittEmptyState } from '@/components/ui/VrittEmptyState'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

function formatCurrency(val: number | string) {
  return `$${Number(val).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export default function SalesScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [sales, setSales] = useState<Sale[]>([])
  const [summary, setSummary] = useState<DailySaleSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  const loadData = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const [salesData, summaryData] = await Promise.all([
        salesApi.list(businessId, { from: today, to: today }),
        salesApi.getDailySummary(businessId, today),
      ])
      setSales(salesData)
      setSummary(summaryData)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar las ventas.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId, today])

  useEffect(() => { loadData() }, [loadData])
  useFocusEffect(useCallback(() => { loadData() }, [loadData]))

  if (isLoading) return <VrittLoader />

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Ventas."
          subtitle="Registro de ventas y resumen del día."
        />

        <View className="gap-3.5">
          <VrittButton
            label="Registrar venta"
            onPress={() => router.push(`/businesses/${businessId}/sales/create`)}
          />
          <VrittButton
            label="Ver reportes"
            variant="secondary"
            onPress={() => router.push(`/businesses/${businessId}/sales/analytics`)}
          />
        </View>

        {summary && summary.saleCount > 0 && (
          <VrittCard>
            <VrittSectionLabel className="mb-3">Resumen del día</VrittSectionLabel>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[15px]">Ingresos</Text>
                <Text className="text-veritt-text text-[15px] font-bold">{formatCurrency(summary.totalRevenue)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[15px]">Costo</Text>
                <Text className="text-veritt-text text-[15px]">{formatCurrency(summary.totalCOGS)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[15px]">Margen</Text>
                <Text className="text-veritt-text text-[15px] font-bold">{formatCurrency(summary.grossMargin)} ({summary.grossMarginPercent}%)</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[15px]">Ventas</Text>
                <Text className="text-veritt-text text-[15px]">{summary.saleCount}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[15px]">Ticket promedio</Text>
                <Text className="text-veritt-text text-[15px]">{formatCurrency(summary.avgTicket)}</Text>
              </View>
            </View>
          </VrittCard>
        )}

        {sales.length === 0 ? (
          <VrittEmptyState
            title="Sin ventas hoy"
            description="Registra la primera venta del día."
          />
        ) : (
          <View className="gap-4">
            <VrittSectionLabel>Ventas de hoy</VrittSectionLabel>
            {sales.map((sale) => (
              <TouchableOpacity
                key={sale.id}
                activeOpacity={0.92}
                onPress={() => router.push(`/businesses/${businessId}/sales/${sale.id}`)}
              >
                <VrittCard>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-[16px] font-bold text-veritt-text">Venta #{sale.saleNumber}</Text>
                      <Text className="text-[13px] text-veritt-muted mt-1">
                        {sale.createdAt ? formatTime(sale.createdAt) : ''} · {sale.operator?.fullName ?? 'Operador'}
                        {sale.area ? ` · ${sale.area.name}` : ''}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[16px] font-bold text-veritt-text">{formatCurrency(sale.total)}</Text>
                      <Text className={`text-[11px] mt-1 ${sale.status === 'CANCELLED' ? 'text-red-400' : 'text-green-400'}`}>
                        {sale.status === 'COMPLETED' ? 'Completada' : sale.status === 'CANCELLED' ? 'Cancelada' : sale.status}
                      </Text>
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
