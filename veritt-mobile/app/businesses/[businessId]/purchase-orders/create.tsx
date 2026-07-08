import React, { useCallback, useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { purchaseOrdersApi } from '@/api/modules/purchase-orders.api'
import { suppliersApi } from '@/api/modules/suppliers.api'
import { inventoryApi } from '@/api/modules/inventory.api'
import { Supplier } from '@/types/supplier.types'
import { Material } from '@/types/inventory.types'
import { CreatePurchaseOrderItemDto } from '@/types/purchase-order.types'
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
  quantityOrdered: string
  estimatedUnitCost: string
}

export default function CreatePurchaseOrderScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<DraftItem[]>([{ materialId: '', quantityOrdered: '', estimatedUnitCost: '' }])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  const loadData = useCallback(async () => {
    if (!businessId) return
    try {
      const [supplierData, materialData] = await Promise.all([
        suppliersApi.list(businessId, 'ACTIVE'),
        inventoryApi.listMaterials(businessId),
      ])
      setSuppliers(supplierData)
      setMaterials(materialData)
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
    setItems((prev) => [...prev, { materialId: '', quantityOrdered: '', estimatedUnitCost: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreate = async () => {
    if (!businessId) return
    if (!supplierId) {
      Alert.alert('Faltan datos', 'Selecciona un proveedor.')
      return
    }

    const validItems: CreatePurchaseOrderItemDto[] = []
    for (const item of items) {
      if (!item.materialId || !item.quantityOrdered || !item.estimatedUnitCost) {
        Alert.alert('Faltan datos', 'Todos los artículos deben tener material, cantidad y costo.')
        return
      }
      validItems.push({
        materialId: item.materialId,
        quantityOrdered: parseFloat(item.quantityOrdered),
        estimatedUnitCost: parseFloat(item.estimatedUnitCost),
      })
    }

    try {
      setIsSubmitting(true)
      await purchaseOrdersApi.create(businessId, {
        supplierId,
        notes: notes.trim() || undefined,
        items: validItems,
      })
      router.replace(`/businesses/${businessId}/purchase-orders`)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos crear la orden.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingData) return <VrittLoader />

  const supplierOptions = suppliers.map((s) => ({ label: s.name, value: s.id }))
  const materialOptions = materials.map((m) => ({ label: `${m.name} (${m.baseUnit})`, value: m.id }))

  return (
    <KeyboardAvoidingView className="flex-1 bg-veritt-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Crear orden de compra."
            subtitle="Solicita materia prima a un proveedor."
          />

          <View className="gap-4">
            <VrittSelect label="Proveedor" value={supplierId} options={supplierOptions} onChange={setSupplierId} disabled={isSubmitting} />
            <VrittInput label="Notas (opcional)" placeholder="Instrucciones especiales..." value={notes} onChangeText={setNotes} editable={!isSubmitting} />
          </View>

          <View className="gap-4">
            <VrittSectionLabel>Artículos</VrittSectionLabel>
            {items.map((item, index) => (
              <VrittCard key={index}>
                <View className="gap-3">
                  <VrittSelect label="Material" value={item.materialId} options={materialOptions} onChange={(v) => updateItem(index, 'materialId', v)} disabled={isSubmitting} />
                  <VrittInput label="Cantidad" placeholder="0" value={item.quantityOrdered} onChangeText={(v) => updateItem(index, 'quantityOrdered', v)} keyboardType="decimal-pad" editable={!isSubmitting} />
                  <VrittInput label="Costo unitario estimado" placeholder="0.00" value={item.estimatedUnitCost} onChangeText={(v) => updateItem(index, 'estimatedUnitCost', v)} keyboardType="decimal-pad" editable={!isSubmitting} />
                  {items.length > 1 && (
                    <VrittButton label="Eliminar artículo" variant="secondary" onPress={() => removeItem(index)} disabled={isSubmitting} />
                  )}
                </View>
              </VrittCard>
            ))}
            <VrittButton label="Agregar artículo" variant="secondary" onPress={addItem} disabled={isSubmitting} />
          </View>

          <View className="gap-3.5">
            <VrittButton label="Crear orden" loading={isSubmitting} onPress={handleCreate} />
            <VrittButton label="Cancelar" variant="secondary" onPress={() => router.back()} disabled={isSubmitting} />
          </View>
        </View>
      </VrittScreen>
    </KeyboardAvoidingView>
  )
}
