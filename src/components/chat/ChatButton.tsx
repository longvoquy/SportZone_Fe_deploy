import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { MessageCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAppSelector, useAppDispatch } from "@/store/hook";
import { getUnreadCount } from "@/features/chat/chatThunk";
import { webSocketService } from "@/features/chat/websocket.service";
import ChatWindow from "./ChatWindow";
import logger from "@/utils/logger";

// Create a ref to control ChatButton from outside
export interface ChatButtonRef {
  openChat: () => void;
  closeChat: () => void;
}

const ChatButton = forwardRef<ChatButtonRef>((_props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { unreadCount, connected } = useAppSelector((state) => state.chat);
  const dispatch = useAppDispatch();

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    openChat: () => {
      logger.debug("ChatButton: Opening chat via external trigger");
      setIsOpen(true);
    },
    closeChat: () => {
      setIsOpen(false);
    }
  }));

  useEffect(() => {
    // Get token from sessionStorage
    const storedToken = sessionStorage.getItem("user");
    setToken(storedToken);

    if (storedToken) {
      // Connect to WebSocket with user data from sessionStorage
      webSocketService.connect();
      
      // Get unread count
      dispatch(getUnreadCount());
    }

    return () => {
      webSocketService.disconnect();
    };
  }, [dispatch]);

  useEffect(() => {
    // Refresh unread count when connected
    if (connected) {
      dispatch(getUnreadCount());
    }
  }, [connected, dispatch]);

  if (!token) return null; // Don't show chat if not logged in

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all duration-300 hover:scale-110"
        aria-label="Open chat"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 min-w-5 h-5 flex items-center justify-center text-xs bg-red-500 text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </>
        )}
      </button>
      
      {isOpen && <ChatWindow onClose={() => setIsOpen(false)} fieldOwnerId={""} fieldId={""} fieldName={""} fieldOwnerName={""} isOpen={false} />}
    </>
  );
});

ChatButton.displayName = "ChatButton";

export default ChatButton;