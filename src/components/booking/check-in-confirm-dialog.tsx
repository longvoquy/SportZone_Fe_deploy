import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, User, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/utils/format-currency'

interface BookingInfo {
    _id: string
    field?: {
        name: string
        images?: string[]
    }
    date: string
    startTime: string
    endTime: string
    totalPrice: number
    user?: {
        fullName?: string
        email?: string
    }
    status: string
}

interface CheckInConfirmDialogProps {
    isOpen: boolean
    onClose: () => void
    booking: BookingInfo | null
    onConfirm: () => void
    isConfirming: boolean
}

export function CheckInConfirmDialog({
    isOpen,
    onClose,
    booking,
    onConfirm,
    isConfirming
}: CheckInConfirmDialogProps) {
    if (!booking) return null

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed':
                return 'bg-green-100 text-green-800'
            case 'checked_in':
                return 'bg-blue-100 text-blue-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <AlertCircle className="w-6 h-6 text-orange-600" />
                        Xác nhận Check-in
                    </DialogTitle>
                    <DialogDescription>
                        Kiểm tra thông tin booking trước khi xác nhận check-in
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Field Info */}
                    <div className="flex items-start gap-4 bg-gray-50 rounded-lg p-4">
                        {booking.field?.images?.[0] && (
                            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                    src={booking.field.images[0]}
                                    alt={booking.field.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900">
                                {booking.field?.name || 'Sân thể thao'}
                            </h3>
                            <Badge className={`mt-2 ${getStatusColor(booking.status)}`}>
                                {booking.status === 'confirmed' ? 'Đã xác nhận' : booking.status}
                            </Badge>
                        </div>
                    </div>

                    {/* Booking Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-600">Ngày đặt</p>
                                    <p className="font-medium text-gray-900">
                                        {formatDate(booking.date)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Clock className="w-5 h-5 text-purple-600 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-600">Thời gian</p>
                                    <p className="font-medium text-gray-900">
                                        {booking.startTime} - {booking.endTime}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {booking.user && (
                                <div className="flex items-start gap-3">
                                    <User className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-gray-600">Khách hàng</p>
                                        <p className="font-medium text-gray-900">
                                            {booking.user.fullName || booking.user.email}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-600">Tổng tiền</p>
                                    <p className="font-semibold text-lg text-green-600">
                                        {formatCurrency(booking.totalPrice)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-yellow-800">
                                Lưu ý quan trọng
                            </p>
                            <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                                <li>Kiểm tra giấy tờ tùy thân của khách hàng</li>
                                <li>Xác nhận booking đúng thời gian</li>
                                <li>Hành động này không thể hoàn tác</li>
                            </ul>
                        </div>
                    </div>

                    {/* Booking ID */}
                    <div className="text-xs text-gray-500 text-center font-mono">
                        Mã booking: {booking._id}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isConfirming}
                        className="flex-1"
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isConfirming}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isConfirming ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Đang xác nhận...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Xác nhận check-in
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
