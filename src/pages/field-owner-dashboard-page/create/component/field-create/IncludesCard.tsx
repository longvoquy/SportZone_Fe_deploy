import { useState, useEffect, useMemo, memo } from 'react';
import { Loading } from '@/components/ui/loading';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useAppSelector } from '@/store/hook';
import { AmenityType } from '@/types/amenities-type';
import type { Amenity } from '@/types/amenities-type';
import type { AmenityWithPrice } from '@/types/amenity-with-price';

interface IncludesCardProps {
    selectedIncludes: AmenityWithPrice[]; // Array of amenities with prices
    onIncludesChange: (amenities: AmenityWithPrice[]) => void;
    sportType?: string; // To filter amenities by sport type
}

export default memo(function IncludesCard({ selectedIncludes, onIncludesChange, sportType }: IncludesCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const { amenities, loading } = useAppSelector((state) => state.amenities);

    // Helper function to get string ID from MongoDB ObjectId
    const getIdString = (id: any): string => {
        // API trả về _id là string, nên chỉ cần return trực tiếp
        return typeof id === 'string' ? id : String(id);
    };

    // Filter amenities by type FACILITY từ tất cả amenities của sportType
    const facilityAmenities = useMemo(() => {
        const amenitiesArray = (amenities as any)?.data || amenities;

        if (!amenitiesArray || !Array.isArray(amenitiesArray)) {
            return [];
        }

        return amenitiesArray.filter(amenity =>
            amenity.type === AmenityType.FACILITY &&
            amenity.isActive
        );
    }, [amenities]);


    // Clear selected includes only when sportType changes
    useEffect(() => {
        if (sportType) {
            onIncludesChange([]);
        }
    }, [sportType, onIncludesChange]);

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    const handleCheckboxChange = (amenityId: any, checked: boolean) => {
        const idString = getIdString(amenityId);
        if (checked) {
            // Add amenity with default price 0
            onIncludesChange([...selectedIncludes, { amenityId: idString, price: 0 }]);
        } else {
            // Remove amenity
            onIncludesChange(selectedIncludes.filter(item => item.amenityId !== idString));
        }
    };

    const handlePriceChange = (amenityId: string, price: string) => {
        const numericPrice = parseFloat(price) || 0;
        const updatedIncludes = selectedIncludes.map(item =>
            item.amenityId === amenityId
                ? { ...item, price: numericPrice }
                : item
        );
        onIncludesChange(updatedIncludes);
    };

    const isAmenitySelected = (amenityId: string) => {
        return selectedIncludes.some(item => item.amenityId === amenityId);
    };

    const getAmenityPrice = (amenityId: string) => {
        const amenity = selectedIncludes.find(item => item.amenityId === amenityId);
        return amenity ? amenity.price : 0;
    };

    return (
        // type FACILITY in includes
        <Card className="bg-white shadow-md border-0">
            <CardHeader
                onClick={toggleExpanded}
                className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            >
                <div className="flex items-center justify-between">
                    <CardTitle>Bao gồm</CardTitle>
                    <ChevronDown
                        className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'
                            }`}
                    />
                </div>
            </CardHeader>
            {isExpanded && (
                <>
                    <hr className="border-t border-gray-300 my-0 mx-6" />
                    <CardContent className="pt-6">
                        {!sportType ? (
                            <div className="text-center py-8">
                                <div className="text-gray-500 text-lg font-medium">
                                    Vui lòng chọn loại sân ở phần "Thông tin cơ bản" để xem các cơ sở vật chất có sẵn
                                </div>
                            </div>
                        ) : loading ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-2">
                                <Loading size={24} className="text-emerald-600" />
                                <div className="text-gray-500 text-sm">Đang tải cơ sở vật chất...</div>
                            </div>
                        ) : facilityAmenities.length === 0 ? (
                            <div className="text-center py-4">
                                <div className="text-gray-500">Không có cơ sở vật chất nào cho loại sân này</div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {facilityAmenities.map((amenity: Amenity) => {
                                    const amenityId = getIdString(amenity._id);
                                    const isChecked = isAmenitySelected(amenityId);
                                    const currentPrice = getAmenityPrice(amenityId);
                                    return (
                                        <div key={amenityId} className="border border-gray-200 rounded-lg p-4 h-full">
                                            <div className="flex items-center space-x-3">
                                                <Checkbox
                                                    id={amenityId}
                                                    checked={isChecked}
                                                    onCheckedChange={(c) => handleCheckboxChange(amenity._id, c as boolean)}
                                                    className="data-[state=checked]:bg-emerald-700"
                                                />
                                                <Label
                                                    htmlFor={amenityId}
                                                    className="text-gray-600 flex-1 cursor-pointer font-medium"
                                                >
                                                    {amenity.name}
                                                </Label>
                                            </div>
                                            {isChecked && (
                                                <div className="mt-3">
                                                    {/* <Label htmlFor={`price-${amenityId}`} className="text-sm text-gray-500 mb-1 block">
                                                    Giá tiền (VND)
                                                </Label> */}
                                                    <Input
                                                        id={`price-${amenityId}`}
                                                        type="text"
                                                        inputMode="numeric"
                                                        placeholder="Nhập giá tiền"
                                                        value={currentPrice ? Number(currentPrice).toLocaleString('vi-VN') : ''}
                                                        onChange={(e) => {
                                                            const rawValue = e.target.value.replace(/[^\d]/g, '');
                                                            handlePriceChange(amenityId, rawValue === '' ? '0' : rawValue);
                                                        }}
                                                        className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </>
            )}
        </Card>
    );
});
