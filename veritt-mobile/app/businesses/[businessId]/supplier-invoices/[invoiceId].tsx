import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supplierInvoicesApi } from '@/api/modules/supplier-invoices.api'
import { SupplierInvoice } from '@/types/supplier-invoice.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  VERIFIED: 'Verificada',
  DISPUTED: 'Disputada',
  DELETED: 'Eliminada',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-400',
  VERIFIED: 'text-green-400',
  DISPUTED: 'text-red-400',
  DELETED: 'text-veritt-muted',
}

export default function SupplierInvoiceDetailScreen() {
  const { businessId, invoiceId } = useLocalSearchParams<{ businessId: string; invoiceId: string }>()
  const [invoice, setInvoice] = useState<SupplierInvoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActioning, setIsActioning] = useState(false)
  const [confirmVerify, setConfirmVerify] = useState(false)
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [showDeleteForm, setShowDeleteForm] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')

  const loadInvoice = useCallback(async () => {
    if (!businessId || !invoiceId) return
    try {
      setIsLoading(true)
      const data = await supplierInvoicesApi.get(businessId, invoiceId)
      setInvoice(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar la factura.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId, invoiceId])

  useEffect(() => { loadInvoice() }, [loadInvoice])

  const handleVerify = async () => {
    if (!businessId || !invoiceId) return
    try {
      setIsActioning(true)
      const updated = await supplierInvoicesApi.verify(businessId, invoiceId)
      setInvoice(updated)
      setConfirmVerify(false)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos verificar la factura.'))
    } finally {
      setIsActioning(false)
    }
  }

  const handleDispute = async () => {
    if (!businessId || !invoiceId) return
    if (!disputeReason.trim()) {
      Alert.alert('Faltan datos', 'El motivo de disputa es obligatorio.')
      return
    }
    try {
      setIsActioning(true)
      const updated = await supplierInvoicesApi.dispute(businessId, invoiceId, disputeReason.trim())
      setInvoice(updated)
      setShowDisputeForm(false)
      setDisputeReason('')
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos disputar la factura.'))
    } finally {
      setIsActioning(false)
    }
  }

  const handleDelete = async () => {
    if (!businessId || !invoiceId) return
    if (!deleteReason.trim()) {
      Alert.alert('Faltan datos', 'El motivo de eliminación es obligatorio.')
      return
    }
    try {
      setIsActioning(true)
      const updated = await supplierInvoicesApi.softDelete(businessId, invoiceId, deleteReason.trim())
      setInvoice(updated)
      setShowDeleteForm(false)
      setDeleteReason('')
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos eliminar la factura.'))
    } finally {
      setIsActioning(false)
    }
  }

  if (isLoading) return <VrittLoader />
  if (!invoice) return null

  const canVerify = invoice.status === 'PENDING' || invoice.status === 'DISPUTED'
  const canDispute = invoice.status === 'PENDING' || invoice.status === 'VERIFIED'
  const canDelete = invoice.status !== 'DELETED'
  const showingForm = confirmVerify || showDisputeForm || showDeleteForm

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title={invoice.supplier?.name ?? 'Factura'}
          subtitle={STATUS_LABELS[invoice.status] ?? invoice.status}
        />

        <VrittCard>
          <View className="gap-3">
            <View>
              <Text className="text-[13px] text-veritt-muted">Estado</Text>
              <Text className={`text-[15px] font-bold ${STATUS_COLORS[invoice.status] ?? 'text-veritt-text'}`}>
                {STATUS_LABELS[invoice.status] ?? invoice.status}
              </Text>
            </View>
            <View>
              <Text className="text-[13px] text-veritt-muted">Monto total</Text>
              <Text className="text-veritt-text text-[15px]">${Number(invoice.totalAmount).toFixed(2)} {invoice.currency}</Text>
            </View>
            {invoice.receiptTotal != null && (
              <View>
                <Text className="text-[13px] text-veritt-muted">Total de recepción</Text>
                <Text className="text-veritt-text text-[15px]">${Number(invoice.receiptTotal).toFixed(2)}</Text>
              </View>
            )}
            <View>
              <Text className="text-[13px] text-veritt-muted">Fecha de factura</Text>
              <Text className="text-veritt-text text-[15px]">{new Date(invoice.invoiceDate).toLocaleDateString('es-MX')}</Text>
            </View>
            {invoice.cfdiUuid && (
              <View>
                <Text className="text-[13px] text-veritt-muted">UUID CFDI</Text>
                <Text className="text-veritt-text text-[15px]">{invoice.cfdiUuid}</Text>
              </View>
            )}
            {invoice.receipt && (
              <View>
                <Text className="text-[13px] text-veritt-muted">Recepción vinculada</Text>
                <Text className="text-veritt-text text-[15px]">
                  {invoice.receipt.purchaseOrder ? `OC-${invoice.receipt.purchaseOrder.orderNumber}` : `Recepción ${invoice.receiptId?.slice(0, 8)}`}
                </Text>
              </View>
            )}
          </View>
        </VrittCard>

        {invoice.discrepancyNote && (
          <VrittCard>
            <View className="gap-2">
              <Text className="text-[14px] font-bold text-yellow-400">Nota de discrepancia</Text>
              <Text className="text-veritt-text text-[15px]">{invoice.discrepancyNote}</Text>
            </View>
          </VrittCard>
        )}

        {invoice.verifiedBy && invoice.verifiedAt && (
          <VrittCard>
            <View className="gap-2">
              <Text className="text-[14px] font-bold text-green-400">Verificada</Text>
              <Text className="text-veritt-muted text-[13px]">
                Por {invoice.verifiedBy.fullName} el {new Date(invoice.verifiedAt).toLocaleDateString('es-MX')}
              </Text>
            </View>
          </VrittCard>
        )}

        {invoice.status === 'DELETED' && (
          <VrittCard>
            <View className="gap-2">
              <Text className="text-[14px] font-bold text-red-400">Eliminada</Text>
              {invoice.deletionReason && (
                <View>
                  <Text className="text-[13px] text-veritt-muted">Motivo</Text>
                  <Text className="text-veritt-text text-[15px]">{invoice.deletionReason}</Text>
                </View>
              )}
              {invoice.deletedBy && invoice.deletedAt && (
                <Text className="text-veritt-muted text-[13px]">
                  Por {invoice.deletedBy.fullName} el {new Date(invoice.deletedAt).toLocaleDateString('es-MX')}
                </Text>
              )}
            </View>
          </VrittCard>
        )}

        {/* Action buttons — only when no inline form is open */}
        {invoice.status !== 'DELETED' && !showingForm && (
          <View className="gap-3.5">
            {canVerify && (
              <VrittButton label="Verificar factura" onPress={() => setConfirmVerify(true)} loading={isActioning} />
            )}
            {canDispute && (
              <VrittButton label="Disputar factura" variant="secondary" onPress={() => setShowDisputeForm(true)} disabled={isActioning} />
            )}
            {canDelete && (
              <VrittButton label="Eliminar factura" variant="secondary" onPress={() => setShowDeleteForm(true)} disabled={isActioning} />
            )}
          </View>
        )}

        {/* Inline confirm: verify */}
        {confirmVerify && (
          <VrittCard>
            <View className="gap-4">
              <Text className="text-[15px] font-bold text-veritt-text">¿Verificar esta factura?</Text>
              <Text className="text-[13px] text-veritt-muted">Confirmas que la factura está correcta y los datos coinciden.</Text>
              <View className="gap-3.5">
                <VrittButton label="Sí, verificar" onPress={handleVerify} loading={isActioning} />
                <VrittButton label="Volver" variant="secondary" onPress={() => setConfirmVerify(false)} disabled={isActioning} />
              </View>
            </View>
          </VrittCard>
        )}

        {/* Inline form: dispute */}
        {showDisputeForm && (
          <VrittCard>
            <View className="gap-4">
              <Text className="text-[15px] font-bold text-veritt-text">Disputar factura</Text>
              <VrittInput
                label="Motivo de la disputa"
                placeholder="¿Por qué se disputa esta factura?"
                value={disputeReason}
                onChangeText={setDisputeReason}
                editable={!isActioning}
              />
              <View className="gap-3.5">
                <VrittButton label="Confirmar disputa" onPress={handleDispute} loading={isActioning} />
                <VrittButton label="Volver" variant="secondary" onPress={() => setShowDisputeForm(false)} disabled={isActioning} />
              </View>
            </View>
          </VrittCard>
        )}

        {/* Inline form: delete */}
        {showDeleteForm && (
          <VrittCard>
            <View className="gap-4">
              <Text className="text-[15px] font-bold text-veritt-text">Eliminar factura</Text>
              <Text className="text-[13px] text-veritt-muted">
                La factura quedará marcada como eliminada. El registro se conserva para auditoría.
              </Text>
              <VrittInput
                label="Motivo de eliminación"
                placeholder="¿Por qué se elimina esta factura?"
                value={deleteReason}
                onChangeText={setDeleteReason}
                editable={!isActioning}
              />
              <View className="gap-3.5">
                <VrittButton label="Confirmar eliminación" onPress={handleDelete} loading={isActioning} />
                <VrittButton label="Volver" variant="secondary" onPress={() => setShowDeleteForm(false)} disabled={isActioning} />
              </View>
            </View>
          </VrittCard>
        )}

        <VrittButton
          label="Volver a facturas"
          variant="secondary"
          onPress={() => router.replace(`/businesses/${businessId}/supplier-invoices`)}
        />
      </View>
    </VrittScreen>
  )
}
