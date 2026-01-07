"use client";

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { type BannerNotification, NotificationType } from "@/types/notification-type";
import axiosInstance from "@/utils/axios/axiosPrivate";
import logger from "@/utils/logger";

interface NotificationBannerContextType {
  notifications: BannerNotification[];
  showNotification: (notification: BannerNotification) => void;
  dismissNotification: (id: string) => void;
  markAsRead: (id: string) => Promise<void>;
  clearAll: () => void;
  testNotification: (type?: NotificationType) => void;
}

const NotificationBannerContext = createContext<NotificationBannerContextType | undefined>(undefined);

export const useNotificationBanner = () => {
  const context = useContext(NotificationBannerContext);
  if (!context) {
    throw new Error("useNotificationBanner must be used within NotificationBannerProvider");
  }
  return context;
};

interface NotificationBannerProviderProps {
  children: ReactNode;
}

export const NotificationBannerProvider: React.FC<NotificationBannerProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<BannerNotification[]>([]);

  const showNotification = useCallback((notification: BannerNotification) => {
    setNotifications((prev) => {
      // Avoid duplicates
      if (prev.some((n) => n.id === notification.id)) {
        return prev;
      }
      return [...prev, notification];
    });
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await axiosInstance.patch(`/notifications/${id}/read`);
      logger.debug("Notification marked as read:", id);
    } catch (error) {
      logger.error("Error marking notification as read:", error);
    }
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const testNotification = useCallback((type?: NotificationType) => {
    const allTypes = Object.values(NotificationType);
    const selectedType = type || allTypes[Math.floor(Math.random() * allTypes.length)];

    const sampleMessages: Record<string, { title: string; message: string }> = {
      [NotificationType.BOOKING_CONFIRMED]: {
        title: "Đặt sân thành công",
        message: "Đơn đặt sân của bạn đã được xác nhận",
      },
      [NotificationType.BOOKING_CANCELLED]: {
        title: "Đặt sân bị hủy",
        message: "Đơn đặt sân của bạn đã bị hủy",
      },
      [NotificationType.PAYMENT_SUCCESS]: {
        title: "Thanh toán thành công",
        message: "Giao dịch thanh toán đã được xử lý thành công",
      },
      [NotificationType.PAYMENT_FAILED]: {
        title: "Thanh toán thất bại",
        message: "Giao dịch thanh toán không thành công. Vui lòng thử lại",
      },
      [NotificationType.NEW_TOURNAMENT]: {
        title: "Giải đấu mới",
        message: "Có giải đấu mới đang được tổ chức",
      },
      [NotificationType.NEW_REVIEW]: {
        title: "Đánh giá mới",
        message: "Bạn có đánh giá mới từ khách hàng",
      },
      [NotificationType.COACH_REQUEST]: {
        title: "Yêu cầu huấn luyện viên",
        message: "Có yêu cầu đặt huấn luyện viên mới",
      },
      [NotificationType.FIELD_APPROVAL]: {
        title: "Sân được duyệt",
        message: "Sân thể thao của bạn đã được phê duyệt",
      },
      [NotificationType.REPORT_SUBMITTED]: {
        title: "Báo cáo đã gửi",
        message: "Báo cáo của bạn đã được gửi thành công",
      },
      [NotificationType.INVOICE_GENERATED]: {
        title: "Hóa đơn mới",
        message: "Bạn có hóa đơn mới cần thanh toán",
      },
      [NotificationType.INVOICE_OVERDUE]: {
        title: "Hóa đơn quá hạn",
        message: "Bạn có hóa đơn quá hạn thanh toán",
      },
      [NotificationType.SUBSCRIPTION_SUSPENDED]: {
        title: "Gói dịch vụ bị tạm ngưng",
        message: "Gói dịch vụ của bạn đã bị tạm ngưng",
      },
      [NotificationType.SUBSCRIPTION_REACTIVATED]: {
        title: "Gói dịch vụ được kích hoạt",
        message: "Gói dịch vụ của bạn đã được kích hoạt lại",
      },
      [NotificationType.PAYMENT_PROOF_SUBMITTED]: {
        title: "Bằng chứng thanh toán",
        message: "Bằng chứng thanh toán đã được gửi",
      },
      [NotificationType.ADMIN_NOTIFICATION]: {
        title: "Thông báo từ quản trị viên",
        message: "Bạn có thông báo quan trọng từ hệ thống",
      },
      [NotificationType.BOOKMARKED_FIELD_PRICE_CHANGED]: {
        title: "Giá sân thay đổi",
        message: "Sân bạn đã bookmark có thay đổi giá",
      },
      [NotificationType.BOOKMARKED_FIELD_STATUS_CHANGED]: {
        title: "Trạng thái sân thay đổi",
        message: "Sân bạn đã bookmark có thay đổi trạng thái",
      },
      [NotificationType.BOOKMARKED_COACH_PRICE_CHANGED]: {
        title: "Giá HLV thay đổi",
        message: "HLV bạn đã bookmark có thay đổi giá",
      },
      [NotificationType.BOOKMARKED_COACH_STATUS_CHANGED]: {
        title: "Trạng thái HLV thay đổi",
        message: "HLV bạn đã bookmark có thay đổi trạng thái",
      },
    };

    const sample = sampleMessages[selectedType] || {
      title: "Thông báo mới",
      message: "Bạn có thông báo mới từ hệ thống",
    };

    const testNotification: BannerNotification = {
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: sample.title,
      message: sample.message,
      type: selectedType,
      url: "/notifications",
      createdAt: new Date().toISOString(),
    };

    showNotification(testNotification);
  }, [showNotification]);

  return (
    <NotificationBannerContext.Provider
      value={{
        notifications,
        showNotification,
        dismissNotification,
        markAsRead,
        clearAll,
        testNotification,
      }}
    >
      {children}
    </NotificationBannerContext.Provider>
  );
};
