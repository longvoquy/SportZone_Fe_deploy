import React, { useState, useEffect, useRef } from "react";
import { Send, X, MessageCircle, Building } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store/hook";
import { clearTyping } from "@/features/chat/chatSlice";
import { webSocketService } from "@/features/chat/websocket.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import type { Message } from "@/features/chat/chat-type";

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
    const [localMessages, setLocalMessages] = useState<Message[]>([]);
    const [localRoomId, setLocalRoomId] = useState<string | null>(null);

    const { currentRoom, loading } = useAppSelector((state) => state.chat);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (isOpen) {
            // Connect WebSocket
            webSocketService.connect();
        }
    }, [isOpen]);

    useEffect(() => {
        if (currentRoom) {
            setLocalRoomId(currentRoom._id);
            setLocalMessages(currentRoom.messages || []);
        }
    }, [currentRoom]);

    useEffect(() => {
        scrollToBottom();
    }, [localMessages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async () => {
        if (!message.trim()) return;

        // Get user data from sessionStorage
        const userData = sessionStorage.getItem("user");
        if (!userData) {
            alert("Vui lòng đăng nhập để gửi tin nhắn");
            return;
        }

        // Send message via WebSocket - room will be created automatically on the backend
        webSocketService.sendMessage({
            fieldOwnerId,
            fieldId,
            content: message.trim(),
            type: "text",
        });

        // Add message locally for immediate display
        const user = JSON.parse(userData);
        const newMessage: Message = {
            sender: user._id,
            type: 'text',
            content: message.trim(),
            isRead: false,
            sentAt: new Date().toISOString(),
        };

        setLocalMessages(prev => [...prev, newMessage]);
        setMessage("");
        clearTypingIndicator();
    };

    const handleTyping = () => {
        if (!localRoomId) return;

        webSocketService.sendTyping(localRoomId, true);

        if (typingTimeout) clearTimeout(typingTimeout);

        const timeout = setTimeout(() => {
            if (localRoomId) {
                webSocketService.sendTyping(localRoomId, false);
            }
        }, 1000);

        setTypingTimeout(timeout);
    };

    const clearTypingIndicator = () => {
        if (typingTimeout) clearTimeout(typingTimeout);
        if (localRoomId) {
            webSocketService.sendTyping(localRoomId, false);
        }
        dispatch(clearTyping({ chatRoomId: localRoomId || "" }));
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
            <div className="relative w-[90%] max-w-2xl h-[80%] bg-white rounded-lg shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-gray-50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Building className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Trò chuyện với {fieldOwnerName}</h3>
                            <p className="text-sm text-gray-600">Về sân: {fieldName}</p>
                            {!localRoomId && (
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
                <ScrollArea className="flex-1 p-4">
                    {loading ? (
                        <div className="text-center py-8">Đang tải cuộc trò chuyện...</div>
                    ) : localMessages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">
                            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h4 className="font-medium mb-2">Bắt đầu cuộc trò chuyện</h4>
                            <p className="text-sm">Gửi tin nhắn đầu tiên cho {fieldOwnerName}</p>
                            <p className="text-xs text-gray-500 mt-2">
                                Hãy hỏi về lịch trống, giá thuê hoặc bất kỳ thắc mắc nào khác
                            </p>
                        </div>
                    ) : (
                        localMessages.map((msg: Message, index: number) => {
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