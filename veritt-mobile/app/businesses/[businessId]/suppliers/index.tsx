import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { suppliersApi } from '@/api/modules/suppliers.api'
import { Supplier } from '@/types/supplier.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittEmptyState } from '@/components/ui/VrittEmptyState'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'

export default function SuppliersScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadSuppliers = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const data = await suppliersApi.list(businessId)
      setSuppliers(data)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar los proveedores.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => { loadSuppliers() }, [loadSuppliers])
  useFocusEffect(useCallback(() => { loadSuppliers() }, [loadSuppliers]))

  if (isLoading) return <VrittLoader />

  return (
    <VrittScreen scrollable>
      <View className="gap-8">
        <VrittHeader
          title="Proveedores."
          subtitle="Gestiona tus proveedores de materia prima."
        />

        {suppliers.length === 0 ? (
          <VrittEmptyState
            title="Aún no hay proveedores"
            description="Registra a tus proveedores para crear órdenes de compra."
            actionLabel="Agregar proveedor"
            onActionPress={() => router.push(`/businesses/${businessId}/suppliers/create`)}
          />
        ) : (
          <>
            <VrittButton
              label="Agregar proveedor"
              onPress={() => router.push(`/businesses/${businessId}/suppliers/create`)}
            />

            <View className="gap-4">
              <VrittSectionLabel>Proveedores registrados</VrittSectionLabel>
              {suppliers.map((supplier) => (
                <TouchableOpacity
                  key={supplier.id}
                  activeOpacity={0.92}
                  onPress={() => router.push(`/businesses/${businessId}/suppliers/${supplier.id}`)}
                >
                  <VrittCard>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-[18px] font-bold text-veritt-text">{supplier.name}</Text>
                        {supplier.contactName && (
                          <Text className="text-[13px] text-veritt-muted mt-1">{supplier.contactName}</Text>
                        )}
                      </View>
                      <Text className="text-[13px] text-veritt-muted">{supplier.status}</Text>
                    </View>
                  </VrittCard>
                </TouchableOpacity>
              ))}
            </View>
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
