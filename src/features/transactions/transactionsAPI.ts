import { BASE_URL } from "../../utils/constant-value/constant";

// PayOS Transactions API endpoints
// Common Transaction API endpoints
export const GET_TRANSACTION_BY_BOOKING_API = (bookingId: string) => `${BASE_URL}/transactions/booking/${bookingId}`;
export const UPDATE_TRANSACTION_STATUS_API = (transactionId: string) => `${BASE_URL}/transactions/${transactionId}/status`;

// PayOS Transactions API endpoints
export const CREATE_PAYOS_PAYMENT_API = `${BASE_URL}/transactions/payos/create-payment`;
export const PAYOS_RETURN_API = `${BASE_URL}/transactions/payos/return`;
export const QUERY_PAYOS_TRANSACTION_API = (orderCode: number) => `${BASE_URL}/transactions/payos/query/${orderCode}`;
export const CANCEL_PAYOS_PAYMENT_API = (orderCode: number) => `${BASE_URL}/transactions/payos/cancel/${orderCode}`;

