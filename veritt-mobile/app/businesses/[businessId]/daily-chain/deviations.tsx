import React, { useCallback, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { dailyChainApi } from '@/api/modules/daily-chain.api'
import { DailyDeviationReport, DeviationCause } from '@/types/daily-chain.types'
import { MANAGER_ROLES } from '@/types/business.types'
import { useBusinessStore } from '@/store/business.store'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittSelect } from '@/components/ui/VrittSelect'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

const CAUSE_OPTIONS = [
  { label: 'Error de conteo', value: 'ERROR' },
  { label: 'Merma / Desperdicio', value: 'WASTE' },
  { label: 'Robo / Faltante', value: 'THEFT' },
  { label: 'Ajuste', value: 'ADJUSTMENT' },
  { label: 'Sobreproducción', value: 'OVERPRODUCTION' },
  { label: 'Subproducción', value: 'UNDERPRODUCTION' },
  { label: 'Otro', value: 'OTHER' },
]

const CAUSE_LABELS: Record<string, string> = {
  ERROR: 'Error de conteo',
  WASTE: 'Merma',
  THEFT: 'Robo',
  ADJUSTMENT: 'Ajuste',
  OVERPRODUCTION: 'Sobreproducción',
  UNDERPRODUCTION: 'Subproducción',
  OTHER: 'Otro',
}

interface Classification {
  materialId: string
  cause: DeviationCause | ''
  note: string
}

