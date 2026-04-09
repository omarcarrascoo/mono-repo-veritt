import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'

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
import { formatLocationType } from '@/lib/inventory-formatters'
import { Business } from '@/types/business.types'
import { InventoryLocation } from '@/types/inventory.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { markIngredientsStepCompleted } from '@/lib/update-onboarding'

function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export default function CreateMaterialScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()

  const [business, setBusiness] = useState<Business | null>(null)
  const [locations, setLocations] = useState<InventoryLocation[]>([])
  const [existingCategories, setExistingCategories] = useState<string[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [baseUnit, setBaseUnit] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const category = selectedCategory === '__CUSTOM__' ? customCategory : selectedCategory
  const [sku, setSku] = useState('')
  const [reorderFrequencyDays, setReorderFrequencyDays] = useState('')
  const [minStock, setMinStock] = useState('')
  const [initialQuantity, setInitialQuantity] = useState('')
  const [initialUnitCost, setInitialUnitCost] = useState('')
  const [locationId, setLocationId] = useState('')

  useEffect(() => {
    const loadFormData = async () => {
      if (!businessId) return

      try {
        setIsLoadingData(true)

        const [businessData, locationData, categories] = await Promise.all([
          businessesApi.getById(businessId),
          inventoryApi.listLocations(businessId),
          inventoryApi.listCategories(businessId).catch(() => []),
        ])

        setBusiness(businessData)
        setLocations(locationData)
        setExistingCategories(categories)

        const preferredLocation =
          locationData.find((item) => item.isPrimary) ?? locationData[0]

        if (preferredLocation) {
          setLocationId(preferredLocation.id)
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

  const handleCreateMaterial = async () => {
    if (!businessId) return

    if (!name.trim() || !baseUnit.trim()) {
      Alert.alert('Faltan datos', 'Completa el nombre y la unidad base del insumo.')
      return
    }

    const reorderFrequencyValue = parseOptionalNumber(reorderFrequencyDays)
    const minStockValue = parseOptionalNumber(minStock)
    const initialQuantityValue = parseOptionalNumber(initialQuantity)
    const initialUnitCostValue = parseOptionalNumber(initialUnitCost)

    if (reorderFrequencyDays.trim() && (!reorderFrequencyValue || reorderFrequencyValue < 1)) {
      Alert.alert('Dato inválido', 'La frecuencia de reabastecimiento debe ser mayor a cero.')
      return
    }

    if (minStock.trim() && (minStockValue === undefined || minStockValue < 0)) {
      Alert.alert('Dato inválido', 'El stock mínimo debe ser cero o mayor.')
      return
    }

    if (initialQuantity.trim() || initialUnitCost.trim()) {
      if (!initialQuantityValue || initialQuantityValue <= 0) {
        Alert.alert('Dato inválido', 'La cantidad inicial debe ser mayor a cero.')
        return
      }

      if (initialUnitCostValue === undefined || initialUnitCostValue < 0) {
        Alert.alert('Dato inválido', 'El costo unitario inicial debe ser cero o mayor.')
        return
      }
    }

    let createdMaterialName = ''

    try {
      setIsSubmitting(true)

      const material = await inventoryApi.createMaterial(businessId, {
        name: name.trim(),
        baseUnit: baseUnit.trim(),
        category: category.trim() || undefined,
        sku: sku.trim() || undefined,
        reorderFrequencyDays: reorderFrequencyValue,
        minStock: minStockValue,
      })

      createdMaterialName = material.name

      if (initialQuantityValue && initialUnitCostValue !== undefined) {
        await inventoryApi.receiveMaterialLot(businessId, material.id, {
          locationId: locationId || undefined,
          quantity: initialQuantityValue,
          unitCost: initialUnitCostValue,
          note: 'Carga inicial desde app móvil',
        })
      }

      await markIngredientsStepCompleted(businessId).catch(() => {})
      router.replace(`/businesses/${businessId}/inventory`)
    } catch (error) {
      if (createdMaterialName) {
        Alert.alert(
          'Insumo creado parcialmente',
          getApiErrorMessage(
            error,
            `Creamos ${createdMaterialName}, pero no pudimos registrar el stock inicial.`
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
        getApiErrorMessage(error, 'No pudimos guardar el insumo.')
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
            title="Agrega un insumo."
            subtitle="Registra materia prima, costos de compra y opcionalmente carga el primer stock para empezar a operar."
          />

          <View className="gap-4">
            <VrittInput
              label="Nombre"
              placeholder="Harina de trigo"
              value={name}
              onChangeText={setName}
              editable={!isSubmitting}
            />

            <VrittInput
              label="Unidad base"
              placeholder="kg, l, pza"
              value={baseUnit}
              onChangeText={setBaseUnit}
              autoCapitalize="none"
              editable={!isSubmitting}
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
                placeholder="Ej: Panadería"
                value={customCategory}
                onChangeText={setCustomCategory}
                editable={!isSubmitting}
              />
            )}

            <VrittInput
              label="SKU"
              placeholder="HAR-001"
              value={sku}
              onChangeText={setSku}
              autoCapitalize="characters"
              editable={!isSubmitting}
            />
          </View>

          <VrittCard>
            <VrittSectionLabel className="mb-3">Control de inventario</VrittSectionLabel>

            <View className="gap-4">
              <VrittInput
                label="Frecuencia de reabastecimiento (días)"
                placeholder="3"
                value={reorderFrequencyDays}
                onChangeText={setReorderFrequencyDays}
                keyboardType="numeric"
                editable={!isSubmitting}
              />

              <VrittInput
                label="Stock mínimo"
                placeholder="10"
                value={minStock}
                onChangeText={setMinStock}
                keyboardType="numeric"
                editable={!isSubmitting}
              />
            </View>
          </VrittCard>

          <VrittCard>
            <VrittSectionLabel className="mb-3">Carga inicial</VrittSectionLabel>

            <Text className="mb-4 text-[13px] leading-[20px] text-veritt-muted">
              Este paso es opcional. Si ya tienes inventario físico, puedes dejarlo cargado
              desde ahora en moneda {business?.defaultCurrency || 'MXN'}.
            </Text>

            <View className="gap-4">
              <VrittInput
                label="Cantidad inicial"
                placeholder="100"
                value={initialQuantity}
                onChangeText={setInitialQuantity}
                keyboardType="numeric"
                editable={!isSubmitting}
              />

              <VrittInput
                label={`Costo unitario (${business?.defaultCurrency || 'MXN'})`}
                placeholder="18.50"
                value={initialUnitCost}
                onChangeText={setInitialUnitCost}
                keyboardType="numeric"
                editable={!isSubmitting}
              />

              {locationOptions.length > 0 ? (
                <VrittSelect
                  label="Ubicación de ingreso"
                  value={locationId}
                  options={locationOptions}
                  onChange={setLocationId}
                  disabled={!locationOptions.length || isSubmitting}
                />
              ) : null}
            </View>
          </VrittCard>

          <View className="gap-3.5">
            <VrittButton
              label="Guardar insumo"
              loading={isSubmitting}
              onPress={handleCreateMaterial}
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
