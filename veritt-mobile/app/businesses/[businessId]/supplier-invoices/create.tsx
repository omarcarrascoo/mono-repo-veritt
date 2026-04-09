import React, { useCallback, useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supplierInvoicesApi } from '@/api/modules/supplier-invoices.api'
import { suppliersApi } from '@/api/modules/suppliers.api'
import { receiptsApi } from '@/api/modules/receipts.api'
import { Supplier } from '@/types/supplier.types'
import { Receipt } from '@/types/receipt.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittSelect } from '@/components/ui/VrittSelect'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittLoader } from '@/components/ui/VrittLoader'

export default function CreateSupplierInvoiceScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [receiptId, setReceiptId] = useState('')
  const [cfdiUuid, setCfdiUuid] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [receiptTotal, setReceiptTotal] = useState<number | null>(null)
  const [discrepancyNote, setDiscrepancyNote] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  const loadData = useCallback(async () => {
    if (!businessId) return
    try {
      const [supplierData, receiptData] = await Promise.all([
        suppliersApi.list(businessId, 'ACTIVE'),
        receiptsApi.list(businessId),
      ])
      setSuppliers(supplierData)
      // Only show completed receipts
      setReceipts(receiptData.filter((r) => r.status === 'COMPLETED'))
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar los datos.'))
    } finally {
      setIsLoadingData(false)
    }
  }, [businessId])

  useEffect(() => { loadData() }, [loadData])

  // Auto-fill total when selecting a receipt
  const handleReceiptChange = async (newReceiptId: string) => {
    setReceiptId(newReceiptId)
    setReceiptTotal(null)
    setDiscrepancyNote('')

    if (!newReceiptId || !businessId) return

    try {
      const result = await supplierInvoicesApi.getReceiptTotal(businessId, newReceiptId)
      setReceiptTotal(result.total)
      setTotalAmount(result.total.toFixed(2))
    } catch {
      // Silently fail — user can still enter manually
    }
  }

  // Check if amounts differ when user changes totalAmount
  const invoiceAmount = parseFloat(totalAmount) || 0
  const hasDiscrepancy = receiptTotal !== null && invoiceAmount > 0 && Math.abs(invoiceAmount - receiptTotal) > 0.01

  const handleCreate = async () => {
    if (!businessId) return
    if (!supplierId) {
      Alert.alert('Faltan datos', 'Selecciona un proveedor.')
      return
    }
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      Alert.alert('Faltan datos', 'El monto total es obligatorio.')
      return
    }
    if (!invoiceDate) {
      Alert.alert('Faltan datos', 'La fecha de factura es obligatoria.')
      return
    }
    if (hasDiscrepancy && !discrepancyNote.trim()) {
      Alert.alert('Faltan datos', 'El monto de la factura no coincide con la recepción. Indica el motivo de la diferencia.')
      return
    }

    try {
      setIsSubmitting(true)
      await supplierInvoicesApi.create(businessId, {
        supplierId,
        receiptId: receiptId || undefined,
        cfdiUuid: cfdiUuid.trim() || undefined,
        totalAmount: parseFloat(totalAmount),
        invoiceDate,
        discrepancyNote: hasDiscrepancy ? discrepancyNote.trim() : undefined,
      })
      router.replace(`/businesses/${businessId}/supplier-invoices`)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos registrar la factura.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingData) return <VrittLoader />

  const supplierOptions = suppliers.map((s) => ({ label: s.name, value: s.id }))
  const receiptOptions = [
    { label: 'Sin recepción vinculada', value: '' },
    ...receipts.map((r) => ({
      label: r.purchaseOrder ? `OC-${r.purchaseOrder.orderNumber} — ${r.purchaseOrder.supplier?.name ?? ''}` : `Recepción ${r.id.slice(0, 8)}`,
      value: r.id,
    })),
  ]

  return (
    <KeyboardAvoidingView className="flex-1 bg-veritt-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Registrar factura."
            subtitle="Vincula una factura CFDI de proveedor."
          />

          <View className="gap-4">
            <VrittSelect label="Proveedor" value={supplierId} options={supplierOptions} onChange={setSupplierId} disabled={isSubmitting} />
            <VrittSelect label="Recepción (opcional)" value={receiptId} options={receiptOptions} onChange={handleReceiptChange} disabled={isSubmitting} />

            {receiptTotal !== null && (
              <VrittCard>
                <View className="gap-1">
                  <Text className="text-[13px] text-veritt-muted">Total de la recepción</Text>
                  <Text className="text-veritt-text text-[18px] font-bold">${receiptTotal.toFixed(2)}</Text>
                </View>
              </VrittCard>
            )}

            <VrittInput label="UUID CFDI (opcional)" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" value={cfdiUuid} onChangeText={setCfdiUuid} editable={!isSubmitting} autoCapitalize="characters" />
            <VrittInput label="Monto total de la factura" placeholder="0.00" value={totalAmount} onChangeText={setTotalAmount} keyboardType="decimal-pad" editable={!isSubmitting} />

            {hasDiscrepancy && (
              <VrittCard>
                <View className="gap-3">
                  <Text className="text-[14px] font-bold text-yellow-400">
                    La factura (${invoiceAmount.toFixed(2)}) no coincide con la recepción (${receiptTotal!.toFixed(2)})
                  </Text>
                  <Text className="text-[13px] text-veritt-muted">
                    Diferencia: ${Math.abs(invoiceAmount - receiptTotal!).toFixed(2)} {invoiceAmount > receiptTotal! ? 'de más' : 'de menos'}
                  </Text>
                  <VrittInput
                    label="Motivo de la diferencia"
                    placeholder="Ej: IVA, flete, descuento por pronto pago..."
                    value={discrepancyNote}
                    onChangeText={setDiscrepancyNote}
                    editable={!isSubmitting}
                  />
                </View>
              </VrittCard>
            )}

            <VrittInput label="Fecha de factura (YYYY-MM-DD)" placeholder="2026-04-08" value={invoiceDate} onChangeText={setInvoiceDate} editable={!isSubmitting} />
          </View>

          <View className="gap-3.5">
            <VrittButton label="Registrar factura" loading={isSubmitting} onPress={handleCreate} />
            <VrittButton label="Cancelar" variant="secondary" onPress={() => router.back()} disabled={isSubmitting} />
          </View>
        </View>
      </VrittScreen>
    </KeyboardAvoidingView>
  )
}
