/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";
import { type RouteObject } from "react-router-dom";
import ProtectedRoute, { UnauthorizedPage, UserRole } from "./protected-routes-config";

// ===== PAGE IMPORTS =====
// Critical Pages - Keep Static (needed immediately on app load)
import AuthenticationPage from "../pages/auth/authentication-page";
import VerifyTokenPage from "../pages/auth/verify-token-page";
import ForgotPasswordPage from "../pages/auth/forgot-password-page";
import ResetPasswordPage from "../pages/auth/reset-password-page";
import LandingPage from "../pages/landing/landing-page";
import AboutPage from "../pages/about/about-page";

// ===== LAZY-LOADED PAGES =====
// User Pages
const UserDashboardPage = lazy(() => import("../pages/user-dashboard-page/user-dashboard-page"));
const UserBookingHistoryPage = lazy(() => import("../pages/user-dashboard-page/user-booking-history-page"));
const UserInvoicesPage = lazy(() => import("../pages/user-dashboard-page/user-invoices-page"));
const MyTournaments = lazy(() => import("../pages/user-dashboard-page/user-tournamets.tsx"));
const UserWalletPage = lazy(() => import("../pages/user-dashboard-page/user-wallet-page"));
const UserProfilePage = lazy(() => import("../pages/user-dashboard-page/user-profile-page"));

// Coach Pages
const CoachDashboardPage = lazy(() => import("../pages/coach-dashboard-page/dashboard/coach-dashboard-page.tsx"));
const CoachSchedulePage = lazy(() => import("../pages/coach-dashboard-page/schedule/coach-schedule-page.tsx"));
const CoachWalletPage = lazy(() => import("../pages/coach-dashboard-page/wallet/coach-wallet-page.tsx"));
const CoachVerifyPaymentsPage = lazy(() => import("../pages/coach-dashboard-page/verify-payments/verify-payments-page.tsx"));
const CoachBookingsPage = lazy(() => import("../pages/coach-dashboard-page/bookings/coach-bookings-page.tsx"));
const CoachSelfDetailPage = lazy(() => import("../pages/coach-dashboard-page/coach-self-detail-page/coach-profile-page"));
const CoachProfileSettingsPage = lazy(() => import("../pages/coach-dashboard-page/profile/coach-profile-page"));

const CoachChatPage = lazy(() => import("../pages/coach-dashboard-page/chat/CoachChatPage"));

// Coach Discovery Pages
const BookingPage = lazy(() => import("../pages/coach-list-page/booking-page.tsx"));
const CoachBookingPage = lazy(() => import("../pages/coach-booking-page/coach-booking-page.tsx"));
const CoachDetailPage = lazy(() => import("../pages/coach-detail-page/coach-detail-page"));

// Field Pages
const FieldBookingPage = lazy(() => import("../pages/field-list-page/list-page"));
const FieldBookingFlowPage = lazy(() => import("../pages/field-booking-page/field-booking-page"));
const FieldBookingAiPage = lazy(() => import("../pages/field-booking-ai-page/field-booking-ai-page"));
const FieldCoachBookingPage = lazy(() => import("../pages/field-coach-booking-page/field-coach-booking-page"));
const FieldCreatePage = lazy(() => import("../pages/field-owner-dashboard-page/create/field-create-page"));
const FieldDetailPage = lazy(() => import("../pages/field-detail-page/field-detail-page"));

// Payment Pages
const PayOSReturnPage = lazy(() => import("../pages/transactions/payos-return-page.tsx"));
const PayOSCancelPage = lazy(() => import("../pages/transactions/payos-cancel-page.tsx"));

