import React, { useCallback, useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { dailyChainApi } from '@/api/modules/daily-chain.api'
import { inventoryApi } from '@/api/modules/inventory.api'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittSelect } from '@/components/ui/VrittSelect'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

interface MaterialCount {
  materialId: string
  name: string
  baseUnit: string
  currentStock: number
  counted: string
  varianceNote: string
}

export default function OpeningScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [materials, setMaterials] = useState<MaterialCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const [locs, mats] = await Promise.all([
        inventoryApi.listLocations(businessId),
        inventoryApi.listMaterials(businessId),
      ])
      setLocations(locs.map((l: any) => ({ id: l.id, name: l.name })))
      if (locs.length > 0) setSelectedLocation(locs[0].id)
      setMaterials(
        mats
          .filter((m: any) => m.status === 'ACTIVE')
          .map((m: any) => ({
            materialId: m.id,
            name: m.name,
            baseUnit: m.baseUnit,
            currentStock: Number(m.currentStock ?? 0),
            counted: '',
            varianceNote: '',
          })),
      )
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar los datos.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => { load() }, [load])

  const updateMaterial = (index: number, field: 'counted' | 'varianceNote', value: string) => {
    setMaterials((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleSubmit = async () => {
    if (!businessId || !selectedLocation) return

    const items = materials
      .filter((m) => m.counted.trim() !== '')
      .map((m) => {
        const counted = Number(m.counted)
        const variance = counted - m.currentStock
        return {
          materialId: m.materialId,
          countedQuantity: counted,
          varianceNote: Math.abs(variance) > 0.005 && m.varianceNote.trim()
            ? m.varianceNote.trim()
            : undefined,
        }
      })

    if (items.length === 0) {
      Alert.alert('Faltan datos', 'Ingresa al menos un conteo de material.')
      return
    }

    // Check that all items with variance have a note
    const missingNotes = materials.filter((m) => {
      if (!m.counted.trim()) return false
      const variance = Number(m.counted) - m.currentStock
      return Math.abs(variance) > 0.005 && !m.varianceNote.trim()
    })
    if (missingNotes.length > 0) {
      Alert.alert(
        'Notas de varianza requeridas',
        `Explica la varianza de: ${missingNotes.map((m) => m.name).join(', ')}`,
      )
      return
    }

    try {
      setIsSubmitting(true)
      await dailyChainApi.createOpening(businessId, { locationId: selectedLocation, items })
      router.back()
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos crear el conteo de apertura.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <VrittLoader />

  return (
    <KeyboardAvoidingView className="flex-1 bg-veritt-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Conteo de apertura."
            subtitle="FAI — Registra las cantidades físicas al inicio del día."
          />

          {locations.length > 1 && (
            <VrittSelect
              label="Ubicación"
              value={selectedLocation}
              onChange={setSelectedLocation}
              options={locations.map((l) => ({ label: l.name, value: l.id }))}
              disabled={isSubmitting}
            />
          )}

          <VrittSectionLabel>Materiales ({materials.length})</VrittSectionLabel>

          <View className="gap-3">
            {materials.map((mat, idx) => {
              const counted = Number(mat.counted) || 0
              const hasCount = mat.counted.trim() !== ''
              const variance = hasCount ? counted - mat.currentStock : 0
              const hasVariance = hasCount && Math.abs(variance) > 0.005

              return (
                <VrittCard key={mat.materialId}>
                  <View className="gap-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-veritt-text font-bold text-[15px]">{mat.name}</Text>
                      <Text className="text-veritt-muted text-[13px]">
                        Sistema: {mat.currentStock.toFixed(2)} {mat.baseUnit}
                      </Text>
                    </View>
                    <VrittInput
                      label={`Cantidad contada (${mat.baseUnit})`}
                      placeholder="0"
                      value={mat.counted}
                      onChangeText={(v) => updateMaterial(idx, 'counted', v)}
                      keyboardType="decimal-pad"
                      editable={!isSubmitting}
                    />
                    {hasVariance && (
                      <>
                        <Text className={`text-[13px] ${variance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          Varianza: {variance > 0 ? '+' : ''}{variance.toFixed(2)} {mat.baseUnit}
                        </Text>
                        <VrittInput
                          label="¿Por qué hay varianza?"
                          placeholder="Ej: se tiró producto, error de conteo anterior..."
                          value={mat.varianceNote}
                          onChangeText={(v) => updateMaterial(idx, 'varianceNote', v)}
                          editable={!isSubmitting}
                        />
                      </>
                    )}
                  </View>
                </VrittCard>
              )
            })}
          </View>

          <View className="gap-3.5">
            <VrittButton label="Enviar conteo de apertura" loading={isSubmitting} onPress={handleSubmit} />
            <VrittButton label="Volver" variant="secondary" onPress={() => router.back()} disabled={isSubmitting} />
          </View>
        </View>
      </VrittScreen>
    </KeyboardAvoidingView>
  )
}
