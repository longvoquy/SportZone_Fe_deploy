import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Shield } from 'lucide-react';
import { Loading } from '@/components/ui/loading';
import logger from '@/utils/logger';

/**
 * eKYC Callback Page
 * Handles Didit eKYC verification callback after user completes identity verification
 */
export default function EkycCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [verificationSessionId, setVerificationSessionId] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  useEffect(() => {
    // Extract query parameters from Didit callback
    const sessionId = searchParams.get('verificationSessionId');
    const statusParam = searchParams.get('status');

    logger.debug('[eKYC Callback] Starting callback processing...');
    logger.debug('[eKYC Callback] Callback params:', {
      verificationSessionId: sessionId,
      status: statusParam,
    });

    // Validate required parameters
    if (!sessionId) {
      logger.error('[eKYC Callback] No verificationSessionId in URL');
      setError('Không tìm thấy mã phiên xác thực. Vui lòng thử lại.');
      setStatus('error');
      return;
    }

    setVerificationSessionId(sessionId);
    setVerificationStatus(statusParam || null);

    // Process the verification status
    if (statusParam === 'Approved') {
      logger.debug('[eKYC Callback] eKYC verification approved!');

      // Immediately show success UI
      setStatus('success');

      // Notify parent window (if opened in popup) immediately
      try {
        if (window.opener) {
          // Notify parent that verification succeeded
          window.opener.postMessage(
            { type: 'ekyc-verified', sessionId, status: 'Approved' },
            window.location.origin
          );
          logger.debug('[eKYC Callback] Sent postMessage to parent window');
        }
      } catch (err) {
        logger.warn('[eKYC Callback] Could not notify parent window:', err);
      }

      // Close popup after showing success message (3 seconds to let user see it)
      const closeTimer = setTimeout(() => {
        const closePopup = () => {
          if (window.opener) {
            // Notify parent first, then try to close (parent can close if window.close() fails)
            try {
              if (window.opener) {
                window.opener.postMessage(
                  { type: 'ekyc-close-popup', sessionId },
                  window.location.origin
                );
                logger.debug('[eKYC Callback] Sent close-popup message to parent');
              }
            } catch (postErr) {
              logger.warn('[eKYC Callback] Could not send close message:', postErr);
            }

            try {
              window.close();
              logger.debug('[eKYC Callback] Attempted to close popup');
            } catch (err) {
              logger.warn('[eKYC Callback] Could not close popup directly:', err);
            }
          } else {
            // Opener missing.
            // Do not auto-navigate. Let the user use the manual buttons.
            // This prevents the "app inside popup" bug if the heuristic fails
            // and gives mobile users time to read the success message.
          }
        };

        closePopup();
      }, 3000); // Increased to 3 seconds so user can see success message

      // Cleanup timer on unmount
      return () => {
        clearTimeout(closeTimer);
      };
    } else {
      // Verification failed or rejected
      logger.debug('[eKYC Callback] eKYC verification failed or rejected');
      const errorMessage = statusParam
        ? `Xác thực thất bại. Trạng thái: ${statusParam}`
        : 'Xác thực thất bại. Vui lòng thử lại.';
      setError(errorMessage);
      setStatus('error');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {status === 'processing' && (
            <div className="text-center py-8">
              <Loading size={64} className="mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Đang xử lý kết quả xác thực...
              </h2>
              <p className="text-gray-600">
                Vui lòng chờ trong giây lát
              </p>
              {verificationSessionId && (
                <p className="text-sm text-gray-500 mt-2">
                  Mã phiên: {verificationSessionId.substring(0, 20)}...
                </p>
              )}
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-600 mb-3">
                  ✅ Xác thực danh tính thành công!
                </h2>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-left">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-900">
                    Bạn đã hoàn thành xác thực danh tính thành công.
                  </p>
                  <p className="text-sm text-green-700">
                    Thông tin của bạn đã được xác minh và sẽ được tự động điền vào form đăng ký.
                  </p>
                  {verificationSessionId && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-xs font-medium text-green-800 mb-1">Mã phiên xác thực:</p>
                      <p className="text-xs text-green-600 font-mono break-all">
                        {verificationSessionId}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-4">
                <Loading size={16} />
                <span>Cửa sổ sẽ tự động đóng trong vài giây...</span>
              </div>

              <Button
                onClick={() => {
                  if (window.opener) {
                    // Notify parent first, then try to close
                    try {
                      window.opener.postMessage(
                        { type: 'ekyc-close-popup', sessionId: verificationSessionId },
                        window.location.origin
                      );
                      logger.debug('[eKYC Callback] Sent close-popup message to parent');
                    } catch (postErr) {
                      logger.warn('[eKYC Callback] Could not send close message:', postErr);
                    }

                    try {
                      window.close();
                    } catch (err) {
                      logger.warn('[eKYC Callback] Could not close popup directly:', err);
                    }
                  } else {
                    // Try to close first
                    window.close();

                    // Check if we are in the popup context
                    const isPopup = window.name === 'didit-ekyc';

                    if (!isPopup) {
                      // Not a popup, navigate to registration page
                      navigate('/become-field-owner', {
                        state: {
                          message: 'Xác thực danh tính thành công!',
                          sessionId: verificationSessionId
                        }
                      });
                    }
                  }
                }}
                className="mt-2 bg-green-600 hover:bg-green-700 text-white"
              >
                {window.name === 'didit-ekyc' ? 'Đóng cửa sổ ngay' : 'Quay lại trang đăng ký'}
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
              <h2 className="text-2xl font-bold text-red-600 mb-2">
                ❌ Xác thực thất bại
              </h2>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-800 text-left">{error}</p>
                  </div>
                </div>
              )}
              {verificationStatus && (
                <p className="text-sm text-gray-600 mb-2">
                  Trạng thái: <span className="font-semibold">{verificationStatus}</span>
                </p>
              )}
              {verificationSessionId && (
                <p className="text-xs text-gray-500 mb-4">
                  Mã phiên: {verificationSessionId.substring(0, 30)}...
                </p>
              )}
              <div className="space-y-2">
                <Button
                  onClick={() => navigate('/become-field-owner')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Thử lại xác thực
                </Button>
                <Button
                  onClick={() => {
                    if (window.opener) {
                      window.close();
                    } else {
                      // Try to close first
                      window.close();

                      const isPopup = window.name === 'didit-ekyc';

                      if (!isPopup) {
                        navigate('/become-field-owner');
                      }
                    }
                  }}
                  variant="outline"
                  className="w-full"
                >
                  {window.name === 'didit-ekyc' ? 'Đóng cửa sổ' : 'Quay lại trang đăng ký'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div >
  );
}

