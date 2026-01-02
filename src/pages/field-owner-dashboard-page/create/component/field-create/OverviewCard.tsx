import { useState, memo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface OverviewCardProps {
    formData: {
        description: string;
    };
    onInputChange: (field: string, value: any) => void;
}

export default memo(function OverviewCard({ formData, onInputChange }: OverviewCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);

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
                    <CardTitle>Tổng quan sân</CardTitle>
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
                        <div className="space-y-2.5">
                            <Label>Mô tả sân <span className="text-red-600">*</span></Label>
                            <Textarea
                                placeholder="Nhập mô tả chi tiết về sân"
                                className="min-h-[200px]"
                                value={formData.description}
                                onChange={(e) => onInputChange('description', e.target.value)}
                            />
                        </div>
                    </CardContent>
                </>
            )}
        </Card>
    );
});
