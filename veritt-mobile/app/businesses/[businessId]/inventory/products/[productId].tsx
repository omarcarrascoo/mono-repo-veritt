import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { inventoryApi } from '@/api/modules/inventory.api'
import { Product } from '@/types/inventory.types'
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

function formatProductType(type: string) {
  return type === 'RECIPE' ? 'Con receta' : 'Directo'
}

export default function ProductDetailScreen() {
  const { businessId, productId } = useLocalSearchParams<{ businessId: string; productId: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editMinStock, setEditMinStock] = useState('')

  const loadProduct = useCallback(async () => {
    if (!businessId || !productId) return
    try {
      setIsLoading(true)
      const data = await inventoryApi.getProduct(businessId, productId)
      setProduct(data)
      setEditName(data.name)
      setEditCategory(data.category ?? '')
      setEditMinStock(String(Number(data.minStock)))
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar el producto.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId, productId])

  useEffect(() => { loadProduct() }, [loadProduct])

  const handleSave = async () => {
    if (!businessId || !productId || !editName.trim()) return
    try {
      setIsSubmitting(true)
      await inventoryApi.updateProduct(businessId, productId, {
        name: editName.trim(),
        category: editCategory.trim() || undefined,
        minStock: Number(editMinStock) || 0,
      })
      setIsEditing(false)
      loadProduct()
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos actualizar el producto.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = () => {
    if (!businessId || !productId) return
    const newStatus = product?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const label = newStatus === 'ACTIVE' ? 'activar' : 'desactivar'

    Alert.alert(
      `¿${label.charAt(0).toUpperCase() + label.slice(1)} producto?`,
      `¿Quieres ${label} "${product?.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: newStatus === 'INACTIVE' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await inventoryApi.updateProduct(businessId, productId, { status: newStatus })
              loadProduct()
            } catch (error) {
              Alert.alert('Error', getApiErrorMessage(error, 'No pudimos actualizar el status.'))
            }
          },
        },
      ],
    )
  }

  if (isLoading) return <VrittLoader />
  if (!product) return <VrittScreen><VrittHeader title="Producto no encontrado." /></VrittScreen>

  const margin = Number(product.currentSalePrice) - Number(product.currentCost)
  const marginPercent = Number(product.currentSalePrice) > 0
    ? ((margin / Number(product.currentSalePrice)) * 100).toFixed(1)
    : '0.0'

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title={product.name}
          subtitle={`${formatProductType(product.type)} · ${product.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}`}
        />

        {!isEditing ? (
          <>
            <VrittCard>
              <VrittSectionLabel className="mb-3">Información</VrittSectionLabel>
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Tipo</Text>
                  <Text className="text-veritt-text text-[15px]">{formatProductType(product.type)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Categoría</Text>
                  <Text className="text-veritt-text text-[15px]">{product.category || 'Sin categoría'}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Unidad de stock</Text>
                  <Text className="text-veritt-text text-[15px]">{product.stockUnit}</Text>
                </View>
              </View>
            </VrittCard>

            <VrittCard>
              <VrittSectionLabel className="mb-3">Precios y costos</VrittSectionLabel>
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Precio de venta</Text>
                  <Text className="text-veritt-text text-[15px] font-bold">{formatCurrency(product.currentSalePrice)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Costo total</Text>
                  <Text className="text-veritt-text text-[15px]">{formatCurrency(product.currentCost)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Costo materiales</Text>
                  <Text className="text-veritt-text text-[15px]">{formatCurrency(product.currentMaterialCost)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Mano de obra</Text>
                  <Text className="text-veritt-text text-[15px]">{formatCurrency(product.currentDirectLaborCost)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">CIF asignado</Text>
                  <Text className="text-veritt-text text-[15px]">{formatCurrency(product.currentAllocatedCifCost)}</Text>
                </View>
                <View className="mt-2 rounded-veritt bg-veritt-surface px-3 py-2 border border-veritt-border">
                  <Text className="text-veritt-text text-[14px] font-bold">
                    Margen: {formatCurrency(margin)} ({marginPercent}%)
                  </Text>
                </View>
              </View>
            </VrittCard>

            <VrittCard>
              <VrittSectionLabel className="mb-3">Inventario</VrittSectionLabel>
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Stock actual</Text>
                  <Text className="text-veritt-text text-[15px] font-bold">
                    {formatNum(product.currentStock)} {product.stockUnit}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-veritt-muted text-[15px]">Stock mínimo</Text>
                  <Text className="text-veritt-text text-[15px]">
                    {formatNum(product.minStock)} {product.stockUnit}
                  </Text>
                </View>
                {Number(product.currentStock) <= Number(product.minStock) && Number(product.minStock) > 0 && (
                  <View className="mt-2 rounded-veritt bg-red-900/30 px-3 py-2">
                    <Text className="text-red-400 text-[13px] font-bold">Stock bajo el mínimo</Text>
                  </View>
                )}
              </View>
            </VrittCard>

            <View className="gap-3.5">
              <VrittButton label="Editar" onPress={() => setIsEditing(true)} />
              <VrittButton
                label={product.status === 'ACTIVE' ? 'Desactivar producto' : 'Activar producto'}
                variant="secondary"
                onPress={handleToggleStatus}
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
