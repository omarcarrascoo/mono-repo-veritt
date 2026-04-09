import React, { useCallback, useMemo, useState } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { businessesApi } from '@/api/modules/businesses.api'
import { inventoryApi } from '@/api/modules/inventory.api'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittEmptyState } from '@/components/ui/VrittEmptyState'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'
import {
  formatInventoryCurrency,
  formatInventoryQuantity,
  formatInventoryStatus,
  formatLocationType,
  formatProductType,
  toInventoryNumber,
} from '@/lib/inventory-formatters'
import { Business } from '@/types/business.types'
import { InventoryLocation, Material, Product } from '@/types/inventory.types'
import { getApiErrorMessage } from '@/utils/error.utils'

function SummaryMetric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <View className="min-w-[47%] flex-1 rounded-card border border-veritt-border bg-veritt-surface p-4">
      <Text className="text-[24px] font-extrabold text-veritt-text">{value}</Text>
      <Text className="mt-1 text-[12px] font-medium uppercase tracking-[0.8px] text-veritt-mutedSoft">
        {label}
      </Text>
      {hint ? (
        <Text className="mt-2 text-[12px] leading-[18px] text-veritt-muted">{hint}</Text>
      ) : null}
    </View>
  )
}

function QuickActionRow({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center justify-between rounded-veritt border border-veritt-border bg-veritt-surfaceSoft px-4 py-4 active:opacity-90"
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
          <Ionicons name={icon} size={20} color="#000000" />
        </View>
        <View className="flex-1">
          <Text className="text-[16px] font-bold text-veritt-text">{title}</Text>
          <Text className="mt-1 text-[13px] text-veritt-muted">{description}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#8B8B8B" />
    </TouchableOpacity>
  )
}

