import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hook';
import { setWidgetView, clearTyping } from '@/features/chat/chatSlice';
import { markAsRead } from '@/features/chat/chatThunk';
import { webSocketService } from '@/features/chat/websocket.service';
import type { Message } from '@/features/chat/chat-type';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, X, Building, UserCircle } from 'lucide-react';
import { format } from 'date-fns';
import logger from '@/utils/logger';

interface ActiveChatViewProps {
    onClose: () => void;
}

const ActiveChatView: React.FC<ActiveChatViewProps> = ({ onClose }) => {
    const [message, setMessage] = useState('');
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();
    const { currentRoom, typingUsers } = useAppSelector((state) => state.chat);

    // Get current user ID
    const getCurrentUserId = () => {
        const userData = sessionStorage.getItem('user');
        if (!userData) return null;
        const user = JSON.parse(userData);
        return user.id || user._id;
    };

    // Scroll to bottom on new messages
    useEffect(() => {
        scrollToBottom();
    }, [currentRoom?.messages]);

    // Join chat room and mark messages as read when viewing
    useEffect(() => {
        if (currentRoom?._id) {
            // Join the socket room for real-time updates
            webSocketService.joinChatRoom(currentRoom._id);
            // Mark as read
            dispatch(markAsRead(currentRoom._id));

            // Cleanup: leave room when component unmounts or room changes
            return () => {
                logger.debug('[ActiveChatView] Cleanup - leaving room:', currentRoom._id);
                webSocketService.leaveChatRoom(currentRoom._id);
            };
        }
    }, [currentRoom?._id, dispatch]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleBack = () => {
        dispatch(setWidgetView('list'));
    };

    const handleSendMessage = async () => {
        if (!message.trim() || !currentRoom) return;

        const userData = sessionStorage.getItem('user');
        if (!userData) {
            alert('Vui lòng đăng nhập để gửi tin nhắn');
            return;
        }

        // Use room-specific send message for reliability and history
        webSocketService.sendMessageToRoom(
            currentRoom._id,
            message.trim(),
            'text'
        );

        setMessage('');
        clearTypingIndicator();
    };

    const handleTyping = () => {
        if (!currentRoom?._id) return;

        webSocketService.sendTyping(currentRoom._id, true);

        if (typingTimeout) clearTimeout(typingTimeout);

        const timeout = setTimeout(() => {
            if (currentRoom._id) {
                webSocketService.sendTyping(currentRoom._id, false);
            }
        }, 1000);

        setTypingTimeout(timeout);
    };

    const clearTypingIndicator = () => {
        if (typingTimeout) clearTimeout(typingTimeout);
        if (currentRoom?._id) {
            webSocketService.sendTyping(currentRoom._id, false);
            dispatch(clearTyping({ chatRoomId: currentRoom._id }));
        }
    };

    const isUserMessage = (senderId: string) => {
        const currentUserId = getCurrentUserId();
        return senderId === currentUserId;
    };

    const formatTime = (dateString: string | Date) => {
        try {
            const date = new Date(dateString);
            return format(date, 'HH:mm');
        } catch {
            return '';
        }
    };

    if (!currentRoom) {
        return (
            <div className="flex items-center justify-center h-full p-8 text-center text-muted-foreground">
                <div>
                    <p className="text-lg font-medium mb-2">Không tìm thấy cuộc trò chuyện</p>
                    <Button variant="outline" onClick={handleBack}>
                        Quay lại
                    </Button>
                </div>
            </div>
        );
    }

    const isCoachRoom = !!currentRoom.coach;
    const actorName = isCoachRoom
        ? currentRoom.coach?.displayName || 'Coach'
        : currentRoom.fieldOwner?.facilityName || 'Field Owner';

    // Check if someone is typing
    const isOtherTyping = Object.keys(typingUsers).some(
        (userId) => typingUsers[userId] && userId !== getCurrentUserId()
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleBack}
                            className="flex-shrink-0"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>

                        {/* Avatar */}
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isCoachRoom
                                ? 'bg-secondary/10 text-secondary'
                                : 'bg-primary/10 text-primary'
                                }`}
                        >
                            {isCoachRoom ? (
                                <UserCircle className="w-6 h-6" />
                            ) : (
                                <Building className="w-6 h-6" />
                            )}
                        </div>

                        {/* Name and Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground truncate">
                                    {actorName}
                                </h3>
                                <Badge
                                    variant="outline"
                                    className={`text-xs px-1.5 py-0 ${isCoachRoom
                                        ? 'border-secondary/30 text-secondary bg-secondary/5'
                                        : 'border-primary/30 text-primary bg-primary/5'
                                        }`}
                                >
                                    {isCoachRoom ? 'Huấn luyện viên' : 'Sân bóng'}
                                </Badge>
                            </div>
                            {currentRoom.field && (
                                <p className="text-xs text-muted-foreground truncate">
                                    Về sân: {currentRoom.field.name}
                                </p>
                            )}
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="flex-shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
                {currentRoom.messages.length === 0 ? (
                    <div className="text-center text-muted-foreground mt-10">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h4 className="font-medium mb-2">Bắt đầu cuộc trò chuyện</h4>
                        <p className="text-sm">Gửi tin nhắn đầu tiên cho {actorName}</p>
                    </div>
                ) : (
                    <>
                        {currentRoom.messages.map((msg: Message, index: number) => {
                            const isCurrentUserMessage = isUserMessage(msg.sender);

                            return (
                                <div
                                    key={msg._id || index}
                                    className={`flex mb-4 ${isCurrentUserMessage ? 'justify-end' : 'justify-start'
                                        }`}
                                >
                                    <div
                                        className={`max-w-[70%] rounded-lg p-3 ${isCurrentUserMessage
                                            ? 'bg-primary text-primary-foreground rounded-br-none'
                                            : 'bg-muted text-foreground rounded-bl-none'
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap break-words">
                                            {msg.content}
                                        </p>
                                        <div
                                            className={`text-xs mt-1 flex justify-end gap-1 ${isCurrentUserMessage
                                                ? 'text-primary-foreground/70'
                                                : 'text-muted-foreground'
                                                }`}
                                        >
                                            {formatTime(msg.sentAt)}
                                            {msg.isRead && isCurrentUserMessage && (
                                                <span>✓✓</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Typing Indicator */}
                        {isOtherTyping && (
                            <div className="flex justify-start mb-4">
                                <div className="bg-muted text-foreground rounded-lg p-3 rounded-bl-none">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </>
                )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-background">
                <div className="flex items-center gap-2">
                    <Input
                        placeholder={`Nhập tin nhắn gửi đến ${actorName}...`}
                        value={message}
                        onChange={(e) => {
                            setMessage(e.target.value);
                            handleTyping();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
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
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        size="icon"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    Nhấn Enter để gửi • Shift + Enter để xuống dòng
                </p>
            </div>
        </div>
    );
};

// Add missing import
import { MessageCircle } from 'lucide-react';

export default ActiveChatView;
