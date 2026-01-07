"use client";

import React from "react";
import { useNotificationBanner } from "@/context/notification-banner-context";
import { BannerNotificationComponent } from "./banner-notification";

export const BannerNotificationContainer: React.FC = () => {
  const { notifications, dismissNotification, markAsRead } = useNotificationBanner();

  // Only show the first notification in queue
  const currentNotification = notifications[0];

  if (!currentNotification) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      <BannerNotificationComponent
        notification={currentNotification}
        onDismiss={dismissNotification}
        onMarkAsRead={markAsRead}
      />
    </div>
  );
};
