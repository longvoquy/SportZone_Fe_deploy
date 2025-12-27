import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Smartphone,
  AlertCircle,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import { Loading } from '@/components/ui/loading';
import axiosPublic from '@/utils/axios/axiosPublic';
import logger from '@/utils/logger';

// Simple QR Code Display using external API
const QRCodeDisplay = ({ data }: { data: string }) => {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;

  return (
    <img
      src={qrImageUrl}
      alt="QR Code"
      className="w-[300px] h-[300px] object-contain"
      onError={(e) => {
        // Fallback to Google Charts API
        (e.target as HTMLImageElement).src = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(data)}`;
      }}
    />
  );
};

interface LocationState {
  paymentId: string;
  bookingId: string;
  amount: number;
  bookingData?: {
    date: string;
    startTime: string;
    endTime: string;
  };
}

interface QRCodeData {
  qrCodeUrl: string;
  paymentId: string;
  amount: number;
  expiresAt: string;
  expiresIn: number;
}

interface PaymentStatusResponse {
  paymentId: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  bookingId: string;
  amount: number;
  transactionId?: string;
}

export default function VNPayQRPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Try to get data from location state first
  const locationState = (location.state as LocationState) || {};

  // Also try to get from URL params as fallback
  const searchParams = new URLSearchParams(location.search);
  const urlPaymentId = searchParams.get('paymentId');
  const urlBookingId = searchParams.get('bookingId');

  // Use location state if available, otherwise try URL params
  const [paymentState, setPaymentState] = useState<LocationState>({
    paymentId: locationState.paymentId || urlPaymentId || '',
    bookingId: locationState.bookingId || urlBookingId || '',
    amount: locationState.amount || 0,
    bookingData: locationState.bookingData,
  });

  const { paymentId, bookingId, amount, bookingData } = paymentState;

  const [status, setStatus] = useState<'loading' | 'ready' | 'scanning' | 'success' | 'expired' | 'error'>('loading');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(900);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [extensionCount, setExtensionCount] = useState(0);
  const [isFetchingPaymentInfo, setIsFetchingPaymentInfo] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const pollPaymentStatus = useCallback(async () => {
    if (!paymentId) return;

    try {
      const response = await axiosPublic.get<PaymentStatusResponse>(
        `/transactions/${paymentId}/status`
      );

      const data = response.data;
      setPollingAttempts(prev => prev + 1);

      if (data.status === 'succeeded') {
        logger.debug('[QR Payment] Payment succeeded!');
        setStatus('success');
        stopPolling();

        setTimeout(() => {
          navigate('/user-booking-history', {
            state: {
              message: 'Thanh toán thành công!',
              bookingId: bookingId
            }
          });
        }, 2000);
      } else if (data.status === 'failed') {
        logger.debug('[QR Payment] Payment failed');
        stopPolling();

        // Show error state instead of navigating
        setError('Thanh toán QR thất bại. Vui lòng thử lại.');
        setStatus('error');
      }
    } catch (err: any) {
      logger.error('[QR Payment] Polling error:', err);
    }
  }, [paymentId, bookingId, amount, navigate, stopPolling]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(() => {
      pollPaymentStatus();
    }, 3000);
  }, [pollPaymentStatus]);

  // Fetch payment info from backend if missing
  const fetchPaymentInfo = useCallback(async (bookingIdOrPaymentId: string) => {
    if (isFetchingPaymentInfo) return;

    setIsFetchingPaymentInfo(true);
    try {
      logger.debug('[VNPay QR] Fetching payment info for:', bookingIdOrPaymentId);

      // Try to get transaction by booking ID first
      const response = await axiosPublic.get(`/transactions/booking/${bookingIdOrPaymentId}`);
      const payment = response.data?.data || response.data;

      if (payment) {
        logger.debug('[VNPay QR] Payment info fetched:', {
          paymentId: payment._id || payment.id,
          bookingId: payment.booking || bookingIdOrPaymentId,
          amount: payment.amount,
        });

        setPaymentState({
          paymentId: payment._id || payment.id || payment.paymentId,
          bookingId: payment.booking || bookingIdOrPaymentId,
          amount: payment.amount || 0,
          bookingData: paymentState.bookingData,
        });

        return {
          paymentId: payment._id || payment.id || payment.paymentId,
          bookingId: payment.booking || bookingIdOrPaymentId,
          amount: payment.amount || 0,
        };
      }

      return null;
    } catch (err: any) {
      logger.error('[VNPay QR] Failed to fetch payment info:', err);
      // If booking ID fails, try payment ID
      try {
        const response = await axiosPublic.get(`/transactions/${bookingIdOrPaymentId}`);
        const payment = response.data?.data || response.data;

        if (payment) {
          setPaymentState({
            paymentId: payment._id || payment.id || bookingIdOrPaymentId,
            bookingId: payment.booking || '',
            amount: payment.amount || 0,
            bookingData: paymentState.bookingData,
          });

          return {
            paymentId: payment._id || payment.id || bookingIdOrPaymentId,
            bookingId: payment.booking || '',
            amount: payment.amount || 0,
          };
        }
      } catch (err2) {
        logger.error('[VNPay QR] Failed to fetch by payment ID:', err2);
      }

      return null;
    } finally {
      setIsFetchingPaymentInfo(false);
    }
  }, [isFetchingPaymentInfo, paymentState.bookingData]);

  const fetchQRCode = useCallback(async () => {
    let finalPaymentId = paymentId;
    let finalAmount = amount;
    let finalBookingId = bookingId;

    // If missing payment info, try to fetch it
    if (!finalPaymentId || !finalAmount) {
      logger.warn('[VNPay QR] Missing payment info, attempting to fetch...', { paymentId, bookingId, amount });

      // Try bookingId first, then paymentId
      const idToFetch = finalBookingId || finalPaymentId;

      if (idToFetch) {
        const paymentInfo = await fetchPaymentInfo(idToFetch);

        if (paymentInfo) {
          finalPaymentId = paymentInfo.paymentId;
          finalAmount = paymentInfo.amount;
          finalBookingId = paymentInfo.bookingId;

          logger.debug('[VNPay QR] Payment info loaded:', { finalPaymentId, finalAmount, finalBookingId });
        } else {
          logger.error('[VNPay QR] Could not fetch payment info');
          setError('Không tìm thấy thông tin thanh toán. Vui lòng tạo đặt sân lại.');
          setStatus('error');
          return;
        }
      } else {
        logger.error('[VNPay QR] No bookingId or paymentId available');
        setError('Missing payment information. Vui lòng quay lại trang đặt sân.');
        setStatus('error');
        return;
      }
    }

    try {
      setStatus('loading');
      logger.debug('[VNPay QR] Creating QR code with:', { paymentId: finalPaymentId, amount: finalAmount });

      const response = await axiosPublic.post<QRCodeData>('/transactions/create-vnpay-qr', {
        paymentId: finalPaymentId,
        amount: finalAmount,
      });

      const data = response.data;
      setQrCodeUrl(data.qrCodeUrl);
      setRemainingTime(data.expiresIn);

      setStatus('ready');
      startPolling();

    } catch (err: any) {
      logger.error('[VNPay QR] Failed to create QR code:', err);
      setError(err.response?.data?.message || 'Không thể tạo mã QR. Vui lòng thử lại.');
      setStatus('error');
    }
  }, [paymentId, bookingId, amount, startPolling, fetchPaymentInfo]);

  const handleExtendTime = async () => {
    if (!paymentId || extensionCount >= 2) return;

    setIsExtending(true);
    try {
      const response = await axiosPublic.patch(`/transactions/${paymentId}/extend`, {
        additionalMinutes: 5,
      });

      if (response.data.success) {
        // Add 5 minutes (300 seconds) to remaining time
        setRemainingTime((prev) => prev + 300);
        setExtensionCount((prev) => prev + 1);
        setShowTimeoutWarning(false);

        logger.debug('[QR Payment] Time extended successfully');
      }
    } catch (err: any) {
      logger.error('[QR Payment] Failed to extend time:', err);
      setError('Không thể gia hạn thời gian. Vui lòng thử lại.');
    } finally {
      setIsExtending(false);
    }
  };

  useEffect(() => {
    if (status !== 'ready' && status !== 'scanning') return;

    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('expired');
          stopPolling();
          return 0;
        }

        // Show warning when 2 minutes (120 seconds) or less remaining
        if (prev <= 120 && !showTimeoutWarning) {
          setShowTimeoutWarning(true);
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, stopPolling, showTimeoutWarning]);

  useEffect(() => {
    // Only fetch if we have at least one ID
    if (paymentId || bookingId) {
      fetchQRCode();
    } else {
      logger.error('[VNPay QR] No paymentId or bookingId available');
      setError('Missing payment information. Vui lòng quay lại trang đặt sân.');
      setStatus('error');
    }

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckStatus = () => {
    pollPaymentStatus();
  };

  const handleCancel = async () => {
    if (paymentId) {
      try {
        // Call backend to cancel payment
        await axiosPublic.delete(`/transactions/${paymentId}/cancel`, {
          data: { reason: 'User cancelled payment' }
        });
      } catch (err) {
        logger.error('[QR Payment] Failed to cancel payment:', err);
      }
    }

    stopPolling();
    navigate(-1);
  };

  const handleRetry = () => {
    setError(null);
    setPollingAttempts(0);
    setExtensionCount(0);
    setShowTimeoutWarning(false);
    fetchQRCode();
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center py-12">
            <Loading size={64} className="mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Đang tạo mã QR...</h3>
            <p className="text-gray-600">Vui lòng đợi trong giây lát</p>
          </div>
        );

      case 'ready':
      case 'scanning':
        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg border-4 border-green-500 shadow-xl relative">
                <QRCodeDisplay data={qrCodeUrl} />
                {status === 'scanning' && (
                  <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center rounded-lg">
                    <Loading size={48} />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-blue-900">Hướng dẫn thanh toán:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                    <li>Mở ứng dụng Banking trên điện thoại</li>
                    <li>Chọn chức năng "Quét mã QR"</li>
                    <li>Quét mã QR bên trên</li>
                    <li>Xác nhận thông tin và hoàn tất thanh toán</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="font-semibold">
                Thời gian còn lại:{' '}
                <span className={remainingTime < 120 ? 'text-red-600' : 'text-gray-900'}>
                  {formatTimeRemaining(remainingTime)}
                </span>
              </span>
            </div>

            {/* Timeout Warning with Extend Option */}
            {showTimeoutWarning && remainingTime > 0 && extensionCount < 2 && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-900 mb-2">
                      ⏰ Mã QR sắp hết hạn!
                    </h4>
                    <p className="text-sm text-orange-800 mb-3">
                      Bạn có thể gia hạn thêm 5 phút để hoàn tất thanh toán
                      {extensionCount === 1 && ' (Lần cuối cùng)'}
                    </p>
                    <Button
                      onClick={handleExtendTime}
                      disabled={isExtending}
                      className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
                      size="sm"
                    >
                      {isExtending ? (
                        <>
                          <Loading size={16} className="mr-2" />
                          Đang gia hạn...
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 mr-2" />
                          Gia hạn thêm 5 phút ({2 - extensionCount} lần còn lại)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Critical Warning (no extensions left or < 30s) */}
            {remainingTime < 120 && remainingTime > 0 && (extensionCount >= 2 || remainingTime < 30) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-800">
                  {remainingTime < 30
                    ? '🚨 Mã QR sắp hết hạn trong vài giây! Vui lòng hoàn tất thanh toán ngay!'
                    : 'Mã QR sắp hết hạn. Vui lòng hoàn tất thanh toán ngay!'}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCheckStatus}
                className="flex-1"
                disabled={status === 'scanning'}
              >
                {status === 'scanning' ? (
                  <Loading size={16} className="mr-2" />
                ) : (
                  <Loading size={16} className="mr-2" /> // Standardized even if not rotating
                )}
                Kiểm tra thanh toán
              </Button>
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                <XCircle className="h-4 w-4 mr-2" />
                Hủy
              </Button>
            </div>

            <div className="text-center text-xs text-gray-500">
              Đang tự động kiểm tra thanh toán... (Lần {pollingAttempts})
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-12">
            <div className="mb-4">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20" />
                <CheckCircle2 className="h-20 w-20 text-green-600 relative" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-green-800 mb-2">
              Thanh toán thành công!
            </h3>
            <p className="text-gray-600 mb-4">
              Đơn đặt sân của bạn đã được xác nhận
            </p>
            <Badge variant="default" className="bg-green-500 text-white mb-4">
              Mã đặt sân: #{bookingId?.slice(-8).toUpperCase()}
            </Badge>
            <p className="text-gray-600 mb-4 text-sm">
              Đang chuyển hướng...
            </p>
            <Button
              onClick={() => navigate('/user-booking-history', {
                state: {
                  message: 'Thanh toán thành công!',
                  bookingId: bookingId
                }
              })}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Xem danh sách đặt sân
            </Button>
          </div>
        );

      case 'expired':
        return (
          <div className="text-center py-12">
            <Clock className="h-20 w-20 text-orange-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-orange-800 mb-2">
              Mã QR đã hết hạn
            </h3>
            <p className="text-gray-600 mb-6">
              Thời gian thanh toán đã hết. Vui lòng tạo mã QR mới.
            </p>
            <Button onClick={handleRetry} className="bg-orange-600 hover:bg-orange-700">
              <Loading size={16} className="mr-2" />
              Tạo mã QR mới
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-12">
            <XCircle className="h-20 w-20 text-red-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-red-800 mb-2">Có lỗi xảy ra</h3>
            <p className="text-gray-600 mb-6">{error || 'Không thể tạo mã QR'}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleRetry} variant="default">
                <Loading size={16} className="mr-2" />
                Thử lại
              </Button>
              <Button onClick={handleCancel} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={handleCancel} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Thanh toán QR Code</h1>
          <p className="text-gray-600 mt-2">Quét mã QR để hoàn tất thanh toán</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-6 w-6 text-green-600" />
              Mã QR thanh toán VNPay
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {renderContent()}

            {(status === 'ready' || status === 'scanning') && (
              <>
                <Separator className="my-6" />
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Thông tin thanh toán</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Số tiền:</span>
                    <span className="font-semibold text-lg text-green-600">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  {bookingData && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Ngày:</span>
                        <span className="font-medium">{bookingData.date}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Thời gian:</span>
                        <span className="font-medium">
                          {bookingData.startTime} - {bookingData.endTime}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <Separator className="my-6" />

                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Shield className="h-4 w-4" />
                  <span>Giao dịch được bảo mật bởi VNPay</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {(status === 'ready' || status === 'scanning') && (
          <Card className="mt-6 bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-1">Lưu ý</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Mã QR có hiệu lực trong 15 phút</li>
                    <li>• Không chia sẻ mã QR với người khác</li>
                    <li>• Kiểm tra kỹ thông tin trước khi thanh toán</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
