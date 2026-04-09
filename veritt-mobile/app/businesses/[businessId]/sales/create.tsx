import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { salesApi } from '@/api/modules/sales.api'
import { paymentMethodsApi } from '@/api/modules/payment-methods.api'
import { staffApi } from '@/api/modules/staff.api'
import { areasApi } from '@/api/modules/areas.api'
import { Product } from '@/types/inventory.types'
import { PaymentMethod } from '@/types/payment-method.types'
import { StaffProfile } from '@/types/staff.types'
import { Area } from '@/types/area.types'
import { getApiErrorMessage } from '@/utils/error.utils'
import { VrittScreen } from '@/components/ui/VrittScreen'
import { VrittHeader } from '@/components/ui/VrittHeader'
import { VrittCard } from '@/components/ui/VrittCard'
import { VrittButton } from '@/components/ui/VrittButton'
import { VrittSelect } from '@/components/ui/VrittSelect'
import { VrittInput } from '@/components/ui/VrittInput'
import { VrittLoader } from '@/components/ui/VrittLoader'
import { VrittSectionLabel } from '@/components/ui/VrittSectionLabel'
import { apiClient } from '@/api/client'

interface CartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

export default function CreateSaleScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>()
  const [products, setProducts] = useState<Product[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [staffList, setStaffList] = useState<StaffProfile[]>([])
  const [areasList, setAreasList] = useState<Area[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedOperatorId, setSelectedOperatorId] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('')

  const loadData = useCallback(async () => {
    if (!businessId) return
    try {
      setIsLoading(true)
      const [productsRes, methodsData, staffData, areasData] = await Promise.all([
        apiClient.get<Product[]>(`/businesses/${businessId}/inventory/products`),
        paymentMethodsApi.list(businessId),
        staffApi.getByBusinessId(businessId),
        areasApi.list(businessId),
      ])
      setProducts(productsRes.data.filter((p) => p.status === 'ACTIVE'))
      setPaymentMethods(methodsData.filter((m) => m.status === 'ACTIVE'))
      setStaffList(staffData.filter((s) => s.status === 'ACTIVE'))
      setAreasList(areasData.filter((a) => a.status === 'ACTIVE'))
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos cargar los datos.'))
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => { loadData() }, [loadData])

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        )
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: Number(product.currentSalePrice),
      }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)))
  }

  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0), [cart])
  const total = subtotal

  const handleSubmit = async () => {
    if (!businessId) return
    if (cart.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega al menos un producto.')
      return
    }
    if (!selectedOperatorId) {
      Alert.alert('Faltan datos', 'Selecciona un operador.')
      return
    }
    if (!selectedPaymentMethodId) {
      Alert.alert('Faltan datos', 'Selecciona un método de pago.')
      return
    }

    try {
      setIsSubmitting(true)
      await salesApi.create(businessId, {
        operatorStaffId: selectedOperatorId,
        areaId: selectedAreaId || undefined,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        payments: [{
          paymentMethodId: selectedPaymentMethodId,
          amount: total,
        }],
      })
      router.replace(`/businesses/${businessId}/sales`)
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos registrar la venta.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <VrittLoader />

  const staffOptions = staffList.map((s) => ({ label: s.fullName, value: s.id }))
  const areaOptions = [{ label: 'Sin área', value: '' }, ...areasList.map((a) => ({ label: a.name, value: a.id }))]
  const paymentOptions = paymentMethods.map((m) => ({ label: m.name, value: m.id }))

  return (
    <KeyboardAvoidingView className="flex-1 bg-veritt-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <VrittScreen scrollable>
        <View className="gap-8">
          <VrittHeader title="Registrar venta." subtitle="Selecciona productos y forma de pago." />

          <View className="gap-4">
            <VrittSelect label="Operador" value={selectedOperatorId} options={staffOptions} onChange={setSelectedOperatorId} disabled={isSubmitting} />
            <VrittSelect label="Área (opcional)" value={selectedAreaId} options={areaOptions} onChange={setSelectedAreaId} disabled={isSubmitting} />
          </View>

          <View className="gap-4">
            <VrittSectionLabel>Productos</VrittSectionLabel>
            {products.map((product) => (
              <TouchableOpacity key={product.id} activeOpacity={0.92} onPress={() => addToCart(product)}>
                <VrittCard>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-[16px] font-bold text-veritt-text">{product.name}</Text>
                      <Text className="text-[13px] text-veritt-muted">{product.category ?? ''}</Text>
                    </View>
                    <Text className="text-[16px] text-veritt-text font-bold">
                      ${Number(product.currentSalePrice).toFixed(2)}
                    </Text>
                  </View>
                </VrittCard>
              </TouchableOpacity>
            ))}
          </View>

          {cart.length > 0 && (
            <VrittCard>
              <VrittSectionLabel className="mb-3">Carrito</VrittSectionLabel>
              <View className="gap-3">
                {cart.map((item) => (
                  <View key={item.productId} className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-veritt-text text-[15px]">{item.productName}</Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <TouchableOpacity onPress={() => updateQuantity(item.productId, item.quantity - 1)}>
                        <Text className="text-veritt-muted text-[20px] px-2">-</Text>
                      </TouchableOpacity>
                      <Text className="text-veritt-text text-[16px] font-bold w-8 text-center">{item.quantity}</Text>
                      <TouchableOpacity onPress={() => updateQuantity(item.productId, item.quantity + 1)}>
                        <Text className="text-veritt-muted text-[20px] px-2">+</Text>
                      </TouchableOpacity>
                      <Text className="text-veritt-text text-[15px] font-bold w-20 text-right">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
                <View className="border-t border-veritt-border pt-3 mt-2 flex-row justify-between">
                  <Text className="text-veritt-text text-[18px] font-extrabold">Total</Text>
                  <Text className="text-veritt-text text-[18px] font-extrabold">${total.toFixed(2)}</Text>
                </View>
              </View>
            </VrittCard>
          )}

          {cart.length > 0 && (
            <VrittSelect label="Método de pago" value={selectedPaymentMethodId} options={paymentOptions} onChange={setSelectedPaymentMethodId} disabled={isSubmitting} />
          )}

          <View className="gap-3.5">
            <VrittButton label="Completar venta" loading={isSubmitting} onPress={handleSubmit} disabled={cart.length === 0} />
            <VrittButton label="Cancelar" variant="secondary" onPress={() => router.back()} disabled={isSubmitting} />
          </View>
        </View>
      </VrittScreen>
    </KeyboardAvoidingView>
  )
}
