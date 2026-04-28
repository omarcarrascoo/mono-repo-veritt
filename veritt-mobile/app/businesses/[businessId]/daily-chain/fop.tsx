import React, { useCallback, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { dailyChainApi } from '@/api/modules/daily-chain.api'
import { DailyOperationClose } from '@/types/daily-chain.types'
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

export default function FOPScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [fop, setFop] = useState<DailyOperationClose | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmSign, setConfirmSign] = useState(false)
  const [justification, setJustification] = useState('')
  const userRole = useBusinessStore((s) => s.getRole(businessId))
  const isManager = !!userRole && MANAGER_ROLES.includes(userRole)

  const load = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const data = await dailyChainApi.getFOP(businessId)
      setFop(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar el FOP.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const handleSign = async () => {
    if (!businessId || !fop) return
    const isBlocked = fop.status === 'BLOCKED'
    const trimmed = justification.trim()
    if (isBlocked && !trimmed) {
      Alert.alert(
        'Justificación requerida',
        'Debes documentar el motivo para firmar un cierre con discrepancia.',
      )
      return
    }
    try {
      setIsSubmitting(true)
      const updated = await dailyChainApi.signFOP(businessId, fop.id, trimmed || undefined)
      setFop(updated)
      setConfirmSign(false)
      setJustification('')
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos firmar el FOP.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <VrittLoader />

  console.log('FOP:', fop)
  
  if (!fop) {
    return (
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader title="Cierre operativo." subtitle="FOP — Aún no se ha generado." />
          <Text className="text-veritt-muted text-[13px] px-1">
            El FOP se genera automáticamente cuando el arqueo financiero (FAF) es aprobado y conciliado.
          </Text>
          <VrittButton label="Volver" variant="secondary" onPress={() => router.back()} />
        </View>
      </VrittScreen>
    )
  }

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Cierre operativo."
          subtitle={`FOP — ${fop.status === 'SIGNED' ? 'Firmado' : fop.status === 'BLOCKED' ? 'Bloqueado' : 'Pendiente de firma'}`}
        />

        <VrittCard>
          <View className="items-center gap-2 py-2">
            <Ionicons
              name={fop.status === 'SIGNED' ? 'checkmark-done-circle' : fop.status === 'BLOCKED' ? 'close-circle' : 'hourglass-outline'}
              size={40}
              color={fop.status === 'SIGNED' ? '#4ade80' : fop.status === 'BLOCKED' ? '#f87171' : '#facc15'}
            />
            <Text className={`font-bold text-[16px] ${fop.status === 'SIGNED' ? 'text-green-400' : fop.status === 'BLOCKED' ? 'text-red-400' : 'text-yellow-400'}`}>
              {fop.status === 'SIGNED' ? 'Día cerrado' : fop.status === 'BLOCKED' ? 'Validaciones pendientes' : 'Listo para firmar'}
            </Text>
          </View>
        </VrittCard>

        <VrittSectionLabel>Validaciones ({fop.validationItems.length})</VrittSectionLabel>

        <View className="gap-3">
          {fop.validationItems.map((item) => (
            <VrittCard key={item.id}>
              <View className="flex-row items-center gap-3">
                <View className={`w-8 h-8 rounded-full items-center justify-center ${item.isWithinThreshold ? 'bg-green-400/20' : 'bg-red-400/20'}`}>
                  <Ionicons
                    name={item.isWithinThreshold ? 'checkmark' : 'close'}
                    size={18}
                    color={item.isWithinThreshold ? '#4ade80' : '#f87171'}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-veritt-text font-bold text-[14px]">{item.label}</Text>
                  <View className="flex-row gap-4 mt-1">
                    <Text className="text-veritt-muted text-[12px]">
                      Operador: {Number(item.operatorValue).toFixed(2)}
                    </Text>
                    <Text className="text-veritt-muted text-[12px]">
                      Sistema: {Number(item.systemValue).toFixed(2)}
                    </Text>
                    {Number(item.difference) !== 0 && (
                      <Text className="text-red-400 text-[12px]">
                        Dif: {Number(item.difference).toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </VrittCard>
          ))}
        </View>

        {fop.status === 'SIGNED' && fop.signedWithDiscrepancy && fop.discrepancyJustification && (
          <VrittCard>
            <View className="gap-2">
              <Text className="text-yellow-400 font-bold text-[13px] uppercase tracking-[1px]">
                Firmado con discrepancia
              </Text>
              <Text className="text-veritt-muted text-[13px]">Justificación:</Text>
              <Text className="text-veritt-text text-[14px]">{fop.discrepancyJustification}</Text>
            </View>
          </VrittCard>
        )}

        {(fop.status === 'PENDING' || fop.status === 'BLOCKED') && isManager && !confirmSign && (
          <VrittButton
            label={fop.status === 'BLOCKED' ? 'Firmar con justificación' : 'Firmar cierre operativo'}
            onPress={() => setConfirmSign(true)}
          />
        )}

        {(fop.status === 'PENDING' || fop.status === 'BLOCKED') && !isManager && (
          <VrittCard>
            <View className="items-center gap-2 py-2">
              <Text className="text-yellow-400 font-bold text-[14px]">Solo un gerente puede firmar</Text>
              <Text className="text-veritt-muted text-[13px] text-center">
                El cierre operativo debe ser firmado por un gerente o administrador.
              </Text>
            </View>
          </VrittCard>
        )}

        {confirmSign && (
          <VrittCard>
            <View className="gap-4">
              <Text className="text-[15px] font-bold text-veritt-text">
                {fop.status === 'BLOCKED' ? 'Firmar con discrepancia' : '¿Firmar el cierre operativo?'}
              </Text>
              {fop.status === 'BLOCKED' ? (
                <>
                  <Text className="text-[13px] text-veritt-muted">
                    Hay validaciones fuera de umbral. Al firmar, aceptas la discrepancia y queda documentada de forma inmutable.
                  </Text>
                  <VrittInput
                    label="Justificación (obligatoria)"
                    placeholder="Ej. Faltante de $20 por error de cambio en venta #124"
                    value={justification}
                    onChangeText={setJustification}
                    editable={!isSubmitting}
                  />
                </>
              ) : (
                <Text className="text-[13px] text-veritt-muted">
                  Esto cierra oficialmente el día operativo. No se podrán hacer más modificaciones.
                </Text>
              )}
              <View className="gap-3.5">
                <VrittButton
                  label={fop.status === 'BLOCKED' ? 'Sí, firmar con ajuste' : 'Sí, firmar'}
                  onPress={handleSign}
                  loading={isSubmitting}
                />
                <VrittButton
                  label="Volver"
                  variant="secondary"
                  onPress={() => { setConfirmSign(false); setJustification('') }}
                  disabled={isSubmitting}
                />
              </View>
            </View>
          </VrittCard>
        )}

        <VrittButton label="Volver a cadena diaria" variant="secondary" onPress={() => router.back()} />
      </View>
    </VrittScreen>
  )
}
