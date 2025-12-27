import React, { useEffect, useRef, useState } from "react";
import { Send, X, MessageCircle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { getChatRoom, startCoachChat } from "@/features/chat/chatThunk";
import { clearTyping, setCurrentRoom } from "@/features/chat/chatSlice";
import { webSocketService } from "@/features/chat/websocket.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import type { Message } from "@/features/chat/chat-type";
import { getCoachIdByUserId } from "@/features/coach";
import logger from "@/utils/logger";

interface CoachDetailChatWindowProps {
    onClose: () => void;
    coachId: string;
    coachName: string;
    isOpen: boolean;
    fieldId?: string;
}

const CoachDetailChatWindow: React.FC<CoachDetailChatWindowProps> = ({
    onClose,
    coachId,
    coachName,
    isOpen,
    fieldId,
}) => {
    const [message, setMessage] = useState("");
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [localMessages, setLocalMessages] = useState<Message[]>([]);
    const { rooms, currentRoom, loading } = useAppSelector((s) => s.chat);
    const { resolvedCoachId } = useAppSelector((s) => s.coach);
    const dispatch = useAppDispatch();

    // No auto-connection on open; handled in init effect below

    useEffect(() => {
        if (currentRoom?.messages?.length) setLocalMessages([...currentRoom.messages]);
        else setLocalMessages([]);
    }, [currentRoom?.messages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [localMessages]);

    // Disconnect and cleanup when popup closes to avoid background activity
    useEffect(() => {
        if (!isOpen) {
            try {
                if (currentRoom?._id) webSocketService.sendTyping(currentRoom._id, false);
            } catch { }
            webSocketService.disconnect();
            dispatch(setCurrentRoom(null));
            setLocalMessages([]);
            lastInitForId.current = null;
        }
    }, [isOpen, currentRoom?._id, dispatch]);

    // Resolve coach profileId from coach userId to satisfy backend /chat/coach/start
    useEffect(() => {
        if (!coachId) return;
        // Try to resolve profile id; harmless if already resolved elsewhere
        dispatch(getCoachIdByUserId(coachId) as any).catch(() => { });
    }, [coachId, dispatch]);

    const lastInitForId = useRef<string | null>(null);
    useEffect(() => {
        if (!isOpen) return;
        const targetCoachId = resolvedCoachId || coachId; // Prefer CoachProfile._id
        if (!targetCoachId) return;
        if (lastInitForId.current === targetCoachId) return;
        lastInitForId.current = targetCoachId;

        webSocketService.connect();

        const mapKey = `chat:coach:roomId:${targetCoachId}:${fieldId || 'none'}`;
        const savedRoomId = localStorage.getItem(mapKey);

        const hydrateFromLocal = (roomId: string) => {
            try {
                const saved = localStorage.getItem(`chat:messages:${roomId}`);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed?.messages)) setLocalMessages(parsed.messages);
                }
            } catch { }
        };

        const useRoom = async (roomId: string) => {
            webSocketService.joinChatRoom(roomId);
            hydrateFromLocal(roomId);
            await dispatch(getChatRoom(roomId));
        };

        const existingRoom = rooms.find(r => r.coach?._id === targetCoachId);
        if (existingRoom) {
            dispatch(setCurrentRoom(existingRoom));
            useRoom(existingRoom._id);
            localStorage.setItem(mapKey, existingRoom._id);
            return;
        }

        if (savedRoomId) {
            dispatch(setCurrentRoom({ _id: savedRoomId, messages: [] } as any));
            useRoom(savedRoomId);
            return;
        }

        (async () => {
            try {
                const room = await dispatch(startCoachChat({ coachId: targetCoachId, fieldId })).unwrap();
                dispatch(setCurrentRoom(room));
                webSocketService.joinChatRoom(room._id);
                await dispatch(getChatRoom(room._id));
                localStorage.setItem(mapKey, room._id);
            } catch (e) {
                logger.error('Failed to initialize coach chat room:', e);
                dispatch(setCurrentRoom(null));
                setLocalMessages([]);
            }
        })();
    }, [isOpen, coachId, resolvedCoachId, fieldId, rooms, dispatch]);

    useEffect(() => {
        if (currentRoom?._id) {
            try {
                localStorage.setItem(
                    `chat:messages:${currentRoom._id}`,
                    JSON.stringify({ messages: localMessages, updatedAt: Date.now() })
                );
            } catch { }
        }
    }, [currentRoom?._id, localMessages]);

    const handleSendMessage = async () => {
        if (!message.trim()) return;
        const userData = sessionStorage.getItem("user");
        if (!userData) {
            alert("Vui lòng đăng nhập để gửi tin nhắn");
            return;
        }
        const targetCoachId = resolvedCoachId || coachId;
        let roomId = currentRoom?._id;
        if (!roomId) {
            try {
                const room = await dispatch(startCoachChat({ coachId: targetCoachId!, fieldId })).unwrap();
                roomId = room._id;
                dispatch(setCurrentRoom(room));
                webSocketService.joinChatRoom(roomId);
                localStorage.setItem(`chat:coach:roomId:${targetCoachId}:${fieldId || 'none'}`, roomId);
            } catch (e) {
                logger.error('Cannot start coach chat to send message:', e);
                return;
            }
        }
        webSocketService.sendMessageToRoom(roomId!, message.trim(), 'text');
        const user = JSON.parse(userData);
        const newMessage: Message = {
            sender: user.id || user._id,
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
        if (!currentRoom?._id) return;
        webSocketService.sendTyping(currentRoom._id, true);
        if (typingTimeout) clearTimeout(typingTimeout);
        const timeout = setTimeout(() => {
            if (currentRoom?._id) webSocketService.sendTyping(currentRoom._id, false);
        }, 1000);
        setTypingTimeout(timeout);
    };

    const clearTypingIndicator = () => {
        if (typingTimeout) clearTimeout(typingTimeout);
        if (currentRoom?._id) webSocketService.sendTyping(currentRoom._id, false);
        dispatch(clearTyping({ chatRoomId: currentRoom?._id || "" }));
    };

    const isUserMessage = (senderId: string) => {
        const userData = sessionStorage.getItem("user");
        if (!userData) return false;
        const user = JSON.parse(userData);
        return senderId === (user.id || user._id);
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
                <div className="p-4 border-b flex items-center justify-between bg-gray-50 rounded-t-lg">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <MessageCircle className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-gray-900">Trò chuyện với HLV</h3>
                            <p className="text-sm text-gray-600">{coachName}</p>
                            {!currentRoom && (
                                <p className="text-xs text-yellow-600 mt-1">Phòng chat sẽ được tạo khi bạn gửi tin nhắn đầu tiên</p>
                            )}
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-200">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <ScrollArea className="flex-1 min-h-0 p-4 overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-8">Đang tải cuộc trò chuyện...</div>
                    ) : localMessages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">
                            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h4 className="font-medium mb-2">Bắt đầu cuộc trò chuyện</h4>
                            <p className="text-sm">Gửi tin nhắn đầu tiên cho {coachName}</p>
                            <p className="text-xs text-gray-500 mt-2">Hãy hỏi về lịch dạy, giá buổi học hoặc bất kỳ thắc mắc nào</p>
                        </div>
                    ) : (
                        localMessages.map((msg, idx) => {
                            const isCurrentUserMessage = isUserMessage(msg.sender);
                            return (
                                <div key={idx} className={`flex mb-4 ${isCurrentUserMessage ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-lg p-3 ${isCurrentUserMessage ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                                        <p className="text-sm">{msg.content}</p>
                                        <div className={`text-xs mt-1 flex justify-end ${isCurrentUserMessage ? 'text-blue-200' : 'text-gray-500'}`}>
                                            {formatTime(msg.sentAt)}
                                            {msg.isRead && isCurrentUserMessage && <span className="ml-1">✓</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </ScrollArea>

                <div className="p-4 border-t">
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder={`Nhập tin nhắn gửi đến ${coachName}...`}
                            value={message}
                            onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            onBlur={clearTypingIndicator}
                            className="flex-1"
                        />
                        <Button onClick={handleSendMessage} disabled={!message.trim()} className="bg-blue-500 hover:bg-blue-600 text-white">
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">Nhấn Enter để gửi • Thường phản hồi trong vòng 24 giờ</p>
                </div>
            </div>
        </div>
    );
};

export default CoachDetailChatWindow;