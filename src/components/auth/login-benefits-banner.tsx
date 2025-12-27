import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Gift, Star, Shield, Clock } from 'lucide-react';
import logger from '@/utils/logger';

interface LoginBenefitsBannerProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const LoginBenefitsBanner: React.FC<LoginBenefitsBannerProps> = ({
  onClose,
  showCloseButton = true,
}) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    const redirectUrl = window.location.pathname + window.location.search;
    try {
      localStorage.setItem('bookingRedirectUrl', redirectUrl);
    } catch (error) {
      logger.warn('Failed to save redirect URL to localStorage:', error);
    }
    navigate('/auth', { state: { mode: 'login', redirectUrl } });
  };

  const benefits = [
    {
      icon: <Gift className="w-5 h-5 text-emerald-600" />,
      text: 'Nhận ưu đãi và mã giảm giá độc quyền',
    },
    {
      icon: <Star className="w-5 h-5 text-yellow-500" />,
      text: 'Tích điểm và đổi thưởng cho mỗi lần đặt sân',
    },
    {
      icon: <Shield className="w-5 h-5 text-blue-600" />,
      text: 'Lưu thông tin thanh toán an toàn và nhanh chóng',
    },
    {
      icon: <Clock className="w-5 h-5 text-purple-600" />,
      text: 'Xem lịch sử đặt sân và quản lý booking dễ dàng',
    },
  ];

  return (
    <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 shadow-md mb-6">
      <div className="p-4 relative">
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 pr-8">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🎁 Đăng nhập để hưởng nhiều lợi ích!
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  {benefit.icon}
                  <span>{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <Button
              onClick={handleLogin}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 whitespace-nowrap"
            >
              Đăng nhập ngay
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LoginBenefitsBanner;

