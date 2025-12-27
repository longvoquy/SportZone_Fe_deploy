import { BASE_URL } from "../../utils/constant-value/constant";

// Booking API endpoints
export const CREATE_FIELD_BOOKING_API = `${BASE_URL}/bookings/field`;
export const CANCEL_FIELD_BOOKING_API = (id: string) => `${BASE_URL}/bookings/${id}/cancel`;
export const CREATE_SESSION_BOOKING_API = `${BASE_URL}/bookings/session`;
export const CREATE_COMBINED_BOOKING_API = `${BASE_URL}/bookings/combined-hold`;
export const CANCEL_SESSION_BOOKING_API = `${BASE_URL}/bookings/session/cancel`;
export const GET_COACH_BOOKINGS_API = (coachId: string) => `${BASE_URL}/bookings/coach/${coachId}`;
export const GET_MY_BOOKINGS_API = `${BASE_URL}/bookings/my-bookings`;
export const GET_MY_INVOICES_API = `${BASE_URL}/bookings/my-invoices`;
export const GET_UPCOMING_BOOKING_API = `${BASE_URL}/bookings/upcoming`;
export const CREATE_PAYOS_PAYMENT_API = (bookingId: string) => `${BASE_URL}/bookings/${bookingId}/payment/payos`;


// Schedule API endpoints  
export const GET_COACH_SCHEDULE_API = (coachId: string) => `${BASE_URL}/schedules/coach/${coachId}`;
export const SET_COACH_HOLIDAY_API = `${BASE_URL}/schedules/set-holiday`;