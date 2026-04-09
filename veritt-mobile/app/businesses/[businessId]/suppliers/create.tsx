import React, { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { suppliersApi } from '@/api/modules/suppliers.api'
import { getApiErrorMessage } from '@/utils/error.utils'
import { markProvidersStepCompleted } from '@/lib/update-onboarding'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittButton } from '@/components/ui/VrittButton'

export default function CreateSupplierScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [rfc, setRfc] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!businessId) return
    if (!name.trim()) {
      Alert.alert('Faltan datos', 'El nombre del proveedor es obligatorio.')
      return
    }

    try {
      setIsSubmitting(true)
      await suppliersApi.create(businessId, {
        name: name.trim(),
        contactName: contactName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        rfc: rfc.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      await markProvidersStepCompleted(businessId).catch(() => {})
      router.replace(`/businesses/${businessId}/suppliers`)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos crear el proveedor.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-veritt-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader
            title="Agregar proveedor."
            subtitle="Registra un nuevo proveedor de materia prima."
          />

          <View className="gap-4">
            <VrittInput label="Nombre" placeholder="Distribuidora ABC" value={name} onChangeText={setName} editable={!isSubmitting} />
            <VrittInput label="Contacto (opcional)" placeholder="Juan Pérez" value={contactName} onChangeText={setContactName} editable={!isSubmitting} />
            <VrittInput label="Email (opcional)" placeholder="contacto@proveedor.com" value={email} onChangeText={setEmail} editable={!isSubmitting} keyboardType="email-address" autoCapitalize="none" />
            <VrittInput label="Teléfono (opcional)" placeholder="55 1234 5678" value={phone} onChangeText={setPhone} editable={!isSubmitting} keyboardType="phone-pad" />
            <VrittInput label="RFC (opcional)" placeholder="XAXX010101000" value={rfc} onChangeText={setRfc} editable={!isSubmitting} autoCapitalize="characters" />
            <VrittInput label="Dirección (opcional)" placeholder="Calle, Colonia, Ciudad" value={address} onChangeText={setAddress} editable={!isSubmitting} />
            <VrittInput label="Notas (opcional)" placeholder="Información adicional..." value={notes} onChangeText={setNotes} editable={!isSubmitting} />
          </View>

          <View className="gap-3.5">
            <VrittButton label="Guardar proveedor" loading={isSubmitting} onPress={handleCreate} />
            <VrittButton label="Cancelar" variant="secondary" onPress={() => router.back()} disabled={isSubmitting} />
          </View>
        </View>
      </VrittScreen>
    </KeyboardAvoidingView>
  )
}
