import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ChatMeta {
  type: 'private' | 'group';
  // 新增：群组子类型，用于区分老群(community)和新红包群(redpacket)
  groupType?: 'community' | 'redpacket';
  // 群聊字段
  name?: string;
  avatar?: string;
  level?: number;
  memberCount?: number;
  groupCondition?: string;
  address?: string;
}

interface ChatMetaState {
  data: Record<string, ChatMeta>; // key 是 chatId
}

const initialState: ChatMetaState = {
  data: {}
};

const chatMetaSlice = createSlice({
  name: 'chatMeta',
  initialState,
  reducers: {
    setChatMeta(
      state,
      action: PayloadAction<{ chatId: string; meta: ChatMeta }>
    ) {
      const { chatId, meta } = action.payload;
      state.data[chatId] = meta;
    },
    updateChatMeta(
      state,
      action: PayloadAction<{ chatId: string; meta: Partial<ChatMeta> }>
    ) {
      const { chatId, meta } = action.payload;
      if (state.data[chatId]) {
        state.data[chatId] = { ...state.data[chatId], ...meta };
      }
    },
    removeChatMeta(state, action: PayloadAction<string>) {
      delete state.data[action.payload];
    },
    clearAllChatMeta(state) {
      state.data = {};
    }
  }
});

export const { setChatMeta, updateChatMeta, removeChatMeta, clearAllChatMeta } =
  chatMetaSlice.actions;

export default chatMetaSlice.reducer;
