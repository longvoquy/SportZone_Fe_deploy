import React, { useMemo, useEffect } from 'react'
import type { Field } from '@/types/field-type'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, ArrowRight, Calendar, Package } from 'lucide-react'

// Helper function for formatting VND
const formatVND = (value: number): string => {
    try {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
    } catch {
        return `${value.toLocaleString('vi-VN')} d`
    }
}

interface AmenitiesMultipleProps {
    venue?: Field
    selectedAmenityIds?: string[]
    onChangeSelected?: (ids: string[]) => void
    onSubmit?: (ids: string[], note?: string) => void
    onBack?: () => void
    /**
     * Number of booking days (for calculating total amenities cost)
     */
    numberOfDays: number
    /**
     * Booking type for display
     */
    bookingType?: 'consecutive' | 'weekly'
}

export const AmenitiesMultiple: React.FC<AmenitiesMultipleProps> = ({
    venue,
    selectedAmenityIds = [],
    onChangeSelected,
    onSubmit,
    onBack,
    numberOfDays = 1,
    bookingType = 'consecutive',
}) => {

    // Normalize amenities: de-duplicate by amenityId (keep the lowest price)
    const amenities = useMemo(() => {
        const raw = (venue as any)?.amenities || []
        if (!Array.isArray(raw)) return []
        const byId = new Map<string, any>()
        for (const item of raw) {
            const id = item?.amenityId
            if (!id) continue
            const existing = byId.get(id)
            if (!existing || (typeof item?.price === 'number' && item.price < (existing?.price ?? Number.POSITIVE_INFINITY))) {
                byId.set(id, item)
            }
        }
        return Array.from(byId.values())
    }, [venue])

    const toggleAmenity = (amenityId: string) => {
        const set = new Set(selectedAmenityIds)
        if (set.has(amenityId)) set.delete(amenityId)
        else set.add(amenityId)
        onChangeSelected?.(Array.from(set))
    }

    // Calculate per-day amenity fee
    const amenityFeePerDay = useMemo(() => {
        return amenities
            .filter((a: any) => selectedAmenityIds.includes(a?.amenityId))
            .reduce((acc: number, cur: any) => acc + (cur?.price || 0), 0)
    }, [amenities, selectedAmenityIds])

    // Total amenity fee = per day × number of days
    const totalAmenityFee = useMemo(() => {
        return amenityFeePerDay * numberOfDays
    }, [amenityFeePerDay, numberOfDays])

    // Store selected amenity IDs in sessionStorage
    useEffect(() => {
        try {
            sessionStorage.setItem('selectedAmenityIds', JSON.stringify(selectedAmenityIds))
        } catch { }
    }, [selectedAmenityIds])

    return (
        <div className="w-full max-w-[1320px] mx-auto px-3 flex flex-col gap-10">
            {/* Main Content - left amenities list, right summary */}
            <div className="flex flex-wrap gap-6 mt-6">
                {/* Amenities List */}
                <div className="flex-1 min-w-[600px]">
                    <Card className="border border-gray-200">
                        <CardHeader className="border-b border-gray-200">
                            <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                                <Package className="w-6 h-6 text-emerald-600" />
                                Chọn tiện ích
                            </CardTitle>
                            <p className="text-sm text-gray-500 mt-1">
                                Tiện ích sẽ được áp dụng cho tất cả {numberOfDays} buổi đặt sân
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6 p-6">
                            {amenities.length === 0 ? (
                                <p className="text-sm text-gray-600">Sân này chưa có tiện ích.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {amenities.map((item: any) => {
                                        const id = item?.amenityId
                                        const checked = selectedAmenityIds.includes(id)
                                        return (
                                            <div key={id} className={`flex items-start gap-3 p-4 rounded-lg border bg-white transition-colors ${checked ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
                                                <Checkbox
                                                    id={`amenity-${id}`}
                                                    checked={checked}
                                                    onCheckedChange={() => toggleAmenity(id)}
                                                />
                                                <label htmlFor={`amenity-${id}`} className="flex-1 cursor-pointer">
                                                    <div className="font-medium text-gray-900">{item?.name || 'Tiện ích'}</div>
                                                    {item?.type && (
                                                        <div className="text-sm text-gray-600">{item.type}</div>
                                                    )}
                                                    <div className="text-sm text-emerald-600 font-semibold mt-1">
                                                        {formatVND(item?.price || 0)}/buoi
                                                    </div>
                                                </label>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                        </CardContent>
                    </Card>

                </div>

                {/* Summary Sidebar */}
                <div className="w-96">
                    <Card className="border border-gray-200 sticky top-24">
                        <CardHeader className="border-b border-gray-200 bg-blue-50">
                            <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                Tóm tắt ({bookingType === 'consecutive' ? 'Liên tiếp' : 'Hàng tuần'})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            {/* Number of days */}
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-gray-500">Số buổi đặt:</span>
                                <span className="font-semibold text-emerald-600">{numberOfDays} buổi</span>
                            </div>

                            {/* Selected amenities count */}
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-gray-500">Tiện ích đã chọn:</span>
                                <span className="font-medium">{selectedAmenityIds.length} tiện ích</span>
                            </div>

                            {/* Fee per day */}
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-gray-500">Phí tiện ích/buổi:</span>
                                <span className="font-medium">{formatVND(amenityFeePerDay)}</span>
                            </div>

                            {/* Total amenity fee */}
                            <div className="flex justify-between py-3 border-t border-dashed text-lg">
                                <span className="font-semibold">Tổng phí tiện ích:</span>
                                <span className="font-bold text-emerald-600">
                                    {formatVND(totalAmenityFee)}
                                </span>
                            </div>

                            {/* Calculation breakdown */}
                            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                                {formatVND(amenityFeePerDay)} x {numberOfDays} buổi = {formatVND(totalAmenityFee)}
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
                <Button
                    onClick={() => onSubmit?.(selectedAmenityIds)}
                    className="px-5 py-3 bg-gray-800 hover:bg-gray-900 text-white"
                >
                    Tiếp tục
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    )
}

export default AmenitiesMultiple
