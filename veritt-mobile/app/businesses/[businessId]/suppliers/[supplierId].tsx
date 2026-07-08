import React, { useCallback, useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { suppliersApi } from '@/api/modules/suppliers.api'
import { Supplier } from '@/types/supplier.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

export default function SupplierDetailScreen() {
  const { businessId, supplierId } = useLocalSearchParams<{ businessId: string; supplierId: string }>()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  // Edit form state
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [rfc, setRfc] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  const loadSupplier = useCallback(async () => {
    if (!businessId || !supplierId) return
    try {
      setIsLoading(true)
      const data = await suppliersApi.get(businessId, supplierId)
      setSupplier(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar el proveedor.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId, supplierId])

  useEffect(() => { loadSupplier() }, [loadSupplier])

  const startEditing = () => {
    if (!supplier) return
    setName(supplier.name)
    setContactName(supplier.contactName ?? '')
    setEmail(supplier.email ?? '')
    setPhone(supplier.phone ?? '')
    setRfc(supplier.rfc ?? '')
    setAddress(supplier.address ?? '')
    setNotes(supplier.notes ?? '')
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!businessId || !supplierId) return
    if (!name.trim()) {
      Alert.alert('Faltan datos', 'El nombre del proveedor es obligatorio.')
      return
    }
    try {
      setIsSaving(true)
      const updated = await suppliersApi.update(businessId, supplierId, {
        name: name.trim(),
        contactName: contactName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        rfc: rfc.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setSupplier(updated)
      setIsEditing(false)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos actualizar el proveedor.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!businessId || !supplierId || !supplier) return
    const newStatus = supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      setIsSaving(true)
      const updated = await suppliersApi.update(businessId, supplierId, { status: newStatus })
      setSupplier(updated)
      setConfirmDeactivate(false)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cambiar el estado del proveedor.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <VrittLoader />
  if (!supplier) return null

  if (isEditing) {
    return (
      <KeyboardAvoidingView className="flex-1 bg-veritt-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <VrittScreen scrollable>
          <View className="gap-8">
            <VrittHeader title="Editar proveedor." subtitle={supplier.name} />

            <View className="gap-4">
              <VrittInput label="Nombre" placeholder="Distribuidora ABC" value={name} onChangeText={setName} editable={!isSaving} />
              <VrittInput label="Contacto (opcional)" placeholder="Juan Pérez" value={contactName} onChangeText={setContactName} editable={!isSaving} />
              <VrittInput label="Email (opcional)" placeholder="contacto@proveedor.com" value={email} onChangeText={setEmail} editable={!isSaving} keyboardType="email-address" autoCapitalize="none" />
              <VrittInput label="Teléfono (opcional)" placeholder="55 1234 5678" value={phone} onChangeText={setPhone} editable={!isSaving} keyboardType="phone-pad" />
              <VrittInput label="RFC (opcional)" placeholder="XAXX010101000" value={rfc} onChangeText={setRfc} editable={!isSaving} autoCapitalize="characters" />
              <VrittInput label="Dirección (opcional)" placeholder="Calle, Colonia, Ciudad" value={address} onChangeText={setAddress} editable={!isSaving} />
              <VrittInput label="Notas (opcional)" placeholder="Información adicional..." value={notes} onChangeText={setNotes} editable={!isSaving} />
            </View>

            <View className="gap-3.5">
              <VrittButton label="Guardar cambios" loading={isSaving} onPress={handleSave} />
              <VrittButton label="Cancelar" variant="secondary" onPress={() => setIsEditing(false)} disabled={isSaving} />
            </View>
          </View>
        </VrittScreen>
      </KeyboardAvoidingView>
    )
  }

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader title={supplier.name} subtitle={supplier.status === 'ACTIVE' ? 'Activo' : 'Inactivo'} />

        <VrittCard>
          <View className="gap-3">
            {supplier.contactName && (
              <View>
                <Text className="text-[13px] text-veritt-muted">Contacto</Text>
                <Text className="text-veritt-text text-[15px]">{supplier.contactName}</Text>
              </View>
            )}
            {supplier.email && (
              <View>
                <Text className="text-[13px] text-veritt-muted">Email</Text>
                <Text className="text-veritt-text text-[15px]">{supplier.email}</Text>
              </View>
            )}
            {supplier.phone && (
              <View>
                <Text className="text-[13px] text-veritt-muted">Teléfono</Text>
                <Text className="text-veritt-text text-[15px]">{supplier.phone}</Text>
              </View>
            )}
            {supplier.rfc && (
              <View>
                <Text className="text-[13px] text-veritt-muted">RFC</Text>
                <Text className="text-veritt-text text-[15px]">{supplier.rfc}</Text>
              </View>
            )}
            {supplier.address && (
              <View>
                <Text className="text-[13px] text-veritt-muted">Dirección</Text>
                <Text className="text-veritt-text text-[15px]">{supplier.address}</Text>
              </View>
            )}
          </View>
        </VrittCard>

        {supplier.notes && (
          <View className="gap-4">
            <VrittSectionLabel>Notas</VrittSectionLabel>
            <VrittCard>
              <Text className="text-veritt-text text-[15px] leading-[22px]">{supplier.notes}</Text>
            </VrittCard>
          </View>
        )}

        {/* Action buttons — hidden when confirm dialog is open */}
        {!confirmDeactivate && (
          <View className="gap-3.5">
            <VrittButton label="Editar proveedor" onPress={startEditing} />
            <VrittButton
              label={supplier.status === 'ACTIVE' ? 'Desactivar proveedor' : 'Reactivar proveedor'}
              variant="secondary"
              onPress={() => setConfirmDeactivate(true)}
            />
          </View>
        )}

        {/* Inline confirm: deactivate/reactivate */}
        {confirmDeactivate && (
          <VrittCard>
            <View className="gap-4">
              <Text className="text-[15px] font-bold text-veritt-text">
                {supplier.status === 'ACTIVE' ? '¿Desactivar este proveedor?' : '¿Reactivar este proveedor?'}
              </Text>
              <Text className="text-[13px] text-veritt-muted">
                {supplier.status === 'ACTIVE'
                  ? 'El proveedor dejará de aparecer en las listas de selección. Puedes reactivarlo después.'
                  : 'El proveedor volverá a estar disponible en las listas de selección.'}
              </Text>
              <View className="gap-3.5">
                <VrittButton
                  label={supplier.status === 'ACTIVE' ? 'Sí, desactivar' : 'Sí, reactivar'}
                  onPress={handleToggleStatus}
                  loading={isSaving}
                />
                <VrittButton label="Volver" variant="secondary" onPress={() => setConfirmDeactivate(false)} disabled={isSaving} />
              </View>
            </View>
          </VrittCard>
        )}

        <VrittButton
          label="Volver a proveedores"
          variant="secondary"
          onPress={() => router.replace(`/businesses/${businessId}/suppliers`)}
        />
      </View>
    </VrittScreen>
  )
}
