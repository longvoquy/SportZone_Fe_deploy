import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { BookingState, ErrorResponse } from "../../types/booking-type";
import {
    createConsecutiveDaysBooking,
    createWeeklyRecurringBooking,
    parseBookingRequest,
    cancelFieldBooking,
    createSessionBooking,
    cancelSessionBooking,
    getMyBookings,
    getMyInvoices,
    getUpcomingBooking,
    setCoachHoliday,
    createPayOSPayment,
} from "./bookingThunk";

const initialState: BookingState = {
    bookings: [],
    currentBooking: null,
    sessionBooking: null,
    coachSchedules: [],
    pagination: null,
    invoices: [],
    invoicesPagination: null,
    upcomingBooking: null,
    paymentLink: null, // PayOS payment link response
    loadingBookings: false,
    loadingInvoices: false,
    loadingUpcoming: false,
    loadingPayment: false, // Loading state for payment
    error: null,
    paymentError: null, // Separate error for payment
};

const bookingSlice = createSlice({
    name: "booking",
    initialState,
    reducers: {
        // Clear error
        clearError: (state) => {
            state.error = null;
        },

        // Reset booking state
        resetBookingState: (state) => {
            state.currentBooking = null;
            state.sessionBooking = null;
            state.error = null;
        },

        // Set current booking
        setCurrentBooking: (state, action) => {
            state.currentBooking = action.payload;
        },

        // Clear current booking
        clearCurrentBooking: (state) => {
            state.currentBooking = null;
        },
    },
    extraReducers: (builder) => {
        // Create Consecutive Days Booking (Turn 1)
        builder
            .addCase(createConsecutiveDaysBooking.fulfilled, (state, action) => {
                state.loadingBookings = false;
                // Add all created bookings to the list
                if (action.payload.bookings && Array.isArray(action.payload.bookings)) {
                    state.bookings.push(...action.payload.bookings);
                    // Set first booking as current
                    if (action.payload.bookings.length > 0) {
                        state.currentBooking = action.payload.bookings[0];
                    }
                }
            })
            .addCase(createConsecutiveDaysBooking.rejected, (state, action) => {
                state.loadingBookings = false;
                state.error = action.payload || { message: "Đã xảy ra lỗi", status: "500" };
            })

        // Create Weekly Recurring Booking (Turn 2)
        builder
            .addCase(createWeeklyRecurringBooking.fulfilled, (state, action) => {
                state.loadingBookings = false;
                // Add all created bookings to the list
                if (action.payload.bookings && Array.isArray(action.payload.bookings)) {
                    state.bookings.push(...action.payload.bookings);
                    // Set first booking as current
                    if (action.payload.bookings.length > 0) {
                        state.currentBooking = action.payload.bookings[0];
                    }
                }
            })
            .addCase(createWeeklyRecurringBooking.rejected, (state, action) => {
                state.loadingBookings = false;
                state.error = action.payload || { message: "Da xay ra loi", status: "500" };
            })

        // Parse Booking Request (Turn 3 - AI Parsing)
        // Note: parseBookingRequest doesn't modify state, data is handled in component
        builder
            .addCase(parseBookingRequest.pending, (state) => {
                state.loadingBookings = true;
                state.error = null;
            })
            .addCase(parseBookingRequest.fulfilled, (state) => {
                state.loadingBookings = false;
                // Parsed data is returned to component, no state update needed
            })
            .addCase(parseBookingRequest.rejected, (state, action) => {
                state.loadingBookings = false;
                state.error = action.payload || { message: "Khong the phan tich yeu cau", status: "500" };
            })


        // Cancel Field Booking
        builder
            .addCase(cancelFieldBooking.fulfilled, (state, action) => {
                state.loadingBookings = false;
                // Update booking in the list
                const index = state.bookings.findIndex(booking => booking._id === action.payload._id);
                if (index !== -1) {
                    state.bookings[index] = action.payload;
                }
                // Update current booking if it's the same one
                if (state.currentBooking?._id === action.payload._id) {
                    state.currentBooking = action.payload;
                }
            })


        // Create Session Booking
        builder
            .addCase(createSessionBooking.fulfilled, (state, action) => {
                state.loadingBookings = false;
                state.sessionBooking = action.payload;
                // Add both bookings to the list
                state.bookings.push(action.payload.fieldBooking);
                state.bookings.push(action.payload.coachBooking);
            })


        // Cancel Session Booking
        builder
            .addCase(cancelSessionBooking.fulfilled, (state, action) => {
                state.loadingBookings = false;
                state.sessionBooking = action.payload;
                // Update bookings in the list
                const fieldIndex = state.bookings.findIndex(booking => booking._id === action.payload.fieldBooking._id);
                const coachIndex = state.bookings.findIndex(booking => booking._id === action.payload.coachBooking._id);
                if (fieldIndex !== -1) {
                    state.bookings[fieldIndex] = action.payload.fieldBooking;
                }
                if (coachIndex !== -1) {
                    state.bookings[coachIndex] = action.payload.coachBooking;
                }
            })


        // Get Coach Bookings - REMOVED (Use direct fetch in pages)



        // Get My Bookings
        builder
            .addCase(getMyBookings.fulfilled, (state, action) => {
                state.loadingBookings = false;
                state.bookings = action.payload.bookings;
                state.pagination = action.payload.pagination;
            })

        // Get My Invoices
        builder
            .addCase(getMyInvoices.fulfilled, (state, action) => {
                state.loadingInvoices = false;
                state.invoices = action.payload.invoices;
                state.invoicesPagination = action.payload.pagination;
            })

        // Get Upcoming Booking
        builder
            .addCase(getUpcomingBooking.fulfilled, (state, action) => {
                state.loadingUpcoming = false;
                state.upcomingBooking = action.payload || null;
            })


        // Get Coach Schedule - REMOVED (Use direct fetch in pages)



        // Set Coach Holiday
        builder
            .addCase(setCoachHoliday.fulfilled, (state) => {
                state.loadingBookings = false;
                // Refresh coach schedules might be needed here
            })

        // Create PayOS Payment Link
        builder
            .addCase(createPayOSPayment.pending, (state) => {
                state.loadingPayment = true;
                state.paymentError = null;
            })
            .addCase(createPayOSPayment.fulfilled, (state, action) => {
                state.loadingPayment = false;
                state.paymentLink = action.payload;
                state.paymentError = null;
            })
            .addCase(createPayOSPayment.rejected, (state, action) => {
                state.loadingPayment = false;
                state.paymentLink = null;
                state.paymentError = action.payload || { message: "Không thể tạo link thanh toán", status: "500" };
            })

            // Matchers: handle pending/rejected per group of thunks
            .addMatcher(
                (action) =>
                    action.type.startsWith("booking/") &&
                    action.type.endsWith("/pending") &&
                    [
                        createConsecutiveDaysBooking.typePrefix,
                        createWeeklyRecurringBooking.typePrefix,
                        cancelFieldBooking.typePrefix,
                        createSessionBooking.typePrefix,
                        cancelSessionBooking.typePrefix,
                        getMyBookings.typePrefix,
                        setCoachHoliday.typePrefix,
                    ].some((prefix) => action.type.startsWith(prefix)),
                (state) => {
                    state.loadingBookings = true;
                    state.error = null;
                }
            )
            .addMatcher(
                (action) =>
                    action.type.startsWith("booking/") &&
                    action.type.endsWith("/pending") &&
                    [getMyInvoices.typePrefix].some((prefix) => action.type.startsWith(prefix)),
                (state) => {
                    state.loadingInvoices = true;
                    state.error = null;
                }
            )
            .addMatcher(
                (action) =>
                    action.type.startsWith("booking/") &&
                    action.type.endsWith("/pending") &&
                    [getUpcomingBooking.typePrefix].some((prefix) => action.type.startsWith(prefix)),
                (state) => {
                    state.loadingUpcoming = true;
                    state.error = null;
                }
            )
            .addMatcher(
                (action) => action.type.startsWith("booking/") && action.type.endsWith("/rejected"),
                (state, action: PayloadAction<ErrorResponse>) => {
                    // On error, stop all loading flags
                    state.loadingBookings = false;
                    state.loadingInvoices = false;
                    state.loadingUpcoming = false;
                    state.error = action.payload || { message: "Unknown error", status: "500" };
                }
            );
    },
});

export const {
    clearError,
    resetBookingState,
    setCurrentBooking,
    clearCurrentBooking,
} = bookingSlice.actions;

export default bookingSlice.reducer;