"use client"

import type React from "react"
import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Calendar, MapPin, User, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useLocation } from "react-router-dom"
import { useAppSelector } from "@/store/hook"
import type { Field } from "@/types/field-type"
import logger from "@/utils/logger"

/**
 * Interface for amenity item
 */
interface Amenity {
    _id: string
    name: string
    price: number
}

/**
 * Interface for booking form data
 */
interface BookingFormData {
    date: string
    startTime: string
    endTime: string
    courtId?: string
    courtName?: string
    name?: string
    email?: string
    phone?: string
}

/**
 * Props for ConfirmMultiple component
 */
interface ConfirmMultipleProps {
    venue?: Field
    bookingData?: BookingFormData
    onSubmit?: (formData: BookingFormData) => void
    onBack?: () => void
    courts?: Array<{ _id: string; name: string; courtNumber?: number }>
    amenities?: Amenity[]
    selectedAmenityIds?: string[]
    /**
     * Number of booking days
     */
    numberOfDays: number
    /**
     * Booking type: consecutive or weekly
     */
    bookingType?: 'consecutive' | 'weekly'
    /**
     * AI Booking payload with validation result
     */
    aiBookingPayload?: any
}

// Helper function for formatting VND
const formatVND = (value: number): string => {
    try {
        return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value)
    } catch {
        return `${value.toLocaleString("vi-VN")} d`
    }
}

/**
 * ConfirmMultiple component - Displays booking confirmation for multiple bookings
 */
