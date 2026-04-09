import React, { useCallback, useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { timeTrackingApi } from '@/api/modules/time-tracking.api'
import { staffApi } from '@/api/modules/staff.api'
import { areasApi } from '@/api/modules/areas.api'
import { StaffProfile } from '@/types/staff.types'
import { Area } from '@/types/area.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittSelect } from '@/components/ui/VrittSelect'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'

export default function ClockInScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const [staffData, areasData] = await Promise.all([
        staffApi.getByBusinessId(businessId),
        areasApi.list(businessId),
      ])
      setStaff(staffData.filter((s) => s.status === 'ACTIVE'))
      setAreas(areasData.filter((a) => a.status === 'ACTIVE'))
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar los datos.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => { loadData() }, [loadData])

  const handleClockIn = async () => {
    if (!businessId || !selectedStaffId) {
      Alert.alert('Faltan datos', 'Selecciona un empleado.')
      return
    }

    try {
      setIsSubmitting(true)
      await timeTrackingApi.clockIn(businessId, {
        staffProfileId: selectedStaffId,
        areaId: selectedAreaId || undefined,
      })
      router.replace(`/businesses/${businessId}/shifts`)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos registrar la entrada.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <VrittLoader />

  const staffOptions = staff.map((s) => ({ label: s.fullName, value: s.id }))
  const areaOptions = [{ label: 'Sin área', value: '' }, ...areas.map((a) => ({ label: a.name, value: a.id }))]

  return (
    <KeyboardAvoidingView className="flex-1 bg-veritt-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Registrar entrada."
            subtitle="Selecciona el empleado que inicia su turno."
          />

          <View className="gap-4">
            <VrittSelect label="Empleado" value={selectedStaffId} options={staffOptions} onChange={setSelectedStaffId} disabled={isSubmitting} />
            <VrittSelect label="Área (opcional)" value={selectedAreaId} options={areaOptions} onChange={setSelectedAreaId} disabled={isSubmitting} />
          </View>

          <View className="gap-3.5">
            <VrittButton label="Registrar entrada" loading={isSubmitting} onPress={handleClockIn} />
            <VrittButton label="Cancelar" variant="secondary" onPress={() => router.back()} disabled={isSubmitting} />
          </View>
        </View>
      </VrittScreen>
    </KeyboardAvoidingView>
  )
}
