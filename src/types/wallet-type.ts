export interface UserWalletResponse {
  refundBalance: number
  currency: string
  message: string
  lastTransactionAt?: string
}

export interface FieldOwnerWalletResponse {
  pendingBalance: number
  availableBalance: number
  currency: string
  message: string
  lastTransactionAt?: string
}

export interface AdminWalletResponse {
  systemBalance: number
  currency: string
  lastTransactionAt?: string
}

export interface WithdrawRefundPayload {
  amount: number
}

export interface WalletFetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

