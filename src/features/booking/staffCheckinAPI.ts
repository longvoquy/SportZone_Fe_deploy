import axios from 'axios'
import { BASE_URL } from '../../utils/constant-value/constant'

/**
 * Staff QR Check-in API
 * Used by staff/admin/field-owner to confirm check-in
 */
export const staffCheckinAPI = {
    /**
     * Confirm check-in with QR token
     * Requires staff/admin/fieldOwner role
     */
    confirmCheckIn: async (bookingId: string, token: string) => {
        const accessToken = localStorage.getItem('accessToken')
        const response = await axios.post(
            `${BASE_URL}/bookings/${bookingId}/check-in`,
            { token },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        )
        return response.data
    },

    /**
     * Get booking details by ID (for preview before check-in)
     */
    getBookingDetails: async (bookingId: string) => {
        const accessToken = localStorage.getItem('accessToken')
        const response = await axios.get(
            `${BASE_URL}/bookings/${bookingId}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        )
        return response.data
    },
}

// Export types
export interface CheckInConfirmResponse {
    success: boolean
    booking: any
    walletTransaction: {
        pendingBalance: number
        availableBalance: number
    }
    checkedInAt: string
}
