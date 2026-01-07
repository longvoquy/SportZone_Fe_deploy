import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Trophy,
  Star,
  UserCheck,
  FileCheck,
  Receipt,
  CreditCard,
  Bell,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { NotificationType } from "@/types/notification-type";
import { type LucideIcon } from "lucide-react";

interface NotificationIconConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const getNotificationIcon = (type: NotificationType | string): NotificationIconConfig => {
  const iconMap: Record<string, NotificationIconConfig> = {
    [NotificationType.BOOKING_CONFIRMED]: {
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    [NotificationType.BOOKING_CANCELLED]: {
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    [NotificationType.PAYMENT_SUCCESS]: {
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    [NotificationType.PAYMENT_FAILED]: {
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    [NotificationType.NEW_TOURNAMENT]: {
      icon: Trophy,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    [NotificationType.NEW_REVIEW]: {
      icon: Star,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    [NotificationType.COACH_REQUEST]: {
      icon: UserCheck,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    [NotificationType.FIELD_APPROVAL]: {
      icon: FileCheck,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    [NotificationType.REPORT_SUBMITTED]: {
      icon: FileCheck,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    [NotificationType.INVOICE_GENERATED]: {
      icon: Receipt,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    [NotificationType.INVOICE_OVERDUE]: {
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    [NotificationType.SUBSCRIPTION_SUSPENDED]: {
      icon: ShieldAlert,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    [NotificationType.SUBSCRIPTION_REACTIVATED]: {
      icon: ShieldCheck,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    [NotificationType.PAYMENT_PROOF_SUBMITTED]: {
      icon: CreditCard,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    [NotificationType.ADMIN_NOTIFICATION]: {
      icon: Bell,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
    [NotificationType.BOOKMARKED_FIELD_PRICE_CHANGED]: {
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    [NotificationType.BOOKMARKED_FIELD_STATUS_CHANGED]: {
      icon: TrendingDown,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    [NotificationType.BOOKMARKED_COACH_PRICE_CHANGED]: {
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    [NotificationType.BOOKMARKED_COACH_STATUS_CHANGED]: {
      icon: TrendingDown,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
  };

  return iconMap[type] || {
    icon: Bell,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  };
};
