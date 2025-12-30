import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
    Booking,
    SessionBookingResponse,
    CreateFieldBookingPayload,
    CreateConsecutiveDaysBookingPayload,
    CreateWeeklyRecurringPayload,
    CreateSessionBookingPayload,
    CancelBookingPayload,
    CancelSessionBookingPayload,
    SetCoachHolidayPayload,
    GetMyBookingsParams,
    MyBookingsResponse,
    MyInvoicesResponse,
    UpcomingBooking,
    ErrorResponse,
    CreateCombinedBookingPayload,
} from "../../types/booking-type";
import axiosPrivate from "../../utils/axios/axiosPrivate";
import logger from "../../utils/logger";
import {
    CREATE_FIELD_BOOKING_API,
    CREATE_CONSECUTIVE_DAYS_BOOKING_API,
    CREATE_WEEKLY_RECURRING_BOOKING_API,
    PARSE_BOOKING_REQUEST_API,
    CANCEL_FIELD_BOOKING_API,
    CREATE_SESSION_BOOKING_API,
    CANCEL_SESSION_BOOKING_API,
    GET_MY_BOOKINGS_API,
    GET_MY_INVOICES_API,
    GET_UPCOMING_BOOKING_API,
    SET_COACH_HOLIDAY_API,
    CREATE_COMBINED_BOOKING_API,
    CREATE_PAYOS_PAYMENT_API,
} from "./bookingAPI";

/**
 * Get my invoices
 */
export const getMyInvoices = createAsyncThunk<
    MyInvoicesResponse,
    { page?: number; limit?: number; status?: string; type?: string },
    { rejectValue: ErrorResponse }
