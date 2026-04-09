import React, { useCallback, useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { receiptsApi } from '@/api/modules/receipts.api'
import { purchaseOrdersApi } from '@/api/modules/purchase-orders.api'
import { inventoryApi } from '@/api/modules/inventory.api'
import { PurchaseOrder } from '@/types/purchase-order.types'
import { InventoryLocation, Material } from '@/types/inventory.types'
import { CreateReceiptItemDto } from '@/types/receipt.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittSelect } from '@/components/ui/VrittSelect'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'
import { VrittLoader } from '@/components/ui/VrittLoader'

interface DraftItem {
  materialId: string
  quantityReceived: string
  actualUnitCost: string
}

export default function CreateReceiptScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [locations, setLocations] = useState<InventoryLocation[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [purchaseOrderId, setPurchaseOrderId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<DraftItem[]>([{ materialId: '', quantityReceived: '', actualUnitCost: '' }])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  const loadData = useCallback(async () => {
    if (!businessId) return
    try {
      const [poData, locData, matData] = await Promise.all([
        purchaseOrdersApi.list(businessId, { status: 'SENT' }),
        inventoryApi.listLocations(businessId),
        inventoryApi.listMaterials(businessId),
      ])
      setPurchaseOrders(poData)
      setLocations(locData)
      setMaterials(matData)
      const primary = locData.find((l) => l.isPrimary)
      if (primary) setLocationId(primary.id)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar los datos.'))
    } finally {
      setIsLoadingData(false)
    }
  }, [businessId])

  useEffect(() => { loadData() }, [loadData])

  const updateItem = (index: number, field: keyof DraftItem, value: string) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const addItem = () => {
    setItems((prev) => [...prev, { materialId: '', quantityReceived: '', actualUnitCost: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreate = async () => {
    if (!businessId) return
    if (!locationId) {
      Alert.alert('Faltan datos', 'Selecciona una ubicación de recepción.')
      return
    }

    const validItems: CreateReceiptItemDto[] = []
    for (const item of items) {
      if (!item.materialId || !item.quantityReceived || !item.actualUnitCost) {
        Alert.alert('Faltan datos', 'Todos los artículos deben tener material, cantidad y costo.')
        return
      }
      validItems.push({
        materialId: item.materialId,
        quantityReceived: parseFloat(item.quantityReceived),
        actualUnitCost: parseFloat(item.actualUnitCost),
      })
    }

    try {
      setIsSubmitting(true)
      await receiptsApi.create(businessId, {
        purchaseOrderId: purchaseOrderId || undefined,
        locationId,
        notes: notes.trim() || undefined,
        items: validItems,
      })
      router.replace(`/businesses/${businessId}/receipts`)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos registrar la recepción.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingData) return <VrittLoader />

  const poOptions = [
    { label: 'Sin orden de compra', value: '' },
    ...purchaseOrders.map((po) => ({ label: `OC-${po.orderNumber} — ${po.supplier?.name ?? ''}`, value: po.id })),
  ]
  const locationOptions = locations.map((l) => ({ label: l.name, value: l.id }))
  const materialOptions = materials.map((m) => ({ label: `${m.name} (${m.baseUnit})`, value: m.id }))

  return (
    <KeyboardAvoidingView className="flex-1 bg-veritt-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Registrar recepción."
            subtitle="Registra la llegada de materia prima."
          />

          <View className="gap-4">
            <VrittSelect label="Orden de compra (opcional)" value={purchaseOrderId} options={poOptions} onChange={setPurchaseOrderId} disabled={isSubmitting} />
            <VrittSelect label="Ubicación de recepción" value={locationId} options={locationOptions} onChange={setLocationId} disabled={isSubmitting} />
            <VrittInput label="Notas (opcional)" placeholder="Observaciones de la recepción..." value={notes} onChangeText={setNotes} editable={!isSubmitting} />
          </View>

          <View className="gap-4">
            <VrittSectionLabel>Artículos recibidos</VrittSectionLabel>
            {items.map((item, index) => (
              <VrittCard key={index}>
                <View className="gap-3">
                  <VrittSelect label="Material" value={item.materialId} options={materialOptions} onChange={(v) => updateItem(index, 'materialId', v)} disabled={isSubmitting} />
                  <VrittInput label="Cantidad recibida" placeholder="0" value={item.quantityReceived} onChangeText={(v) => updateItem(index, 'quantityReceived', v)} keyboardType="decimal-pad" editable={!isSubmitting} />
                  <VrittInput label="Costo unitario real" placeholder="0.00" value={item.actualUnitCost} onChangeText={(v) => updateItem(index, 'actualUnitCost', v)} keyboardType="decimal-pad" editable={!isSubmitting} />
                  {items.length > 1 && (
                    <VrittButton label="Eliminar artículo" variant="secondary" onPress={() => removeItem(index)} disabled={isSubmitting} />
                  )}
                </View>
              </VrittCard>
            ))}
            <VrittButton label="Agregar artículo" variant="secondary" onPress={addItem} disabled={isSubmitting} />
          </View>

          <View className="gap-3.5">
            <VrittButton label="Registrar recepción" loading={isSubmitting} onPress={handleCreate} />
            <VrittButton label="Cancelar" variant="secondary" onPress={() => router.back()} disabled={isSubmitting} />
          </View>
        </View>
      </VrittScreen>
    </KeyboardAvoidingView>
  )
}
