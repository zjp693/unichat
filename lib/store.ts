import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { keyManagementReducer } from './keyManagement';
import searchHistoryReducer from './searchHistorySlice';
import chatReducer from './chatSlice';
import chatMetaReducer from './chatMetaSlice';

const persistConfig = {
  key: 'unichat-root',
  storage,
  whitelist: ['searchHistory', 'keyManagement', 'chatMeta'] // 持久化搜索历史、密钥管理和聊天元信息
};

const rootReducer = combineReducers({
  keyManagement: keyManagementReducer,
  searchHistory: searchHistoryReducer,
  chat: chatReducer,
  chatMeta: chatMetaReducer
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
      }
    })
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
