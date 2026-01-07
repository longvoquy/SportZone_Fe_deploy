import { useEffect, useState } from 'react'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface CheckInSuccessAnimationProps {
    customerName?: string
    fieldName?: string
    onComplete?: () => void
    className?: string
}

export function CheckInSuccessAnimation({
    customerName,
    fieldName,
    onComplete,
    className = ''
}: CheckInSuccessAnimationProps) {
    const [show, setShow] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setShow(false)
            onComplete?.()
        }, 3000) // Auto-hide after 3 seconds

        return () => clearTimeout(timer)
    }, [onComplete])

    if (!show) return null

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${className}`}>
            <Card className="max-w-md w-full mx-4 border-4 border-green-500 shadow-2xl animate-in zoom-in duration-300">
                <CardContent className="p-8">
                    <div className="text-center space-y-6">
                        {/* Success Icon */}
                        <div className="relative inline-block">
                            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center animate-bounce">
                                <CheckCircle2 className="w-16 h-16 text-white" strokeWidth={3} />
                            </div>

                            {/* Sparkles */}
                            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
                            <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-yellow-400 animate-pulse delay-100" />
                            <Sparkles className="absolute top-0 -left-4 w-6 h-6 text-yellow-400 animate-pulse delay-200" />
                        </div>

                        {/* Success Text */}
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold text-green-600">
                                ✅ Check-in thành công!
                            </h2>
                            {customerName && (
                                <p className="text-lg text-gray-700">
                                    Chào mừng <strong>{customerName}</strong>
                                </p>
                            )}
                            {fieldName && (
                                <p className="text-sm text-gray-600">
                                    đến với {fieldName}
                                </p>
                            )}
                        </div>

                        {/* Additional Info */}
                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                            <p className="text-sm font-medium text-green-800">
                                🎉 Chúc bạn có trận đấu vui vẻ!
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                                Tiền đã được chuyển vào ví khả dụng
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-400 to-green-600 animate-progress"
                                style={{
                                    animation: 'progress 3s linear forwards'
                                }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <style>{`
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
        </div>
    )
}