// Field Owner Pages
const OwnerFieldListPage = lazy(() => import("../pages/field-owner-dashboard-page/fields/owner-field-list-page"));
const FieldOwnerDashboardPage = lazy(() => import("../pages/field-owner-dashboard-page/dashboard/field-owner-dashboard-page"));
const FieldOwnerWalletPage = lazy(() => import("../pages/field-owner-dashboard-page/wallet/field-owner-wallet-page"));
const FieldBookingListPage = lazy(() => import("../pages/field-owner-dashboard-page/field-booking-list/field-booking-list-page.tsx"));
const FieldCoachBookingListPage = lazy(() => import("../pages/field-owner-dashboard-page/field-coach-booking-list/field-coach-booking-list-page.tsx"));
const FieldOwnerAnalyticsPage = lazy(() => import("../pages/field-owner-dashboard-page/analytics/field-owner-analytics-page"));
const FieldOwnerProfilePage = lazy(() => import("../pages/field-owner-dashboard-page/profile/field-owner-profile-page"));
const FieldEditPage = lazy(() => import("../pages/field-owner-dashboard-page/fields/field-edit-page"));
const FieldViewPage = lazy(() => import("../pages/field-owner-dashboard-page/fields/field-view-page"));
const TournamentRequestsPage = lazy(() => import("../pages/field-owner-dashboard-page/tournament-requests/tournament-requests-page"));
const FieldOwnerChatDashboard = lazy(() => import("@/pages/field-owner-dashboard-page/chat/FieldOwnerChatPage.tsx"));

// Field Owner Registration Pages
const FieldOwnerRegistrationPage = lazy(() => import("../pages/field-owner-registration-page/field-owner-registration-page"));
const FieldOwnerRegistrationStatusPage = lazy(() => import("../pages/field-owner-registration-status-page/field-owner-registration-status-page"));
const EkycCallbackPage = lazy(() => import("../pages/field-owner-registration-page/EkycCallbackPage"));

// Coach Registration Pages
const CoachRegistrationPage = lazy(() => import("../pages/coach-registration-page/coach-registration-page"));
const CoachRegistrationStatusPage = lazy(() => import("../pages/coach-registration-status-page/coach-registration-status-page"));

// Other Pages
const NotificationsPage = lazy(() => import("../pages/notifications/page"));
const TournamentListPage = lazy(() => import("@/pages/list-tournament/TournamentListPage.tsx"));
const CreateTournamentPage = lazy(() => import("@/pages/create-tournament/CreateTournamentPage.tsx"));
const TournamentDetailPage = lazy(() => import("@/pages/tournament-detail-page/tournament-detail-page.tsx"));
const MyReportsPage = lazy(() => import("../pages/my-reports-page/my-reports-page"));

// Test Pages
const NotificationTestPage = lazy(() => import("../pages/test/notification-test-page"));

// Error Pages
import GeneralError from "../pages/error/general-error";
import NotFoundError from "../pages/error/not-found-error";
import MaintenanceError from "../pages/error/maintenance-error";
import UnauthorizedError from "../pages/error/unauthorized-error";
import ForbiddenError from "../pages/error/forbidden-error";

/**
 * Placeholder component for pages under development
 */
