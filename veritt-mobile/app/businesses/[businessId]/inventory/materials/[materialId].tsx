import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { inventoryApi } from '@/api/modules/inventory.api'
import { Material } from '@/types/inventory.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

function formatNum(val: number | string) {
  return Number(val).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

function formatCurrency(val: number | string) {
  return `$${Number(val).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function MaterialDetailScreen() {
  const { businessId, materialId } = useLocalSearchParams<{ businessId: string; materialId: string }>()
  const [material, setMaterial] = useState<Material | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit fields
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSku, setEditSku] = useState('')
  const [editMinStock, setEditMinStock] = useState('')

  const loadMaterial = useCallback(async () => {
    if (!businessId || !materialId) return
    try {
      setIsLoading(true)
      const data = await inventoryApi.getMaterial(businessId, materialId)
      setMaterial(data)
      setEditName(data.name)
      setEditCategory(data.category ?? '')
      setEditSku(data.sku ?? '')
      setEditMinStock(String(Number(data.minStock)))
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar el insumo.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId, materialId])

  useEffect(() => { loadMaterial() }, [loadMaterial])

  const handleSave = async () => {
    if (!businessId || !materialId || !editName.trim()) return
    try {
      setIsSubmitting(true)
      await inventoryApi.updateMaterial(businessId, materialId, {
        name: editName.trim(),
        category: editCategory.trim() || undefined,
        sku: editSku.trim() || undefined,
        minStock: Number(editMinStock) || 0,
      })
      setIsEditing(false)
      loadMaterial()
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos actualizar el insumo.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeactivate = () => {
    if (!businessId || !materialId) return
    const newStatus = material?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const label = newStatus === 'ACTIVE' ? 'activar' : 'desactivar'

    Alert.alert(
      `¿${label.charAt(0).toUpperCase() + label.slice(1)} insumo?`,
      `¿Quieres ${label} "${material?.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: newStatus === 'INACTIVE' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await inventoryApi.updateMaterial(businessId, materialId, { status: newStatus })
              loadMaterial()
            } catch (error) {
              Alert.alert('Error', getApiErrorMessage(error, 'No pudimos actualizar el status.'))
            }
          },
        },
      ],
    )
  }

  if (isLoading) return <VrittLoader />
  if (!material) return <VrittScreen><VrittHeader title="Insumo no encontrado." /></VrittScreen>

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title={material.name}
          subtitle={`${material.baseUnit} · ${material.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}`}
        />

        {!isEditing ? (
          <>
            {/* Info card */}
            <VrittCard>
              <VrittSectionLabel className="mb-3">Información</VrittSectionLabel>
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Categoría</Text>
                  <Text className="text-veritt-text text-[15px]">{material.category || 'Sin categoría'}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">SKU</Text>
                  <Text className="text-veritt-text text-[15px]">{material.sku || 'Sin SKU'}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Unidad base</Text>
                  <Text className="text-veritt-text text-[15px]">{material.baseUnit}</Text>
                </View>
              </View>
            </VrittCard>

            {/* Stock card */}
            <VrittCard>
              <VrittSectionLabel className="mb-3">Inventario</VrittSectionLabel>
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Stock actual</Text>
                  <Text className="text-veritt-text text-[15px] font-bold">
                    {formatNum(material.currentStock)} {material.baseUnit}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Stock mínimo</Text>
                  <Text className="text-veritt-text text-[15px]">
                    {formatNum(material.minStock)} {material.baseUnit}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Costo unitario ref.</Text>
                  <Text className="text-veritt-text text-[15px]">{formatCurrency(material.currentReferenceUnitCost)}</Text>
                </View>
                {Number(material.currentStock) <= Number(material.minStock) && Number(material.minStock) > 0 && (
                  <View className="mt-2 rounded-veritt bg-red-900/30 px-3 py-2">
                    <Text className="text-red-400 text-[13px] font-bold">Stock bajo el mínimo</Text>
                  </View>
                )}
              </View>
            </VrittCard>

            <View className="gap-3.5">
              <VrittButton label="Editar" onPress={() => setIsEditing(true)} />
              <VrittButton
                label={material.status === 'ACTIVE' ? 'Desactivar insumo' : 'Activar insumo'}
                variant="secondary"
                onPress={handleDeactivate}
              />
              <VrittButton
                label="Volver al inventario"
                variant="secondary"
                onPress={() => router.replace(`/businesses/${businessId}/inventory`)}
              />
            </View>
          </>
        ) : (
          <>
            <View className="gap-4">
              <VrittInput label="Nombre" value={editName} onChangeText={setEditName} editable={!isSubmitting} />
              <VrittInput label="Categoría" value={editCategory} onChangeText={setEditCategory} editable={!isSubmitting} />
              <VrittInput label="SKU" value={editSku} onChangeText={setEditSku} editable={!isSubmitting} />
              <VrittInput label="Stock mínimo" value={editMinStock} onChangeText={setEditMinStock} keyboardType="numeric" editable={!isSubmitting} />
            </View>

            <View className="gap-3.5">
              <VrittButton label="Guardar cambios" loading={isSubmitting} onPress={handleSave} />
              <VrittButton label="Cancelar" variant="secondary" onPress={() => setIsEditing(false)} disabled={isSubmitting} />
            </View>
          </>
        )}
      </View>
    </VrittScreen>
  )
}
