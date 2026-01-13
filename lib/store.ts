import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { keyManagementReducer } from './keyManagement';
import searchHistoryReducer from './searchHistorySlice';
import chatReducer from './chatSlice';
import chatMetaReducer from './chatMetaSlice';

// BigInt 转换器：序列化时转为字符串
const bigIntTransform = {
  in: (state: any) => {
    // 反序列化：从 storage 读取时（字符串保持字符串）
    return state;
  },
  out: (state: any) => {
    // 序列化：保存到 storage 时，将 BigInt 转为字符串
    return JSON.parse(
      JSON.stringify(state, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
  }
};
const persistConfig = {
  key: 'unichat-root',
  storage,
  whitelist: ['searchHistory', 'keyManagement', 'chatMeta'], // 持久化搜索历史、密钥管理和聊天元信息
  // 使用自定义序列化函数作为最后一道防线
  serialize: ((data: any) => {
    return JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
  }) as any,
  deserialize: ((data: string) => JSON.parse(data)) as any
};

// Chat Slice 嵌套持久化配置（只持久化必要字段）
const chatPersistConfig = {
  key: 'unichat-chat',
  storage,
  whitelist: ['draftInputs', 'timestampMap', 'selectedCelebrityByWallet'],
  serialize: ((data: any) => {
    return JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
  }) as any,
  deserialize: ((data: string) => JSON.parse(data)) as any
};

const rootReducer = combineReducers({
  keyManagement: keyManagementReducer,
  searchHistory: searchHistoryReducer,
  chat: persistReducer(chatPersistConfig, chatReducer), // 应用嵌套持久化
  chatMeta: chatMetaReducer
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false // 禁用序列化检查以支持 BigInt 类型（区块链数据）
    })
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