const Placeholder = ({ title }: { title: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center p-8 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
      <p className="text-gray-600">Trang này đang được phát triển</p>
    </div>
  </div>
);

/**
 * ===== PUBLIC ROUTES =====
 * Routes accessible to all users (authenticated and non-authenticated)
 * These routes do not require any specific role or authentication
 */
export const publicRoutes: RouteObject[] = [
  // Core Public Pages
  { path: "/", element: <LandingPage /> },
  { path: "/verify-email", element: <VerifyTokenPage /> },
  { path: "/auth/verify-token", element: <VerifyTokenPage /> },
  { path: "/verify-email/success", element: <VerifyTokenPage /> },
  { path: "/verify-email/failed", element: <VerifyTokenPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/coach", element: <BookingPage /> },
  { path: "/coach-detail/:id", element: <CoachDetailPage /> },
  { path: "/auth", element: <AuthenticationPage /> },
  { path: "/unauthorized", element: <UnauthorizedPage /> },

  // PayOS Payment Pages
  { path: "/transactions/payos/return", element: <PayOSReturnPage /> },
  { path: "/transactions/payos/cancel", element: <PayOSCancelPage /> },

  // Error Pages
  { path: "/500", element: <GeneralError /> },
  { path: "/404", element: <NotFoundError /> },
  { path: "/403", element: <ForbiddenError /> },
  { path: "/401", element: <UnauthorizedError /> },
  { path: "/503", element: <MaintenanceError /> },

  // Test Pages (Development)
  { path: "/test/notifications", element: <NotificationTestPage /> },

  // Field Discovery & Booking (Public)
  { path: "/fields", element: <FieldBookingPage /> },
  { path: "/fields/:id", element: <FieldDetailPage /> },
  { path: "/field-booking", element: <FieldBookingFlowPage /> },
  { path: "/field-booking-ai", element: <FieldBookingAiPage /> },
  { path: "/field-coach", element: <FieldCoachBookingPage /> },

  // Coach Discovery (Public)
  { path: "/coaches", element: <Placeholder title="Danh sách HLV" /> },
  { path: "/coach-detail", element: <CoachDetailPage /> },
  { path: "/coach/:id", element: <CoachDetailPage /> },
  { path: "/coaches/:id/booking", element: <CoachBookingPage /> },

  // About & Contact (Public)
  { path: "/about", element: <AboutPage /> },
  { path: "/contact", element: <Placeholder title="Liên hệ" /> },
  { path: "/services", element: <Placeholder title="Dịch vụ" /> },

  // Tournament Discovery (Public)
  { path: "/tournaments", element: <TournamentListPage /> },
  { path: "/tournaments/:id", element: <TournamentDetailPage /> },

  //test
  { path: "/field-owner-dashboard", element: <FieldOwnerDashboardPage /> },
];

/**
 * ===== GUEST ROUTES =====
 * Public routes accessible to all users + legacy redirects
 * Keeping separate export for backward compatibility with main-router.tsx
 */
export const guestRoutes: RouteObject[] = [
  ...publicRoutes,
];

/**
 * ===== USER ROUTES =====
 * Routes accessible only to authenticated users with "user" role
 */
export const userRoutes: RouteObject[] = [
  // User Dashboard & Profile
  {
    path: "/user-dashboard",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.user]}>
        <UserDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/user-profile",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.user, UserRole.coach]}>
        <UserProfilePage />
      </ProtectedRoute>
    ),
  },

  // User Booking Management
  {
    path: "/user-booking-history",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.user]}>
        <UserBookingHistoryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/user-invoices",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.user]}>
        <UserInvoicesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/my-reports",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.user]}>
        <MyReportsPage />
      </ProtectedRoute>
    ),
  },

  // User Communication & Finance
  {
    path: "/user-tournaments",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.user]}>
        <MyTournaments />
      </ProtectedRoute>
    ),
  },
  {
    path: "/user-wallet",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.user]}>
        <UserWalletPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/notifications",
    element: (
      <ProtectedRoute
        allowedRoles={[
          UserRole.user,
          UserRole.coach,
          UserRole.FIELD_OWNER
        ]}
      >
        <NotificationsPage />
      </ProtectedRoute>
    ),
  },
  // Field Owner Registration (for regular users)
  {
    path: "/become-field-owner",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.user]}>
        <FieldOwnerRegistrationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/field-owner-registration-status",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.user, UserRole.FIELD_OWNER]}>
        <FieldOwnerRegistrationStatusPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/field-owner/ekyc/callback",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.user, UserRole.FIELD_OWNER]}>
        <EkycCallbackPage />
      </ProtectedRoute>
    ),
  },
  // Coach Registration (for regular users)
  {
    path: "/become-coach",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.user]}>
        <CoachRegistrationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/coach-registration-status",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.user, UserRole.coach]}>
        <CoachRegistrationStatusPage />
      </ProtectedRoute>
    ),
  },
  // Fallback User Area
  {
    path: "/user",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.user]}>
        <Placeholder title="User Dashboard" />
      </ProtectedRoute>
    ),
  },
  {
    path: "/tournaments/create",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.user, UserRole.coach, UserRole.FIELD_OWNER]}>
        <CreateTournamentPage />
      </ProtectedRoute>
    ),
  },
];

/**
 * ===== COACH ROUTES =====
 * Routes accessible only to authenticated users with "coach" role
 */
