// Booking types based on API documentation
import type { UserProfile } from "@/types/user-type"
import type { Field } from "@/types/field-type"
import type { Payment } from "@/types/payment-type"

export interface CreateFieldBookingPayload {
    fieldId: string;
    courtId: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    selectedAmenities?: string[];
    paymentMethod?: number; // PaymentMethod enum (1-9)
    paymentNote?: string;
    note?: string; // User note to owner (max 200 chars)
}

export interface CreateSessionBookingPayload {
    fieldId: string;
    coachId: string;
    date: string; // YYYY-MM-DD
    fieldStartTime: string; // HH:mm
    fieldEndTime: string; // HH:mm
    coachStartTime: string; // HH:mm
    coachEndTime: string; // HH:mm
    selectedAmenities?: string[];
}

export interface CreateCombinedBookingPayload {
    fieldId: string;
    courtId: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    selectedAmenities?: string[];
    coachId: string;
    paymentMethod?: number;
    note?: string;
    paymentNote?: string;
    guestEmail?: string;
    guestPhone?: string;
    guestName?: string;
}

export interface CancelBookingPayload {
    cancellationReason?: string;
    courtId?: string;
}

export interface CancelSessionBookingPayload {
    fieldBookingId: string;
    coachBookingId: string;
    cancellationReason?: string;
}

export interface SetCoachHolidayPayload {
    coachId: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
}

export type CoachStatus = "pending" | "declined" | "accepted" | "cancelled";

export interface Booking {
    _id: string;
    user: string | UserProfile;
    field?: Field; // field id for FIELD bookings
    court?: string | { _id?: string; name?: string; courtNumber?: number };
    requestedCoach?: string; // coach id for COACH bookings
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    numSlots?: number;
    type: 'field' | 'coach' | 'field_coach';
    coachStatus?: CoachStatus;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    // New price structure
    bookingAmount?: number; // Court fee + amenities (base amount before platform fee)
    platformFee?: number; // System/platform fee (5% of bookingAmount)
    // @deprecated Use bookingAmount + platformFee instead. Kept for backward compatibility
    totalPrice?: number;
    selectedAmenities?: string[];
    amenitiesFee?: number;
    payment?: string | Payment; // Payment ObjectId reference or populated Payment
    pricingSnapshot?: {
        basePrice: number;
        appliedMultiplier?: number;
        priceBreakdown?: string;
    };
    cancellationReason?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface SessionBookingResponse {
    fieldBooking: Booking;
    coachBooking: Booking;
}

export interface CoachScheduleSlot {
    time: string; // "09:00"
    available: boolean;
}

export interface CoachSchedule {
    date: string; // "2025-09-29T00:00:00.000Z"
    isHoliday: boolean;
    slots: CoachScheduleSlot[];
}

export interface GetCoachScheduleParams {
    coachId: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
}

export interface GetMyBookingsParams {
    status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    type?: 'field' | 'coach' | 'field_coach';
    page?: number;
    limit?: number;
}

export interface PaginationInfo {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface Invoice {
    bookingId: string;
    name: string;
    court?: string;
    courtId?: string;
    courtName?: string;
    courtNumber?: number;
    date: string; // YYYY-MM-DD
    time: string; // e.g. "08:00 - 09:00"
    payment: number;
    paidOn?: string | null; // ISO date string
    status?: string;
}

export interface MyInvoicesResponse {
    invoices: Invoice[];
    pagination: PaginationInfo | null;
}
export interface UpcomingBooking {
    bookingId: string;
    academyName?: string;
    fieldName?: string;
    courtName?: string;
    courtNumber?: number;
    date?: string; // YYYY-MM-DD
    time?: string; // e.g. "08:00 - 09:00"
}

export interface MyBookingsResponse {
    bookings: Booking[];
    pagination: PaginationInfo;
}

export interface BookingState {
    bookings: Booking[];
    currentBooking: Booking | null;
    sessionBooking: SessionBookingResponse | null;
    coachSchedules: CoachSchedule[];
    pagination: PaginationInfo | null;
    invoices: Invoice[];
    invoicesPagination: PaginationInfo | null;
    upcomingBooking?: UpcomingBooking | null;
    // PayOS payment link response
    paymentLink?: { checkoutUrl: string; paymentLinkId: string; orderCode: number } | null;
    // Separate loading flags for better UI control
    loadingBookings: boolean;
    loadingInvoices: boolean;
    loadingUpcoming: boolean;
    loadingPayment?: boolean; // Loading state for PayOS payment
    error: ErrorResponse | null;
    paymentError?: ErrorResponse | null; // Separate error for payment
}

export interface ErrorResponse {
    message: string;
    status: string;
}