function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string
  tone?: 'neutral' | 'warning' | 'danger' | 'primary'
}) {
  const toneClass =
    tone === 'danger'
      ? 'bg-[#2B1212] text-[#FF8E8E]'
      : tone === 'warning'
        ? 'bg-[#2A2312] text-[#F8D27C]'
        : tone === 'primary'
          ? 'bg-white text-black'
          : 'bg-veritt-border text-veritt-muted'

  return (
    <Text
      className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.9px] ${toneClass}`}
    >
      {label}
    </Text>
  )
}

function getStockTone(currentStock: number, minStock: number): 'neutral' | 'warning' | 'danger' {
  if (currentStock <= 0) {
    return 'danger'
  }

  if (minStock > 0 && currentStock <= minStock) {
    return 'warning'
  }

  return 'neutral'
}

export default function BusinessInventoryScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()

  const [business, setBusiness] = useState<Business | null>(null)
  const [locations, setLocations] = useState<InventoryLocation[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadInventory = useCallback(async () => {
    if (!businessId) return

    try {
      setIsLoading(true)

      const [businessData, locationData, materialData, productData] = await Promise.all([
        businessesApi.getById(businessId),
        inventoryApi.listLocations(businessId),
        inventoryApi.listMaterials(businessId),
        inventoryApi.listProducts(businessId),
      ])

      setBusiness(businessData)
      setLocations(locationData)
      setMaterials(materialData)
      setProducts(productData)
    } catch (error) {
      Alert.alert(
        'Error',
        getApiErrorMessage(error, 'No pudimos cargar el inventario.')
      )
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useFocusEffect(
    useCallback(() => {
      loadInventory()
    }, [loadInventory])
  )

  const stats = useMemo(() => {
    const lowMaterials = materials.filter((item) => {
      const currentStock = toInventoryNumber(item.currentStock)
      const minStock = toInventoryNumber(item.minStock)
      return currentStock > 0 && minStock > 0 && currentStock <= minStock
    }).length

    const outMaterials = materials.filter(
      (item) => toInventoryNumber(item.currentStock) <= 0
    ).length

    const lowProducts = products.filter((item) => {
      const currentStock = toInventoryNumber(item.currentStock)
      const minStock = toInventoryNumber(item.minStock)
      return currentStock > 0 && minStock > 0 && currentStock <= minStock
    }).length

    const outProducts = products.filter(
      (item) => toInventoryNumber(item.currentStock) <= 0
    ).length

    return {
      lowMaterials,
      outMaterials,
      lowProducts,
      outProducts,
    }
  }, [materials, products])

  if (isLoading) {
    return <VrittLoader />
  }

  if (!business) {
    return (
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Inventario no disponible."
            subtitle="No pudimos cargar la configuración de este negocio."
          />

          <VrittButton
            label="Volver al negocio"
            onPress={() => router.replace(`/businesses/${businessId}`)}
          />
        </View>
      </VrittScreen>
    )
  }

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          eyebrow={business.name}
          title="Inventario."
          subtitle="Registra ubicaciones, insumos y productos para que tu negocio empiece a operar con stock real desde la app."
        />

        <View className="flex-row flex-wrap gap-4">
          <SummaryMetric
            label="Ubicaciones"
            value={String(locations.length)}
            hint={locations.length > 1 ? 'Incluye almacenes y sucursales' : 'Usando ubicación principal'}
          />
          <SummaryMetric
            label="Insumos"
            value={String(materials.length)}
            hint={
              stats.outMaterials > 0
                ? `${stats.outMaterials} sin stock`
                : stats.lowMaterials > 0
                  ? `${stats.lowMaterials} en mínimo`
                  : 'Sin alertas críticas'
            }
          />
          <SummaryMetric
            label="Productos"
            value={String(products.length)}
            hint={
              stats.outProducts > 0
                ? `${stats.outProducts} agotados`
                : stats.lowProducts > 0
                  ? `${stats.lowProducts} por debajo del mínimo`
                  : 'Stock sano'
            }
          />
        </View>

        <VrittCard>
          <VrittSectionLabel className="mb-4">Acciones rápidas</VrittSectionLabel>

          <View className="gap-3">
            <QuickActionRow
              icon="business-outline"
              title="Agregar ubicación"
              description="Crea almacenes, cocinas o restaurantes dentro del mismo negocio."
              onPress={() => router.push(`/businesses/${businessId}/inventory/create-location`)}
            />

            <QuickActionRow
              icon="cube-outline"
              title="Agregar insumo"
              description="Registra materia prima y opcionalmente carga stock inicial."
              onPress={() => router.push(`/businesses/${businessId}/inventory/create-material`)}
            />

            <QuickActionRow
              icon="bag-add-outline"
              title="Agregar producto"
              description="Da de alta productos directos o con receta y súbelos al inventario."
              onPress={() => router.push(`/businesses/${businessId}/inventory/create-product`)}
            />
          </View>
        </VrittCard>

        <View className="gap-3">
          <VrittSectionLabel>Ubicaciones</VrittSectionLabel>

          {locations.map((location) => (
            <TouchableOpacity
              key={location.id}
              activeOpacity={0.85}
              onPress={() => router.push(`/businesses/${businessId}/inventory/locations/${location.id}`)}
            >
              <VrittCard>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[18px] font-bold text-veritt-text">
                      {location.name}
                    </Text>
                    <Text className="mt-1 text-[14px] text-veritt-muted">
                      {formatLocationType(location.type)}
                    </Text>
                  </View>

                  <View className="items-end gap-2">
                    {location.isPrimary ? (
                      <StatusPill label="Principal" tone="primary" />
                    ) : null}
                    <StatusPill label={formatInventoryStatus(location.status)} />
                  </View>
                </View>
              </VrittCard>
            </TouchableOpacity>
          ))}
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <VrittSectionLabel>Insumos</VrittSectionLabel>
            <Text className="text-[13px] text-veritt-muted">
              Moneda base: {business.defaultCurrency}
            </Text>
          </View>

          {materials.length === 0 ? (
            <VrittEmptyState
              title="Aún no hay insumos"
              description="Empieza registrando harina, agua, empaques o cualquier materia prima que tu negocio consuma."
              actionLabel="Agregar insumo"
              onActionPress={() => router.push(`/businesses/${businessId}/inventory/create-material`)}
            />
          ) : (
            materials.map((material) => {
              const currentStock = toInventoryNumber(material.currentStock)
              const minStock = toInventoryNumber(material.minStock)
              const stockTone = getStockTone(currentStock, minStock)

              return (
                <TouchableOpacity
                  key={material.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/businesses/${businessId}/inventory/materials/${material.id}`)}
                >
                  <VrittCard>
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-[18px] font-bold text-veritt-text">
                          {material.name}
                        </Text>
                        <Text className="mt-1 text-[14px] text-veritt-muted">
                          {material.category || 'Sin categoría'} · {material.baseUnit}
                        </Text>
                      </View>

                      <StatusPill
                        label={
                          stockTone === 'danger'
                            ? 'Sin stock'
                            : stockTone === 'warning'
                              ? 'Stock bajo'
                              : 'Disponible'
                        }
                        tone={stockTone}
                      />
                    </View>

                    <View className="mt-4 gap-2">
                      <Text className="text-[14px] text-veritt-text">
                        Stock actual:{' '}
                        {formatInventoryQuantity(material.currentStock, material.baseUnit)}
                      </Text>
                      <Text className="text-[14px] text-veritt-text">
                        Stock mínimo:{' '}
                        {formatInventoryQuantity(material.minStock, material.baseUnit)}
                      </Text>
                      <Text className="text-[14px] text-veritt-text">
                        Costo de referencia:{' '}
                        {formatInventoryCurrency(
                          material.currentReferenceUnitCost,
                          business.defaultCurrency
                        )}{' '}
                        por {material.baseUnit}
                      </Text>
                      {material.sku ? (
                        <Text className="text-[13px] text-veritt-muted">SKU: {material.sku}</Text>
                      ) : null}
                    </View>
                  </VrittCard>
                </TouchableOpacity>
              )
            })
          )}
        </View>

        <View className="gap-3">
          <VrittSectionLabel>Productos</VrittSectionLabel>

          {products.length === 0 ? (
            <VrittEmptyState
              title="Aún no hay productos"
              description="Cuando registres productos directos o con receta, aquí verás su precio, costo y stock actual."
              actionLabel="Agregar producto"
              onActionPress={() => router.push(`/businesses/${businessId}/inventory/create-product`)}
            />
          ) : (
            products.map((product) => {
              const currentStock = toInventoryNumber(product.currentStock)
              const minStock = toInventoryNumber(product.minStock)
              const stockTone = getStockTone(currentStock, minStock)

              return (
                <TouchableOpacity
                  key={product.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/businesses/${businessId}/inventory/products/${product.id}`)}
                >
                  <VrittCard>
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-[18px] font-bold text-veritt-text">
                          {product.name}
                        </Text>
                        <Text className="mt-1 text-[14px] text-veritt-muted">
                          {formatProductType(product.type)} · {product.category || 'Sin categoría'}
                        </Text>
                      </View>

                      <StatusPill
                        label={
                          stockTone === 'danger'
                            ? 'Agotado'
                            : stockTone === 'warning'
                              ? 'Mínimo'
                              : 'Disponible'
                        }
                        tone={stockTone}
                      />
                    </View>

                    <View className="mt-4 gap-2">
                      <Text className="text-[14px] text-veritt-text">
                        Precio de venta:{' '}
                        {formatInventoryCurrency(
                          product.currentSalePrice,
                          business.defaultCurrency
                        )}
                      </Text>
                      <Text className="text-[14px] text-veritt-text">
                        Costo actual:{' '}
                        {formatInventoryCurrency(product.currentCost, business.defaultCurrency)}
                      </Text>
                      <Text className="text-[14px] text-veritt-text">
                        Stock actual:{' '}
                        {formatInventoryQuantity(product.currentStock, product.stockUnit)}
                      </Text>
                      <Text className="text-[14px] text-veritt-text">
                        Stock mínimo:{' '}
                        {formatInventoryQuantity(product.minStock, product.stockUnit)}
                      </Text>
                    </View>
                  </VrittCard>
                </TouchableOpacity>
              )
            })
          )}
        </View>

        <View className="gap-3.5">
          <VrittButton
            label="Agregar producto"
            onPress={() => router.push(`/businesses/${businessId}/inventory/create-product`)}
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
