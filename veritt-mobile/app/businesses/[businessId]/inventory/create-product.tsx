import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { businessesApi } from '@/api/modules/businesses.api'
import { inventoryApi } from '@/api/modules/inventory.api'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittSelect } from '@/components/ui/VrittSelect'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'
import {
  formatInventoryQuantity,
  formatLocationType,
} from '@/lib/inventory-formatters'
import { Business } from '@/types/business.types'
import {
  InventoryLocation,
  Material,
  Product,
  ProductCostBreakdownDto,
  ProductType,
} from '@/types/inventory.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { markProductsStepCompleted, markRecipesStepCompleted } from '@/lib/update-onboarding'

const PRODUCT_TYPE_OPTIONS: {
  label: string
  value: ProductType
  hint?: string
}[] = [
  { label: 'Directo', value: 'DIRECT', hint: 'Se compra o recibe listo para vender' },
  { label: 'Con receta', value: 'RECIPE', hint: 'Su costo nace de los insumos usados' },
]

type RecipeItemForm = {
  id: string
  materialId: string
  quantity: string
  wastePercent: string
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function createRecipeItem(): RecipeItemForm {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    materialId: '',
    quantity: '',
    wastePercent: '',
  }
}

export default function CreateProductScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()

  const [business, setBusiness] = useState<Business | null>(null)
  const [locations, setLocations] = useState<InventoryLocation[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [existingCategories, setExistingCategories] = useState<string[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [type, setType] = useState<ProductType>('DIRECT')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const category = selectedCategory === '__CUSTOM__' ? customCategory : selectedCategory
  const [stockUnit, setStockUnit] = useState('unit')
  const [estimatedDailySalesVolume, setEstimatedDailySalesVolume] = useState('')
  const [minStock, setMinStock] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [initialLocationId, setInitialLocationId] = useState('')

  const [directMaterialCost, setDirectMaterialCost] = useState('')
  const [directLaborCost, setDirectLaborCost] = useState('')
  const [directCifCost, setDirectCifCost] = useState('')
  const [initialDirectStock, setInitialDirectStock] = useState('')

  const [recipeDirectLaborCost, setRecipeDirectLaborCost] = useState('')
  const [recipeAllocatedCifCost, setRecipeAllocatedCifCost] = useState('')
  const [initialProductionQuantity, setInitialProductionQuantity] = useState('')
  const [recipeItems, setRecipeItems] = useState<RecipeItemForm[]>([createRecipeItem()])

  useEffect(() => {
    const loadFormData = async () => {
      if (!businessId) return

      try {
        setIsLoadingData(true)

        const [businessData, locationData, materialData, categories] = await Promise.all([
          businessesApi.getById(businessId),
          inventoryApi.listLocations(businessId),
          inventoryApi.listMaterials(businessId),
          inventoryApi.listCategories(businessId).catch(() => []),
        ])

        setBusiness(businessData)
        setLocations(locationData)
        setMaterials(materialData)
        setExistingCategories(categories)

        const preferredLocation =
          locationData.find((item) => item.isPrimary) ?? locationData[0]

        if (preferredLocation) {
          setInitialLocationId(preferredLocation.id)
        }
      } catch (error) {
        Alert.alert(
          'Error',
          getApiErrorMessage(error, 'No pudimos preparar el formulario.')
        )
      } finally {
        setIsLoadingData(false)
      }
    }

    loadFormData()
  }, [businessId])

  const categoryOptions = useMemo(
    () => [
      { label: 'Sin categoría', value: '' },
      ...existingCategories.map((c) => ({ label: c, value: c })),
      { label: 'Nueva categoría...', value: '__CUSTOM__' },
    ],
    [existingCategories],
  )

  const locationOptions = useMemo(
    () =>
      locations.map((location) => ({
        label: location.name,
        value: location.id,
        hint: formatLocationType(location.type),
      })),
    [locations]
  )

  const materialOptions = useMemo(
    () =>
      materials.map((material) => ({
        label: material.name,
        value: material.id,
        hint: `Disponible ${formatInventoryQuantity(material.currentStock, material.baseUnit)}`,
      })),
    [materials]
  )

  const directCostBreakdown = useMemo<ProductCostBreakdownDto>(() => {
    const materialCost = parseOptionalNumber(directMaterialCost) ?? 0
    const laborCost = parseOptionalNumber(directLaborCost) ?? 0
    const cifCost = parseOptionalNumber(directCifCost) ?? 0

    return {
      materialCost,
      directLaborCost: laborCost,
      allocatedCifCost: cifCost,
      totalCost: materialCost + laborCost + cifCost,
    }
  }, [directCifCost, directLaborCost, directMaterialCost])

  const handleRecipeItemChange = (
    id: string,
    field: keyof Omit<RecipeItemForm, 'id'>,
    value: string
  ) => {
    setRecipeItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    )
  }

  const handleRemoveRecipeItem = (id: string) => {
    setRecipeItems((current) => {
      if (current.length === 1) {
        return current
      }

      return current.filter((item) => item.id !== id)
    })
  }

  const validatePositiveNumber = (value: string, label: string) => {
    const parsed = parseOptionalNumber(value)

    if (value.trim() && (parsed === undefined || parsed <= 0)) {
      Alert.alert('Dato inválido', `${label} debe ser mayor a cero.`)
      return undefined
    }

    return parsed
  }

  const handleCreateProduct = async () => {
    if (!businessId) return

    if (!name.trim()) {
      Alert.alert('Faltan datos', 'Asigna un nombre para el producto.')
      return
    }

    const estimatedSalesValue = parseOptionalNumber(estimatedDailySalesVolume)
    const minStockValue = parseOptionalNumber(minStock)

    if (
      estimatedDailySalesVolume.trim() &&
      (estimatedSalesValue === undefined || estimatedSalesValue < 0)
    ) {
      Alert.alert('Dato inválido', 'La venta diaria estimada debe ser cero o mayor.')
      return
    }

    if (minStock.trim() && (minStockValue === undefined || minStockValue < 0)) {
      Alert.alert('Dato inválido', 'El stock mínimo debe ser cero o mayor.')
      return
    }

    const salePriceValue = salePrice.trim() ? validatePositiveNumber(salePrice, 'El precio') : undefined
    if (salePrice.trim() && salePriceValue === undefined) {
      return
    }

    const initialDirectStockValue =
      type === 'DIRECT'
        ? initialDirectStock.trim()
          ? validatePositiveNumber(initialDirectStock, 'El stock inicial')
          : undefined
        : undefined

    if (type === 'DIRECT' && initialDirectStock.trim() && initialDirectStockValue === undefined) {
      return
    }

    const recipeLaborCostValue = parseOptionalNumber(recipeDirectLaborCost)
    const recipeCifCostValue = parseOptionalNumber(recipeAllocatedCifCost)

    if (
      (parseOptionalNumber(directMaterialCost) ?? 0) < 0 ||
      (parseOptionalNumber(directLaborCost) ?? 0) < 0 ||
      (parseOptionalNumber(directCifCost) ?? 0) < 0
    ) {
      Alert.alert('Dato inválido', 'Los costos del producto directo deben ser cero o mayores.')
      return
    }

    if (
      recipeDirectLaborCost.trim() &&
      (recipeLaborCostValue === undefined || recipeLaborCostValue < 0)
    ) {
      Alert.alert('Dato inválido', 'La mano de obra debe ser cero o mayor.')
      return
    }

    if (
      recipeAllocatedCifCost.trim() &&
      (recipeCifCostValue === undefined || recipeCifCostValue < 0)
    ) {
      Alert.alert('Dato inválido', 'El CIF asignado debe ser cero o mayor.')
      return
    }

    const initialProductionValue =
      type === 'RECIPE'
        ? initialProductionQuantity.trim()
          ? validatePositiveNumber(initialProductionQuantity, 'La producción inicial')
          : undefined
        : undefined

    if (
      type === 'RECIPE' &&
      initialProductionQuantity.trim() &&
      initialProductionValue === undefined
    ) {
      return
    }

    if (type === 'RECIPE' && materials.length === 0) {
      Alert.alert(
        'Faltan insumos',
        'Primero registra al menos un insumo para poder crear una receta.'
      )
      return
    }

    const normalizedRecipeItems =
      type === 'RECIPE'
        ? recipeItems.map((item) => ({
            materialId: item.materialId,
            quantity: parseOptionalNumber(item.quantity),
            wastePercent: parseOptionalNumber(item.wastePercent) ?? 0,
          }))
        : []

    if (type === 'RECIPE') {
      if (normalizedRecipeItems.some((item) => !item.materialId || !item.quantity || item.quantity <= 0)) {
        Alert.alert(
          'Receta incompleta',
          'Cada renglón de receta necesita un insumo y una cantidad mayor a cero.'
        )
        return
      }

      if (normalizedRecipeItems.some((item) => (item.wastePercent ?? 0) < 0)) {
        Alert.alert(
          'Dato inválido',
          'La merma natural debe ser cero o mayor en todos los insumos.'
        )
        return
      }

      const materialIds = normalizedRecipeItems.map((item) => item.materialId)
      if (new Set(materialIds).size !== materialIds.length) {
        Alert.alert(
          'Receta duplicada',
          'No repitas el mismo insumo dentro de una misma versión de receta.'
        )
        return
      }
    }

    let createdProduct: Product | null = null

    try {
      setIsSubmitting(true)

      createdProduct = await inventoryApi.createProduct(businessId, {
        name: name.trim(),
        type,
        category: category.trim() || undefined,
        stockUnit: stockUnit.trim() || undefined,
        estimatedDailySalesVolume: estimatedSalesValue,
        minStock: minStockValue,
      })

      if (salePriceValue) {
        await inventoryApi.addProductPrice(businessId, createdProduct.id, {
          price: salePriceValue,
          changeReason: 'Precio inicial desde app móvil',
        })
      }

      if (type === 'DIRECT') {
        const shouldPersistCost =
          directCostBreakdown.totalCost !== undefined &&
          directCostBreakdown.totalCost > 0

        if (shouldPersistCost) {
          await inventoryApi.addProductManualCost(businessId, createdProduct.id, {
            ...directCostBreakdown,
            changeReason: 'Costo inicial desde app móvil',
          })
        }

        if (initialDirectStockValue) {
          await inventoryApi.receiveProductLot(businessId, createdProduct.id, {
            locationId: initialLocationId || undefined,
            quantity: initialDirectStockValue,
            note: 'Ingreso inicial desde app móvil',
            ...directCostBreakdown,
          })
        }
      }

      if (type === 'RECIPE') {
        const recipeVersion = await inventoryApi.createRecipeVersion(
          businessId,
          createdProduct.id,
          {
            directLaborCost: recipeLaborCostValue ?? 0,
            allocatedCifCost: recipeCifCostValue ?? 0,
            note: 'Receta base creada desde app móvil',
            items: normalizedRecipeItems.map((item) => ({
              materialId: item.materialId,
              quantity: item.quantity!,
              wastePercent: item.wastePercent,
            })),
          }
        )

        if (initialProductionValue) {
          await inventoryApi.createProductionBatch(businessId, createdProduct.id, {
            locationId: initialLocationId || undefined,
            recipeVersionId: recipeVersion.id,
            quantity: initialProductionValue,
            directLaborCost: recipeLaborCostValue ?? 0,
            allocatedCifCost: recipeCifCostValue ?? 0,
            note: 'Producción inicial desde app móvil',
          })
        }
      }

      await markProductsStepCompleted(businessId).catch(() => {})
      if (type === 'RECIPE') {
        await markRecipesStepCompleted(businessId).catch(() => {})
      }
      router.replace(`/businesses/${businessId}/inventory`)
    } catch (error) {
      if (createdProduct) {
        Alert.alert(
          'Producto creado parcialmente',
          getApiErrorMessage(
            error,
            `Creamos ${createdProduct.name}, pero faltó completar precio, receta o stock inicial.`
          ),
          [
            {
              text: 'Entendido',
              onPress: () => router.replace(`/businesses/${businessId}/inventory`),
            },
          ]
        )
        return
      }

      Alert.alert(
        'Error',
        getApiErrorMessage(error, 'No pudimos guardar el producto.')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingData) {
    return <VrittLoader />
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-veritt-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Agrega un producto."
            subtitle="Registra precio, costo y stock inicial de productos directos o construye recetas para producción."
          />

          <View className="gap-4">
            <VrittInput
              label="Nombre"
              placeholder="Pan artesanal"
              value={name}
              onChangeText={setName}
              editable={!isSubmitting}
            />

            <VrittSelect
              label="Tipo de producto"
              value={type}
              options={PRODUCT_TYPE_OPTIONS}
              onChange={setType}
              disabled={isSubmitting}
            />

            <VrittSelect
              label="Categoría"
              value={selectedCategory}
              options={categoryOptions}
              onChange={setSelectedCategory}
              disabled={isSubmitting}
            />

            {selectedCategory === '__CUSTOM__' && (
              <VrittInput
                label="Nueva categoría"
                placeholder="Ej: Bebidas"
                value={customCategory}
                onChangeText={setCustomCategory}
                editable={!isSubmitting}
              />
            )}

            <VrittInput
              label="Unidad de stock"
              placeholder="unit, caja, charola"
              value={stockUnit}
              onChangeText={setStockUnit}
              autoCapitalize="none"
              editable={!isSubmitting}
            />
          </View>

          <VrittCard>
            <VrittSectionLabel className="mb-3">Comercial</VrittSectionLabel>

            <View className="gap-4">
              <VrittInput
                label={`Precio de venta (${business?.defaultCurrency || 'MXN'})`}
                placeholder="55"
                value={salePrice}
                onChangeText={setSalePrice}
                keyboardType="numeric"
                editable={!isSubmitting}
              />

              <VrittInput
                label="Venta diaria estimada"
                placeholder="20"
                value={estimatedDailySalesVolume}
                onChangeText={setEstimatedDailySalesVolume}
                keyboardType="numeric"
                editable={!isSubmitting}
              />

              <VrittInput
                label="Stock mínimo"
                placeholder="5"
                value={minStock}
                onChangeText={setMinStock}
                keyboardType="numeric"
                editable={!isSubmitting}
              />
            </View>
          </VrittCard>

          {type === 'DIRECT' ? (
            <>
              <VrittCard>
                <VrittSectionLabel className="mb-3">Costo del producto directo</VrittSectionLabel>

                <View className="gap-4">
                  <VrittInput
                    label="Materia prima"
                    placeholder="18"
                    value={directMaterialCost}
                    onChangeText={setDirectMaterialCost}
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />

                  <VrittInput
                    label="Mano de obra directa"
                    placeholder="0"
                    value={directLaborCost}
                    onChangeText={setDirectLaborCost}
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />

                  <VrittInput
                    label="CIF asignado"
                    placeholder="0"
                    value={directCifCost}
                    onChangeText={setDirectCifCost}
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />

                  <Text className="text-[14px] leading-[22px] text-veritt-muted">
                    Costo total calculado: {directCostBreakdown.totalCost?.toFixed(2)}{' '}
                    {business?.defaultCurrency || 'MXN'}
                  </Text>
                </View>
              </VrittCard>

              <VrittCard>
                <VrittSectionLabel className="mb-3">Ingreso inicial a inventario</VrittSectionLabel>

                <Text className="mb-4 text-[13px] leading-[20px] text-veritt-muted">
                  Opcional. Si ya recibiste unidades de este producto, déjalas cargadas
                  desde ahora.
                </Text>

                <View className="gap-4">
                  <VrittInput
                    label="Cantidad inicial"
                    placeholder="24"
                    value={initialDirectStock}
                    onChangeText={setInitialDirectStock}
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />

                  {locationOptions.length > 0 ? (
                    <VrittSelect
                      label="Ubicación"
                      value={initialLocationId}
                      options={locationOptions}
                      onChange={setInitialLocationId}
                      disabled={!locationOptions.length || isSubmitting}
                    />
                  ) : null}
                </View>
              </VrittCard>
            </>
          ) : (
            <>
              <VrittCard>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <VrittSectionLabel className="mb-3">Receta base</VrittSectionLabel>
                    <Text className="text-[13px] leading-[20px] text-veritt-muted">
                      El costo mostrado al dueño usará referencia de insumos, mientras que el
                      consumo real seguirá FIFO en inventario.
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setRecipeItems((current) => [...current, createRecipeItem()])}
                    className="rounded-full border border-veritt-border bg-veritt-surfaceSoft px-4 py-2"
                  >
                    <Text className="text-[12px] font-bold uppercase tracking-[0.8px] text-veritt-text">
                      Agregar línea
                    </Text>
                  </TouchableOpacity>
                </View>

                {materials.length === 0 ? (
                  <View className="mt-5 gap-4 rounded-veritt border border-veritt-border bg-veritt-surfaceSoft p-4">
                    <Text className="text-[15px] font-semibold text-veritt-text">
                      Aún no tienes insumos disponibles
                    </Text>
                    <Text className="text-[13px] leading-[20px] text-veritt-muted">
                      Primero registra la materia prima que usarás en la receta para poder
                      continuar.
                    </Text>
                    <VrittButton
                      label="Agregar insumo"
                      variant="secondary"
                      onPress={() => router.push(`/businesses/${businessId}/inventory/create-material`)}
                    />
                  </View>
                ) : (
                  <View className="mt-5 gap-4">
                    {recipeItems.map((item, index) => (
                      <VrittCard key={item.id} className="bg-veritt-surfaceSoft">
                        <View className="mb-4 flex-row items-center justify-between">
                          <Text className="text-[15px] font-bold text-veritt-text">
                            Insumo {index + 1}
                          </Text>

                          {recipeItems.length > 1 ? (
                            <TouchableOpacity
                              activeOpacity={0.9}
                              onPress={() => handleRemoveRecipeItem(item.id)}
                              className="flex-row items-center gap-1 rounded-full bg-[#1A1A1A] px-3 py-1.5"
                            >
                              <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                              <Text className="text-[11px] font-bold uppercase tracking-[0.8px] text-veritt-text">
                                Quitar
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        <View className="gap-4">
                          <VrittSelect
                            label="Insumo"
                            value={item.materialId}
                            options={materialOptions}
                            onChange={(value) => handleRecipeItemChange(item.id, 'materialId', value)}
                            disabled={isSubmitting}
                          />

                          <VrittInput
                            label="Cantidad por unidad"
                            placeholder="0.25"
                            value={item.quantity}
                            onChangeText={(value) => handleRecipeItemChange(item.id, 'quantity', value)}
                            keyboardType="numeric"
                            editable={!isSubmitting}
                          />

                          <VrittInput
                            label="Merma natural (%)"
                            placeholder="5"
                            value={item.wastePercent}
                            onChangeText={(value) =>
                              handleRecipeItemChange(item.id, 'wastePercent', value)
                            }
                            keyboardType="numeric"
                            editable={!isSubmitting}
                          />
                        </View>
                      </VrittCard>
                    ))}
                  </View>
                )}
              </VrittCard>

              <VrittCard>
                <VrittSectionLabel className="mb-3">Costos adicionales de receta</VrittSectionLabel>

                <View className="gap-4">
                  <VrittInput
                    label="Mano de obra directa por unidad"
                    placeholder="3"
                    value={recipeDirectLaborCost}
                    onChangeText={setRecipeDirectLaborCost}
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />

                  <VrittInput
                    label="CIF asignado por unidad"
                    placeholder="1.5"
                    value={recipeAllocatedCifCost}
                    onChangeText={setRecipeAllocatedCifCost}
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />
                </View>
              </VrittCard>

              <VrittCard>
                <VrittSectionLabel className="mb-3">Producción inicial</VrittSectionLabel>

                <Text className="mb-4 text-[13px] leading-[20px] text-veritt-muted">
                  Opcional. Si quieres que el producto entre con stock desde hoy, puedes
                  crear un primer lote de producción usando los insumos de la ubicación elegida.
                </Text>

                <View className="gap-4">
                  <VrittInput
                    label="Cantidad a producir"
                    placeholder="10"
                    value={initialProductionQuantity}
                    onChangeText={setInitialProductionQuantity}
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />

                  {locationOptions.length > 0 ? (
                    <VrittSelect
                      label="Ubicación de producción"
                      value={initialLocationId}
                      options={locationOptions}
                      onChange={setInitialLocationId}
                      disabled={!locationOptions.length || isSubmitting}
                    />
                  ) : null}
                </View>
              </VrittCard>
            </>
          )}

          <View className="gap-3.5">
            <VrittButton
              label="Guardar producto"
              loading={isSubmitting}
              onPress={handleCreateProduct}
            />

            <VrittButton
              label="Cancelar"
              variant="secondary"
              onPress={() => router.back()}
              disabled={isSubmitting}
            />
          </View>
        </View>
      </VrittScreen>
    </KeyboardAvoidingView>
  )
}
