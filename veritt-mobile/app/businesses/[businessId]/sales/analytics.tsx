import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { salesApi } from '@/api/modules/sales.api'
import { PeriodSaleSummary, ProductRevenueSummary } from '@/types/sale.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittEmptyState } from '@/components/ui/VrittEmptyState'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

type PeriodKey = 'today' | 'week' | 'month'

function formatCurrency(val: number) {
  return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getDateRange(period: PeriodKey): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().split('T')[0]

  if (period === 'today') {
    return { from: to, to }
  }

  if (period === 'week') {
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 6)
    return { from: weekAgo.toISOString().split('T')[0], to }
  }

  // month
  const monthAgo = new Date(now)
  monthAgo.setDate(monthAgo.getDate() - 29)
  return { from: monthAgo.toISOString().split('T')[0], to }
}

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: 'Hoy',
  week: '7 días',
  month: '30 días',
}

export default function SalesAnalyticsScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [period, setPeriod] = useState<PeriodKey>('week')
  const [summary, setSummary] = useState<PeriodSaleSummary | null>(null)
  const [products, setProducts] = useState<ProductRevenueSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const { from, to } = getDateRange(period)
      const [summaryData, productData] = await Promise.all([
        salesApi.getPeriodSummary(businessId, from, to),
        salesApi.getProductRevenue(businessId, from, to),
      ])
      setSummary(summaryData)
      setProducts(productData.sort((a, b) => b.totalRevenue - a.totalRevenue))
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar los reportes.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId, period])

  useEffect(() => { loadData() }, [loadData])

  if (isLoading) return <VrittLoader />

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Reportes."
          subtitle="Análisis de ingresos y rendimiento por periodo."
        />

        {/* Period selector */}
        <View className="flex-row gap-3">
          {(['today', 'week', 'month'] as PeriodKey[]).map((key) => (
            <TouchableOpacity
              key={key}
              activeOpacity={0.85}
              onPress={() => setPeriod(key)}
              className={`flex-1 py-3 rounded-veritt items-center ${
                period === key ? 'bg-veritt-text' : 'bg-veritt-surface border border-veritt-border'
              }`}
            >
              <Text className={`text-[14px] font-bold ${period === key ? 'text-veritt-bg' : 'text-veritt-muted'}`}>
                {PERIOD_LABELS[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary card */}
        {summary && (
          <VrittCard>
            <VrittSectionLabel className="mb-3">Resumen general</VrittSectionLabel>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[15px]">Ingresos</Text>
                <Text className="text-veritt-text text-[15px] font-bold">{formatCurrency(summary.totalRevenue)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[15px]">Costo de venta</Text>
                <Text className="text-veritt-text text-[15px]">{formatCurrency(summary.totalCOGS)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[15px]">Margen bruto</Text>
                <Text className="text-green-400 text-[15px] font-bold">
                  {formatCurrency(summary.grossMargin)} ({summary.grossMarginPercent}%)
                </Text>
              </View>
              <View className="border-t border-veritt-border mt-2 pt-2 flex-row justify-between">
                <Text className="text-veritt-muted text-[15px]">Total ventas</Text>
                <Text className="text-veritt-text text-[15px]">{summary.saleCount}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[15px]">Ticket promedio</Text>
                <Text className="text-veritt-text text-[15px]">{formatCurrency(summary.avgTicket)}</Text>
              </View>
            </View>
          </VrittCard>
        )}

        {/* Daily breakdown */}
        {summary && summary.daily.length > 1 && (
          <View className="gap-4">
            <VrittSectionLabel>Desglose diario</VrittSectionLabel>
            {summary.daily.map((day) => (
              <VrittCard key={day.date}>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-veritt-text text-[15px] font-bold">{day.date}</Text>
                    <Text className="text-veritt-muted text-[13px] mt-1">{day.count} ventas</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-veritt-text text-[15px] font-bold">{formatCurrency(day.revenue)}</Text>
                    <Text className="text-veritt-muted text-[13px] mt-1">
                      Margen {day.revenue > 0 ? Math.round(((day.revenue - day.cogs) / day.revenue) * 100) : 0}%
                    </Text>
                  </View>
                </View>
              </VrittCard>
            ))}
          </View>
        )}

        {/* By payment method */}
        {summary && summary.byPaymentMethod.length > 0 && (
          <View className="gap-4">
            <VrittSectionLabel>Por método de pago</VrittSectionLabel>
            {summary.byPaymentMethod.map((pm) => (
              <VrittCard key={pm.paymentMethodId}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-veritt-text text-[15px]">{pm.paymentMethodName}</Text>
                  <Text className="text-veritt-text text-[15px] font-bold">{formatCurrency(pm.total)}</Text>
                </View>
              </VrittCard>
            ))}
          </View>
        )}

        {/* By area */}
        {summary && summary.byArea.length > 0 && (
          <View className="gap-4">
            <VrittSectionLabel>Por área</VrittSectionLabel>
            {summary.byArea.map((area) => (
              <VrittCard key={area.areaId}>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-veritt-text text-[15px]">{area.areaName}</Text>
                    <Text className="text-veritt-muted text-[13px] mt-1">{area.saleCount} ventas</Text>
                  </View>
                  <Text className="text-veritt-text text-[15px] font-bold">{formatCurrency(area.revenue)}</Text>
                </View>
              </VrittCard>
            ))}
          </View>
        )}

        {/* Product revenue */}
        {products.length > 0 ? (
          <View className="gap-4">
            <VrittSectionLabel>Rendimiento por producto</VrittSectionLabel>
            {products.map((p) => (
              <VrittCard key={p.productId}>
                <View className="gap-1">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-veritt-text text-[15px] font-bold">{p.productName}</Text>
                      {p.category && <Text className="text-veritt-muted text-[12px]">{p.category}</Text>}
                    </View>
                    <Text className="text-veritt-text text-[15px] font-bold">{formatCurrency(p.totalRevenue)}</Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-veritt-muted text-[13px]">{p.unitsSold} vendidos</Text>
                    <Text className="text-green-400 text-[13px]">
                      Margen: {formatCurrency(p.estimatedMargin)}
                    </Text>
                  </View>
                </View>
              </VrittCard>
            ))}
          </View>
        ) : (
          !isLoading && <VrittEmptyState title="Sin datos" description="No hay ventas en este periodo." />
        )}

        <View className="gap-3.5">
          <VrittButton
            label="Ir a ventas"
            variant="secondary"
            onPress={() => router.replace(`/businesses/${businessId}/sales`)}
          />
          <VrittButton
            label="Volver al negocio"
            variant="secondary"
            onPress={() => router.replace(`/businesses/${businessId}`)}
          />
        </View>
      </View>
    </VrittScreen>
  )
}
