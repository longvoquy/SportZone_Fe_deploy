import { createSlice } from "@reduxjs/toolkit";
import type { PaymentState } from "../../types/payment-type";
import {
    getTransactionByBooking,
    updateTransactionStatus,
    createPayOSPayment,
    verifyPayOSPayment,
    queryPayOSTransaction,
    cancelPayOSPayment,
} from "./transactionsThunk";

const initialState: PaymentState = {
    currentPayment: null,
    loading: false,
    error: null,
    // PayOS specific states
    payosPaymentLink: null,
    payosOrderCode: null,
    payosVerificationResult: null,
    payosQueryResult: null,
};

const transactionsSlice = createSlice({
    name: "transactions",
    initialState,
    reducers: {
        clearTransactionError: (state) => {
            state.error = null;
        },
        clearCurrentTransaction: (state) => {
            state.currentPayment = null;
        },
    },
    extraReducers: (builder) => {
        // Get transaction by booking
        builder.addCase(getTransactionByBooking.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(getTransactionByBooking.fulfilled, (state, action) => {
            state.loading = false;
            state.currentPayment = action.payload;
        });
        builder.addCase(getTransactionByBooking.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || { message: "Failed to get transaction", status: "500" };
        });

        // Update transaction status
        builder.addCase(updateTransactionStatus.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(updateTransactionStatus.fulfilled, (state, action) => {
            state.loading = false;
            state.currentPayment = action.payload;
        });
        builder.addCase(updateTransactionStatus.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || { message: "Failed to update transaction status", status: "500" };
        });

        // ============================================
        // PayOS Thunks
        // ============================================

        // Create PayOS Payment
        builder.addCase(createPayOSPayment.pending, (state) => {
            state.loading = true;
            state.error = null;
            state.payosPaymentLink = null;
        });
        builder.addCase(createPayOSPayment.fulfilled, (state, action) => {
            state.loading = false;
            state.payosPaymentLink = action.payload;
            state.payosOrderCode = action.payload.orderCode;
        });
        builder.addCase(createPayOSPayment.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || { message: "Failed to create PayOS payment", status: "500" };
        });

        // Verify PayOS Payment
        builder.addCase(verifyPayOSPayment.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(verifyPayOSPayment.fulfilled, (state, action) => {
            state.loading = false;
            state.payosVerificationResult = action.payload;
        });
        builder.addCase(verifyPayOSPayment.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || { message: "PayOS verification failed", status: "500" };
        });

        // Query PayOS Transaction
        builder.addCase(queryPayOSTransaction.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(queryPayOSTransaction.fulfilled, (state, action) => {
            state.loading = false;
            state.payosQueryResult = action.payload;
        });
        builder.addCase(queryPayOSTransaction.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || { message: "Failed to query PayOS transaction", status: "500" };
        });

        // Cancel PayOS Payment
        builder.addCase(cancelPayOSPayment.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(cancelPayOSPayment.fulfilled, (state) => {
            state.loading = false;
            state.payosPaymentLink = null;
            state.payosOrderCode = null;
        });
        builder.addCase(cancelPayOSPayment.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || { message: "Failed to cancel PayOS payment", status: "500" };
        });
    },
});

export const { clearTransactionError, clearCurrentTransaction } = transactionsSlice.actions;

// Export legacy aliases for backward compatibility
export const clearPaymentError = clearTransactionError;
export const clearCurrentPayment = clearCurrentTransaction;

export default transactionsSlice.reducer;

