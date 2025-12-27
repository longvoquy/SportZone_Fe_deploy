import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import logger from "@/utils/logger";
import type { ChatState, ChatRoom, SocketMessageEvent, TypingEvent } from "./chat-type";
import {
  getChatRooms,
  getChatRoom,
  startChat,
  markAsRead,
  getUnreadCount,
  getFieldOwnerChatRooms,
  getCoachChatRooms,
} from "./chatThunk";

const initialState: ChatState = {
  rooms: [],
  currentRoom: null,
  loading: false,
  error: null,
  unreadCount: 0,
  connected: false,
  typingUsers: {},
  widgetOpen: false,
  widgetView: 'list',
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setCurrentRoom: (state, action: PayloadAction<ChatRoom | null>) => {
      state.currentRoom = action.payload;
    },
    addMessage: (state, action: PayloadAction<SocketMessageEvent>) => {
      const { chatRoomId, message, chatRoom } = action.payload;

      logger.debug('chatSlice addMessage called', {
        chatRoomId,
        currentRoomId: state.currentRoom?._id,
        matchesCurrentRoom: state.currentRoom?._id === chatRoomId,
      });

      // Update current room if active, with de-duplication
      if (state.currentRoom?._id === chatRoomId) {
        const exists = state.currentRoom.messages.some((m) => {
          if (m._id && message._id) return m._id === message._id;
          const a = Number(new Date(m.sentAt).getTime());
          const b = Number(new Date(message.sentAt).getTime());
          const timeClose = Math.abs(a - b) <= 2000; // within 2s considered same
          return m.sender === message.sender && m.content === message.content && timeClose;
        });
        if (!exists) {
          logger.debug('Adding message to currentRoom');
          state.currentRoom.messages.push(message);
          state.currentRoom.lastMessageAt = new Date().toISOString();
          state.currentRoom.lastMessageBy = message.sender;
        } else {
          logger.debug('Message already exists in currentRoom, skipping');
        }
      }

      // Update rooms list
      const roomIndex = state.rooms.findIndex(room => room._id === chatRoomId);
      if (roomIndex !== -1) {
        logger.debug('Updating room in rooms list');
        state.rooms[roomIndex] = {
          ...chatRoom,
          hasUnread: state.currentRoom?._id !== chatRoomId,
        };

        // Move to top
        const updatedRoom = state.rooms.splice(roomIndex, 1)[0];
        state.rooms.unshift(updatedRoom);
      } else {
        logger.debug('Adding new room to rooms list');
        // Add new room
        state.rooms.unshift(chatRoom);
      }

      // Update unread count (only when not in active room)
      if (state.currentRoom?._id !== chatRoomId) {
        state.unreadCount += 1;
      }
    },
    setTyping: (state, action: PayloadAction<TypingEvent>) => {
      const { userId, isTyping, chatRoomId } = action.payload;
      if (state.currentRoom?._id === chatRoomId) {
        state.typingUsers[userId] = isTyping;
      }
    },
    clearTyping: (state, action: PayloadAction<{ chatRoomId: string }>) => {
      if (state.currentRoom?._id === action.payload.chatRoomId) {
        state.typingUsers = {};
      }
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
    },
    updateUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setWidgetOpen: (state, action: PayloadAction<boolean>) => {
      state.widgetOpen = action.payload;
      if (!action.payload) {
        state.widgetView = 'list'; // Reset to list view when closing
      }
    },
    setWidgetView: (state, action: PayloadAction<'list' | 'chat'>) => {
      state.widgetView = action.payload;
    },
    resetChatState: (state) => {
      logger.debug('Resetting chat state on logout');
      state.rooms = [];
      state.currentRoom = null;
      state.unreadCount = 0;
      state.typingUsers = {};
      state.connected = false;
      state.widgetOpen = false;
      state.widgetView = 'list';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getChatRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getChatRooms.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = action.payload;
      })
      .addCase(getChatRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(getChatRoom.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getChatRoom.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRoom = action.payload;
      })
      .addCase(getChatRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // In chatSlice.ts, add this case in extraReducers:

      .addCase(getFieldOwnerChatRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFieldOwnerChatRooms.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = action.payload;
      })
      .addCase(getFieldOwnerChatRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(getCoachChatRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCoachChatRooms.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = action.payload;
      })
      .addCase(getCoachChatRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(startChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startChat.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRoom = action.payload;
        // Add to rooms if not already there
        if (!state.rooms.find(room => room._id === action.payload._id)) {
          state.rooms.unshift(action.payload);
        }
      })
      .addCase(startChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(getUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.count;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        // action.meta.arg can be either a string (chatRoomId) or an object { chatRoomId: string }
        const chatRoomId =
          typeof action.meta.arg === "string"
            ? action.meta.arg
            : (action.meta.arg as { chatRoomId?: string }).chatRoomId;

        if (!chatRoomId) return;

        if (state.currentRoom?._id === chatRoomId) {
          state.currentRoom.messages.forEach(msg => {
            msg.isRead = true;
          });
          state.currentRoom.hasUnread = false;
        }

        // Update in rooms list
        const roomIndex = state.rooms.findIndex(room => room._id === chatRoomId);
        if (roomIndex !== -1) {
          state.rooms[roomIndex].hasUnread = false;
          state.rooms[roomIndex].messages.forEach(msg => {
            msg.isRead = true;
          });
        }

        // Update unread count
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      });
  },
});

export const {
  setCurrentRoom,
  addMessage,
  setTyping,
  clearTyping,
  setConnected,
  updateUnreadCount,
  clearError,
  setWidgetOpen,
  setWidgetView,
  resetChatState,
} = chatSlice.actions;

export default chatSlice.reducer;