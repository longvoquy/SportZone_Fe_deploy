import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
    Payment,
    CreateVNPayUrlPayload,
    CreateVNPayUrlResponse,
    UpdatePaymentStatusPayload,
    ErrorResponse,
    CreatePayOSPaymentPayload,
    PayOSPaymentLinkResponse,
    PayOSVerificationResult,
    PayOSQueryResult,
    CancelPayOSPaymentResponse,
} from "../../types/payment-type";
import axiosPrivate from "../../utils/axios/axiosPrivate";
import logger from "../../utils/logger";
import {
    CREATE_VNPAY_URL_API,
    GET_TRANSACTION_BY_BOOKING_API,
    UPDATE_TRANSACTION_STATUS_API,
    VERIFY_VNPAY_API,
    QUERY_VNPAY_TRANSACTION_API,
    VNPAY_REFUND_API,
    CREATE_PAYOS_PAYMENT_API,
    PAYOS_RETURN_API,
    QUERY_PAYOS_TRANSACTION_API,
    CANCEL_PAYOS_PAYMENT_API,
} from "./transactionsAPI";

/**
 * Create VNPay payment URL
 */
export const createVNPayUrl = createAsyncThunk<
    CreateVNPayUrlResponse,
    CreateVNPayUrlPayload,
    { rejectValue: ErrorResponse }
