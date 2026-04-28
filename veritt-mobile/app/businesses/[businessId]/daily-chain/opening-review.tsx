import React, { useCallback, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { dailyChainApi } from '@/api/modules/daily-chain.api'
import { DailyInventoryOpening } from '@/types/daily-chain.types'
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

export default function OpeningReviewScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [opening, setOpening] = useState<DailyInventoryOpening | null>(null)
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
      const data = await dailyChainApi.getOpening(businessId)
      setOpening(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar el conteo.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const handleAuthorize = async () => {
    if (!businessId || !opening) return
    try {
      setIsActioning(true)
      await dailyChainApi.authorizeOpening(businessId, opening.id)
      setConfirmAuthorize(false)
      router.back()
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos autorizar el conteo.'))
    } finally {
      setIsActioning(false)
    }
  }

  const handleReject = async () => {
    if (!businessId || !opening || !rejectReason.trim()) {
      Alert.alert('Faltan datos', 'Ingresa el motivo del rechazo.')
      return
    }
    try {
      setIsActioning(true)
      await dailyChainApi.rejectOpening(businessId, opening.id, rejectReason.trim())
      setShowReject(false)
      router.back()
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos rechazar el conteo.'))
    } finally {
      setIsActioning(false)
    }
  }

  if (isLoading) return <VrittLoader />
  if (!opening) return null

  const totalVariance = opening.items.reduce((sum, i) => sum + Math.abs(Number(i.varianceValueMXN)), 0)

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Revisar apertura."
          subtitle={`${opening.location.name} — ${opening.operationalDate}`}
        />

        <VrittCard>
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-veritt-muted text-[13px]">Estado</Text>
              <Text className={`text-[13px] font-bold ${opening.status === 'AUTHORIZED' ? 'text-green-400' : opening.status === 'REJECTED' ? 'text-red-400' : 'text-yellow-400'}`}>
                {opening.status === 'AUTHORIZED' ? 'Autorizado' : opening.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-veritt-muted text-[13px]">Varianza total</Text>
              <Text className={`text-[13px] font-bold ${totalVariance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                ${totalVariance.toFixed(2)} MXN
              </Text>
            </View>
          </View>
        </VrittCard>

        <VrittSectionLabel>Materiales ({opening.items.length})</VrittSectionLabel>

        <View className="gap-3">
          {opening.items.map((item) => (
            <VrittCard key={item.id}>
              <View className="gap-1">
                <Text className="text-veritt-text font-bold text-[15px]">{item.material.name}</Text>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-veritt-muted text-[13px]">
                    Sistema: {Number(item.systemQuantity).toFixed(2)} {item.material.baseUnit}
                  </Text>
                  <Text className="text-veritt-text text-[13px]">
                    Contado: {Number(item.countedQuantity).toFixed(2)} {item.material.baseUnit}
                  </Text>
                </View>
                {Number(item.variance) !== 0 && (
                  <>
                    <Text className={`text-[13px] ${Number(item.variance) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      Varianza: {Number(item.variance) > 0 ? '+' : ''}{Number(item.variance).toFixed(2)} (${Number(item.varianceValueMXN).toFixed(2)})
                    </Text>
                    {item.varianceNote && (
                      <Text className="text-veritt-muted text-[12px] italic">
                        Razón: {item.varianceNote}
                      </Text>
                    )}
                  </>
                )}
              </View>
            </VrittCard>
          ))}
        </View>

        {opening.status === 'PENDING' && isManager && !confirmAuthorize && !showReject && (
          <View className="gap-3.5">
            <VrittButton label="Autorizar conteo" onPress={() => setConfirmAuthorize(true)} />
            <VrittButton label="Rechazar conteo" variant="secondary" onPress={() => setShowReject(true)} />
          </View>
        )}

        {opening.status === 'PENDING' && !isManager && (
          <VrittCard>
            <View className="items-center gap-2 py-2">
              <Text className="text-yellow-400 font-bold text-[14px]">Pendiente de autorización</Text>
              <Text className="text-veritt-muted text-[13px] text-center">
                Un gerente debe autorizar este conteo de apertura para habilitar las operaciones del día.
              </Text>
            </View>
          </VrittCard>
        )}

        {confirmAuthorize && (
          <VrittCard>
            <View className="gap-4">
              <Text className="text-[15px] font-bold text-veritt-text">¿Autorizar este conteo de apertura?</Text>
              <Text className="text-[13px] text-veritt-muted">Se habilitarán las operaciones del día.</Text>
              <View className="gap-3.5">
                <VrittButton label="Sí, autorizar" onPress={handleAuthorize} loading={isActioning} />
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
                placeholder="¿Por qué se rechaza este conteo?"
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