export const ConfirmMultiple: React.FC<ConfirmMultipleProps> = ({
    venue: venueProp,
    bookingData,
    onSubmit,
    onBack,
    courts = [],
    amenities = [],
    selectedAmenityIds = [],
    numberOfDays = 1,
    bookingType = 'consecutive',
    aiBookingPayload,
}) => {
    // Centralized note handling
    const [note, setNote] = useState<string>("")
    useEffect(() => {
        try {
            const existing = sessionStorage.getItem("amenitiesNote")
            if (existing) setNote(existing)
        } catch {
            // ignore
        }
    }, [])
    useEffect(() => {
        try {
            const trimmed = note.trim()
            if (trimmed) sessionStorage.setItem("amenitiesNote", trimmed)
            else sessionStorage.removeItem("amenitiesNote")
        } catch {
            // ignore
        }
    }, [note])

    const location = useLocation()
    const currentField = useAppSelector((state) => state.field.currentField)
    const venue = (venueProp || currentField || (location.state as any)?.venue) as Field | undefined

    // Use booking data from props or initialize with empty values
    const formData: BookingFormData = {
        date: bookingData?.date || "",
        startTime: bookingData?.startTime || "",
        endTime: bookingData?.endTime || "",
        courtId: bookingData?.courtId || "",
        courtName: bookingData?.courtName || "",
        name: bookingData?.name || "",
        email: bookingData?.email || "",
        phone: bookingData?.phone || "",
    }

    // Get dates from aiBookingPayload
    const bookingDates = useMemo(() => {
        // Check in summary.dates (from validation result)
        if (aiBookingPayload?.summary?.dates) {
            return aiBookingPayload.summary.dates as string[]
        }
        if (aiBookingPayload?.validationResult?.dates) {
            return aiBookingPayload.validationResult.dates as string[]
        }
        if (aiBookingPayload?.dates) {
            return aiBookingPayload.dates as string[]
        }
        return []
    }, [aiBookingPayload])

    // Helper functions for formatting
    const formatDate = (dateString: string): string => {
        if (!dateString) return ""
        const date = new Date(dateString)
        return date.toLocaleDateString("vi-VN", {
            weekday: "short",
            month: "short",
            day: "numeric",
        })
    }

    const formatTime = (timeString: string): string => {
        if (!timeString) return ""
        const [hours, minutes] = timeString.split(":")
        return `${hours}:${minutes}`
    }

    // Helper functions for pricing calculation
    const toMinutes = (t: string): number => {
        const [hh = '00', mm = '00'] = (t || '00:00').split(':')
        return Number(hh) * 60 + Number(mm)
    }

    const minutesToTimeString = (minutes: number): string => {
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    const getDayName = (date: Date): string => {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        return dayNames[date.getDay()]
    }

    const getMultiplierFor = (day: string, timeHHmm: string): number => {
        const ranges = (venue?.priceRanges || []).filter(r => r.day === day)
        if (ranges.length === 0) return 1.0
        const t = toMinutes(timeHHmm)
        const match = ranges.find(r => t >= toMinutes(r.start) && t < toMinutes(r.end))
        return match?.multiplier ?? 1.0
    }

    // Calculate hours per session
    const calculateHoursPerSession = (): number => {
        if (!formData.startTime || !formData.endTime) return 0
        const start = new Date(`1970-01-01T${formData.startTime}:00`)
        const end = new Date(`1970-01-01T${formData.endTime}:00`)
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    }

    // Calculate cage total for ONE day (with multiplier and slot-based calculation)
    const calculateCagePerDay = (): number => {
        if (!venue || !formData.startTime || !formData.endTime) return 0
        if (!venue.basePrice || venue.basePrice <= 0) return 0

        try {
            const startTotal = toMinutes(formData.startTime)
            const endTotal = toMinutes(formData.endTime)
            if (endTotal <= startTotal) return 0

            const slotDuration = venue.slotDuration || 60
            let dayPrice = 0

            // Use first booking date to get day name for multiplier
            // If we have bookingDates, use the first one; otherwise use a default date
            let sampleDate: Date
            if (bookingDates.length > 0) {
                sampleDate = new Date(bookingDates[0] + 'T00:00:00')
            } else if (formData.date) {
                sampleDate = new Date(formData.date + 'T00:00:00')
            } else {
                // Fallback: use today
                sampleDate = new Date()
            }

            const dayName = getDayName(sampleDate)

            // Calculate price for this day's time slot (same logic as ConsecutiveBookingTab)
            for (let currentMinutes = startTotal; currentMinutes < endTotal; currentMinutes += slotDuration) {
                const slotStartTime = minutesToTimeString(currentMinutes)
                const mult = getMultiplierFor(dayName, slotStartTime)
                // Price per slot = (slotDuration / 60) * basePrice * multiplier
                const slotPrice = (slotDuration / 60) * venue.basePrice * mult
                dayPrice += slotPrice
            }

            return Math.round(dayPrice)
        } catch (error) {
            logger.error('Error calculating cage per day:', error)
            // Fallback to simple calculation
            return Math.round((venue.basePrice || 0) * calculateHoursPerSession())
        }
    }

    // Calculate amenities total for ONE day
    const calculateAmenitiesPerDay = (): number => {
        return amenities
            .filter((amenity) => selectedAmenityIds.includes(amenity._id))
            .reduce((total, amenity) => total + amenity.price, 0)
    }

    // Calculate subtotal per day
    const calculateSubtotalPerDay = (): number => {
        return calculateCagePerDay() + calculateAmenitiesPerDay()
    }

    // Calculate total subtotal (all days) - with accurate calculation for all dates
    // Accounts for skipDates and dateOverrides from conflict resolution
    const calculateTotalSubtotal = (): number => {
        if (!venue || !formData.startTime || !formData.endTime) return 0
        if (!venue.basePrice || venue.basePrice <= 0) return 0

        // Get skipDates and dateOverrides from aiBookingPayload
        const skipDates: string[] = aiBookingPayload?.skipDates || []
        const dateOverrides: Record<string, { startTime?: string; endTime?: string; courtId?: string }> =
            aiBookingPayload?.dateOverrides || {}

        // If we have bookingDates, calculate accurately for each date
        if (bookingDates.length > 0) {
            try {
                const slotDuration = venue.slotDuration || 60
                let totalPrice = 0

                // Calculate price for each booking date with its own multiplier
                bookingDates.forEach(dateStr => {
                    // Skip dates that are in skipDates
                    const normalizedDate = dateStr.split('T')[0]
                    if (skipDates.includes(normalizedDate)) {
                        return // Skip this date
                    }

                    const date = new Date(dateStr + 'T00:00:00')
                    const dayName = getDayName(date)

                    // Get effective times for this date (from override or default)
                    const override = dateOverrides[normalizedDate]
                    const effectiveStartTime = override?.startTime || formData.startTime
                    const effectiveEndTime = override?.endTime || formData.endTime

                    const startTotal = toMinutes(effectiveStartTime)
                    const endTotal = toMinutes(effectiveEndTime)
                    if (endTotal <= startTotal) return

                    // Calculate price for this day's time slot
                    let dayPrice = 0
                    for (let currentMinutes = startTotal; currentMinutes < endTotal; currentMinutes += slotDuration) {
                        const slotStartTime = minutesToTimeString(currentMinutes)
                        const mult = getMultiplierFor(dayName, slotStartTime)
                        // Price per slot = (slotDuration / 60) * basePrice * multiplier
                        const slotPrice = (slotDuration / 60) * venue.basePrice * mult
                        dayPrice += slotPrice
                    }

                    totalPrice += dayPrice
                })

                // Count actual booked days (excluding skipped)
                const actualBookedDays = bookingDates.filter(d => !skipDates.includes(d.split('T')[0])).length

                // Add amenities cost (per day * number of actual booked days)
                const amenitiesTotal = calculateAmenitiesPerDay() * actualBookedDays

                return Math.round(totalPrice + amenitiesTotal)
            } catch (error) {
                logger.error('[CONFIRM MULTIPLE] Error calculating total subtotal:', error)
                // Fallback to simple calculation
                return calculateSubtotalPerDay() * numberOfDays
            }
        }

        // Fallback: use simple calculation if no bookingDates
        return calculateSubtotalPerDay() * numberOfDays
    }

    // Calculate system fee (5% of total)
    const calculateSystemFee = (): number => {
        return Math.round(calculateTotalSubtotal() * 0.05)
    }

    // Calculate grand total
    const calculateGrandTotal = (): number => {
        return calculateTotalSubtotal() + calculateSystemFee()
    }

    // Calculate actual number of booked days (excluding skipDates)
    const getActualBookedDays = (): number => {
        const skipDates: string[] = aiBookingPayload?.skipDates || []
        if (bookingDates.length > 0) {
            return bookingDates.filter(d => !skipDates.includes(d.split('T')[0])).length
        }
        return numberOfDays - skipDates.length
    }
    const actualBookedDays = getActualBookedDays()

    // Get discount info from validation summary
    const discountInfo = aiBookingPayload?.summary?.discount



    const getCourtName = (): string => {
        const court = courts.find(c => c._id === formData.courtId)
        return court?.name || formData.courtName || "Chưa chọn sân con"
    }

    const getSelectedAmenities = (): Amenity[] => {
        return amenities.filter((amenity) => selectedAmenityIds.includes(amenity._id))
    }

    const handleSubmit = () => {
        if (onSubmit) {
            onSubmit(formData)
        }
    }

    if (!venue) {
        return (
            <div className="w-full max-w-[1320px] mx-auto px-3 py-10">
                <Card className="border border-gray-200">
                    <CardContent className="p-6">
                        <p className="text-base text-[#6b7280]">Chưa chọn sân. Vui lòng chọn sân trước.</p>
                        <div className="pt-4">
                            <Button variant="outline" onClick={onBack}>
                                Quay lai
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="w-full max-w-[1320px] mx-auto px-3 flex flex-col gap-6">
            {/* Header Card */}
            <Card className="border border-gray-200 bg-gradient-to-r from-emerald-50 to-blue-50">
                <CardContent className="py-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                            Xác nhận đặt sân {bookingType === 'consecutive' ? 'liên tiếp' : 'hàng tuần'}
                        </h1>
                        <p className="text-base font-normal text-gray-600">
                            Vui lòng kiểm tra lại thông tin trước khi tiếp tục thanh toán.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Booking Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Booking Summary Card */}
                    <Card className="border border-gray-200">
                        <CardHeader className="border-b border-gray-200 bg-gray-50">
                            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-emerald-600" />
                                Thông tin đặt sân
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Tên sân</h4>
                                    <p className="text-sm font-medium text-gray-900">{venue.name || "Chưa cập nhật"}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Sân con</h4>
                                    <p className="text-sm font-medium text-gray-900">{getCourtName()}</p>
                                </div>
                                <div className="col-span-2">
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Loại đặt sân</h4>
                                    <p className="text-sm font-semibold text-emerald-600">
                                        {bookingType === 'consecutive' ? 'Đặt liên tiếp' : 'Đặt hàng tuần'} - {actualBookedDays} buổi
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Schedule Details Table */}
                    {bookingDates.length > 0 && (
                        <Card className="border border-gray-200">
                            <CardHeader className="border-b border-gray-200 bg-blue-50">
                                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    Chi tiết lịch đặt ({actualBookedDays} ngày)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                            <TableHead className="w-[50px] text-center">#</TableHead>
                                            <TableHead>Ngày</TableHead>
                                            <TableHead className="text-center">Giờ bắt đầu</TableHead>
                                            <TableHead className="text-center">Giờ kết thúc</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bookingDates
                                            .filter(dateStr => {
                                                const skipDates = aiBookingPayload?.skipDates || []
                                                return !skipDates.includes(dateStr.split('T')[0])
                                            })
                                            .map((dateStr, idx) => {
                                                const normalizedDate = dateStr.split('T')[0]
                                                const dateOverrides = aiBookingPayload?.dateOverrides || {}
                                                const override = dateOverrides[normalizedDate]

                                                // Determine effective times
                                                const startTime = override?.startTime || formData.startTime
                                                const endTime = override?.endTime || formData.endTime
                                                const isChanged = (override?.startTime && override.startTime !== formData.startTime) ||
                                                    (override?.endTime && override.endTime !== formData.endTime)

                                                return (
                                                    <TableRow key={idx} className="hover:bg-blue-50/30">
                                                        <TableCell className="font-medium text-center text-gray-500">
                                                            {idx + 1}
                                                        </TableCell>
                                                        <TableCell className="font-medium text-gray-900">
                                                            {formatDate(dateStr)}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <span className={isChanged ? "text-orange-600 font-medium" : "text-gray-700"}>
                                                                    {formatTime(startTime)}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <span className={isChanged ? "text-orange-600 font-medium" : "text-gray-700"}>
                                                                    {formatTime(endTime)}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Venue Contact Card */}
                    <Card className="border border-gray-200">
                        <CardHeader className="border-b border-gray-200 bg-gray-50">
                            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <User className="w-5 h-5 text-gray-600" />
                                Thông tin liên hệ
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Chủ sân</h4>
                                    <p className="text-sm font-medium text-gray-900">
                                        {(venue as any)?.ownerName || venue?.owner?.name || "Chưa cập nhật"}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Số điện thoại</h4>
                                    <p className="text-sm font-medium text-gray-900">
                                        {(venue as any)?.ownerPhone || venue?.owner?.contact || "Chưa cập nhật"}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Địa chỉ
                                    </h4>
                                    <p className="text-sm font-medium text-gray-900">
                                        {typeof (venue as any)?.location === "string"
                                            ? (venue as any)?.location
                                            : (venue as any)?.location?.address || "Chưa cập nhật"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Selected Amenities */}
                    {getSelectedAmenities().length > 0 && (
                        <Card className="border border-gray-200">
                            <CardHeader className="border-b border-gray-200 bg-gray-50">
                                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-purple-600" />
                                    Tiện ích đã chọn
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {getSelectedAmenities().map((amenity) => (
                                        <div
                                            key={amenity._id}
                                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                                        >
                                            <p className="text-sm font-medium text-gray-900">{amenity.name}</p>
                                            <p className="text-sm font-semibold text-emerald-600">{formatVND(amenity.price)}/buoi</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Phí tiện ích/buổi:</span>
                                        <span className="font-medium">{formatVND(calculateAmenitiesPerDay())}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mt-1">
                                        <span className="text-gray-600">Tổng ({actualBookedDays} buổi):</span>
                                        <span className="font-bold text-emerald-600">{formatVND(calculateAmenitiesPerDay() * actualBookedDays)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Note Section */}
                    <Card className="border border-gray-200">
                        <CardHeader className="border-b border-gray-200 bg-gray-50">
                            <CardTitle className="text-lg font-semibold text-gray-900">Ghi chú (tùy chọn)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-3">
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Nhập ghi chú cho đặt sân (nếu có)"
                                    className="w-full min-h-[96px] border border-gray-300 rounded-md p-3 outline-none focus:ring-2 focus:ring-emerald-600"
                                />
                                {note.trim() && (
                                    <div className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                        Lưu ý: Đơn đặt có ghi chú sẽ cần chủ sân xác nhận trước khi thanh toán.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Payment Summary */}
                <div className="lg:col-span-1">
                    <Card className="border border-gray-200 sticky top-24">
                        <CardHeader className="border-b border-gray-200 bg-emerald-50">
                            <CardTitle className="text-lg font-semibold text-gray-900">Tổng thanh toán</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {/* Per day breakdown */}
                            <div className="space-y-2 pb-4 border-b border-dashed">
                                <h4 className="text-sm font-semibold text-gray-700">Chi phí mỗi buổi:</h4>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Thuê sân ({calculateHoursPerSession()}h):</span>
                                    <span className="font-medium">{formatVND(calculateCagePerDay())}</span>
                                </div>
                                {calculateAmenitiesPerDay() > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Tiện ích:</span>
                                        <span className="font-medium">{formatVND(calculateAmenitiesPerDay())}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                                    <span className="text-gray-700">Tạm tính/buổi:</span>
                                    <span className="text-emerald-600">{formatVND(calculateSubtotalPerDay())}</span>
                                </div>
                            </div>

                            {/* Total calculation */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Số buổi:</span>
                                    <span className="font-semibold">{actualBookedDays} buổi</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Tạm tính:</span>
                                    <span className="font-medium">{formatVND(calculateTotalSubtotal())}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Phí dịch vụ (5%):</span>
                                    <span className="font-medium">{formatVND(calculateSystemFee())}</span>
                                </div>
                            </div>

                            {/* Discount Section */}
                            {discountInfo && (discountInfo.rate > 0 || discountInfo.amount > 0) && (
                                <div className="space-y-2 pt-2 border-t border-dashed">
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Giảm giá ({discountInfo.rate > 0 ? `${discountInfo.rate}%` : 'Voucher'}):</span>
                                        <span className="font-medium">
                                            -{formatVND(
                                                discountInfo.rate > 0
                                                    ? Math.round(calculateGrandTotal() * (discountInfo.rate / 100))
                                                    : discountInfo.amount
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Grand Total */}
                            <div className="pt-4 border-t border-dashed">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold text-gray-900">Tổng cộng:</span>
                                    <span className="text-2xl font-bold text-emerald-600">
                                        {formatVND(
                                            calculateGrandTotal() - (
                                                discountInfo?.rate > 0
                                                    ? Math.round(calculateGrandTotal() * (discountInfo.rate / 100))
                                                    : (discountInfo?.amount || 0)
                                            )
                                        )}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {discountInfo && (discountInfo.rate > 0 || discountInfo.amount > 0) ? (
                                        <>
                                            = {formatVND(calculateGrandTotal())} - {formatVND(
                                                discountInfo.rate > 0
                                                    ? Math.round(calculateGrandTotal() * (discountInfo.rate / 100))
                                                    : discountInfo.amount
                                            )} giảm giá
                                        </>
                                    ) : (
                                        <>
                                            = {formatVND(calculateSubtotalPerDay())} x {numberOfDays} buổi + {formatVND(calculateSystemFee())} phí dịch vụ
                                        </>
                                    )}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center items-center gap-5 py-5 bg-white/20 shadow-[0px_4px_44px_0px_rgba(211,211,211,0.25)]">
                <Button
                    variant="outline"
                    onClick={onBack}
                    className="px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay lai
                </Button>
                <Button onClick={handleSubmit} className="px-5 py-3 bg-gray-800 hover:bg-gray-900 text-white">
                    Tiếp tục thanh toán
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    )
}

export default ConfirmMultiple
