// Payment types based on API documentation

export const PaymentMethod = {
    BANK_TRANSFER: 8,
    INTERNAL: 10, // Giao dịch nội bộ hệ thống (payout, fee)
    PAYOS: 11, // PayOS payment gateway
} as const;

export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Payment {
    _id: string;
    booking: string;
    user: string;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    paymentNote?: string;
    transactionId?: string;
    paidBy?: string;
    createdAt: string;
    updatedAt: string;
}



export interface UpdatePaymentStatusPayload {
    status: PaymentStatus;
    transactionId?: string;
}

export interface PaymentState {
    currentPayment: Payment | null;
    loading: boolean;
    error: ErrorResponse | null;
    // PayOS specific states
    payosPaymentLink: PayOSPaymentLinkResponse | null;
    payosOrderCode: number | null;
    payosVerificationResult: PayOSVerificationResult | null;
    payosQueryResult: PayOSQueryResult | null;
}

export interface ErrorResponse {
    message: string;
    status: string;
}

// ============================================
// PayOS Payment Types
// ============================================

export interface PaymentItem {
    name: string;
    quantity: number;
    price: number;
}

export interface CreatePayOSPaymentPayload {
    orderId: string;           // Booking ID hoặc Transaction ID
    amount: number;            // Số tiền (VND), tối thiểu 1000
    description: string;       // Mô tả thanh toán
    buyerName?: string;        // Tên người mua (optional)
    buyerEmail?: string;       // Email người mua (optional)
    buyerPhone?: string;       // SĐT người mua (optional)
    returnUrl?: string;        // URL redirect sau thanh toán (optional)
    cancelUrl?: string;        // URL khi user hủy (optional)
    items: PaymentItem[];      // Danh sách items
    expiredAt?: number;        // Thời gian hết hạn (phút), default 15
}

export interface PayOSPaymentLinkResponse {
    paymentLinkId: string;     // ID của payment link
    checkoutUrl: string;       // URL để redirect user
    qrCodeUrl: string;         // URL QR code
    orderCode: number;         // Mã đơn hàng PayOS
    amount: number;            // Số tiền
    status: string;            // Trạng thái (PENDING)
}

export interface PayOSVerificationResult {
    success: boolean;
    paymentStatus: 'succeeded' | 'failed' | 'pending' | 'cancelled';
    bookingId: string;
    message: string;
    orderCode?: number;
    reference?: string;
    amount: number;
    reason?: string;
}

export interface PayOSQueryResult {
    orderCode: number;
    amount: number;
    description: string;
    status: 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
    accountNumber?: string;        // PayOS account number (optional)
    reference?: string;
    transactionDateTime?: string;
    createdAt: number;
    cancelledAt?: number;
}

export interface CancelPayOSPaymentPayload {
    cancellationReason?: string;
}

export interface CancelPayOSPaymentResponse {
    orderCode: number;
    status: 'CANCELLED';
    message: string;
}
