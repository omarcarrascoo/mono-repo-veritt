import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { processesApi } from '@/api/modules/processes.api'
import { ProcessTemplate, ProcessExecution } from '@/types/process.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

export default function ProcessDetailScreen() {
  const { businessId, processId } = useLocalSearchParams<{ businessId: string; processId: string }>()
  const [process, setProcess] = useState<ProcessTemplate | null>(null)
  const [executions, setExecutions] = useState<ProcessExecution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)

  const load = useCallback(async () => {
    if (!businessId || !processId) return
    try {
      setIsLoading(true)
      const [proc, execs] = await Promise.all([
        processesApi.get(businessId, processId),
        processesApi.listExecutions(businessId, { processId }),
      ])
      setProcess(proc)
      setExecutions(execs)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar el proceso.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId, processId])

  useEffect(() => { load() }, [load])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const handleStartExecution = async () => {
    if (!businessId || !processId) return
    try {
      setIsStarting(true)
      await processesApi.startExecution(businessId, processId)
      Alert.alert('Listo', 'Ejecución iniciada.')
      load()
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos iniciar la ejecución.'))
    } finally {
      setIsStarting(false)
    }
  }

  const handleCompleteExecution = async (executionId: string) => {
    if (!businessId || !processId) return
    try {
      await processesApi.completeExecution(businessId, processId, executionId)
      Alert.alert('Listo', 'Ejecución completada.')
      load()
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos completar la ejecución.'))
    }
  }

  if (isLoading || !process) return <VrittLoader />

  const activeExecutions = executions.filter((e) => e.status === 'IN_PROGRESS' || e.status === 'PENDING')
  const completedExecutions = executions.filter((e) => e.status === 'COMPLETED')

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title={process.name}
          subtitle={process.description ?? 'Sin descripción'}
        />

        {/* Process info */}
        <VrittCard>
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-veritt-muted text-[13px]">Estado</Text>
              <Text className="text-veritt-text text-[14px] font-semibold">{process.status}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-veritt-muted text-[13px]">Bloqueante</Text>
              <Text className={`text-[14px] font-semibold ${process.isBlocking ? 'text-red-400' : 'text-veritt-text'}`}>
                {process.isBlocking ? 'Sí' : 'No'}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-veritt-muted text-[13px]">Pasos</Text>
              <Text className="text-veritt-text text-[14px] font-semibold">{process.steps?.length ?? 0}</Text>
            </View>
          </View>
        </VrittCard>

        {/* Steps */}
        {process.steps && process.steps.length > 0 && (
          <View className="gap-4">
            <VrittSectionLabel>Pasos</VrittSectionLabel>
            {process.steps
              .sort((a, b) => a.stepOrder - b.stepOrder)
              .map((step) => (
                <VrittCard key={step.id}>
                  <View className="flex-row items-center gap-3">
                    <View className="w-7 h-7 rounded-full bg-veritt-surface items-center justify-center border border-veritt-border">
                      <Text className="text-veritt-text text-[12px] font-bold">{step.stepOrder}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-veritt-text font-semibold text-[15px]">{step.name}</Text>
                      {step.requiredRole && (
                        <Text className="text-veritt-muted text-[12px]">Rol: {step.requiredRole}</Text>
                      )}
                    </View>
                  </View>
                </VrittCard>
              ))}
          </View>
        )}

        {/* Start execution */}
        <VrittButton
          label="Iniciar ejecución"
          loading={isStarting}
          onPress={handleStartExecution}
        />

        {/* Active executions */}
        {activeExecutions.length > 0 && (
          <View className="gap-4">
            <VrittSectionLabel>Ejecuciones activas</VrittSectionLabel>
            {activeExecutions.map((exec) => (
              <VrittCard key={exec.id}>
                <View className="gap-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="play-circle-outline" size={18} color="#FFD700" />
                      <Text className="text-veritt-text text-[14px] font-semibold">{exec.status}</Text>
                    </View>
                    <Text className="text-veritt-muted text-[12px]">
                      {new Date(exec.startedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  {exec.area && (
                    <Text className="text-veritt-muted text-[12px]">Área: {exec.area.name}</Text>
                  )}
                  <VrittButton
                    label="Completar"
                    variant="secondary"
                    onPress={() => handleCompleteExecution(exec.id)}
                  />
                </View>
              </VrittCard>
            ))}
          </View>
        )}

        {/* Recent completed */}
        {completedExecutions.length > 0 && (
          <View className="gap-4">
            <VrittSectionLabel>Ejecuciones recientes</VrittSectionLabel>
            {completedExecutions.slice(0, 10).map((exec) => (
              <VrittCard key={exec.id}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="checkmark-circle-outline" size={18} color="#22C55E" />
                    <Text className="text-veritt-text text-[14px]">Completada</Text>
                  </View>
                  <Text className="text-veritt-muted text-[12px]">
                    {exec.completedAt
                      ? new Date(exec.completedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </Text>
                </View>
              </VrittCard>
            ))}
          </View>
        )}

        <VrittButton
          label="Volver a procesos"
          variant="secondary"
          onPress={() => router.replace(`/businesses/${businessId}/processes`)}
        />
      </View>
    </VrittScreen>
  )
}
