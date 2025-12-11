import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChatState {
  // --- UI 面板控制 ---
  isActionsOpen: boolean;
  panelHeight: number;
  showGroupInfoPanel: boolean;
  showPrivateChatSettingsPanel: boolean;

  // --- 弹窗控制 ---
  showKeyModal: boolean;
  showDecryptModal: boolean;
  showGenerationModal: boolean;
  showSendModeModal: boolean;

  // --- 业务状态 ---
  selectedMessageId: string | null;
  pendingGroupMessage: string;

  // --- 聊天列表时间戳 ---
  // 存储每个聊天的最后消息时间戳 { [chatId]: timestamp }
  timestampMap: Record<string, number>;
}

const initialState: ChatState = {
  isActionsOpen: false,
  panelHeight: 0,
  showGroupInfoPanel: false,
  showPrivateChatSettingsPanel: false,
  showKeyModal: false,
  showDecryptModal: false,
  showGenerationModal: false,
  showSendModeModal: false,
  selectedMessageId: null,
  pendingGroupMessage: '',
  timestampMap: {}
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setIsActionsOpen(state, action: PayloadAction<boolean>) {
      state.isActionsOpen = action.payload;
    },
    setPanelHeight(state, action: PayloadAction<number>) {
      state.panelHeight = action.payload;
    },
    setShowGroupInfoPanel(state, action: PayloadAction<boolean>) {
      state.showGroupInfoPanel = action.payload;
    },
    setShowPrivateChatSettingsPanel(state, action: PayloadAction<boolean>) {
      state.showPrivateChatSettingsPanel = action.payload;
    },
    setShowKeyModal(state, action: PayloadAction<boolean>) {
      state.showKeyModal = action.payload;
    },
    setShowDecryptModal(state, action: PayloadAction<boolean>) {
      state.showDecryptModal = action.payload;
    },
    setShowGenerationModal(state, action: PayloadAction<boolean>) {
      state.showGenerationModal = action.payload;
    },
    setShowSendModeModal(state, action: PayloadAction<boolean>) {
      state.showSendModeModal = action.payload;
    },
    setSelectedMessageId(state, action: PayloadAction<string | null>) {
      state.selectedMessageId = action.payload;
    },
    setPendingGroupMessage(state, action: PayloadAction<string>) {
      state.pendingGroupMessage = action.payload;
    },
    // 更新某个聊天的最后消息时间戳
    updateTimestamp(
      state,
      action: PayloadAction<{ chatId: string; timestamp: number }>
    ) {
      state.timestampMap[action.payload.chatId] = action.payload.timestamp;
    },
    // 清空所有时间戳（切换账户时使用）
    clearTimestampMap(state) {
      state.timestampMap = {};
    },
    // 重置所有 UI 状态 (离开聊天页面时使用)
    resetChatState(state) {
      return initialState;
    }
  }
});

export const {
  setIsActionsOpen,
  setPanelHeight,
  setShowGroupInfoPanel,
  setShowPrivateChatSettingsPanel,
  setShowKeyModal,
  setShowDecryptModal,
  setShowGenerationModal,
  setShowSendModeModal,
  setSelectedMessageId,
  setPendingGroupMessage,
  updateTimestamp,
  clearTimestampMap,
  resetChatState
} = chatSlice.actions;

export default chatSlice.reducer;
