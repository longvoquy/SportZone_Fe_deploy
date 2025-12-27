"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLocation } from "react-router-dom"
import { useAppSelector } from "@/store/hook"
import type { Field } from "@/types/field-type"
import logger from "@/utils/logger"

/**
 * Interface for amenity item
 */
interface Amenity {
    id: string
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
 * Props for ConfirmCourtTab component
 */
interface ConfirmCourtTabProps {
    /**
     * Venue information to display
     */
    venue?: Field
    /**
     * Booking form data from previous step
     */
    bookingData?: BookingFormData
    /**
     * Callback when form is submitted
     */
    onSubmit?: (formData: BookingFormData) => void
    /**
     * Callback for back button
     */
    onBack?: () => void
    /**
     * Available courts list
     */
    courts?: Array<{ id: string; name: string; courtNumber?: number }>
    /**
     * Added amenities props
     */
    amenities?: Amenity[]
    selectedAmenityIds?: string[]
}

/**
 * ConfirmCourtTab component - Displays booking confirmation with venue details
 */
export const ConfirmCourtTab: React.FC<ConfirmCourtTabProps> = ({
    venue: venueProp,
    bookingData,
    onSubmit,
    onBack,
    courts = [],
    amenities = [],
    selectedAmenityIds = [],
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

    // Log field data usage in ConfirmCourt tab
    logger.debug("[CONFIRM COURT TAB] Field data loaded:", {
        hasVenueProp: !!venueProp,
        hasCurrentField: !!currentField,
        hasLocationState: !!(location.state as any)?.venue,
        finalVenue: venue
            ? {
                id: venue.id,
                name: venue.name,
                location: venue.location,
                basePrice: venue.basePrice,
                sportType: venue.sportType,
                owner: venue.owner,
            }
            : null,
        bookingData: bookingData
            ? {
                date: bookingData.date,
                startTime: bookingData.startTime,
                endTime: bookingData.endTime,
                courtId: bookingData.courtId,
                courtName: bookingData.courtName,
            }
            : null,
    })
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

    // Helper functions for formatting
    const formatDate = (dateString: string): string => {
        if (!dateString) return ""
        const date = new Date(dateString)
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
        })
    }

    const formatTime = (timeString: string): string => {
        if (!timeString) return ""
        const [hours, minutes] = timeString.split(":")
        const date = new Date()
        date.setHours(Number.parseInt(hours), Number.parseInt(minutes))
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
    }

    const calculateCageTotal = (): number => {
        if (!venue || !formData.startTime || !formData.endTime) return 0

        const start = new Date(`1970-01-01T${formData.startTime}:00`)
        const end = new Date(`1970-01-01T${formData.endTime}:00`)
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

        return venue.basePrice * hours
    }

    const calculateAmenitiesTotal = (): number => {
        return amenities
            .filter((amenity) => selectedAmenityIds.includes(amenity.id))
            .reduce((total, amenity) => total + amenity.price, 0)
    }

    const getCourtName = (): string => {
        const court = courts.find(c => c.id === formData.courtId)
        return court?.name || formData.courtName || "Chưa chọn sân con"
    }

    const calculateSubtotal = (): number => {
        return calculateCageTotal() + calculateAmenitiesTotal()
    }

    const calculateSystemFee = (): number => {
        if (!venue || !formData.startTime || !formData.endTime) return 0

        const baseAmount = calculateSubtotal()
        const systemFeeRate = 0.05 // 5% system fee
        const systemFee = Math.round(baseAmount * systemFeeRate)
        return systemFee > 0 ? systemFee : 0
    }

    const calculateTotal = (): number => {
        return calculateSubtotal() + calculateSystemFee()
    }

