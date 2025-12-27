import React, { useState, useEffect, useRef } from "react";
import { Send, X, MessageCircle } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store/hook";
import { getChatRoom, startChat } from "@/features/chat/chatThunk";
import { setCurrentRoom, clearTyping } from "@/features/chat/chatSlice";
import { webSocketService } from "@/features/chat/websocket.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import type { Message } from "@/features/chat/chat-type";
import logger from "@/utils/logger";

interface FieldDetailChatWindowProps {
    onClose: () => void;
    fieldOwnerId: string;
    fieldId: string;
    fieldName: string;
    fieldOwnerName: string;
    isOpen: boolean;
}

const FieldDetailChatWindow: React.FC<FieldDetailChatWindowProps> = ({
    onClose,
    fieldOwnerId,
    fieldId,
    fieldName,
    fieldOwnerName,
    isOpen,
}) => {
    const [message, setMessage] = useState("");
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { currentRoom, loading } = useAppSelector((state) => state.chat);
    const dispatch = useAppDispatch();

    // Connect/disconnect WebSocket and cleanup
    useEffect(() => {
        if (isOpen) {
            webSocketService.connect();
        } else {
            try {
                if (currentRoom?._id) webSocketService.sendTyping(currentRoom._id, false);
            } catch { }
            // webSocketService.disconnect(); // Don't disconnect globally
            dispatch(setCurrentRoom(null));
        }
    }, [isOpen, currentRoom?._id, dispatch]);

    // Auto-scroll on new messages
    useEffect(() => {
        scrollToBottom();
    }, [currentRoom?.messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Initialize chat room
    useEffect(() => {
        if (!isOpen || !fieldOwnerId) return;

        const initRoom = async () => {
            try {
                // Create or get existing room
                const room = await dispatch(
                    startChat({ fieldOwnerId, fieldId })
                ).unwrap();

                // Set as current room
                dispatch(setCurrentRoom(room));

                // Join socket room for real-time updates
                webSocketService.joinChatRoom(room._id);

                // Fetch full message history
                await dispatch(getChatRoom(room._id));

            } catch (error) {
                logger.error('Failed to initialize chat:', error);
                dispatch(setCurrentRoom(null));
            }
        };

        initRoom();
    }, [isOpen, fieldOwnerId, fieldId, dispatch]);

    // Ensure we stay joined to the active room for realtime events
    useEffect(() => {
        if (currentRoom?._id) {
            webSocketService.joinChatRoom(currentRoom._id);
        }
    }, [currentRoom?._id]);

    const handleSendMessage = async () => {
        logger.debug('[FieldDetailChatWindow] handleSendMessage called', {
            hasMessage: !!message.trim(),
            hasCurrentRoom: !!currentRoom,
            currentRoomId: currentRoom?._id,
        });

        if (!message.trim() || !currentRoom?._id) {
            logger.warn('[FieldDetailChatWindow] Cannot send - missing message or room', {
                message: message.trim(),
                currentRoomId: currentRoom?._id,
            });
            return;
        }

        const userData = sessionStorage.getItem("user");
        if (!userData) {
            alert("Vui lòng đăng nhập để gửi tin nhắn");
            return;
        }

        logger.debug('[FieldDetailChatWindow] Sending message via WebSocket', {
            roomId: currentRoom._id,
            contentLength: message.trim().length,
        });

        // Use room-specific send for persistence
        webSocketService.sendMessageToRoom(
            currentRoom._id,
            message.trim(),
            'text'
        );

        setMessage("");
        clearTypingIndicator();
    };

    const handleTyping = () => {
        if (!currentRoom?._id) return;

        webSocketService.sendTyping(currentRoom._id, true);

        if (typingTimeout) clearTimeout(typingTimeout);

        const timeout = setTimeout(() => {
            if (currentRoom?._id) {
                webSocketService.sendTyping(currentRoom._id, false);
            }
        }, 1000);

        setTypingTimeout(timeout);
    };

    const clearTypingIndicator = () => {
        if (typingTimeout) clearTimeout(typingTimeout);
        if (currentRoom?._id) {
            webSocketService.sendTyping(currentRoom._id, false);
        }
        dispatch(clearTyping({ chatRoomId: currentRoom?._id || "" }));
    };

    const isUserMessage = (senderId: string) => {
        const userData = sessionStorage.getItem("user");
        if (!userData) return false;
        const user = JSON.parse(userData);
        return senderId === user._id;
    };

    const formatTime = (dateString: string | Date) => {
        try {
            const date = new Date(dateString);
            return format(date, "HH:mm");
        } catch {
            return "";
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative w-[90%] max-w-2xl h-[80%] bg-white rounded-lg shadow-2xl flex flex-col min-h-0">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-gray-50 rounded-t-lg">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <MessageCircle className="w-5 h-5 text-blue-600" />
                        </div>

                        <div className="text-left">
                            <h3 className="font-semibold text-gray-900">
                                Trò chuyện với chủ sân
                            </h3>
                            <p className="text-sm text-gray-600">
                                Về sân: {fieldName}
                            </p>

                            {!currentRoom && (
                                <p className="text-xs text-yellow-600 mt-1">
                                    Phòng chat sẽ được tạo khi bạn gửi tin nhắn đầu tiên
                                </p>
                            )}
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="hover:bg-gray-200"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1 min-h-0 p-4 overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-8">Đang tải cuộc trò chuyện...</div>
                    ) : !currentRoom?.messages || currentRoom.messages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">
                            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h4 className="font-medium mb-2">Bắt đầu cuộc trò chuyện</h4>
                            <p className="text-sm">Gửi tin nhắn đầu tiên cho {fieldOwnerName}</p>
                            <p className="text-xs text-gray-500 mt-2">
                                Hãy hỏi về lịch trống, giá thuê hoặc bất kỳ thắc mắc nào khác
                            </p>
                        </div>
                    ) : (
                        currentRoom.messages.map((msg: Message, index: number) => {
                            const isCurrentUserMessage = isUserMessage(msg.sender);

                            return (
                                <div
                                    key={index}
                                    className={`flex mb-4 ${isCurrentUserMessage ? "justify-end" : "justify-start"
                                        }`}
                                >
                                    <div
                                        className={`max-w-[70%] rounded-lg p-3 ${isCurrentUserMessage
                                            ? "bg-blue-500 text-white rounded-br-none"
                                            : "bg-gray-100 text-gray-800 rounded-bl-none"
                                            }`}
                                    >
                                        <p className="text-sm">{msg.content}</p>
                                        <div className={`text-xs mt-1 flex justify-end ${isCurrentUserMessage ? "text-blue-200" : "text-gray-500"
                                            }`}>
                                            {formatTime(msg.sentAt)}
                                            {msg.isRead && isCurrentUserMessage && (
                                                <span className="ml-1">✓</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder={`Nhập tin nhắn gửi đến ${fieldOwnerName}...`}
                            value={message}
                            onChange={(e) => {
                                setMessage(e.target.value);
                                handleTyping();
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            onBlur={clearTypingIndicator}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={!message.trim()}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                        Nhấn Enter để gửi • Thường phản hồi trong vòng 24 giờ
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FieldDetailChatWindow;