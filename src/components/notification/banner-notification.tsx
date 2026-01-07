"use client";

import React, { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getNotificationIcon } from "./notification-icons";
import { type BannerNotification } from "@/types/notification-type";

interface BannerNotificationProps {
  notification: BannerNotification;
  onDismiss: (id: string) => void;
  onMarkAsRead?: (id: string) => Promise<void>;
}

export const BannerNotificationComponent: React.FC<BannerNotificationProps> = ({
  notification,
  onDismiss,
  onMarkAsRead,
}) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | 'up' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const autoDismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iconConfig = getNotificationIcon(notification.type);
  const Icon = iconConfig.icon;

  // Auto dismiss after 5 seconds
  useEffect(() => {
    autoDismissTimeoutRef.current = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300);
  };

  const handleClick = () => {
    if (notification.url) {
      if (notification.url.startsWith("http")) {
        // External URLs - use window.location
        window.location.href = notification.url;
      } else {
        // Internal routes - use navigate for smooth SPA navigation
        navigate(notification.url);
      }
      handleDismiss();
    }
  };

  const handleDrag = (event: any, info: any) => {
    // Track drag offset for visual feedback
    setDragOffset({ x: info.offset.x, y: info.offset.y });

    // Track drag direction for exit animation
    if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
      setDragDirection(info.offset.x > 0 ? 'right' : 'left');
    } else if (info.offset.y < 0) {
      setDragDirection('up');
    }
  };

  const handleDragEnd = async (event: any, info: any) => {
    // Dismiss if dragged up more than 50px
    if (info.offset.y < -50) {
      handleDismiss();
      return;
    }

    // Swipe left: mark as read if swiped 50-100px, dismiss if > 100px
    if (info.offset.x < -50) {
      if (info.offset.x < -100) {
        // Swipe left fully - dismiss
        handleDismiss();
      } else {
        // Swipe left partially - mark as read and dismiss
        if (onMarkAsRead) {
          await onMarkAsRead(notification.id);
        }
        handleDismiss();
      }
      return;
    }

    // Swipe right - dismiss
    if (info.offset.x > 100) {
      handleDismiss();
      return;
    }

    // Reset direction and offset if not dismissed
    setDragDirection(null);
    setDragOffset({ x: 0, y: 0 });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          drag
          dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
          dragElastic={0.2}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          initial={{ y: -200, opacity: 0 }}
          animate={{ y: 0, opacity: 1, x: 0 }}
          exit={
            dragDirection === 'left'
              ? { x: -500, opacity: 0, transition: { duration: 0.3 } }
              : dragDirection === 'right'
                ? { x: 500, opacity: 0, transition: { duration: 0.3 } }
                : { y: -200, opacity: 0, transition: { duration: 0.3 } }
          }
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 pointer-events-auto"
          style={{ paddingTop: "env(safe-area-inset-top, 0)" }}
        >
          {/* Mark as Read Indicator (shows when swiping left partially) */}
          {dragOffset.x < -50 && dragOffset.x > -100 && (
            <div className="absolute left-0 top-0 bottom-0 w-full flex items-center justify-start pl-4 pointer-events-none z-10">
              <div className="flex items-center gap-2 text-green-600 font-medium text-sm bg-green-50/90 px-3 py-2 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Đánh dấu đã đọc</span>
              </div>
            </div>
          )}

          <div
            className={`bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border overflow-hidden cursor-pointer transition-colors ${dragOffset.x < -50 && dragOffset.x > -100
                ? 'border-green-300 bg-green-50/95'
                : 'border-gray-200/50'
              }`}
            onClick={handleClick}
          >
            <div className="flex items-start gap-3 p-4">
              {/* Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full ${iconConfig.bgColor} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconConfig.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                  {notification.title}
                </h4>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {notification.message}
                </p>
                {notification.url && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClick();
                    }}
                    className="mt-2 text-xs font-medium text-green-600 hover:text-green-700"
                  >
                    Xem chi tiết →
                  </button>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss();
                }}
                className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-600" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
