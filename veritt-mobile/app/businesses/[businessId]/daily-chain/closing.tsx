import React, { useCallback, useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { dailyChainApi } from '@/api/modules/daily-chain.api'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

interface MaterialCount {
  materialId: string
  name: string
  baseUnit: string
  openingQuantity: number
  counted: string
}

export default function ClosingScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [materials, setMaterials] = useState<MaterialCount[]>([])
  const [locationId, setLocationId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const opening = await dailyChainApi.getOpening(businessId)
      if (!opening) {
        Alert.alert('Error', 'No hay conteo de apertura para hoy.')
        router.back()
        return
      }
      setLocationId(opening.locationId)
      setMaterials(
        opening.items.map((item) => ({
          materialId: item.materialId,
          name: item.material.name,
          baseUnit: item.material.baseUnit,
          openingQuantity: Number(item.countedQuantity),
          counted: '',
        })),
      )
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar los datos.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => { load() }, [load])

  const updateCount = (index: number, value: string) => {
    setMaterials((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], counted: value }
      return next
    })
  }

  const handleSubmit = async () => {
    if (!businessId || !locationId) return

    const items = materials
      .filter((m) => m.counted.trim() !== '')
      .map((m) => ({ materialId: m.materialId, countedQuantity: Number(m.counted) }))

    if (items.length === 0) {
      Alert.alert('Faltan datos', 'Ingresa al menos un conteo de material.')
      return
    }

    try {
      setIsSubmitting(true)
      await dailyChainApi.createClosing(businessId, { locationId, items })
      router.back()
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos crear el conteo de cierre.'))
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
            title="Conteo de cierre."
            subtitle="FCI — Registra las cantidades físicas al final del día."
          />

          <VrittSectionLabel>Materiales ({materials.length})</VrittSectionLabel>

          <View className="gap-3">
            {materials.map((mat, idx) => {
              const counted = Number(mat.counted) || 0
              const consumption = mat.counted.trim() ? mat.openingQuantity - counted : 0

              return (
                <VrittCard key={mat.materialId}>
                  <View className="gap-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-veritt-text font-bold text-[15px]">{mat.name}</Text>
                      <Text className="text-veritt-muted text-[13px]">
                        Apertura: {mat.openingQuantity.toFixed(2)} {mat.baseUnit}
                      </Text>
                    </View>
                    <VrittInput
                      label={`Cantidad contada (${mat.baseUnit})`}
                      placeholder="0"
                      value={mat.counted}
                      onChangeText={(v) => updateCount(idx, v)}
                      keyboardType="decimal-pad"
                      editable={!isSubmitting}
                    />
                    {mat.counted.trim() !== '' && (
                      <Text className="text-veritt-muted text-[13px]">
                        Consumo real: {consumption.toFixed(2)} {mat.baseUnit}
                      </Text>
                    )}
                  </View>
                </VrittCard>
              )
            })}
          </View>

          <View className="gap-3.5">
            <VrittButton label="Enviar conteo de cierre" loading={isSubmitting} onPress={handleSubmit} />
            <VrittButton label="Volver" variant="secondary" onPress={() => router.back()} disabled={isSubmitting} />
          </View>
        </View>
      </VrittScreen>
    </KeyboardAvoidingView>
  )
}
