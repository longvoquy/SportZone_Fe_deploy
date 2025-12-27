import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/authentication/authSlice";
import fieldReducer from "../features/field/fieldSlice";
import bookingReducer from "../features/booking/bookingSlice";
import coachReducer from "../features/coach/coachSlice";
import transactionsReducer from "../features/transactions/transactionsSlice";
import { amenitiesReducer } from "../features/amenities";
import { ownerProfileReducer } from "../features/field-owner-profile";
import { tournamentReducer } from "../features/tournament";
import { walletReducer } from "../features/wallet";
import { registrationReducer } from "../features/field-owner-registration";
import { coachRegistrationReducer } from "../features/coach-registration";
import { bankAccountReducer } from "../features/bank-account";
import chatReducer from "@/features/chat/chatSlice";
import { reviewReducer } from "@/features/reviews";
import { userReducer } from "../features/user";
import { lessonTypesReducer } from "../features/lesson-types";

import { webSocketService } from "@/features/chat/websocket.service";
import { resetChatState } from "@/features/chat/chatSlice";
import logger from "@/utils/logger";

const chatMiddleware = (store: any) => (next: any) => (action: any) => {
    // Check if the action is logout fulfilled
    if (action.type === 'auth/logout/fulfilled') {
        logger.debug('[ChatMiddleware] Detected logout, resetting chat service...');

        // 1. Reset WebSocket Service (disconnects socket)
        webSocketService.reset();

        // 2. Dispatch reset action to clear Redux state
        store.dispatch(resetChatState());
    }

    return next(action);
};

export const store = configureStore({
    reducer: {
        auth: authReducer,
        field: fieldReducer,
        booking: bookingReducer,
        coach: coachReducer,
        transactions: transactionsReducer,
        amenities: amenitiesReducer,
        ownerProfile: ownerProfileReducer,
        tournament: tournamentReducer,
        wallet: walletReducer,
        registration: registrationReducer,
        coachRegistration: coachRegistrationReducer,
        bankAccount: bankAccountReducer,
        chat: chatReducer,
        reviews: reviewReducer,
        user: userReducer,
        lessonTypes: lessonTypesReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }).concat(chatMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
