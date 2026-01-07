import { CheckInQRDisplay } from './check-in-qr-display'
import { qrCheckinAPI } from '@/features/booking/qrCheckinAPI'

interface BookingCheckInSectionProps {
    bookingId: string
    startTime: Date
    status: string
    className?: string
}

export function BookingCheckInSection({
    bookingId,
    startTime,
    status,
    className = ''
}: BookingCheckInSectionProps) {
    // Only show for confirmed bookings
    if (status.toLowerCase() !== 'confirmed') {
        return null
    }

    const handleGenerateQR = async () => {
        try {
            const response = await qrCheckinAPI.generateQR(bookingId)
            return {
                token: response.token,
                expiresAt: response.expiresAt,
            }
        } catch (error: any) {
            // Handle different error types
            if (error.response?.status === 403) {
                throw new Error(error.response?.data?.message || 'Chưa đến giờ nhận sân')
            }
            if (error.response?.status === 400) {
                throw new Error(error.response?.data?.message || 'Booking không hợp lệ')
            }
            throw new Error('Không thể tạo mã QR. Vui lòng thử lại.')
        }
    }

    return (
        <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-lg font-semibold text-gray-900">🎫 Check-in QR Code</h3>
                <p className="text-sm text-gray-600 mt-1">
                    Tạo mã để check-in tại sân
                </p>
            </div>
            <div className="p-4">
                <CheckInQRDisplay
                    bookingId={bookingId}
                    startTime={startTime}
                    onGenerateQR={handleGenerateQR}
                />
            </div>
        </div>
    )
}
