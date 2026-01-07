// src/layouts/root-layout.tsx
import { useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { AuthWrapper } from '../../routes/auth-wrapper';
import { BannerNotificationContainer } from '@/components/notification/banner-notification-container';

export const RootLayout = () => {
  const { pathname } = useLocation();

  // Auto-redirect logic is handled by AuthWrapper component

  useEffect(() => {
    // Only scroll to top for specific routes, not booking page
    if (!pathname.includes('/booking')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pathname]);

  return (
    <div className="min-h-screen sticky-container">
      <BannerNotificationContainer />
      <AuthWrapper>
        <Outlet />
      </AuthWrapper>
    </div>
  );
};

export default RootLayout;