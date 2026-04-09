export type PaymentMethodType = 'CASH' | 'CARD_TERMINAL' | 'BANK_TRANSFER' | 'OTHER'
export type PaymentMethodStatus = 'ACTIVE' | 'INACTIVE'

export interface PaymentMethod {
  id: string
  businessId: string
  name: string
  type: PaymentMethodType
  terminalReference?: string | null
  bankReference?: string | null
  status: PaymentMethodStatus
  createdAt?: string
  updatedAt?: string
}

export interface CreatePaymentMethodDto {
  name: string
  type: PaymentMethodType
  terminalReference?: string
  bankReference?: string
}

export interface UpdatePaymentMethodDto {
  name?: string
  type?: PaymentMethodType
  terminalReference?: string
  bankReference?: string
  status?: PaymentMethodStatus
}