export const coachRoutes: RouteObject[] = [
  // Coach Dashboard & Management
  {
    path: "/coach/dashboard",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.coach]}>
        <CoachDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/coach/profile",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.coach]}>
        <CoachProfileSettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/coach/profile/details",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.coach]}>
        <CoachSelfDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/coach/schedule",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.coach]}>
        <CoachSchedulePage />
      </ProtectedRoute>
    ),
  },



  {
    path: "/coach/classes",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.coach]}>
        <Placeholder title="Quản lý lớp học" />
      </ProtectedRoute>
    ),
  },
  {
    path: "/coach/bookings",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.coach]}>
        <CoachBookingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/coach/verify-payments",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.coach]}>
        <CoachVerifyPaymentsPage />
      </ProtectedRoute>
    ),
  },

  // Coach Students & Performance
  {
    path: "/coach/students",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.coach]}>
        <Placeholder title="Học viên" />
      </ProtectedRoute>
    ),
  },
  {
    path: "/coach/earnings",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.coach]}>
        <Placeholder title="Thu nhập" />
      </ProtectedRoute>
    ),
  },
  {
    path: "/coach-wallet",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.coach]}>
        <CoachWalletPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/coach/analytics",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.coach]}>
        <Placeholder title="Thống kê hiệu suất" />
      </ProtectedRoute>
    ),
  },

  // Coach Chat (two aliases for sidebar/tab paths)
  {
    path: "/coach/chat",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.coach]}>
        <CoachChatPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/coach-chat",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.coach]}>
        <CoachChatPage />
      </ProtectedRoute>
    ),
  },

  // Fallback Coach Area
  {
    path: "/coach",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.coach]}>
        <Placeholder title="Coach Dashboard" />
      </ProtectedRoute>
    ),
  },
];

/**
 * ===== ADMIN/MANAGER ROUTES =====
 * Routes accessible only to authenticated users with "manager" role
 */
export const adminRoutes: RouteObject[] = [
  // Admin Dashboard & Management
  {
    path: "/admin/dashboard",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.MANAGER]}>
        <Placeholder title="Admin Dashboard" />
      </ProtectedRoute>
    ),
  },

  // User Management
  {
    path: "/admin/users",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.MANAGER]}>
        <Placeholder title="Quản lý người dùng" />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/coaches",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.MANAGER]}>
        <Placeholder title="Quản lý HLV" />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/field-owners",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.MANAGER]}>
        <Placeholder title="Quản lý chủ sân" />
      </ProtectedRoute>
    ),
  },

  // Content & System Management
  {
    path: "/admin/fields",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.MANAGER]}>
        <Placeholder title="Quản lý sân bóng" />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/bookings",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.MANAGER]}>
        <Placeholder title="Quản lý đặt sân" />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/analytics",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.MANAGER]}>
        <Placeholder title="Thống kê hệ thống" />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/settings",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.MANAGER]}>
        <Placeholder title="Cài đặt hệ thống" />
      </ProtectedRoute>
    ),
  },

  // Legacy Support
  {
    path: "/center",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.MANAGER]}>
        <Placeholder title="Manager Center" />
      </ProtectedRoute>
    ),
  },

  // Fallback Admin Area
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.MANAGER]}>
        <Placeholder title="Admin Dashboard" />
      </ProtectedRoute>
    ),
  },
];

/**
 * ===== FIELD OWNER ROUTES =====
 * Routes accessible only to authenticated users with "field_owner" role
 */
