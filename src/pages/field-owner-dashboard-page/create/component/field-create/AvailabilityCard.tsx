import { useState, memo } from 'react';
import { ChevronDown, Plus, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { PriceRange } from '@/types/field-type';
import InlineTimeSelect from '@/components/ui/inline-time-select';

interface AvailabilityCardProps {
    selectedDays: string[];
    dayAvailability: Record<string, boolean>;
    editingDay: string | null;
    formData: {
        operatingHours: Array<{
            day: string;
            start: string;
            end: string;
            duration: number;
        }>;
        priceRanges: PriceRange[];
    };
    availableDays: Array<{ value: string; label: string }>;
    availableMultipliers: Array<{ value: number; label: string }>;
    onToggleDay: (day: string) => void;
    onToggleDayAvailability: (day: string) => void;
    onEditDay: (day: string) => void;
    onOperatingHoursChange: (day: string, field: 'start' | 'end' | 'duration', value: string | number) => void;
    onPriceRangeChange: (index: number, field: keyof PriceRange, value: any) => void;
    onAddPriceRange: (day: string) => void;
    onRemovePriceRange: (index: number) => void;
    onApplyDaySettings: (sourceDay: string, targetDays: string[]) => void;
    onResetAvailability: () => void;
    onSaveAvailability: () => void;
}

export default memo(function AvailabilityCard({
    selectedDays,
    dayAvailability,
    editingDay,
    formData,
    availableDays,
    availableMultipliers,
    onToggleDay,
    onToggleDayAvailability,
    onEditDay,
    onOperatingHoursChange,
    onPriceRangeChange,
    onAddPriceRange,
    onRemovePriceRange,
    onApplyDaySettings,
    onResetAvailability,
    onSaveAvailability
}: AvailabilityCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    // Debug: Log priceRanges to console
    // console.log('AvailabilityCard - priceRanges:', formData.priceRanges);
    // console.log('AvailabilityCard - selectedDays:', selectedDays);

    return (
        <Card className="bg-white shadow-lg border-0">
            <CardHeader
                onClick={toggleExpanded}
                className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            >
                <div className="flex items-center justify-between">
                    <CardTitle>Lịch hoạt động</CardTitle>
                    <ChevronDown
                        className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'
                            }`}
                    />
                </div>
            </CardHeader>
            {isExpanded && (
                <>
                    <hr className="border-t border-gray-300 my-0 mx-6" />
                    <CardContent className="pt-6 space-y-6">
                        {/* Select Days */}
                        <div className="space-y-2.5">
                            <h3 className="text-lg font-medium text-start">Chọn ngày</h3>
                            <div className="flex flex-wrap gap-3">
                                {availableDays.map((day) => (
                                    <Button
                                        key={day.value}
                                        variant="secondaryOutline"
                                        onClick={() => onToggleDay(day.value)}
                                        className={`min-w-24 px-8 py-3.5 rounded-[5px] transition-colors ${selectedDays.includes(day.value)
                                            ? "border-emerald-600 text-emerald-600"
                                            : ""
                                            }`}
                                    >
                                        {day.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Day Availability Cards */}
                        <div className="space-y-4">
                            {selectedDays.map((day) => {
                                const dayInfo = availableDays.find(d => d.value === day);
                                return (
                                    <Card key={day} className="shadow-md border-0">
                                        <CardContent className="py-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => onToggleDayAvailability(day)}
                                                        className="cursor-pointer"
                                                    >
                                                        {dayAvailability[day] ? (
                                                            <ToggleRight className="w-6 h-6 text-emerald-600" />
                                                        ) : (
                                                            <ToggleLeft className="w-6 h-6 text-gray-400" />
                                                        )}
                                                    </button>
                                                    <h4 className="text-lg font-medium">{dayInfo?.label || day}</h4>
                                                </div>
                                                <Button
                                                    variant="link"
                                                    onClick={() => onEditDay(day)}
                                                    className="text-emerald-600 text-sm font-medium"
                                                >
                                                    Chỉnh sửa
                                                </Button>
                                            </div>

                                            {editingDay === day && (
                                                <div className="mt-6 space-y-6 pt-6 border-t">
                                                    <div className="flex justify-end">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                // Apply current day's settings to other selected days (excluding itself)
                                                                const targets = selectedDays.filter(d => d !== day);
                                                                onApplyDaySettings(day, targets);
                                                            }}
                                                            className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                                                        >
                                                            Áp dụng cho ngày khác
                                                        </Button>
                                                    </div>
                                                    {/* Operating Hours */}
                                                    <div className="space-y-4">
                                                        <Label className="text-base font-medium">Giờ hoạt động</Label>
                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg shadow-md">
                                                            <InlineTimeSelect
                                                                label="Giờ mở cửa"
                                                                value={formData.operatingHours.find(oh => oh.day === day)?.start || '06:00'}
                                                                onChange={(val) => onOperatingHoursChange(day, 'start', val)}
                                                                className="space-y-1.5"
                                                            />
                                                            <InlineTimeSelect
                                                                label="Giờ đóng cửa"
                                                                value={formData.operatingHours.find(oh => oh.day === day)?.end || '22:00'}
                                                                onChange={(val) => onOperatingHoursChange(day, 'end', val)}
                                                                className="space-y-1.5"
                                                            />
                                                            {/* <div className="space-y-2">
                                                    <Label>Thời lượng slot (phút)</Label>
                                                    <Input 
                                                        type="number"
                                                        value={formData.operatingHours.find(oh => oh.day === day)?.duration || 60}
                                                        onChange={(e) => onOperatingHoursChange(day, 'duration', Number(e.target.value))}
                                                    />
                                                </div> */}
                                                        </div>
                                                    </div>

                                                    {/* Price Ranges */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-base font-medium">Khung giờ giá</Label>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => onAddPriceRange(day)}
                                                                className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                                                            >
                                                                <Plus className="w-4 h-4 mr-1" />
                                                                Thêm khung giờ
                                                            </Button>
                                                        </div>

                                                        {formData.priceRanges.filter(range => range.day === day).length === 0 && (
                                                            <div className="text-center py-4 text-gray-500">
                                                                Chưa có khung giờ giá nào. Nhấn "Thêm khung giờ" để tạo.
                                                            </div>
                                                        )}
                                                        {formData.priceRanges.filter(range => range.day === day).map((range) => {
                                                            const globalIndex = formData.priceRanges.findIndex(r => r === range);
                                                            return (
                                                                <div key={globalIndex} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg shadow-md">
                                                                    <InlineTimeSelect
                                                                        label="Giờ bắt đầu"
                                                                        value={range.start}
                                                                        onChange={(val) => onPriceRangeChange(globalIndex, 'start', val)}
                                                                        className="space-y-1.5"
                                                                    />
                                                                    <InlineTimeSelect
                                                                        label="Giờ kết thúc"
                                                                        value={range.end}
                                                                        onChange={(val) => onPriceRangeChange(globalIndex, 'end', val)}
                                                                        className="space-y-1.5"
                                                                    />
                                                                    <div className="space-y-2">
                                                                        <Label>Hệ số giá</Label>
                                                                        <Select
                                                                            value={range.multiplier.toString()}
                                                                            onValueChange={(value) => onPriceRangeChange(globalIndex, 'multiplier', Number(value))}
                                                                        >
                                                                            <SelectTrigger>
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {availableMultipliers.map((multiplier) => (
                                                                                    <SelectItem key={multiplier.value} value={multiplier.value.toString()}>
                                                                                        {multiplier.label}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label>Thao tác</Label>
                                                                        <Button
                                                                            type="button"
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            onClick={() => onRemovePriceRange(globalIndex)}
                                                                            className="w-full h-9 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white border-red-600"
                                                                        >
                                                                            <X className="w-4 h-4 mr-1" />
                                                                            Xóa
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-5 pt-6">
                            <Button
                                variant="default"
                                onClick={onResetAvailability}
                                className="min-w-24 px-8 py-3.5 bg-emerald-700 text-white border-emerald-700 rounded-[10px]"
                            >
                                Thiết lập lại
                            </Button>
                            <Button
                                onClick={onSaveAvailability}
                                className="min-w-36 px-6 py-3.5 bg-gray-800 text-white rounded-[10px] hover:!bg-green-800"
                            >
                                Lưu thay đổi
                            </Button>
                        </div>
                    </CardContent>
                </>
            )}
        </Card>
    );
});
