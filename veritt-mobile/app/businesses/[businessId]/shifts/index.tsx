import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { timeTrackingApi } from '@/api/modules/time-tracking.api'
import { ShiftLog } from '@/types/time-tracking.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittEmptyState } from '@/components/ui/VrittEmptyState'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function formatMinutes(mins: number | null | undefined) {
  if (!mins) return '-'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

export default function ShiftsScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [activeShifts, setActiveShifts] = useState<ShiftLog[]>([])
  const [recentShifts, setRecentShifts] = useState<ShiftLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadShifts = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const [active, recent] = await Promise.all([
        timeTrackingApi.getActive(businessId),
        timeTrackingApi.list(businessId, { status: 'COMPLETED' }),
      ])
      setActiveShifts(active)
      setRecentShifts(recent.slice(0, 20))
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar los turnos.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => { loadShifts() }, [loadShifts])
  useFocusEffect(useCallback(() => { loadShifts() }, [loadShifts]))

  if (isLoading) return <VrittLoader />

  const hasData = activeShifts.length > 0 || recentShifts.length > 0

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Turnos."
          subtitle="Control de asistencia y horas trabajadas."
        />

        <VrittButton
          label="Registrar entrada"
          onPress={() => router.push(`/businesses/${businessId}/shifts/clock-in`)}
        />

        {!hasData ? (
          <VrittEmptyState
            title="Sin turnos registrados"
            description="Registra la primera entrada de un empleado."
          />
        ) : (
          <>
            {activeShifts.length > 0 && (
              <View className="gap-4">
                <VrittSectionLabel>Turnos activos</VrittSectionLabel>
                {activeShifts.map((shift) => (
                  <VrittCard key={shift.id}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-[18px] font-bold text-veritt-text">
                          {shift.staffProfile?.fullName ?? 'Empleado'}
                        </Text>
                        <Text className="text-[13px] text-veritt-muted mt-1">
                          Entrada: {formatTime(shift.clockInAt)}
                          {shift.area ? ` · ${shift.area.name}` : ''}
                        </Text>
                      </View>
                      <VrittButton
                        label="Salida"
                        variant="secondary"
                        onPress={async () => {
                          try {
                            await timeTrackingApi.clockOut(businessId, shift.id)
                            loadShifts()
                          } catch (error) {
                            Alert.alert('Error', getApiErrorMessage(error, 'No pudimos registrar la salida.'))
                          }
                        }}
                      />
                    </View>
                  </VrittCard>
                ))}
              </View>
            )}

            {recentShifts.length > 0 && (
              <View className="gap-4">
                <VrittSectionLabel>Turnos recientes</VrittSectionLabel>
                {recentShifts.map((shift) => (
                  <VrittCard key={shift.id}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-[16px] font-bold text-veritt-text">
                          {shift.staffProfile?.fullName ?? 'Empleado'}
                        </Text>
                        <Text className="text-[13px] text-veritt-muted mt-1">
                          {formatTime(shift.clockInAt)} - {shift.clockOutAt ? formatTime(shift.clockOutAt) : '-'}
                        </Text>
                      </View>
                      <Text className="text-[15px] text-veritt-text font-bold">
                        {formatMinutes(shift.totalMinutes)}
                      </Text>
                    </View>
                  </VrittCard>
                ))}
              </View>
            )}
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
