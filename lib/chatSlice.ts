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
  pendingGroupMessage: ''
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
  resetChatState
} = chatSlice.actions;

export default chatSlice.reducer;
