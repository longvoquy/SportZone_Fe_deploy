"use client";

import React from "react";
import { useNotificationBanner } from "@/context/notification-banner-context";
import { NotificationType } from "@/types/notification-type";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageWrapper } from "@/components/layouts/page-wrapper";
import PageHeader from "@/components/header-banner/page-header";

const NotificationTestPage: React.FC = () => {
  const { testNotification, clearAll } = useNotificationBanner();

  const notificationTypes = [
    { type: NotificationType.BOOKING_CONFIRMED, label: "Đặt sân thành công" },
    { type: NotificationType.BOOKING_CANCELLED, label: "Đặt sân bị hủy" },
    { type: NotificationType.PAYMENT_SUCCESS, label: "Thanh toán thành công" },
    { type: NotificationType.PAYMENT_FAILED, label: "Thanh toán thất bại" },
    { type: NotificationType.NEW_TOURNAMENT, label: "Giải đấu mới" },
    { type: NotificationType.NEW_REVIEW, label: "Đánh giá mới" },
    { type: NotificationType.COACH_REQUEST, label: "Yêu cầu HLV" },
    { type: NotificationType.FIELD_APPROVAL, label: "Sân được duyệt" },
    { type: NotificationType.REPORT_SUBMITTED, label: "Báo cáo đã gửi" },
    { type: NotificationType.INVOICE_GENERATED, label: "Hóa đơn mới" },
    { type: NotificationType.INVOICE_OVERDUE, label: "Hóa đơn quá hạn" },
    { type: NotificationType.SUBSCRIPTION_SUSPENDED, label: "Gói dịch vụ tạm ngưng" },
    { type: NotificationType.SUBSCRIPTION_REACTIVATED, label: "Gói dịch vụ kích hoạt" },
    { type: NotificationType.PAYMENT_PROOF_SUBMITTED, label: "Bằng chứng thanh toán" },
    { type: NotificationType.ADMIN_NOTIFICATION, label: "Thông báo admin" },
    { type: NotificationType.BOOKMARKED_FIELD_PRICE_CHANGED, label: "Giá sân thay đổi" },
    { type: NotificationType.BOOKMARKED_FIELD_STATUS_CHANGED, label: "Trạng thái sân thay đổi" },
    { type: NotificationType.BOOKMARKED_COACH_PRICE_CHANGED, label: "Giá HLV thay đổi" },
    { type: NotificationType.BOOKMARKED_COACH_STATUS_CHANGED, label: "Trạng thái HLV thay đổi" },
  ];

  const handleTestQueue = () => {
    // Test multiple notifications in sequence
    const types = [
      NotificationType.BOOKING_CONFIRMED,
      NotificationType.PAYMENT_SUCCESS,
      NotificationType.NEW_TOURNAMENT,
    ];

    types.forEach((type, index) => {
      setTimeout(() => {
        testNotification(type);
      }, index * 2000); // 2 seconds apart
    });
  };

  return (
    <PageWrapper>
      <PageHeader title="Test Banner Notifications" breadcrumbs={[{ label: "Test", href: "/test" }]} />
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Banner Notification Test Page</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Click các buttons bên dưới để test banner notifications giống iPhone
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Action Buttons */}
            <div className="flex gap-4 flex-wrap">
              <Button
                onClick={() => testNotification()}
                variant="default"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Test Random Notification
              </Button>
              <Button
                onClick={handleTestQueue}
                variant="default"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Test Queue (3 notifications)
              </Button>
              <Button
                onClick={clearAll}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                Clear All
              </Button>
            </div>

            {/* Notification Type Buttons Grid */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Test Specific Notification Types</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {notificationTypes.map(({ type, label }) => (
                  <Button
                    key={type}
                    onClick={() => testNotification(type)}
                    variant="outline"
                    className="h-auto py-3 px-4 text-left justify-start hover:bg-gray-50"
                  >
                    <span className="text-sm">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Hướng dẫn:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Click vào các buttons để trigger notifications</li>
                <li>Notifications sẽ xuất hiện từ trên cùng màn hình</li>
                <li>Swipe up để dismiss notification</li>
                <li>Click vào notification để navigate đến URL</li>
                <li>Notifications tự động dismiss sau 5 giây</li>
                <li>Queue: chỉ hiển thị 1 notification tại một thời điểm</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
};

export default NotificationTestPage;
