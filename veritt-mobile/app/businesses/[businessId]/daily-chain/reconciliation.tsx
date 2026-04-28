import React, { useCallback, useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { dailyChainApi } from '@/api/modules/daily-chain.api'
import { paymentMethodsApi } from '@/api/modules/payment-methods.api'
import { DailyCashReconciliation } from '@/types/daily-chain.types'
import { MANAGER_ROLES } from '@/types/business.types'
import { useBusinessStore } from '@/store/business.store'
import { useAuthStore } from '@/store/auth.store'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5]

interface DenomCount {
  denomination: number
  quantity: string
}

interface TerminalInput {
  paymentMethodId: string
  name: string
  reportedTotal: string
  reference: string
}

type ScreenMode = 'input' | 'review' | 'final'

function getMode(recon: DailyCashReconciliation | null): ScreenMode {
  if (!recon) return 'input'
  if (recon.status === 'PENDING_REVIEW') return 'review'
  return 'final'
}

export default function ReconciliationScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [recon, setRecon] = useState<DailyCashReconciliation | null>(null)
  const [denominations, setDenominations] = useState<DenomCount[]>(
    DENOMINATIONS.map((d) => ({ denomination: d, quantity: '' })),
  )
  const [terminals, setTerminals] = useState<TerminalInput[]>([])
  const [transferTotal, setTransferTotal] = useState('')
  const [transferFolios, setTransferFolios] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const userRole = useBusinessStore((s) => s.getRole(businessId))
  const isManager = !!userRole && MANAGER_ROLES.includes(userRole)
  const currentUserId = useAuthStore((s) => s.user?.id)

  const load = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      // Check if reconciliation already exists
      const existing = await dailyChainApi.getReconciliation(businessId)
      setRecon(existing)

      // Load payment methods for input mode
      if (!existing) {
        const methods = await paymentMethodsApi.list(businessId)
        const terminalMethods = methods.filter((m: any) => m.type === 'CARD_TERMINAL' && m.status === 'ACTIVE')
        setTerminals(
          terminalMethods.map((m: any) => ({
            paymentMethodId: m.id,
            name: m.name,
            reportedTotal: '',
            reference: '',
          })),
        )
      }
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar el arqueo.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const updateDenom = (index: number, qty: string) => {
    setDenominations((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], quantity: qty }
      return next
    })
  }

  const updateTerminal = (index: number, field: 'reportedTotal' | 'reference', value: string) => {
    setTerminals((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const cashTotal = denominations.reduce(
    (sum, d) => sum + d.denomination * (Number(d.quantity) || 0),
    0,
  )

  const handleSubmit = async () => {
    if (!businessId) return

    const cashDenominations = denominations
      .filter((d) => d.quantity.trim() !== '' && Number(d.quantity) > 0)
      .map((d) => ({ denomination: d.denomination, quantity: Number(d.quantity) }))

    const terminalTotals = terminals
      .filter((t) => t.reportedTotal.trim() !== '')
      .map((t) => ({
        paymentMethodId: t.paymentMethodId,
        reportedTotal: Number(t.reportedTotal),
        reference: t.reference || undefined,
      }))

    const transferTotals = transferTotal.trim()
      ? [{ reportedTotal: Number(transferTotal), folioReferences: transferFolios || undefined }]
      : []

    try {
      setIsSubmitting(true)
      const result = await dailyChainApi.createReconciliation(businessId, {
        cashDenominations,
        terminalTotals: terminalTotals.length > 0 ? terminalTotals : undefined,
        transferTotals: transferTotals.length > 0 ? transferTotals : undefined,
      })
      setRecon(result)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos crear el arqueo.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = async () => {
    if (!businessId || !recon) return
    try {
      setIsSubmitting(true)
      const updated = await dailyChainApi.approveReconciliation(businessId, recon.id)
      setRecon(updated)
      setConfirmApprove(false)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos aprobar el arqueo.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!businessId || !recon) return
    const reason = rejectReason.trim()
    if (!reason) {
      Alert.alert('Motivo requerido', 'Debes indicar el motivo del rechazo para que el operador pueda recontar.')
      return
    }
    try {
      setIsSubmitting(true)
      await dailyChainApi.rejectReconciliation(businessId, recon.id, reason)
      setConfirmReject(false)
      setRejectReason('')
      // After reject, FAF row is gone — reload so the screen falls back to INPUT mode
      await load()
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos rechazar el arqueo.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <VrittLoader />

  const mode = getMode(recon)

  // ── MODE: INPUT (blind count) ──
  if (mode === 'input') {
    return (
      <KeyboardAvoidingView className="flex-1 bg-veritt-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <VrittScreen scrollable>
          <View className="gap-8">
            <VrittHeader
              title="Arqueo financiero."
              subtitle="FAF — Conteo ciego de efectivo, terminales y transferencias."
            />

            {/* Cash denominations */}
            <View className="gap-4">
              <VrittSectionLabel>Efectivo</VrittSectionLabel>
              <View className="gap-2">
                {denominations.map((d, idx) => (
                  <VrittCard key={d.denomination}>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-veritt-text text-[15px] w-20">
                        ${d.denomination >= 1 ? d.denomination : `${d.denomination}¢`}
                      </Text>
                      <View className="w-24">
                        <VrittInput
                          placeholder="0"
                          value={d.quantity}
                          onChangeText={(v) => updateDenom(idx, v)}
                          keyboardType="number-pad"
                          editable={!isSubmitting}
                        />
                      </View>
                      <Text className="text-veritt-muted text-[13px] w-28 text-right">
                        ${(d.denomination * (Number(d.quantity) || 0)).toFixed(2)}
                      </Text>
                    </View>
                  </VrittCard>
                ))}
              </View>
              <VrittCard>
                <View className="flex-row justify-between">
                  <Text className="text-veritt-text font-bold text-[15px]">Total efectivo</Text>
                  <Text className="text-veritt-text font-bold text-[15px]">${cashTotal.toFixed(2)}</Text>
                </View>
              </VrittCard>
            </View>

            {/* Terminal totals */}
            {terminals.length > 0 && (
              <View className="gap-4">
                <VrittSectionLabel>Terminales ({terminals.length})</VrittSectionLabel>
                {terminals.map((t, idx) => (
                  <VrittCard key={t.paymentMethodId}>
                    <View className="gap-2">
                      <Text className="text-veritt-text font-bold text-[15px]">{t.name}</Text>
                      <VrittInput
                        label="Total reportado"
                        placeholder="0.00"
                        value={t.reportedTotal}
                        onChangeText={(v) => updateTerminal(idx, 'reportedTotal', v)}
                        keyboardType="decimal-pad"
                        editable={!isSubmitting}
                      />
                      <VrittInput
                        label="Referencia (opcional)"
                        placeholder="No. de corte"
                        value={t.reference}
                        onChangeText={(v) => updateTerminal(idx, 'reference', v)}
                        editable={!isSubmitting}
                      />
                    </View>
                  </VrittCard>
                ))}
              </View>
            )}

            {/* Transfers */}
            <View className="gap-4">
              <VrittSectionLabel>Transferencias</VrittSectionLabel>
              <VrittCard>
                <View className="gap-2">
                  <VrittInput
                    label="Total de transferencias"
                    placeholder="0.00"
                    value={transferTotal}
                    onChangeText={setTransferTotal}
                    keyboardType="decimal-pad"
                    editable={!isSubmitting}
                  />
                  <VrittInput
                    label="Folios de referencia (opcional)"
                    placeholder="Folio1, Folio2..."
                    value={transferFolios}
                    onChangeText={setTransferFolios}
                    editable={!isSubmitting}
                  />
                </View>
              </VrittCard>
            </View>

            <View className="gap-3.5">
              <VrittButton label="Enviar arqueo" loading={isSubmitting} onPress={handleSubmit} />
              <VrittButton label="Volver" variant="secondary" onPress={() => router.back()} disabled={isSubmitting} />
            </View>
          </View>
        </VrittScreen>
      </KeyboardAvoidingView>
    )
  }

  // ── MODE: REVIEW (PENDING_REVIEW — show comparison) ──
  if (mode === 'review' && recon) {
    const diff = Number(recon.difference)
    const hasDiff = Math.abs(diff) > 0.005
    const canApprove = isManager && recon.createdByUserId !== currentUserId

    return (
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Arqueo financiero."
            subtitle="FAF — Pendiente de aprobación"
          />

          {/* Summary comparison */}
          <VrittCard>
            <View className="gap-3">
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[13px]">Tu conteo</Text>
                <Text className="text-veritt-text font-bold text-[15px]">${Number(recon.totalCounted).toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[13px]">Sistema esperaba</Text>
                <Text className="text-veritt-text font-bold text-[15px]">${Number(recon.totalExpected).toFixed(2)}</Text>
              </View>
              <View className="h-[1px] bg-veritt-border" />
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[13px]">Diferencia</Text>
                <Text className={`font-bold text-[15px] ${hasDiff ? 'text-red-400' : 'text-green-400'}`}>
                  ${diff.toFixed(2)}
                </Text>
              </View>
            </View>
          </VrittCard>

          {/* Cash denominations breakdown */}
          {recon.cashDenominations.length > 0 && (
            <>
              <VrittSectionLabel>Efectivo contado</VrittSectionLabel>
              <View className="gap-2">
                {recon.cashDenominations.map((d) => (
                  <VrittCard key={d.id}>
                    <View className="flex-row justify-between">
                      <Text className="text-veritt-text text-[14px]">
                        ${Number(d.denomination) >= 1 ? Number(d.denomination) : `${Number(d.denomination)}¢`} x {d.quantity}
                      </Text>
                      <Text className="text-veritt-muted text-[14px]">${Number(d.subtotal).toFixed(2)}</Text>
                    </View>
                  </VrittCard>
                ))}
              </View>
            </>
          )}

          {/* Terminal comparison */}
          {recon.terminalReconciliations.length > 0 && (
            <>
              <VrittSectionLabel>Terminales</VrittSectionLabel>
              <View className="gap-2">
                {recon.terminalReconciliations.map((t) => {
                  const tDiff = Number(t.difference)
                  return (
                    <VrittCard key={t.id}>
                      <View className="gap-1">
                        <Text className="text-veritt-text font-bold text-[14px]">{t.paymentMethod.name}</Text>
                        <View className="flex-row justify-between">
                          <Text className="text-veritt-muted text-[12px]">Reportado: ${Number(t.reportedTotal).toFixed(2)}</Text>
                          <Text className="text-veritt-muted text-[12px]">Esperado: ${Number(t.expectedTotal).toFixed(2)}</Text>
                        </View>
                        {Math.abs(tDiff) > 0.005 && (
                          <Text className="text-red-400 text-[12px]">Diferencia: ${tDiff.toFixed(2)}</Text>
                        )}
                      </View>
                    </VrittCard>
                  )
                })}
              </View>
            </>
          )}

          {/* Transfer comparison */}
          {recon.transferReconciliations.length > 0 && (
            <>
              <VrittSectionLabel>Transferencias</VrittSectionLabel>
              <View className="gap-2">
                {recon.transferReconciliations.map((t) => {
                  const trDiff = Number(t.difference)
                  return (
                    <VrittCard key={t.id}>
                      <View className="gap-1">
                        <View className="flex-row justify-between">
                          <Text className="text-veritt-muted text-[12px]">Reportado: ${Number(t.reportedTotal).toFixed(2)}</Text>
                          <Text className="text-veritt-muted text-[12px]">Esperado: ${Number(t.expectedTotal).toFixed(2)}</Text>
                        </View>
                        {Math.abs(trDiff) > 0.005 && (
                          <Text className="text-red-400 text-[12px]">Diferencia: ${trDiff.toFixed(2)}</Text>
                        )}
                        {t.folioReferences && (
                          <Text className="text-veritt-muted text-[11px]">Folios: {t.folioReferences}</Text>
                        )}
                      </View>
                    </VrittCard>
                  )
                })}
              </View>
            </>
          )}

          {/* Approve / Reject / Pending */}
          {canApprove && !confirmApprove && !confirmReject && (
            <View className="gap-3.5">
              <VrittButton label="Aprobar arqueo" onPress={() => setConfirmApprove(true)} />
              <VrittButton
                label="Rechazar (reintentar conteo)"
                variant="secondary"
                onPress={() => setConfirmReject(true)}
              />
            </View>
          )}

          {isManager && recon.createdByUserId === currentUserId && (
            <VrittCard>
              <View className="items-center gap-2 py-2">
                <Text className="text-yellow-400 font-bold text-[14px]">Pendiente de aprobación</Text>
                <Text className="text-veritt-muted text-[13px] text-center">
                  Otro gerente debe aprobar este arqueo (separación de responsabilidades).
                </Text>
              </View>
            </VrittCard>
          )}

          {!isManager && (
            <VrittCard>
              <View className="items-center gap-2 py-2">
                <Text className="text-yellow-400 font-bold text-[14px]">Pendiente de aprobación</Text>
                <Text className="text-veritt-muted text-[13px] text-center">
                  Un gerente debe aprobar este arqueo para continuar.
                </Text>
              </View>
            </VrittCard>
          )}

          {confirmApprove && (
            <VrittCard>
              <View className="gap-4">
                <Text className="text-[15px] font-bold text-veritt-text">¿Aprobar este arqueo?</Text>
                <Text className="text-[13px] text-veritt-muted">
                  {hasDiff
                    ? `Hay una diferencia de $${Math.abs(diff).toFixed(2)}. Se marcará como discrepancia y el FOP quedará bloqueado hasta que firmes con una justificación documentada.`
                    : 'El conteo coincide. Se marcará como conciliado y se generará el FOP.'
                  }
                </Text>
                <View className="gap-3.5">
                  <VrittButton label="Sí, aprobar" onPress={handleApprove} loading={isSubmitting} />
                  <VrittButton label="Volver" variant="secondary" onPress={() => setConfirmApprove(false)} disabled={isSubmitting} />
                </View>
              </View>
            </VrittCard>
          )}

          {confirmReject && (
            <VrittCard>
              <View className="gap-4">
                <Text className="text-[15px] font-bold text-veritt-text">Rechazar arqueo</Text>
                <Text className="text-[13px] text-veritt-muted">
                  El operador podrá recontar desde cero. Úsalo cuando la diferencia parece un error de conteo.
                </Text>
                <VrittInput
                  label="Motivo del rechazo"
                  placeholder="Ej. Faltan billetes en el conteo de $500"
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  editable={!isSubmitting}
                />
                <View className="gap-3.5">
                  <VrittButton label="Sí, rechazar" onPress={handleReject} loading={isSubmitting} />
                  <VrittButton
                    label="Volver"
                    variant="secondary"
                    onPress={() => { setConfirmReject(false); setRejectReason('') }}
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

  // ── MODE: FINAL (RECONCILED or DISCREPANCY) ──
  if (recon) {
    const diff = Number(recon.difference)
    const isReconciled = recon.status === 'RECONCILED'

    return (
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Arqueo financiero."
            subtitle={`FAF — ${isReconciled ? 'Conciliado' : 'Discrepancia'}`}
          />

          <VrittCard>
            <View className="items-center gap-2 py-2">
              <Ionicons
                name={isReconciled ? 'checkmark-done-circle' : 'warning'}
                size={40}
                color={isReconciled ? '#4ade80' : '#f87171'}
              />
              <Text className={`font-bold text-[16px] ${isReconciled ? 'text-green-400' : 'text-red-400'}`}>
                {isReconciled ? 'Arqueo conciliado' : 'Discrepancia registrada'}
              </Text>
              {!isReconciled && (
                <Text className="text-veritt-muted text-[12px] text-center">
                  Continúa al FOP para firmar el cierre con una justificación documentada.
                </Text>
              )}
            </View>
          </VrittCard>

          <VrittCard>
            <View className="gap-3">
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[13px]">Conteo</Text>
                <Text className="text-veritt-text font-bold text-[15px]">${Number(recon.totalCounted).toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[13px]">Sistema</Text>
                <Text className="text-veritt-text font-bold text-[15px]">${Number(recon.totalExpected).toFixed(2)}</Text>
              </View>
              <View className="h-[1px] bg-veritt-border" />
              <View className="flex-row justify-between">
                <Text className="text-veritt-muted text-[13px]">Diferencia</Text>
                <Text className={`font-bold text-[15px] ${Math.abs(diff) > 0.005 ? 'text-red-400' : 'text-green-400'}`}>
                  ${diff.toFixed(2)}
                </Text>
              </View>
            </View>
          </VrittCard>

          <VrittButton label="Volver a cadena diaria" variant="secondary" onPress={() => router.back()} />
        </View>
      </VrittScreen>
    )
  }

  return null
}
