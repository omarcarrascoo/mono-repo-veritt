import React, { useCallback, useState } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { dailyChainApi } from '@/api/modules/daily-chain.api'
import { DailyChainStatus } from '@/types/daily-chain.types'
import { MANAGER_ROLES } from '@/types/business.types'
import { useBusinessStore } from '@/store/business.store'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittButton } from '@/components/ui/VrittButton'

type StepStatus = 'completed' | 'available' | 'blocked'

interface StepConfig {
  key: string
  label: string
  code: string
  icon: string
  route: string
}

const STEPS: StepConfig[] = [
  { key: 'fai', label: 'Apertura de inventario', code: 'FAI', icon: 'document-text-outline', route: 'opening' },
  { key: 'fci', label: 'Cierre de inventario', code: 'FCI', icon: 'clipboard-outline', route: 'closing' },
  { key: 'fid', label: 'Desviaciones', code: 'FID', icon: 'analytics-outline', route: 'deviations' },
  { key: 'faf', label: 'Arqueo financiero', code: 'FAF', icon: 'cash-outline', route: 'reconciliation' },
  { key: 'fop', label: 'Cierre operativo', code: 'FOP', icon: 'lock-closed-outline', route: 'fop' },
]

function getStepStatus(chain: DailyChainStatus, key: string): StepStatus {
  const { fai, fci, fid, faf, fop } = chain

  console.log('chain:', chain)
  switch (key) {
    case 'fai':
      if (fai?.status === 'AUTHORIZED') return 'completed'
      return 'available'
    case 'fci':
      if (fci?.status === 'AUTHORIZED') return 'completed'
      if (fci?.status === 'PENDING') return 'available'
      if (fai?.status === 'AUTHORIZED') return 'available'
      return 'blocked'
    case 'fid':
      if (fid?.status === 'APPROVED') return 'completed'
      if (fid?.status === 'CLASSIFIED' || fid?.status === 'PENDING_CLASSIFICATION') return 'available'
      if (fci?.status === 'AUTHORIZED') return 'available'
      return 'blocked'
    case 'faf':
      if (faf?.status === 'RECONCILED' || faf?.status === 'DISCREPANCY') return 'completed'
      if (faf?.status === 'PENDING_REVIEW') return 'available'
      if (fid?.status === 'APPROVED') return 'available'
      return 'blocked'
    case 'fop':
      if (fop?.status === 'SIGNED') return 'completed'
      if (faf?.status === 'RECONCILED' || faf?.status === 'DISCREPANCY') return 'available'
      return 'blocked'
    default:
      return 'blocked'
  }
}

function getStatusLabel(chain: DailyChainStatus, key: string, isManager: boolean): string {
  const item = chain[key as keyof DailyChainStatus]
  if (!item || typeof item === 'string') return 'Sin iniciar'
  const status = (item as { status: string }).status
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    AUTHORIZED: 'Autorizado',
    REJECTED: 'Rechazado',
    COMPLETED: 'Completado',
    PENDING_CLASSIFICATION: 'Por clasificar',
    CLASSIFIED: isManager ? 'Pendiente de aprobación' : 'Clasificado — Pendiente: gerente',
    APPROVED: 'Aprobado',
    PENDING_REVIEW: isManager ? 'Pendiente de aprobación' : 'Enviado — Pendiente: gerente',
    RECONCILED: 'Conciliado',
    DISCREPANCY: 'Con discrepancia',
    SIGNED: 'Firmado',
    BLOCKED: 'Bloqueado',
  }
  return labels[status] ?? status
}

export default function DailyChainDashboard() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [chain, setChain] = useState<DailyChainStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const userRole = useBusinessStore((s) => s.getRole(businessId))
  const isStoreLoaded = useBusinessStore((s) => s.isLoaded)
  const loadStore = useBusinessStore((s) => s.loadBusinesses)
  const isManager = !!userRole && MANAGER_ROLES.includes(userRole)

  const load = useCallback(async () => {
    if (!isStoreLoaded) await loadStore()
    if (!businessId) return
    try {
      setIsLoading(true)
      const data = await dailyChainApi.getStatus(businessId)
      setChain(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar el estado de la cadena.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (isLoading) return <VrittLoader />

  // Show "Start Day" card when no FAI exists
  const showStartDay = chain && !chain.fai

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Cadena diaria."
          subtitle={chain ? `Día operativo: ${chain.operationalDate}` : 'Cargando...'}
        />

        {showStartDay && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push(`/businesses/${businessId}/daily-chain/opening`)}
          >
            <VrittCard>
              <View className="items-center gap-3 py-4">
                <View className="w-14 h-14 rounded-full bg-yellow-400/10 items-center justify-center">
                  <Ionicons name="sunny-outline" size={28} color="#facc15" />
                </View>
                <Text className="text-veritt-text font-bold text-[17px]">Iniciar día operativo</Text>
                <Text className="text-veritt-muted text-[13px] text-center">
                  Realiza el conteo de apertura (FAI) para habilitar ventas y recepciones.
                </Text>
              </View>
            </VrittCard>
          </TouchableOpacity>
        )}

        <View className="gap-3">
          {STEPS.map((step) => {
            const status = chain ? getStepStatus(chain, step.key) : 'blocked'
            const statusLabel = chain ? getStatusLabel(chain, step.key, isManager) : 'Sin iniciar'

            const bgColor = status === 'completed' ? 'bg-green-400/10' : status === 'available' ? 'bg-veritt-surfaceSoft' : 'bg-veritt-surface'
            const iconColor = status === 'completed' ? '#4ade80' : status === 'available' ? '#FFFFFF' : '#555555'
            const textColor = status === 'blocked' ? 'text-veritt-mutedSoft' : 'text-veritt-text'
            const statusColor = status === 'completed' ? 'text-green-400' : status === 'available' ? 'text-yellow-400' : 'text-veritt-mutedSoft'

            return (
              <TouchableOpacity
                key={step.key}
                activeOpacity={status === 'blocked' ? 1 : 0.9}
                onPress={() => {
                  if (status === 'blocked') return
                  if (step.key === 'fai' && chain?.fai?.status === 'PENDING') {
                    router.push(`/businesses/${businessId}/daily-chain/opening-review`)
                  } else if (step.key === 'fai' && !chain?.fai) {
                    router.push(`/businesses/${businessId}/daily-chain/opening`)
                  } else if (step.key === 'fci' && (chain?.fci?.status === 'PENDING' || chain?.fci?.status === 'AUTHORIZED')) {
                    router.push(`/businesses/${businessId}/daily-chain/closing-review`)
                  } else {
                    router.push(`/businesses/${businessId}/daily-chain/${step.route}`)
                  }
                }}
              >
                <VrittCard>
                  <View className="flex-row items-center gap-4">
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${bgColor}`}>
                      <Ionicons name={step.icon as any} size={20} color={iconColor} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className={`text-[11px] font-bold uppercase tracking-[1px] ${statusColor}`}>
                          {step.code}
                        </Text>
                        <Text className={`text-[11px] uppercase tracking-[0.5px] ${statusColor}`}>
                          — {statusLabel}
                        </Text>
                      </View>
                      <Text className={`text-[15px] font-bold mt-0.5 ${textColor}`}>
                        {step.label}
                      </Text>
                    </View>
                    {status !== 'blocked' && (
                      <Ionicons name="chevron-forward" size={18} color={iconColor} />
                    )}
                  </View>
                </VrittCard>
              </TouchableOpacity>
            )
          })}
        </View>

        <VrittButton label="Volver al negocio" variant="secondary" onPress={() => router.back()} />
      </View>
    </VrittScreen>
  )
}
