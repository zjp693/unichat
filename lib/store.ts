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

const persistConfig = {
  key: 'unichat-root',
  storage,
  whitelist: ['searchHistory', 'keyManagement'] // 持久化搜索历史和密钥管理
};

const rootReducer = combineReducers({
  keyManagement: keyManagementReducer,
  searchHistory: searchHistoryReducer,
  chat: chatReducer
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
