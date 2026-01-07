import axios from 'axios'
import { BASE_URL } from '../../utils/constant-value/constant'

// QR Check-in API endpoints
export const qrCheckinAPI = {
    /**
     * Generate QR code for check-in
     * Only available within time window (default: 15 minutes before match)
     */
    generateQR: async (bookingId: string) => {
        const token = localStorage.getItem('accessToken')
        const response = await axios.get(
            `${BASE_URL}/bookings/${bookingId}/check-in-qr`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        )
        return response.data
    },

    /**
     * Get check-in window information
     * Returns when QR generation becomes available
     */
    getCheckInWindow: async (bookingId: string) => {
        const token = localStorage.getItem('accessToken')
        const response = await axios.get(
            `${BASE_URL}/bookings/${bookingId}/check-in-window`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        )
        return response.data
    },
}

// Export types for TypeScript
export interface QRCheckInResponse {
    token: string
    expiresAt: string
    bookingId: string
    startTime: string
    fieldName?: string
}

export interface CheckInWindowResponse {
    windowStartsAt: string
    windowEndsAt: string
    windowDurationMinutes: number
    canGenerateNow: boolean
    timeUntilWindowMs: number
    bookingStartTime: string
    message?: string
}
