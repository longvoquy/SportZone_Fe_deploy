import React, { useEffect, useRef, useState } from "react";
import logger from "@/utils/logger";
import { FieldOwnerDashboardLayout } from "@/components/layouts/field-owner-dashboard-layout";
import { useAppSelector, useAppDispatch } from "@/store/hook";
import { getChatRoom, markAsRead, getFieldOwnerChatRooms } from "@/features/chat/chatThunk";
import { setCurrentRoom } from "@/features/chat/chatSlice";
import { webSocketService } from "@/features/chat/websocket.service";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageCircle, User, Calendar, MapPin, Send } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import type { Message } from "@/features/chat/chat-type";
import axiosPrivate from "@/utils/axios/axiosPrivate";
import { Loading } from "@/components/ui/loading";

const FieldOwnerChatDashboard: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [message, setMessage] = useState("");
    const [localMessages, setLocalMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);


    const { rooms, currentRoom, loading, typingUsers } = useAppSelector((state) => state.chat);
    const dispatch = useAppDispatch();
    const fieldOwnerData = sessionStorage.getItem("user");
    const fieldOwner = fieldOwnerData ? JSON.parse(fieldOwnerData) : null;
    const fieldOwnerId = fieldOwner?.id || fieldOwner?._id;

    // Update the filteredRooms function
    const filteredRooms = Array.isArray(rooms)
        ? rooms.filter(room => {
            // Basic validation
            if (!room || !room.fieldOwner) return false;

            // The backend should have already filtered rooms for this field owner
            // So we can trust all rooms in the array belong to the current user

            // Rest of filtering...
            const userName = room?.user?.fullName || "";
            const fieldName = room?.field?.name || "";

            const matchesSearch =
                userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                fieldName.toLowerCase().includes(searchQuery.toLowerCase());



            return matchesSearch;
        })
        : [];

    // After fetching rooms, add this:
    useEffect(() => {
        logger.debug('Rooms fetched', { count: rooms.length });
    }, [rooms]);

    const getFieldOwnerProfile = async () => {
        try {
            // Use axiosPrivate since this requires authentication
            const response = await axiosPrivate.get(`/field-owner/profile/`);
            return response.data;
        } catch (error) {
            logger.error("Error fetching field owner profile:", error);
            return null;
        }
    };

    useEffect(() => {
        const userData = sessionStorage.getItem("user");
        if (!userData) return;

        // const user = JSON.parse(userData);
        // const userId = user.id || user._id;

        getFieldOwnerProfile().then(profile => {
            if (profile) {
                logger.debug("Field owner profile loaded");
            }
        });
    }, []);

    // In FieldOwnerChatPage.tsx, update the useEffect for fetching profile:

    useEffect(() => {
        const userData = sessionStorage.getItem("user");
        if (!userData) return;

        const user = JSON.parse(userData);
        const userId = user.id || user._id;
        if (!userId) return;

        // Ensure socket is connected for realtime updates
        webSocketService.connect();

        // Load profile and rooms (kept lightweight; rooms also loaded via thunk)
        const init = async () => {
            try {
                const response = await axiosPrivate.get(`/field-owner/profile/`);
                if (response.data?.success) {
                    // setFieldOwnerProfile(response.data.data);
                }
            } catch (error) {
                logger.error("Error fetching field owner profile:", error);
            }
        };
        init();

        // Fetch rooms for owner
        dispatch(getFieldOwnerChatRooms());
    }, [dispatch]);

    // Always join active room on change so incoming messages arrive instantly
    useEffect(() => {
        if (currentRoom?._id) {
            webSocketService.joinChatRoom(currentRoom._id);
        }
    }, [currentRoom?._id]);


    useEffect(() => {
        if (currentRoom?.messages) {
            setLocalMessages(currentRoom.messages);
        } else {
            setLocalMessages([]);
        }
    }, [currentRoom?.messages]);

    const scrollToBottom = (smooth: boolean = true) => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
        }
    };

    // Auto-scroll when messages update or room changes
    useEffect(() => {
        scrollToBottom(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localMessages, currentRoom?._id]);

    const handleRoomClick = (room: any) => {
        dispatch(setCurrentRoom(room));
        dispatch(getChatRoom(room._id));
        if (room.hasUnread) {
            dispatch(markAsRead(room._id));
        }
        // Join WebSocket room
        webSocketService.joinChatRoom(room._id);
    };

    const getUnreadCountForRoom = (roomId: string) => {
        const room = rooms.find(r => r._id === roomId);
        if (!room || !room.messages) return 0;

        // For owner view: count unread messages sent by the customer (room.user)
        const customerId = room.user?._id;
        return room.messages.filter(msg => !msg.isRead && msg.sender === customerId).length || 0;
    };

    const handleSendMessage = async () => {
        if (!message.trim() || !currentRoom) return;

        // Send message directly to the chat room (owner reply)
        webSocketService.sendMessageToRoom(currentRoom._id, message.trim(), 'text');

        // Optimistic local append
        const newMessage: Message = {
            sender: fieldOwnerId || "",
            type: 'text',
            content: message.trim(),
            isRead: false,
            sentAt: new Date().toISOString(),
        };

        setLocalMessages(prev => [...prev, newMessage]);
        setMessage("");
    };

    // Mark messages as read when viewing the active room and new incoming arrives
    useEffect(() => {
        if (!currentRoom || localMessages.length === 0) return;
        const last = localMessages[localMessages.length - 1];
        // Only mark as read if the last message is from the other participant
        const customerId = currentRoom.user?._id;
        if (last && last.sender === customerId) {
            dispatch(markAsRead(currentRoom._id));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localMessages.length, currentRoom?._id]);

    const isUserMessage = (senderId: string) => {
        // Owner view: a user message if the sender equals the room's user._id
        const customerId = currentRoom?.user?._id;
        return senderId === customerId;
    };

    const formatTime = (dateString: string | Date) => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            const diffMinutes = Math.floor(diff / (1000 * 60));
            const diffHours = Math.floor(diff / (1000 * 60 * 60));
            const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

            if (diffMinutes < 1) return "Just now";
            if (diffMinutes < 60) return `${diffMinutes}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays === 1) return "Yesterday";
            if (diffDays < 7) return `${diffDays}d ago`;
            return format(date, "MMM d");
        } catch {
            return "";
        }
    };

    const formatMessageTime = (dateString: string | Date) => {
        try {
            const date = new Date(dateString);
            return format(date, "HH:mm");
        } catch {
            return "";
        }
    };

    return (
        <FieldOwnerDashboardLayout>
            <div className="w-full p-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Nhắn tin với khách hàng</h1>

                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left sidebar - Chat list */}
                    <div className="lg:col-span-1 bg-white rounded-lg shadow border">
                        {/* Search and filters */}
                        <div className="p-4 border-b">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Tìm tên khách hàng"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>


                        </div>

                        {/* Chat list */}
                        <ScrollArea className="h-[600px]">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center p-8 gap-3">
                                    <Loading size={32} className="text-blue-500" />
                                    <div className="text-gray-500 text-sm">Đang tải...</div>
                                </div>
                            ) : filteredRooms.length === 0 ? (
                                <div className="p-8 text-center">
                                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có cuộc trò chuyện nào</h3>
                                    <p className="text-gray-500">
                                        Khi khách hàng nhắn tin cho bạn, các cuộc trò chuyện sẽ xuất hiện ở đây
                                    </p>

                                </div>
                            ) : (
                                filteredRooms.map((room) => {
                                    const unreadCount = getUnreadCountForRoom(room._id);
                                    const lastMessage = room.messages?.[room.messages.length - 1];

                                    return (
                                        <div
                                            key={room._id}
                                            onClick={() => handleRoomClick(room)}
                                            className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${currentRoom?._id === room._id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-semibold text-gray-900 truncate">
                                                            {room.user?.fullName || "Unknown User"}
                                                        </h4>
                                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                                            {formatTime(room.lastMessageAt)}
                                                        </span>
                                                    </div>

                                                    <p className="text-sm text-gray-600 truncate mt-1">
                                                        {lastMessage?.content || "No messages yet"}
                                                    </p>

                                                    <div className="flex items-center gap-3 mt-2">
                                                        {room.field && (
                                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                <MapPin className="w-3 h-3" />
                                                                <span>{room.field.name}</span>
                                                            </div>
                                                        )}

                                                        {room.bookingId && (
                                                            <div className="flex items-center gap-1 text-xs text-blue-600">
                                                                <Calendar className="w-3 h-3" />
                                                                <span>Has Booking</span>
                                                            </div>
                                                        )}

                                                        {room.field?.sportType && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {room.field.sportType}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {unreadCount > 0 && (
                                                    <Badge className="bg-blue-500 text-white min-w-5 h-5 flex items-center justify-center">
                                                        {unreadCount}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </ScrollArea>
                    </div>

                    {/* Right side - Chat interface or placeholder */}
                    <div className="lg:col-span-2 min-h-0">
                        {currentRoom ? (
                            <div className="bg-white rounded-lg shadow border h-[600px] max-h-[600px] flex flex-col min-h-0 overflow-hidden">
                                {/* Chat header */}
                                <div className="p-4 border-b">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">

                                            <div className="text-left">
                                                <h3 className="font-semibold text-gray-900">
                                                    {currentRoom.user?.fullName || "Unknown User"}
                                                </h3>
                                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {currentRoom.user?.phone || "No phone"}
                                                    </span>
                                                    {currentRoom.field && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {currentRoom.field.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>


                                    </div>
                                </div>

                                {/* Messages area */}
                                <ScrollArea className="flex-1 min-h-0 p-4 overflow-y-auto">
                                    {localMessages.length === 0 ? (
                                        <div className="text-center text-gray-500 mt-10">
                                            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />

                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {localMessages.map((msg: Message, index: number) => {
                                                const isCustomerMessage = isUserMessage(msg.sender);
                                                const isRead = msg.isRead;

                                                return (
                                                    <div
                                                        key={index}
                                                        className={`flex ${isCustomerMessage ? "justify-start" : "justify-end"
                                                            }`}
                                                    >
                                                        <div
                                                            className={`max-w-[70%] rounded-lg p-3 ${isCustomerMessage
                                                                ? "bg-gray-100 text-gray-800 rounded-bl-none"
                                                                : "bg-blue-500 text-white rounded-br-none"
                                                                }`}
                                                        >
                                                            <p className="text-sm">{msg.content}</p>
                                                            <div className={`text-xs mt-1 flex justify-end ${isCustomerMessage ? "text-gray-500" : "text-blue-200"
                                                                }`}>
                                                                {formatMessageTime(msg.sentAt)}
                                                                {!isCustomerMessage && isRead && (
                                                                    <span className="ml-1">✓</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {/* Typing indicator */}
                                            {Object.entries(typingUsers).some(([userId, isTyping]) =>
                                                isTyping && userId !== fieldOwnerId
                                            ) && (
                                                    <div className="flex justify-start">
                                                        <div className="max-w-[70%] rounded-lg p-3 bg-gray-100 text-gray-800 rounded-bl-none">
                                                            <div className="flex space-x-1">
                                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </ScrollArea>

                                {/* Message input */}
                                <div className="p-4 border-t">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            placeholder="Nhập tin nhắn của bạn..."
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={handleSendMessage}
                                            disabled={!message.trim()}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>

                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow border h-[600px] max-h-[600px] flex flex-col items-center justify-center p-8 overflow-hidden">
                                <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    Chọn một cuộc trò chuyện để bắt đầu
                                </h3>



                                <div className="p-4 border rounded-lg bg-blue-50">
                                    <h4 className="font-medium text-blue-700 mb-2">Mẹo nhanh</h4>
                                    <ul className="text-sm text-gray-600 space-y-1, text-left">
                                        <li>• Trả lời trong 24h</li>
                                        <li>• Rõ ràng về giá cả</li>
                                        <li>• Chia sẻ điều khoản đặt chỗ</li>
                                        <li>• Xác nhận tình trạng sẵn có</li>
                                    </ul>
                                </div>



                            </div>
                        )}
                    </div>
                </div>
            </div>
        </FieldOwnerDashboardLayout>
    );
};

export default FieldOwnerChatDashboard;