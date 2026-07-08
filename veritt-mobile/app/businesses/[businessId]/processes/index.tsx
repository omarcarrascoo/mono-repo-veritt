import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { processesApi } from '@/api/modules/processes.api'
import { ProcessTemplate } from '@/types/process.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittEmptyState } from '@/components/ui/VrittEmptyState'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

export default function ProcessesScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [processes, setProcesses] = useState<ProcessTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadProcesses = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const data = await processesApi.list(businessId)
      setProcesses(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar los procesos.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => { loadProcesses() }, [loadProcesses])
  useFocusEffect(useCallback(() => { loadProcesses() }, [loadProcesses]))

  if (isLoading) return <VrittLoader />

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Procesos."
          subtitle="Define y ejecuta los procesos operativos de tu negocio."
        />

        {processes.length === 0 ? (
          <VrittEmptyState
            title="Aún no hay procesos"
            description="Crea procesos para estandarizar la operación diaria."
            actionLabel="Crear proceso"
            onActionPress={() => router.push(`/businesses/${businessId}/processes/create`)}
          />
        ) : (
          <>
            <VrittButton
              label="Crear proceso"
              onPress={() => router.push(`/businesses/${businessId}/processes/create`)}
            />

            <View className="gap-4">
              <VrittSectionLabel>Procesos activos</VrittSectionLabel>
              {processes.map((process) => (
                <TouchableOpacity
                  key={process.id}
                  activeOpacity={0.92}
                  onPress={() => router.push(`/businesses/${businessId}/processes/${process.id}`)}
                >
                  <VrittCard>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-[18px] font-bold text-veritt-text">{process.name}</Text>
                        {process.description && (
                          <Text className="text-[13px] text-veritt-muted mt-1">{process.description}</Text>
                        )}
                      </View>
                      <View className="items-end">
                        <Text className="text-[13px] text-veritt-muted">{process.steps?.length ?? 0} pasos</Text>
                        {process.isBlocking && (
                          <Text className="text-[11px] text-red-400 mt-1">Bloqueante</Text>
                        )}
                      </View>
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
