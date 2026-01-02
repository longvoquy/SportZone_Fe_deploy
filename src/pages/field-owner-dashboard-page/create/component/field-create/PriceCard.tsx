import { useState, memo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// removed local Select usage; InlineTimeSelect encapsulates Selects
import InlineTimeSelect from '@/components/ui/inline-time-select';
import { Button } from '@/components/ui/button';

interface PriceCardProps {
    formData: {
        basePrice: string | number;
        slotDuration: string | number;
        maxSlots: string | number;
    };
    onInputChange: (field: string, value: any) => void;
    onApplyDefaultHours: (start: string, end: string) => void;
}

export default memo(function PriceCard({ formData, onInputChange, onApplyDefaultHours }: PriceCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [defaultStart, setDefaultStart] = useState<string>('06:00');
    const [defaultEnd, setDefaultEnd] = useState<string>('22:00');

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };



    return (
        <Card className="bg-white shadow-md border-0">
            <CardHeader
                onClick={toggleExpanded}
                className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle>Giá cơ bản</CardTitle>
                        <span className="text-xl font-semibold text-gray-500">(VND)</span>
                    </div>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2.5">
                                <Label>Giá cơ bản (VND/giờ) <span className="text-red-600">*</span></Label>
                                <Input
                                    placeholder="Nhập giá cơ bản"
                                    type="text"
                                    value={formData.basePrice ? Number(formData.basePrice).toLocaleString('vi-VN') : ''}
                                    onChange={(e) => {
                                        const rawValue = e.target.value.replace(/[^\d]/g, '');
                                        onInputChange('basePrice', rawValue === '' ? '' : Number(rawValue));
                                    }}
                                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label>Số slot tối đa (tối đa 4)</Label>
                                <Input
                                    type="text"
                                    placeholder="4"
                                    value={formData.maxSlots || ''}
                                    onChange={(e) => {
                                        const rawValue = e.target.value.replace(/[^\d]/g, '');
                                        const numValue = rawValue === '' ? '' : Number(rawValue);
                                        // Giới hạn tối đa là 4
                                        if (numValue !== '' && Number(numValue) > 4) {
                                            onInputChange('maxSlots', 4);
                                        } else {
                                            onInputChange('maxSlots', numValue);
                                        }
                                    }}
                                    max={4}
                                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                        </div>

                        {/* Bulk apply default operating hours */}
                        <div className="flex flex-wrap items-end gap-4">
                            <InlineTimeSelect label="Giờ mở cửa mặc định" value={defaultStart} onChange={setDefaultStart} />
                            <InlineTimeSelect label="Giờ đóng cửa mặc định" value={defaultEnd} onChange={setDefaultEnd} />
                            <div className="flex items-end ml-auto">
                                <Button
                                    type="button"
                                    variant="default"
                                    onClick={() => onApplyDefaultHours(defaultStart, defaultEnd)}
                                    className="w-full h-10 rounded-md text-white"
                                >
                                    Áp dụng cho tất cả các ngày
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </>
            )}
        </Card>
    );
});
