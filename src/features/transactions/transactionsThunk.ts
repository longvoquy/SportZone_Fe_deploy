import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
    Payment,
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
    GET_TRANSACTION_BY_BOOKING_API,
    UPDATE_TRANSACTION_STATUS_API,
    CREATE_PAYOS_PAYMENT_API,
    PAYOS_RETURN_API,
    QUERY_PAYOS_TRANSACTION_API,
    CANCEL_PAYOS_PAYMENT_API,
} from "./transactionsAPI";



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
