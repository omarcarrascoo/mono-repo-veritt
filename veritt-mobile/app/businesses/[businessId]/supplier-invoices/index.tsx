import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { supplierInvoicesApi } from '@/api/modules/supplier-invoices.api'
import { SupplierInvoice } from '@/types/supplier-invoice.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittEmptyState } from '@/components/ui/VrittEmptyState'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  VERIFIED: 'Verificada',
  DISPUTED: 'Disputada',
  DELETED: 'Eliminada',
}

export default function SupplierInvoicesScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadInvoices = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const data = await supplierInvoicesApi.list(businessId)
      setInvoices(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar las facturas.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => { loadInvoices() }, [loadInvoices])
  useFocusEffect(useCallback(() => { loadInvoices() }, [loadInvoices]))

  if (isLoading) return <VrittLoader />

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Facturas de proveedor."
          subtitle="Vincula facturas CFDI a tus recepciones."
        />

        {invoices.length === 0 ? (
          <VrittEmptyState
            title="Aún no hay facturas"
            description="Registra facturas de proveedor para mantener la trazabilidad fiscal."
            actionLabel="Registrar factura"
            onActionPress={() => router.push(`/businesses/${businessId}/supplier-invoices/create`)}
          />
        ) : (
          <>
            <VrittButton
              label="Registrar factura"
              onPress={() => router.push(`/businesses/${businessId}/supplier-invoices/create`)}
            />

            <View className="gap-4">
              <VrittSectionLabel>Facturas registradas</VrittSectionLabel>
              {invoices.map((invoice) => (
                <TouchableOpacity
                  key={invoice.id}
                  activeOpacity={0.92}
                  onPress={() => router.push(`/businesses/${businessId}/supplier-invoices/${invoice.id}`)}
                >
                  <VrittCard>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-[18px] font-bold text-veritt-text">
                          {invoice.supplier?.name ?? 'Proveedor'}
                        </Text>
                        <Text className="text-[13px] text-veritt-muted mt-1">
                          ${Number(invoice.totalAmount).toFixed(2)} · {new Date(invoice.invoiceDate).toLocaleDateString('es-MX')}
                        </Text>
                      </View>
                      <Text className="text-[13px] text-veritt-muted">{STATUS_LABELS[invoice.status] ?? invoice.status}</Text>
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
