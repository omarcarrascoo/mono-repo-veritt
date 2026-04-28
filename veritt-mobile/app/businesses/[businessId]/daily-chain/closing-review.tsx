import React, { useCallback, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { dailyChainApi } from '@/api/modules/daily-chain.api'
import { DailyInventoryClosing } from '@/types/daily-chain.types'
import { MANAGER_ROLES } from '@/types/business.types'
import { useBusinessStore } from '@/store/business.store'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

export default function ClosingReviewScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [closing, setClosing] = useState<DailyInventoryClosing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActioning, setIsActioning] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [confirmAuthorize, setConfirmAuthorize] = useState(false)
  const userRole = useBusinessStore((s) => s.getRole(businessId))
  const isManager = !!userRole && MANAGER_ROLES.includes(userRole)

  const load = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const data = await dailyChainApi.getClosing(businessId)
      setClosing(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar el conteo de cierre.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const handleAuthorize = async () => {
    if (!businessId || !closing) return
    try {
      setIsActioning(true)
      await dailyChainApi.authorizeClosing(businessId, closing.id)
      setConfirmAuthorize(false)
      router.back()
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos autorizar el conteo.'))
    } finally {
      setIsActioning(false)
    }
  }

  const handleReject = async () => {
    if (!businessId || !closing || !rejectReason.trim()) {
      Alert.alert('Faltan datos', 'Ingresa el motivo del rechazo.')
      return
    }
    try {
      setIsActioning(true)
      await dailyChainApi.rejectClosing(businessId, closing.id, rejectReason.trim())
      setShowReject(false)
      router.back()
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos rechazar el conteo.'))
    } finally {
      setIsActioning(false)
    }
  }

  if (isLoading) return <VrittLoader />
  if (!closing) return null

  const totalConsumption = closing.items.reduce((sum, i) => sum + Number(i.realConsumption), 0)

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Revisar cierre."
          subtitle={`${closing.location.name} — ${closing.operationalDate}`}
        />

        <VrittCard>
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-veritt-muted text-[13px]">Estado</Text>
              <Text className={`text-[13px] font-bold ${closing.status === 'AUTHORIZED' ? 'text-green-400' : closing.status === 'REJECTED' ? 'text-red-400' : 'text-yellow-400'}`}>
                {closing.status === 'AUTHORIZED' ? 'Autorizado' : closing.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-veritt-muted text-[13px]">Consumo real total</Text>
              <Text className="text-veritt-text text-[13px] font-bold">
                {totalConsumption.toFixed(2)}
              </Text>
            </View>
          </View>
        </VrittCard>

        <VrittSectionLabel>Materiales ({closing.items.length})</VrittSectionLabel>

        <View className="gap-3">
          {closing.items.map((item) => (
            <VrittCard key={item.id}>
              <View className="gap-1">
                <Text className="text-veritt-text font-bold text-[15px]">{item.material.name}</Text>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-veritt-muted text-[13px]">
                    Apertura: {Number(item.openingQuantity).toFixed(2)} {item.material.baseUnit}
                  </Text>
                  <Text className="text-veritt-muted text-[13px]">
                    Recibido: {Number(item.receivedQuantity).toFixed(2)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-veritt-text text-[13px]">
                    Contado: {Number(item.countedQuantity).toFixed(2)} {item.material.baseUnit}
                  </Text>
                  <Text className={`text-[13px] font-bold ${Number(item.realConsumption) > 0 ? 'text-yellow-400' : 'text-veritt-muted'}`}>
                    Consumo: {Number(item.realConsumption).toFixed(2)}
                  </Text>
                </View>
              </View>
            </VrittCard>
          ))}
        </View>

        {closing.status === 'PENDING' && isManager && !confirmAuthorize && !showReject && (
          <View className="gap-3.5">
            <VrittButton label="Autorizar conteo de cierre" onPress={() => setConfirmAuthorize(true)} />
            <VrittButton label="Rechazar conteo" variant="secondary" onPress={() => setShowReject(true)} />
          </View>
        )}

        {closing.status === 'PENDING' && !isManager && (
          <VrittCard>
            <View className="items-center gap-2 py-2">
              <Text className="text-yellow-400 font-bold text-[14px]">Pendiente de autorizacion</Text>
              <Text className="text-veritt-muted text-[13px] text-center">
                Un gerente debe autorizar este conteo de cierre para generar el reporte de desviaciones.
              </Text>
            </View>
          </VrittCard>
        )}

        {confirmAuthorize && (
          <VrittCard>
            <View className="gap-4">
              <Text className="text-[15px] font-bold text-veritt-text">Autorizar conteo de cierre?</Text>
              <Text className="text-[13px] text-veritt-muted">Se generara automaticamente el reporte de desviaciones (FID).</Text>
              <View className="gap-3.5">
                <VrittButton label="Si, autorizar" onPress={handleAuthorize} loading={isActioning} />
                <VrittButton label="Volver" variant="secondary" onPress={() => setConfirmAuthorize(false)} disabled={isActioning} />
              </View>
            </View>
          </VrittCard>
        )}

        {showReject && (
          <VrittCard>
            <View className="gap-4">
              <Text className="text-[15px] font-bold text-veritt-text">Rechazar conteo</Text>
              <VrittInput
                label="Motivo del rechazo"
                placeholder="Por que se rechaza este conteo?"
                value={rejectReason}
                onChangeText={setRejectReason}
                editable={!isActioning}
              />
              <View className="gap-3.5">
                <VrittButton label="Confirmar rechazo" onPress={handleReject} loading={isActioning} />
                <VrittButton label="Volver" variant="secondary" onPress={() => setShowReject(false)} disabled={isActioning} />
              </View>
            </View>
          </VrittCard>
        )}

        <VrittButton
          label="Volver a cadena diaria"
          variant="secondary"
          onPress={() => router.back()}
        />
      </View>
    </VrittScreen>
  )
}