export const fieldOwnerRoutes: RouteObject[] = [
  // Field Owner Dashboard & Profile
  {
    path: "/field-owner/dashboard",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <Placeholder title="Field Owner Dashboard" />
      </ProtectedRoute>
    ),
  },
  {
    path: "/field-owner/profile",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <FieldOwnerProfilePage />
      </ProtectedRoute>
    ),
  },

  // Field Management
  {
    path: "/field/create",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <FieldCreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/field-owner/fields",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <OwnerFieldListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/field-owner/fields/:fieldId",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <FieldViewPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/field-owner/fields/:fieldId/edit",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <FieldEditPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/field-owner/locations",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <Placeholder title="Quản lý địa điểm" />
      </ProtectedRoute>
    ),
  },

  // Booking & Schedule Management
  {
    path: "/field-owner/field-bookings",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <FieldBookingListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/field-owner/field-coach-bookings",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <FieldCoachBookingListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/field-owner/booking-history",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <FieldBookingListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/field-owner/tournament-requests",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <TournamentRequestsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/field-owner/schedule",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <Placeholder title="Lịch đặt sân" />
      </ProtectedRoute>
    ),
  },

  // Customer Management
  {
    path: "/field-owner/wallet",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <FieldOwnerWalletPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/field-owner/chat",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <FieldOwnerChatDashboard />
      </ProtectedRoute>
    ),
  },

  // Analytics & Financial Management
  {
    path: "/field-owner/analytics",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <FieldOwnerAnalyticsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/field-owner/financial-reports",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <Placeholder title="Báo cáo tài chính" />
      </ProtectedRoute>
    ),
  },

  // Settings & Configuration
  {
    path: "/field-owner/settings",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <Placeholder title="Cài đặt" />
      </ProtectedRoute>
    ),
  },

  // Fallback Field Owner Area
  {
    path: "/field-owner",
    element: (
      <ProtectedRoute allowedRoles={[UserRole.FIELD_OWNER]}>
        <Placeholder title="Field Owner Dashboard" />
      </ProtectedRoute>
    ),
  },
];

/**
 * ===== CHAT ROUTES =====
 * Routes for chat functionality (available to all authenticated users)
 */
export const chatRoutes: RouteObject[] = [
  // TODO: Implement chat routes when chat feature is ready
];

/**
 * ===== LEGACY SUPPORT =====
 * Keep centerRoutes for backward compatibility with existing code
 */
export const centerRoutes: RouteObject[] = adminRoutes;

/**
 * ===== UTILITY FUNCTIONS =====
 * Helper functions to extract route information
 */

/**
 * Extract public route paths from publicRoutes array
 * Used by AuthWrapper to determine which routes don't need authentication
 */
export const getPublicRoutePaths = (): string[] => {
  return publicRoutes.map(route => route.path).filter((path): path is string => path !== undefined);
};

/**
 * Check if a given path is a public route
 * @param pathname - The current pathname to check
 * @returns boolean indicating if the path is public
 */
export const isPublicRoute = (pathname: string): boolean => {
  const publicPaths = getPublicRoutePaths();

  return publicPaths.some(route =>
    pathname === route ||
    (route !== '/' && pathname.startsWith(route))
  );
};

/**
 * ===== ROUTE SUMMARY =====
 * 
 * 📋 ROUTE STRUCTURE:
 * 
 * PUBLIC ROUTES (No Auth Required):
 * • / - Landing page
 * • /auth - Authentication  
 * • /fields, /field-booking - Field discovery & booking
 * • /coaches, /coach-detail, /coach/:id - Coach discovery
 * • /about, /contact, /services - Static pages
 * 
 * PROTECTED ROUTES (Auth + Role Required):
 * • /user/* - User role routes (dashboard, profile, bookings, etc.)
 * • /coach/* - Coach role routes (classes, schedule, earnings, etc.)  
 * • /field-owner/* - Field owner routes (fields, revenue, analytics, etc.)
 * • /admin/* - Manager/Admin routes (user mgmt, system settings, etc.)
 * 
 * LEGACY REDIRECTS (Backward Compatibility):
 * • /user-dashboard → /user/dashboard
 * • /coach-dashboard → /coach/dashboard
 * • /user-* → /user/*
 * 
 * 🔐 PROTECTION LEVELS:
 * 1. Public: Accessible to everyone
 * 2. Protected: Requires authentication + specific role
 * 3. Legacy: Auto-redirects to new protected routes
 * 
 * 🎯 NAVIGATION FLOW:
 * 1. Login → Redirect to "/" (landing page)
 * 2. From landing → Navigate to role-specific dashboard via dropdown/navbar
 * 3. Role-based permissions enforce access control
 */