export default function DeviationsScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [report, setReport] = useState<DailyDeviationReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [classifications, setClassifications] = useState<Classification[]>([])
  const [confirmApprove, setConfirmApprove] = useState(false)
  const userRole = useBusinessStore((s) => s.getRole(businessId))
  const isManager = !!userRole && MANAGER_ROLES.includes(userRole)

  const load = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const data = await dailyChainApi.getDeviations(businessId)
      setReport(data)
      if (data) {
        setClassifications(
          data.items
            .filter((i) => Number(i.deviationQuantity) !== 0)
            .map((i) => ({
              materialId: i.materialId,
              cause: (i.cause as DeviationCause) ?? '',
              note: i.note ?? '',
            })),
        )
      }
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar las desviaciones.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const updateClassification = (materialId: string, field: 'cause' | 'note', value: string) => {
    setClassifications((prev) =>
      prev.map((c) => (c.materialId === materialId ? { ...c, [field]: value } : c)),
    )
  }

  const handleClassify = async () => {
    if (!businessId || !report) return

    const incomplete = classifications.filter((c) => !c.cause)
    if (incomplete.length > 0) {
      Alert.alert('Faltan datos', 'Todas las desviaciones deben tener una causa asignada.')
      return
    }

    try {
      setIsSubmitting(true)
      const updated = await dailyChainApi.classifyDeviations(businessId, report.id, {
        items: classifications.map((c) => ({
          materialId: c.materialId,
          cause: c.cause as DeviationCause,
          note: c.note || undefined,
        })),
      })
      setReport(updated)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos clasificar las desviaciones.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = async () => {
    if (!businessId || !report) return
    try {
      setIsSubmitting(true)
      const updated = await dailyChainApi.approveDeviations(businessId, report.id)
      setReport(updated)
      setConfirmApprove(false)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos aprobar el reporte.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <VrittLoader />
  if (!report) {
    return (
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader title="Desviaciones." subtitle="FID — Aún no se ha generado el reporte." />
          <VrittButton label="Volver" variant="secondary" onPress={() => router.back()} />
        </View>
      </VrittScreen>
    )
  }

  const STATUS_LABELS: Record<string, string> = {
    PENDING_CLASSIFICATION: 'Pendiente de clasificar',
    CLASSIFIED: 'Clasificado',
    APPROVED: 'Aprobado',
  }

  const deviatingItems = report.items.filter((i) => Number(i.deviationQuantity) !== 0)
  const nonDeviatingItems = report.items.filter((i) => Number(i.deviationQuantity) === 0)

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Desviaciones."
          subtitle={`FID — ${STATUS_LABELS[report.status] ?? report.status}`}
        />

        <VrittCard>
          <View className="flex-row justify-between">
            <Text className="text-veritt-muted text-[13px]">Valor total de desviaciones</Text>
            <Text className="text-red-400 font-bold text-[15px]">
              ${Number(report.totalDeviationValueMXN).toFixed(2)} MXN
            </Text>
          </View>
        </VrittCard>

        {deviatingItems.length > 0 && (
          <>
            <VrittSectionLabel>Con desviación ({deviatingItems.length})</VrittSectionLabel>
            <View className="gap-3">
              {deviatingItems.map((item) => {
                const cls = classifications.find((c) => c.materialId === item.materialId)
                const isClassified = report.status !== 'PENDING_CLASSIFICATION'

                return (
                  <VrittCard key={item.id}>
                    <View className="gap-2">
                      <Text className="text-veritt-text font-bold text-[15px]">{item.material.name}</Text>
                      <View className="flex-row justify-between">
                        <Text className="text-veritt-muted text-[13px]">
                          Teórico: {Number(item.theoreticalConsumption).toFixed(2)}
                        </Text>
                        <Text className="text-veritt-muted text-[13px]">
                          Real: {Number(item.realConsumption).toFixed(2)}
                        </Text>
                      </View>
                      <Text className={`text-[13px] font-bold ${Number(item.deviationQuantity) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        Desviación: {Number(item.deviationQuantity) > 0 ? '+' : ''}{Number(item.deviationQuantity).toFixed(2)} (${Number(item.deviationValueMXN).toFixed(2)})
                      </Text>

                      {isClassified && item.cause ? (
                        <Text className="text-veritt-muted text-[13px]">
                          Causa: {CAUSE_LABELS[item.cause] ?? item.cause}
                          {item.note ? ` — ${item.note}` : ''}
                        </Text>
                      ) : cls ? (
                        <>
                          <VrittSelect
                            label="Causa"
                            value={cls.cause}
                            onChange={(v) => updateClassification(item.materialId, 'cause', v)}
                            options={CAUSE_OPTIONS}
                            disabled={isSubmitting}
                          />
                          <VrittInput
                            label="Nota (opcional)"
                            placeholder="Detalle adicional..."
                            value={cls.note}
                            onChangeText={(v) => updateClassification(item.materialId, 'note', v)}
                            editable={!isSubmitting}
                          />
                        </>
                      ) : null}
                    </View>
                  </VrittCard>
                )
              })}
            </View>
          </>
        )}

        {nonDeviatingItems.length > 0 && (
          <>
            <VrittSectionLabel>Sin desviación ({nonDeviatingItems.length})</VrittSectionLabel>
            <View className="gap-3">
              {nonDeviatingItems.map((item) => (
                <VrittCard key={item.id}>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-veritt-text text-[15px]">{item.material.name}</Text>
                    <Text className="text-green-400 text-[13px]">OK</Text>
                  </View>
                </VrittCard>
              ))}
            </View>
          </>
        )}

        {report.status === 'PENDING_CLASSIFICATION' && deviatingItems.length > 0 && (
          <VrittButton label="Clasificar desviaciones" loading={isSubmitting} onPress={handleClassify} />
        )}

        {report.status === 'CLASSIFIED' && isManager && !confirmApprove && (
          <VrittButton label="Aprobar reporte" onPress={() => setConfirmApprove(true)} />
        )}

        {report.status === 'CLASSIFIED' && !isManager && (
          <VrittCard>
            <View className="items-center gap-2 py-2">
              <Text className="text-yellow-400 font-bold text-[14px]">Pendiente de aprobación</Text>
              <Text className="text-veritt-muted text-[13px] text-center">
                Un gerente debe aprobar este reporte de desviaciones para continuar al arqueo.
              </Text>
            </View>
          </VrittCard>
        )}

        {confirmApprove && (
          <VrittCard>
            <View className="gap-4">
              <Text className="text-[15px] font-bold text-veritt-text">¿Aprobar este reporte de desviaciones?</Text>
              <View className="gap-3.5">
                <VrittButton label="Sí, aprobar" onPress={handleApprove} loading={isSubmitting} />
                <VrittButton label="Volver" variant="secondary" onPress={() => setConfirmApprove(false)} disabled={isSubmitting} />
              </View>
            </View>
          </VrittCard>
        )}

        <VrittButton label="Volver a cadena diaria" variant="secondary" onPress={() => router.back()} />
      </View>
    </VrittScreen>
  )
}
