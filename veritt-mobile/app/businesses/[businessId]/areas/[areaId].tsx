import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { areasApi } from '@/api/modules/areas.api'
import { Area } from '@/types/area.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

export default function AreaDetailScreen() {
  const { businessId, areaId } = useLocalSearchParams<{ businessId: string; areaId: string }>()
  const [area, setArea] = useState<Area | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadArea = useCallback(async () => {
    if (!businessId || !areaId) return
    try {
      setIsLoading(true)
      const data = await areasApi.get(businessId, areaId)
      setArea(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar el área.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId, areaId])

  useEffect(() => { loadArea() }, [loadArea])

  if (isLoading) return <VrittLoader />
  if (!area) return null

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader title={area.name} subtitle={area.type.replace('_', ' ')} />

        {area.description && (
          <VrittCard>
            <Text className="text-veritt-text text-[15px] leading-[22px]">{area.description}</Text>
          </VrittCard>
        )}

        {(area.inventoryLocations?.length ?? 0) > 0 && (
          <View className="gap-4">
            <VrittSectionLabel>Ubicaciones vinculadas</VrittSectionLabel>
            {area.inventoryLocations!.map((loc) => (
              <VrittCard key={loc.id}>
                <Text className="text-veritt-text font-bold">{loc.name}</Text>
                <Text className="text-veritt-muted text-[13px]">{loc.type}</Text>
              </VrittCard>
            ))}
          </View>
        )}

        {(area.childAreas?.length ?? 0) > 0 && (
          <View className="gap-4">
            <VrittSectionLabel>Sub-áreas</VrittSectionLabel>
            {area.childAreas!.map((child) => (
              <VrittCard key={child.id}>
                <Text className="text-veritt-text font-bold">{child.name}</Text>
                <Text className="text-veritt-muted text-[13px]">{child.type}</Text>
              </VrittCard>
            ))}
          </View>
        )}

        <VrittButton
          label="Volver a áreas"
          variant="secondary"
          onPress={() => router.replace(`/businesses/${businessId}/areas`)}
        />
      </View>
    </VrittScreen>
  )
}