>("transactions/createVNPayUrl", async (payload, thunkAPI) => {
    try {
        logger.debug("[Transactions Thunk] Creating VNPay URL:", payload);
        const response = await axiosPrivate.get(
            `${CREATE_VNPAY_URL_API}?amount=${payload.amount}&orderId=${payload.orderId}`
        );
        
        logger.debug("[Transactions Thunk] Response:", response.data);
        
        // Handle different response structures
        if (response.data?.paymentUrl) {
            return response.data;
        }
        
        if (response.data?.data?.paymentUrl) {
            return response.data.data;
        }
        
        if (response.data?.success && response.data?.data?.paymentUrl) {
            return response.data.data;
        }
        
        if (typeof response.data === 'string' && response.data.startsWith('http')) {
            return { paymentUrl: response.data };
        }
        
        logger.error("[Transactions Thunk] ❌ Cannot find paymentUrl in response", response.data);
        throw new Error(`Backend response does not contain paymentUrl.`);
    } catch (error: any) {
        logger.error("[Transactions Thunk] ❌ Error creating VNPay URL:", error);
        
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || 
                     error.response?.data?.error || 
                     error.message || 
                     "Failed to create VNPay URL",
            status: error.response?.status?.toString() || "500",
        };
        
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Get transaction by booking ID
 */
export const getTransactionByBooking = createAsyncThunk<
    Payment,
    string,
    { rejectValue: ErrorResponse }
>("transactions/getTransactionByBooking", async (bookingId, thunkAPI) => {
    try {
        const response = await axiosPrivate.get(GET_TRANSACTION_BY_BOOKING_API(bookingId));
        return response.data;
    } catch (error: any) {
        logger.error("Error getting transaction:", error);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to get transaction",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Update transaction status (admin/staff only)
 */
export const updateTransactionStatus = createAsyncThunk<
    Payment,
    { transactionId: string; payload: UpdatePaymentStatusPayload },
    { rejectValue: ErrorResponse }
>("transactions/updateTransactionStatus", async ({ transactionId, payload }, thunkAPI) => {
    try {
        const response = await axiosPrivate.patch(
            UPDATE_TRANSACTION_STATUS_API(transactionId),
            payload
        );
        return response.data;
    } catch (error: any) {
        logger.error("Error updating transaction status:", error);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to update transaction status",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Verify VNPay payment after redirect
 */
export interface VNPayVerificationResult {
    success: boolean;
    paymentStatus: 'succeeded' | 'failed' | 'pending';
    bookingId: string;
    message: string;
    reason?: string;
}

export const verifyVNPayPayment = createAsyncThunk<
    VNPayVerificationResult,
    string,
    { rejectValue: { message: string; status: string } }
>(
    'transactions/verifyVNPayPayment',
    async (queryString, thunkAPI) => {
        try {
            const cleanQuery = queryString.startsWith('?') ? queryString.slice(1) : queryString;
            const response = await axiosPrivate.get(`${VERIFY_VNPAY_API}?${cleanQuery}`);
            
            let verificationResult = response.data;
            if (response.data?.data) {
                verificationResult = response.data.data;
            }
            
            logger.debug('[Transactions Thunk] Verification result:', verificationResult);
            return verificationResult;
        } catch (error: any) {
            logger.error('[Transactions Thunk] ❌ Verification error:', error);
            const errorResponse = {
                message: error.response?.data?.message || error.message || 'Failed to verify payment',
                status: error.response?.status?.toString() || '500',
            };
            return thunkAPI.rejectWithValue(errorResponse);
        }
    }
);

/**
 * Query VNPay transaction status
 */
export const queryVNPayTransaction = createAsyncThunk<
    any,
    { orderId: string; transactionDate: string },
    { rejectValue: ErrorResponse }
>("transactions/queryVNPayTransaction", async (payload, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(QUERY_VNPAY_TRANSACTION_API, payload);
        return response.data;
    } catch (error: any) {
        logger.error('[Transactions Thunk] ❌ Query error:', error);
        return thunkAPI.rejectWithValue({
            message: error.response?.data?.message || "Failed to query transaction",
            status: error.response?.status?.toString() || "500",
        });
    }
});

/**
 * Process VNPay refund
 */
export const processVNPayRefund = createAsyncThunk<
    any,
    {
        orderId: string;
        transactionDate: string;
        amount: number;
        transactionType: '02' | '03'; // 02: Full, 03: Partial
        createdBy: string;
        reason?: string;
    },
    { rejectValue: ErrorResponse }
>("transactions/processVNPayRefund", async (payload, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(VNPAY_REFUND_API, payload);
        return response.data;
    } catch (error: any) {
        logger.error('[Transactions Thunk] ❌ Refund error:', error);
        return thunkAPI.rejectWithValue({
            message: error.response?.data?.message || "Failed to process refund",
            status: error.response?.status?.toString() || "500",
        });
    }
});

/**
 * Create PayOS payment link
 */
export const createPayOSPayment = createAsyncThunk<
    PayOSPaymentLinkResponse,
    CreatePayOSPaymentPayload,
    { rejectValue: ErrorResponse }
>("transactions/createPayOSPayment", async (payload, thunkAPI) => {
    try {
        logger.debug("[PayOS Thunk] Creating PayOS payment:", payload);
        const response = await axiosPrivate.post(CREATE_PAYOS_PAYMENT_API, payload);
        const responseData = response.data;
        
        let normalized: any = responseData;
        if (responseData?.data?.checkoutUrl) {
            normalized = responseData.data;
        } else if (responseData?.success && responseData?.data) {
            normalized = responseData.data;
        }

        if (!normalized?.checkoutUrl) {
            logger.error("[PayOS Thunk] ❌ Missing checkoutUrl", responseData);
            throw new Error("Backend response does not contain checkoutUrl.");
        }

        const rawOrderCode = normalized.orderCode ?? responseData?.orderCode;
        const parsedOrderCode = typeof rawOrderCode === "string" ? Number(rawOrderCode) : rawOrderCode;
        const rawAmount = normalized.amount ?? responseData?.amount ?? payload.amount;
        const parsedAmount = typeof rawAmount === "string" ? Number(rawAmount) : rawAmount;

        const normalizedPayload: PayOSPaymentLinkResponse = {
            paymentLinkId: normalized.paymentLinkId ?? responseData?.paymentLinkId ?? "",
            checkoutUrl: normalized.checkoutUrl,
            qrCodeUrl: normalized.qrCodeUrl ?? responseData?.qrCodeUrl,
            orderCode: Number.isFinite(parsedOrderCode) ? parsedOrderCode : 0,
            amount: Number.isFinite(parsedAmount) ? parsedAmount : payload.amount,
            status: normalized.status ?? responseData?.status ?? "PENDING",
        };

        logger.debug("[PayOS Thunk] ✅ Normalized PayOS payload:", normalizedPayload);
        return normalizedPayload;
    } catch (error: any) {
        logger.error("[PayOS Thunk] ❌ Error creating PayOS payment:", error);
        
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to create PayOS payment",
            status: error.response?.status?.toString() || "500",
        };
        
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Verify PayOS payment after return
 */
export const verifyPayOSPayment = createAsyncThunk<
    PayOSVerificationResult,
    string,
    { rejectValue: ErrorResponse }
>("transactions/verifyPayOSPayment", async (queryString, thunkAPI) => {
    try {
        const response = await axiosPrivate.get(`${PAYOS_RETURN_API}${queryString}`);
        const responseData = response.data;
        
        let normalized: any = responseData;
        if (responseData?.data?.paymentStatus) {
            normalized = responseData.data;
        } else if (responseData?.success !== undefined && responseData?.data) {
            normalized = responseData.data;
        }

        if (!normalized || normalized.paymentStatus === undefined) {
            logger.error("[PayOS Thunk] ❌ Missing paymentStatus", responseData);
            throw new Error("Backend response does not contain paymentStatus.");
        }

        const normalizedPayload: PayOSVerificationResult = {
            success: normalized.success ?? responseData?.success ?? false,
            paymentStatus: normalized.paymentStatus,
            bookingId: normalized.bookingId ?? responseData?.bookingId ?? "",
            message: normalized.message ?? responseData?.message ?? "",
            reason: normalized.reason ?? responseData?.reason,
            orderCode: normalized.orderCode ?? responseData?.orderCode,
            reference: normalized.reference ?? responseData?.reference,
            amount: normalized.amount ?? responseData?.amount ?? 0,
        };
        
        logger.debug("[PayOS Thunk] ✅ Verification result:", normalizedPayload);
        return normalizedPayload;
    } catch (error: any) {
        logger.error("[PayOS Thunk] ❌ Error verifying PayOS payment:", error);
        return thunkAPI.rejectWithValue({
            message: error.response?.data?.message || error.message || "Failed to verify PayOS payment",
            status: error.response?.status?.toString() || "500",
        });
    }
});

/**
 * Query PayOS transaction status
 */
export const queryPayOSTransaction = createAsyncThunk<
    PayOSQueryResult,
    number,
    { rejectValue: ErrorResponse }
>("transactions/queryPayOSTransaction", async (orderCode, thunkAPI) => {
    try {
        const response = await axiosPrivate.get(QUERY_PAYOS_TRANSACTION_API(orderCode));
        const responseData = response.data;
        
        let normalized: any = responseData;
        if (responseData?.data?.status) {
            normalized = responseData.data;
        } else if (responseData?.success && responseData?.data) {
            normalized = responseData.data;
        }

        const normalizedPayload: PayOSQueryResult = {
            orderCode: normalized.orderCode ?? responseData?.orderCode ?? orderCode,
            amount: normalized.amount ?? responseData?.amount ?? 0,
            description: normalized.description ?? responseData?.description ?? "",
            status: normalized.status,
            accountNumber: normalized.accountNumber ?? responseData?.accountNumber,
            reference: normalized.reference ?? responseData?.reference,
            transactionDateTime: normalized.transactionDateTime ?? responseData?.transactionDateTime,
            createdAt: normalized.createdAt ?? responseData?.createdAt ?? Date.now(),
            cancelledAt: normalized.cancelledAt ?? responseData?.cancelledAt,
        };
        
        logger.debug("[PayOS Thunk] ✅ Status:", normalizedPayload);
        return normalizedPayload;
    } catch (error: any) {
        logger.error("[PayOS Thunk] ❌ Error querying transaction:", error);
        return thunkAPI.rejectWithValue({
            message: error.response?.data?.message || error.message || "Failed to query PayOS transaction",
            status: error.response?.status?.toString() || "500",
        });
    }
});

/**
 * Cancel PayOS payment
 */
export const cancelPayOSPayment = createAsyncThunk<
    CancelPayOSPaymentResponse,
    { orderCode: number; cancellationReason?: string },
    { rejectValue: ErrorResponse }
>("transactions/cancelPayOSPayment", async ({ orderCode, cancellationReason }, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(
            CANCEL_PAYOS_PAYMENT_API(orderCode),
            { cancellationReason }
        );
        const responseData = response.data;
        
        let normalized: any = responseData;
        if (responseData?.data?.status) {
            normalized = responseData.data;
        }

        const normalizedPayload: CancelPayOSPaymentResponse = {
            orderCode: normalized.orderCode ?? responseData?.orderCode ?? orderCode,
            status: normalized.status ?? 'CANCELLED',
            message: normalized.message ?? responseData?.message ?? 'Transaction cancelled',
        };
        
        logger.debug("[PayOS Thunk] ✅ Cancel result:", normalizedPayload);
        return normalizedPayload;
    } catch (error: any) {
        logger.error("[PayOS Thunk] ❌ Error cancelling payment:", error);
        return thunkAPI.rejectWithValue({
            message: error.response?.data?.message || error.message || "Failed to cancel PayOS payment",
            status: error.response?.status?.toString() || "500",
        });
    }
});

// Export legacy aliases for backward compatibility
export const getPaymentByBooking = getTransactionByBooking;
export const updatePaymentStatus = updateTransactionStatus;
