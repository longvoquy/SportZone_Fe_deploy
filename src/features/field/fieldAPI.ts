import { BASE_URL } from "../../utils/constant-value/constant";

// Base endpoints
export const FIELDS_API = `${BASE_URL}/fields`;
export const FIELDS_PAGINATED_API = `${BASE_URL}/fields/paginated`;
export const FIELD_BY_ID_API = (id: string) => `${BASE_URL}/fields/${id}`;

// Field owner-specific endpoints now live under /field-owner
const FIELD_OWNER_FIELDS_BASE = `${BASE_URL}/field-owner/fields`;
export const CREATE_FIELD_API = FIELD_OWNER_FIELDS_BASE;
export const CREATE_FIELD_WITH_IMAGES_API = `${FIELD_OWNER_FIELDS_BASE}/with-images`;
export const GENERATE_FIELD_AI_API = `${BASE_URL}/fields/ai/generate`;
export const UPDATE_FIELD_API = (id: string) => `${FIELD_OWNER_FIELDS_BASE}/${id}`;
export const UPDATE_FIELD_WITH_IMAGES_API = (id: string) => `${FIELD_OWNER_FIELDS_BASE}/${id}/with-images`; // PATCH
export const DELETE_FIELD_API = (id: string) => `${FIELD_OWNER_FIELDS_BASE}/${id}`;

// Availability endpoints (Pure Lazy Creation)
export const FIELD_AVAILABILITY_API = (id: string) => `${BASE_URL}/fields/${id}/availability`;
// Public courts listing for user booking flow (owner/admin CRUD uses auth route)
export const FIELD_COURTS_API = (id: string) => `${BASE_URL}/public/fields/${id}/courts`;

// Price scheduling endpoints
export const SCHEDULE_PRICE_UPDATE_API = (id: string) => `${FIELD_OWNER_FIELDS_BASE}/${id}/schedule-price-update`;
export const CANCEL_SCHEDULED_PRICE_UPDATE_API = (id: string) => `${FIELD_OWNER_FIELDS_BASE}/${id}/scheduled-price-update`;
export const GET_SCHEDULED_PRICE_UPDATES_API = (id: string) => `${FIELD_OWNER_FIELDS_BASE}/${id}/scheduled-price-updates`;

// Field amenities endpoints
export const GET_FIELD_AMENITIES_API = (fieldId: string) => `${BASE_URL}/fields/${fieldId}/amenities`;
export const UPDATE_FIELD_AMENITIES_API = (fieldId: string) => `${FIELD_OWNER_FIELDS_BASE}/${fieldId}/amenities`;

// Location-based endpoints
export const GET_NEARBY_FIELDS_API = (
    lat: number,
    lng: number,
    radius?: number,
    limit?: number,
    sportType?: 'football' | 'tennis' | 'badminton' | 'pickleball' | 'basketball' | 'volleyball' | 'swimming' | 'gym'
) => {
    const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        ...(radius ? { radius: radius.toString() } : {}),
        ...(limit ? { limit: limit.toString() } : {}),
        ...(sportType ? { sportType } : {})
    } as Record<string, string>);
    return `${BASE_URL}/fields/nearby?${params.toString()}`;
};

export const GET_FIELDS_BY_LOCATION_API = (location: string) => `${BASE_URL}/fields?location=${encodeURIComponent(location)}`;

// Field owner endpoints
export const GET_MY_FIELDS_API = `${BASE_URL}/field-owner/fields`;
export const GET_MY_FIELDS_BOOKINGS_API = `${BASE_URL}/field-owner/bookings/by-type`; // Use new endpoint with type filtering

// Field owner note-approval endpoints
export const OWNER_BOOKING_DETAIL_API = (bookingId: string) => `${BASE_URL}/owners/bookings/${bookingId}`;
export const OWNER_ACCEPT_NOTE_API = (bookingId: string) => `${BASE_URL}/owners/bookings/${bookingId}/note/accept`;
export const OWNER_DENY_NOTE_API = (bookingId: string) => `${BASE_URL}/owners/bookings/${bookingId}/note/deny`;
export const OWNER_NOTE_BOOKINGS_API = `${BASE_URL}/owners/bookings/notes`;

// Field owner booking accept/reject endpoints
export const OWNER_ACCEPT_BOOKING_API = (bookingId: string) => `${BASE_URL}/owners/bookings/${bookingId}/accept`;
export const OWNER_REJECT_BOOKING_API = (bookingId: string) => `${BASE_URL}/owners/bookings/${bookingId}/reject`;