    const formatVND = (value: number): string => {
        try {
            return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value)
        } catch {
            return `${value.toLocaleString("vi-VN")} ₫`
        }
    }

    const getSelectedAmenities = (): Amenity[] => {
        return amenities.filter((amenity) => selectedAmenityIds.includes(amenity.id))
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
                        <p className="text-base text-[#6b7280]">No field selected. Please select a field to book.</p>
                        <div className="pt-4">
                            <Button variant="outline" onClick={onBack}>
                                Back
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }
    return (
        <div className="w-full max-w-[1320px] mx-auto px-3 flex flex-col gap-10">
            {/* Header Card */}
            <Card className="border border-gray-200">
                <CardContent className="">
                    <div className="">
                        <h1 className="text-2xl font-semibold text-center text-[#1a1a1a] mb-1">Xác nhận đặt sân</h1>
                        <p className="text-base font-normal text-center text-[#6b7280]">
                            Cảm ơn bạn đã đặt sân! Vui lòng kiểm tra lại thông tin trước khi tiếp tục.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="w-full max-w-[1320px] mx-auto px-3 py-8">
                <div className="space-y-8">
                    {/* Grid Layout - 3 columns for main information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Column 1: Booking Details */}
                        <Card className="border border-gray-200">
                            <CardHeader className="border-b border-gray-200 bg-gray-50 pb-3">
                                <CardTitle className="text-lg font-semibold text-gray-900">Chi tiết đặt sân</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div>
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Tên sân</h4>
                                    <p className="text-sm font-medium text-gray-900">{venue.name || "Chưa cập nhật"}</p>
                                </div>
                                <div className="border-t border-gray-100 pt-3">
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Sân con (court)</h4>
                                    <p className="text-sm font-medium text-gray-900">{getCourtName()}</p>
                                </div>
                                <div className="border-t border-gray-100 pt-3">
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Ngày</h4>
                                    <p className="text-sm font-medium text-gray-900">{formatDate(formData.date) || "Mon, Jul 11"}</p>
                                </div>
                                <div className="border-t border-gray-100 pt-3">
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Giờ bắt đầu</h4>
                                    <p className="text-sm font-medium text-gray-900">{formatTime(formData.startTime) || "05:25 AM"}</p>
                                </div>
                                <div className="border-t border-gray-100 pt-3">
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Giờ kết thúc</h4>
                                    <p className="text-sm font-medium text-gray-900">{formatTime(formData.endTime) || "06:25 AM"}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Column 2: Venue Contact Information */}
                        <Card className="border border-gray-200">
                            <CardHeader className="border-b border-gray-200 bg-gray-50 pb-3">
                                <CardTitle className="text-lg font-semibold text-gray-900">Thông tin liên hệ</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div>
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Chủ sân</h4>
                                    <p className="text-sm font-medium text-gray-900">
                                        {(venue as any)?.ownerName || venue?.owner?.name || "Chưa cập nhật"}
                                    </p>
                                </div>
                                <div className="border-t border-gray-100 pt-3">
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Số điện thoại</h4>
                                    <p className="text-sm font-medium text-gray-900">
                                        {(venue as any)?.ownerPhone || venue?.owner?.contact || "Chưa cập nhật"}
                                    </p>
                                </div>
                                <div className="border-t border-gray-100 pt-3">
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Địa chỉ</h4>
                                    <p className="text-sm font-medium text-gray-900">
                                        {typeof (venue as any)?.location === "string"
                                            ? (venue as any)?.location
                                            : (venue as any)?.location?.address || "Location not specified"}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Column 3: Payment Information */}
                        <Card className="border border-gray-200">
                            <CardHeader className="border-b border-gray-200 bg-gray-50 pb-3">
                                <CardTitle className="text-lg font-semibold text-gray-900">Thông tin thanh toán</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div>
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Đơn giá</h4>
                                    <p className="text-sm font-medium text-emerald-600">{formatVND(venue?.basePrice || 0)}/giờ</p>
                                </div>
                                <div className="border-t border-gray-100 pt-3">
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Thời lượng</h4>
                                    <p className="text-sm font-medium text-gray-900">
                                        {(() => {
                                            if (!formData.startTime || !formData.endTime) return "0 giờ"
                                            const start = new Date(`1970-01-01T${formData.startTime}:00`)
                                            const end = new Date(`1970-01-01T${formData.endTime}:00`)
                                            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                                            return hours > 0 ? `${hours} giờ` : "0 giờ"
                                        })()}
                                    </p>
                                </div>
                                {calculateSystemFee() > 0 && (
                                    <div className="border-t border-gray-100 pt-3">
                                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Phí dịch vụ (5%)</h4>
                                        <p className="text-sm font-medium text-gray-900">{formatVND(calculateSystemFee())}</p>
                                    </div>
                                )}
                                <div className="border-t border-gray-100 pt-3 bg-emerald-50 -mx-4 -mb-4 px-4 py-3 rounded-b">
                                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Tổng tiền</h4>
                                    <p className="text-lg font-bold text-emerald-600">{formatVND(calculateTotal())}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {getSelectedAmenities().length > 0 && (
                        <Card className="border border-gray-200">
                            <CardHeader className="border-b border-gray-200 bg-gray-50">
                                <CardTitle className="text-lg font-semibold text-gray-900">Tiện ích được chọn</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {getSelectedAmenities().map((amenity) => (
                                        <div
                                            key={amenity.id}
                                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{amenity.name}</p>
                                            </div>
                                            <p className="text-sm font-semibold text-emerald-600">{formatVND(amenity.price)}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                                    <p className="text-sm font-medium text-gray-600">Tổng phí tiện ích:</p>
                                    <p className="text-lg font-bold text-emerald-600">{formatVND(calculateAmenitiesTotal())}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Optional Note Section - Full width */}
                    <Card className="border border-gray-200">
                        <CardHeader className="border-b border-gray-200 bg-gray-50">
                            <CardTitle className="text-lg font-semibold text-gray-900">Ghi chú (tuỳ chọn)</CardTitle>
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
                                        Lưu ý: Đơn đặt có ghi chú sẽ cần chủ sân xác nhận trước khi thanh toán. Bạn sẽ nhận email khi được
                                        chấp nhận.
                                    </div>
                                )}
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
                    Quay lại
                </Button>
                <Button onClick={handleSubmit} className="px-5 py-3 bg-gray-800 hover:bg-gray-900 text-white">
                    Tiếp tục
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    )
}
