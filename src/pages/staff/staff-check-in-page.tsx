"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QRScanner } from '@/components/booking/qr-scanner'
import { CheckInConfirmDialog } from '@/components/booking/check-in-confirm-dialog'
import { CheckInSuccessAnimation } from '@/components/booking/check-in-success-animation'
import { staffCheckinAPI } from '@/features/booking/staffCheckinAPI'
import { toast } from 'sonner'
import { NavbarDarkComponent } from '@/components/header/navbar-dark-component'
import { PageWrapper } from '@/components/layouts/page-wrapper'
import { CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import logger from '@/utils/logger'

export default function StaffCheckInPage() {
    const [scannedToken, setScannedToken] = useState<string | null>(null)
    const [bookingInfo, setBookingInfo] = useState<any>(null)
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
    const [isConfirming, setIsConfirming] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [stats, setStats] = useState({
        totalToday: 0,
        successToday: 0,
        lastCheckIn: null as string | null,
    })

    const extractBookingIdFromToken = (token: string): string | null => {
        try {
            // Decode JWT to get booking ID
            const payload = JSON.parse(atob(token.split('.')[1]))
            return payload.bookingId
        } catch (error) {
            logger.error('Failed to decode token:', error)
            return null
        }
    }

    const handleScanSuccess = async (decodedText: string) => {
        try {
            setScannedToken(decodedText)

            // Extract booking ID from token
            const bookingId = extractBookingIdFromToken(decodedText)
            if (!bookingId) {
                toast.error('Mã QR không hợp lệ')
                return
            }

            // Fetch booking details
            const booking = await staffCheckinAPI.getBookingDetails(bookingId)
            setBookingInfo(booking)
            setIsConfirmDialogOpen(true)
        } catch (error: any) {
            logger.error('Failed to fetch booking:', error)
            toast.error(error.response?.data?.message || 'Không thể lấy thông tin booking')
        }
    }

    const handleConfirmCheckIn = async () => {
        if (!scannedToken || !bookingInfo) return

        try {
            setIsConfirming(true)

            await staffCheckinAPI.confirmCheckIn(bookingInfo._id, scannedToken)

            // Update stats
            setStats(prev => ({
                ...prev,
                successToday: prev.successToday + 1,
                totalToday: prev.totalToday + 1,
                lastCheckIn: new Date().toISOString(),
            }))

            // Close dialog and show success
            setIsConfirmDialogOpen(false)
            setShowSuccess(true)

            toast.success('Check-in thành công!')
        } catch (error: any) {
            logger.error('Check-in failed:', error)
            toast.error(error.response?.data?.message || 'Check-in thất bại')
        } finally {
            setIsConfirming(false)
        }
    }

    const handleCloseDialog = () => {
        setIsConfirmDialogOpen(false)
        setScannedToken(null)
        setBookingInfo(null)
    }

    const handleSuccessComplete = () => {
        setShowSuccess(false)
        setScannedToken(null)
        setBookingInfo(null)
    }

    return (
        <>
            <NavbarDarkComponent />
            <PageWrapper className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="container mx-auto px-4 py-8 max-w-6xl">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            🎫 QR Check-in Station
                        </h1>
                        <p className="text-gray-600">
                            Quét mã QR của khách hàng để xác nhận check-in
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600">Hôm nay</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-1">
                                            {stats.totalToday}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600">Thành công</p>
                                        <p className="text-3xl font-bold text-green-600 mt-1">
                                            {stats.successToday}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600">Lần cuối</p>
                                        <p className="text-sm font-semibold text-gray-900 mt-1">
                                            {stats.lastCheckIn
                                                ? new Date(stats.lastCheckIn).toLocaleTimeString('vi-VN')
                                                : 'Chưa có'}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                        <Clock className="w-6 h-6 text-purple-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Scanner */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <QRScanner
                                onScanSuccess={handleScanSuccess}
                                isProcessing={isConfirming}
                            />
                        </div>

                        {/* Instructions Panel */}
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">📋 Hướng dẫn</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-600">
                                            1
                                        </div>
                                        <p className="text-sm text-gray-700">
                                            Khách hàng mở app và tạo mã QR check-in
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-600">
                                            2
                                        </div>
                                        <p className="text-sm text-gray-700">
                                            Nhấn "Bắt đầu quét" để mở camera
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-600">
                                            3
                                        </div>
                                        <p className="text-sm text-gray-700">
                                            Hướng camera vào mã QR của khách
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-600">
                                            4
                                        </div>
                                        <p className="text-sm text-gray-700">
                                            Xác nhận thông tin và hoàn tất check-in
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-yellow-50 border-yellow-200">
                                <CardContent className="p-4">
                                    <p className="text-sm font-medium text-yellow-800 mb-2">
                                        ⚠️ Lưu ý
                                    </p>
                                    <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                                        <li>Kiểm tra giấy tờ tùy thân</li>
                                        <li>Xác nhận đúng thời gian</li>
                                        <li>Mã QR chỉ có hiệu lực 10 phút</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Confirmation Dialog */}
                <CheckInConfirmDialog
                    isOpen={isConfirmDialogOpen}
                    onClose={handleCloseDialog}
                    booking={bookingInfo}
                    onConfirm={handleConfirmCheckIn}
                    isConfirming={isConfirming}
                />

                {/* Success Animation */}
                {showSuccess && (
                    <CheckInSuccessAnimation
                        customerName={bookingInfo?.user?.fullName}
                        fieldName={bookingInfo?.field?.name}
                        onComplete={handleSuccessComplete}
                    />
                )}
            </PageWrapper>
        </>
    )
}