>("booking/getMyInvoices", async (params, thunkAPI) => {
    try {


        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.status) queryParams.append('status', params.status);
        if (params?.type) queryParams.append('type', params.type);

        const url = queryParams.toString() ? `${GET_MY_INVOICES_API}?${queryParams.toString()}` : GET_MY_INVOICES_API;
        const response = await axiosPrivate.get(url);



        const responseData = response.data;
        // Support envelope: { success: true, data: { invoices, pagination } }
        if (responseData?.success && responseData?.data && responseData.data.invoices) {
            return {
                invoices: responseData.data.invoices,
                pagination: responseData.data.pagination || null,
            };
        }

        // Support direct response: { invoices, pagination }
        if (responseData?.invoices && Array.isArray(responseData.invoices)) {
            return {
                invoices: responseData.invoices,
                pagination: responseData.pagination || null,
            };
        }

        // Fallback: empty
        return {
            invoices: [],
            pagination: null,
        };
    } catch (error: any) {
        logger.error("Error getting my invoices:", error);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to get my invoices",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Create field booking
 */
export const createFieldBooking = createAsyncThunk<
    Booking,
    CreateFieldBookingPayload,
    { rejectValue: ErrorResponse }
>("booking/createFieldBooking", async (payload, thunkAPI) => {
    try {

        const response = await axiosPrivate.post(CREATE_FIELD_BOOKING_API, payload);


        return response.data;
    } catch (error: any) {
        logger.error("Error creating field booking:", error);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to create field booking",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Create consecutive days booking (Turn 1 - Recurring Booking Feature)
 * Book same court for multiple consecutive days
 */
export const createConsecutiveDaysBooking = createAsyncThunk<
    { bookings: Booking[]; summary: { totalBookings: number; totalAmount: number; dateRange: string } },
    CreateConsecutiveDaysBookingPayload,
    { rejectValue: ErrorResponse & { conflicts?: Array<{ date: string; reason: string }> } }
>("booking/createConsecutiveDaysBooking", async (payload, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(CREATE_CONSECUTIVE_DAYS_BOOKING_API, payload);
        return response.data;
    } catch (error: any) {
        logger.error("Error creating consecutive days booking:", error);
        const errorResponse = {
            message: error.response?.data?.message || error.message || "Failed to create consecutive days booking",
            status: error.response?.status?.toString() || "500",
            conflicts: error.response?.data?.conflicts || undefined,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Create weekly recurring booking (Turn 2 - Recurring Booking Feature)
 * Book specific weekdays for multiple weeks
 * Example: Book every Monday and Wednesday for 4 weeks
 */
export const createWeeklyRecurringBooking = createAsyncThunk<
    { bookings: Booking[]; summary: { totalBookings: number; totalAmount: number; pattern: string; weekdays: string[]; numberOfWeeks: number } },
    CreateWeeklyRecurringPayload,
    { rejectValue: ErrorResponse & { conflicts?: Array<{ date: string; reason: string }> } }
>("booking/createWeeklyRecurringBooking", async (payload, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(CREATE_WEEKLY_RECURRING_BOOKING_API, payload);
        return response.data;
    } catch (error: any) {
        logger.error("Error creating weekly recurring booking:", error);
        const errorResponse = {
            message: error.response?.data?.message || error.message || "Failed to create weekly recurring booking",
            status: error.response?.status?.toString() || "500",
            conflicts: error.response?.data?.conflicts || undefined,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Parse natural language booking request with AI (Turn 3)
 * Example: "Đặt sân từ thứ 2 đến thứ 6 tuần này, 9h-11h" → structured data
 */
export const parseBookingRequest = createAsyncThunk<
    any, // Parsed booking data
    { query: string; fieldId: string },
    { rejectValue: ErrorResponse }
>("booking/parseBookingRequest", async (payload, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(PARSE_BOOKING_REQUEST_API, payload);
        return response.data.data; // Backend returns { success: true, data: parsedData }
    } catch (error: any) {
        logger.error("Error parsing booking request:", error);
        const errorResponse = {
            message: error.response?.data?.message || error.message || "Failed to parse booking request",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Cancel field booking
 */
export const cancelFieldBooking = createAsyncThunk<
    Booking,
    { id: string; payload?: CancelBookingPayload },
    { rejectValue: ErrorResponse }
>("booking/cancelFieldBooking", async ({ id, payload }, thunkAPI) => {
    try {

        const response = await axiosPrivate.patch(CANCEL_FIELD_BOOKING_API(id), payload);


        return response.data;
    } catch (error: any) {
        logger.error("Error cancelling field booking:", error);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to cancel field booking",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Create session booking (field + coach)
 */
export const createSessionBooking = createAsyncThunk<
    SessionBookingResponse,
    CreateSessionBookingPayload,
    { rejectValue: ErrorResponse }
>("booking/createSessionBooking", async (payload, thunkAPI) => {
    try {

        const response = await axiosPrivate.post(CREATE_SESSION_BOOKING_API, payload);


        return response.data;
    } catch (error: any) {
        logger.error("Error creating session booking:", error);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to create session booking",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Cancel session booking (field + coach)
 */
export const cancelSessionBooking = createAsyncThunk<
    SessionBookingResponse,
    CancelSessionBookingPayload,
    { rejectValue: ErrorResponse }
>("booking/cancelSessionBooking", async (payload, thunkAPI) => {
    try {

        const response = await axiosPrivate.patch(CANCEL_SESSION_BOOKING_API, payload);


        return response.data;
    } catch (error: any) {
        logger.error("Error cancelling session booking:", error);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to cancel session booking",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Create combined booking (field + coach + hold transaction)
 */
export const createCombinedBooking = createAsyncThunk<
    Booking,
    CreateCombinedBookingPayload,
    { rejectValue: ErrorResponse }
>("booking/createCombinedBooking", async (payload, thunkAPI) => {
    try {

        const response = await axiosPrivate.post(CREATE_COMBINED_BOOKING_API, payload);


        return response.data;
    } catch (error: any) {
        logger.error("Error creating combined booking:", error);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to create combined booking",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Get my bookings
 */
export const getMyBookings = createAsyncThunk<
    MyBookingsResponse,
    GetMyBookingsParams,
    { rejectValue: ErrorResponse }
>("booking/getMyBookings", async (params, thunkAPI) => {
    try {


        // Build query string
        const queryParams = new URLSearchParams();
        if (params.status) queryParams.append('status', params.status);
        if (params.type) queryParams.append('type', params.type);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());

        const url = queryParams.toString()
            ? `${GET_MY_BOOKINGS_API}?${queryParams.toString()}`
            : GET_MY_BOOKINGS_API;

        const response = await axiosPrivate.get(url);



        // Handle API response format: { success: true, data: { bookings: [...], pagination: {...} } }
        const responseData = response.data;
        if (responseData?.success && responseData?.data?.bookings) {
            return {
                bookings: responseData.data.bookings,
                pagination: responseData.data.pagination
            };
        }

        // Fallback for different response formats
        if (Array.isArray(responseData)) {
            return {
                bookings: responseData,
                pagination: null
            };
        }

        if (responseData?.bookings && Array.isArray(responseData.bookings)) {
            return {
                bookings: responseData.bookings,
                pagination: responseData.pagination || null
            };
        }

        if (responseData?.data && Array.isArray(responseData.data)) {
            return {
                bookings: responseData.data,
                pagination: null
            };
        }

        return {
            bookings: [],
            pagination: null
        };
    } catch (error: any) {
        logger.error("Error getting my bookings:", error);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to get my bookings",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Set coach holiday
 */
export const setCoachHoliday = createAsyncThunk<
    { modifiedCount: number },
    SetCoachHolidayPayload,
    { rejectValue: ErrorResponse }
>("booking/setCoachHoliday", async (payload, thunkAPI) => {
    try {

        const response = await axiosPrivate.post(SET_COACH_HOLIDAY_API, payload);


        return response.data;
    } catch (error: any) {
        logger.error("Error setting coach holiday:", error);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to set coach holiday",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Get upcoming booking for current user
 */
export const getUpcomingBooking = createAsyncThunk<
    UpcomingBooking | null,
    void,
    { rejectValue: ErrorResponse }
>("booking/getUpcomingBooking", async (_, thunkAPI) => {
    try {

        const response = await axiosPrivate.get(GET_UPCOMING_BOOKING_API);
        const responseData = response.data;

        if (responseData?.success && responseData?.data) {
            return responseData.data as UpcomingBooking;
        }

        if (responseData) {
            return responseData as UpcomingBooking;
        }

        return null;
    } catch (error: any) {
        logger.error("Error getting upcoming booking:", error);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to get upcoming booking",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Create coach booking V2 with bank transfer payment proof
 */
export const createCoachBookingV2 = createAsyncThunk<
    Booking,
    FormData,
    { rejectValue: ErrorResponse }
>("booking/createCoachBookingV2", async (formData, thunkAPI) => {
    try {

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const token = localStorage.getItem('token');

        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${apiUrl}/bookings/coach/v2`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Có lỗi xảy ra' }));
            throw new Error(errorData.message || 'Không thể tạo booking. Vui lòng thử lại.');
        }

        const booking = await response.json();

        return booking;
    } catch (error: any) {
        logger.error("Error creating coach booking V2:", error);
        const errorResponse: ErrorResponse = {
            message: error?.message || "Failed to create coach booking",
            status: error?.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Create PayOS payment link for existing booking
 * Returns checkout URL to redirect user for payment
 */
export const createPayOSPayment = createAsyncThunk<
    { checkoutUrl: string; paymentLinkId: string; orderCode: number },
    string, // bookingId
    { rejectValue: ErrorResponse }
>("booking/createPayOSPayment", async (bookingId, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(CREATE_PAYOS_PAYMENT_API(bookingId));

        // Debug: Log the actual response structure
        logger.debug('PayOS Response:', response);
        logger.debug('PayOS Response.data:', response.data);

        // Backend returns: { checkoutUrl, paymentLinkId, orderCode }
        // But check if it's wrapped in a 'data' field
        const paymentData = response.data?.data || response.data;

        if (!paymentData.checkoutUrl) {
            logger.error('PayOS Response missing checkoutUrl:', paymentData);
            throw new Error('Khong nhan duoc link thanh toan tu server');
        }

        return {
            checkoutUrl: paymentData.checkoutUrl,
            paymentLinkId: paymentData.paymentLinkId,
            orderCode: paymentData.orderCode,
        };
    } catch (error: any) {
        logger.error("Error creating PayOS payment:", error);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Khong the tao link thanh toan PayOS",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// ============================================================================
// TURN 4: RECURRING GROUP MANAGEMENT
// ============================================================================

import {
    GET_RECURRING_GROUP_API,
    CANCEL_RECURRING_GROUP_API,
} from "./bookingAPI";

/**
 * Turn 4: Get all bookings in a recurring group
 */
export const getRecurringGroup = createAsyncThunk<
    { groupId: string; totalBookings: number; bookings: Booking[] },
    string, // groupId
    { rejectValue: ErrorResponse }
>("booking/getRecurringGroup", async (groupId, thunkAPI) => {
    try {
        const response = await axiosPrivate.get(GET_RECURRING_GROUP_API(groupId));
        return response.data;
    } catch (error: any) {
        logger.error("Error getting recurring group:", error);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to get recurring group",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Turn 4: Cancel all bookings in a recurring group
 */
export const cancelRecurringGroup = createAsyncThunk<
    { success: boolean; cancelledCount: number; totalInGroup: number; message: string },
    { groupId: string; cancellationReason?: string },
    { rejectValue: ErrorResponse }
>("booking/cancelRecurringGroup", async ({ groupId, cancellationReason }, thunkAPI) => {
    try {
        const response = await axiosPrivate.patch(CANCEL_RECURRING_GROUP_API(groupId), {
            cancellationReason
        });
        return response.data;
    } catch (error: any) {
        logger.error("Error cancelling recurring group:", error);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to cancel recurring group",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});
