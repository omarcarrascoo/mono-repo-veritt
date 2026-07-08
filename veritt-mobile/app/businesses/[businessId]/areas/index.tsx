import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { areasApi } from '@/api/modules/areas.api'
import { Area } from '@/types/area.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittEmptyState } from '@/components/ui/VrittEmptyState'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

export default function AreasScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [areas, setAreas] = useState<Area[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadAreas = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const data = await areasApi.list(businessId)
      setAreas(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar las áreas.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => { loadAreas() }, [loadAreas])
  useFocusEffect(useCallback(() => { loadAreas() }, [loadAreas]))

  if (isLoading) return <VrittLoader />

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Áreas."
          subtitle="Espacios físicos o funcionales de tu negocio."
        />

        {areas.length === 0 ? (
          <VrittEmptyState
            title="Aún no hay áreas"
            description="Define los espacios de tu negocio: cocina, barra, caja, almacén."
            actionLabel="Crear área"
            onActionPress={() => router.push(`/businesses/${businessId}/areas/create`)}
          />
        ) : (
          <>
            <VrittButton
              label="Crear área"
              onPress={() => router.push(`/businesses/${businessId}/areas/create`)}
            />

            <View className="gap-4">
              <VrittSectionLabel>Áreas registradas</VrittSectionLabel>
              {areas.map((area) => (
                <TouchableOpacity
                  key={area.id}
                  activeOpacity={0.92}
                  onPress={() => router.push(`/businesses/${businessId}/areas/${area.id}`)}
                >
                  <VrittCard>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-[18px] font-bold text-veritt-text">{area.name}</Text>
                        <Text className="text-[13px] text-veritt-muted mt-1">{area.type.replace('_', ' ')}</Text>
                      </View>
                      <Text className="text-[13px] text-veritt-muted">{area.status}</Text>
                    </View>
                  </VrittCard>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <VrittButton
          label="Volver al negocio"
          variant="secondary"
          onPress={() => router.replace(`/businesses/${businessId}`)}
        />
      </View>
    </VrittScreen>
  )
}
