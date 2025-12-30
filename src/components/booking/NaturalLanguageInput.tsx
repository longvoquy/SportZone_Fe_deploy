import React, { useState } from 'react';
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useDispatch } from 'react-redux';
import { parseBookingRequest } from '@/features/booking/bookingThunk';

interface ParsedData {
    type: 'consecutive' | 'weekly' | 'single';
    startDate?: string;
    endDate?: string;
    weekdays?: string[];
    numberOfWeeks?: number;
    startTime?: string;
    endTime?: string;
    confidence: number;
    clarificationNeeded?: string[];
    explanation?: string;
}

interface NaturalLanguageInputProps {
    fieldId: string; // Required to call API
    onParsed: (data: ParsedData) => void;
    onParseStart?: () => void;
    onParseError?: (error: string) => void;
}

export const NaturalLanguageInput: React.FC<NaturalLanguageInputProps> = ({
    fieldId,
    onParsed,
    onParseStart,
    onParseError,
}) => {
    const dispatch = useDispatch<any>();
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleParse = async () => {
        if (!query.trim()) {
            setError('Vui lòng nhập yêu cầu đặt sân');
            return;
        }

        setIsLoading(true);
        setError(null);
        setParsedData(null);
        onParseStart?.();

        try {
            // Call real Redux thunk
            const result = await dispatch(parseBookingRequest({ query, fieldId })).unwrap();

            setParsedData(result);
            onParsed(result);
        } catch (err: any) {
            const errorMsg = err.message || 'Không thể phân tích yêu cầu. Vui lòng thử lại.';
            setError(errorMsg);
            onParseError?.(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'text-green-600';
        if (confidence >= 0.6) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-4">
            {/* Input Area */}
            <div className="space-y-2.5">
                <Label className="text-base font-normal flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Mô tả yêu cầu đặt sân bằng ngôn ngữ tự nhiên
                </Label>
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder='Ví dụ: "Đặt sân từ thứ 2 đến thứ 6 tuần này, 9h-11h sáng" hoặc "Book every Monday and Wednesday for 4 weeks"'
                    className="w-full h-24 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
                    disabled={isLoading}
                />
            </div>

            {/* Parse Button */}
            <button
                type="button"
                onClick={handleParse}
                disabled={isLoading || !query.trim()}
                className={`
                    w-full px-4 py-3 rounded-md font-medium text-white transition-colors flex items-center justify-center gap-2
                    ${isLoading || !query.trim()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                    }
                `}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Đang phân tích với AI...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-5 h-5" />
                        Phân tích với AI
                    </>
                )}
            </button>

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-900">Lỗi phân tích</p>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Parsed Result Display */}
            {parsedData && (
                <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <p className="text-sm font-medium text-purple-900">AI đã hiểu yêu cầu của bạn</p>
                        </div>
                        <span className={`text-xs font-medium ${getConfidenceColor(parsedData.confidence)}`}>
                            {(parsedData.confidence * 100).toFixed(0)}% độ chính xác
                        </span>
                    </div>

                    {parsedData.explanation && (
                        <p className="text-sm text-purple-800 italic">
                            "{parsedData.explanation}"
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-gray-600">Loại:</span>
                            <span className="ml-2 font-medium text-gray-900">
                                {parsedData.type === 'consecutive' ? 'Nhiều ngày liên tục' :
                                    parsedData.type === 'weekly' ? 'Pattern hàng tuần' : 'Đặt đơn'}
                            </span>
                        </div>

                        {parsedData.startDate && (
                            <div>
                                <span className="text-gray-600">Từ ngày:</span>
                                <span className="ml-2 font-medium text-gray-900">{parsedData.startDate}</span>
                            </div>
                        )}

                        {parsedData.endDate && (
                            <div>
                                <span className="text-gray-600">Đến ngày:</span>
                                <span className="ml-2 font-medium text-gray-900">{parsedData.endDate}</span>
                            </div>
                        )}

                        {parsedData.startTime && (
                            <div>
                                <span className="text-gray-600">Giờ bắt đầu:</span>
                                <span className="ml-2 font-medium text-gray-900">{parsedData.startTime}</span>
                            </div>
                        )}

                        {parsedData.endTime && (
                            <div>
                                <span className="text-gray-600">Giờ kết thúc:</span>
                                <span className="ml-2 font-medium text-gray-900">{parsedData.endTime}</span>
                            </div>
                        )}

                        {parsedData.weekdays && parsedData.weekdays.length > 0 && (
                            <div className="col-span-2">
                                <span className="text-gray-600">Các ngày:</span>
                                <span className="ml-2 font-medium text-gray-900">
                                    {parsedData.weekdays.join(', ')}
                                </span>
                            </div>
                        )}

                        {parsedData.numberOfWeeks && (
                            <div>
                                <span className="text-gray-600">Số tuần:</span>
                                <span className="ml-2 font-medium text-gray-900">{parsedData.numberOfWeeks}</span>
                            </div>
                        )}
                    </div>

                    {parsedData.clarificationNeeded && parsedData.clarificationNeeded.length > 0 && (
                        <div className="pt-2 border-t border-purple-200">
                            <p className="text-xs font-medium text-amber-800 mb-1">⚠️ Cần làm rõ:</p>
                            <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">
                                {parsedData.clarificationNeeded.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Example Queries */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs font-medium text-gray-700 mb-2">💡 Ví dụ câu đặt sân:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                    <li>• "Đặt sân từ thứ 2 đến thứ 6 tuần này, 9h-11h sáng"</li>
                    <li>• "Book every Monday and Wednesday for 4 weeks"</li>
                    <li>• "Đặt sân cuối tuần trong 2 tuần tới, chiều 2h-4h"</li>
                </ul>
            </div>
        </div>
    );
};

export default NaturalLanguageInput;
