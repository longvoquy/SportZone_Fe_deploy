import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, CameraOff, XCircle, Loader2 } from 'lucide-react'

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void
    onScanError?: (error: string) => void
    isProcessing?: boolean
    className?: string
}

export function QRScanner({
    onScanSuccess,
    onScanError,
    isProcessing = false,
    className = ''
}: QRScannerProps) {
    const [isScanning, setIsScanning] = useState(false)
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [lastScan, setLastScan] = useState<string | null>(null)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const qrCodeRegionId = 'qr-reader-region'

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error)
            }
        }
    }, [])

    const startScanning = async () => {
        try {
            setCameraError(null)

            // Initialize scanner if not already done
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode(qrCodeRegionId)
            }

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            }

            await scannerRef.current.start(
                { facingMode: 'environment' }, // Use back camera
                config,
                (decodedText) => {
                    // Prevent duplicate scans
                    if (decodedText !== lastScan && !isProcessing) {
                        setLastScan(decodedText)
                        onScanSuccess(decodedText)
                    }
                },
                () => {
                    // Ignore scan errors (happens when no QR code in frame)
                }
            )

            setIsScanning(true)
        } catch (error: any) {
            const errorMsg = error.message || 'Không thể truy cập camera'
            setCameraError(errorMsg)
            onScanError?.(errorMsg)
        }
    }

    const stopScanning = async () => {
        try {
            if (scannerRef.current?.isScanning) {
                await scannerRef.current.stop()
                setIsScanning(false)
                setLastScan(null)
            }
        } catch (error) {
            console.error('Error stopping scanner:', error)
        }
    }

    return (
        <Card className={className}>
            <CardContent className="p-6">
                <div className="space-y-4">
                    {/* Scanner Status */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {isScanning ? '📸 Đang quét...' : '🎫 QR Scanner'}
                        </h3>
                        {isProcessing && (
                            <div className="flex items-center gap-2 text-blue-600">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm font-medium">Đang xác nhận...</span>
                            </div>
                        )}
                    </div>

                    {/* Camera View */}
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-square max-w-md mx-auto">
                        <div id={qrCodeRegionId} className="w-full h-full" />

                        {!isScanning && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90">
                                <div className="text-center space-y-4">
                                    <div className="w-20 h-20 mx-auto rounded-full bg-gray-800 flex items-center justify-center">
                                        <Camera className="w-10 h-10 text-gray-400" />
                                    </div>
                                    <p className="text-gray-300 text-sm">
                                        Nhấn bắt đầu để quét QR code
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {cameraError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-800">Lỗi camera</p>
                                <p className="text-sm text-red-700 mt-1">{cameraError}</p>
                                <p className="text-xs text-red-600 mt-2">
                                    Vui lòng cho phép truy cập camera trong cài đặt trình duyệt
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Control Buttons */}
                    <div className="flex gap-3">
                        {!isScanning ? (
                            <Button
                                onClick={startScanning}
                                disabled={isProcessing}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold"
                            >
                                <Camera className="w-5 h-5 mr-2" />
                                Bắt đầu quét
                            </Button>
                        ) : (
                            <Button
                                onClick={stopScanning}
                                disabled={isProcessing}
                                variant="outline"
                                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 py-6 text-lg font-semibold"
                            >
                                <CameraOff className="w-5 h-5 mr-2" />
                                Dừng quét
                            </Button>
                        )}
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                            <strong>Hướng dẫn:</strong>
                        </p>
                        <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                            <li>Nhấn "Bắt đầu quét" để mở camera</li>
                            <li>Hướng camera vào mã QR của khách hàng</li>
                            <li>Đợi hệ thống tự động quét và xác nhận</li>
                        </ol>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
