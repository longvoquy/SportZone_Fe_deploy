import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';
import logger from '@/utils/logger';

interface AuthRequiredPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export const AuthRequiredPopup: React.FC<AuthRequiredPopupProps> = ({
  isOpen,
  onClose,
  title = "Yêu cầu đăng nhập",
  description = "Bạn cần đăng nhập để tiếp tục đặt sân. Vui lòng đăng nhập hoặc đăng ký tài khoản mới."
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = () => {
    // Save current location (pathname + search params) to localStorage for redirect after login
    const redirectUrl = location.pathname + location.search;
    try {
      localStorage.setItem('bookingRedirectUrl', redirectUrl);
    } catch (error) {
      logger.warn('Failed to save redirect URL to localStorage:', error);
    }
    
    onClose();
    navigate('/auth', { state: { mode: 'login', redirectUrl } });
  };

  const handleRegister = () => {
    // Save current location (pathname + search params) to localStorage for redirect after login
    const redirectUrl = location.pathname + location.search;
    try {
      localStorage.setItem('bookingRedirectUrl', redirectUrl);
    } catch (error) {
      logger.warn('Failed to save redirect URL to localStorage:', error);
    }
    
    onClose();
    navigate('/auth', { state: { mode: 'register', redirectUrl } });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-center text-gray-900">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-gray-600 mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex flex-col gap-3 sm:flex-row sm:gap-2">
          <AlertDialogCancel 
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Hủy
          </AlertDialogCancel>
          
          <Button
            onClick={handleLogin}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Đăng nhập
          </Button>
          
          <Button
            onClick={handleRegister}
            variant="outline"
            className="w-full sm:w-auto border-emerald-600 text-emerald-600 hover:bg-emerald-50"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Đăng ký
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AuthRequiredPopup;
