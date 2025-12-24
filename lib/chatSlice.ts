import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Contact } from '@/lib/contacts';

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

  // --- 选中的名人（按钱包地址隔离）---
  // { '0xAAA...': Contact, '0xBBB...': Contact }
  selectedCelebrityByWallet: Record<string, Contact | null>;

  // --- 草稿输入内容 ---
  // 存储每个聊天的草稿内容 { [conversationId]: draftContent }
  draftInputs: Record<string, string>;
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
  timestampMap: {},
  selectedCelebrityByWallet: {},
  draftInputs: {}
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
      state.isActionsOpen = false;
      state.panelHeight = 0;
      state.showGroupInfoPanel = false;
      state.showPrivateChatSettingsPanel = false;
      state.showKeyModal = false;
      state.showDecryptModal = false;
      state.showGenerationModal = false;
      state.showSendModeModal = false;
      state.selectedMessageId = null;
      state.pendingGroupMessage = '';
      // 保留 draftInputs, timestampMap, selectedCelebrityByWallet
    },

    // --- 草稿输入管理 ---
    // 设置草稿内容
    setDraftInput(
      state,
      action: PayloadAction<{ conversationId: string; content: string }>
    ) {
      const { conversationId, content } = action.payload;
      if (!content || content.trim() === '') {
        delete state.draftInputs[conversationId];
      } else {
        state.draftInputs[conversationId] = content;
      }
    },
    // 清除单个聊天的草稿
    clearDraftInput(state, action: PayloadAction<string>) {
      delete state.draftInputs[action.payload];
    },
    // 清除所有草稿
    clearAllDrafts(state) {
      state.draftInputs = {};
    },

    // --- 选中名人管理 ---
    // 设置指定钱包的选中名人
    setSelectedCelebrity(
      state,
      action: PayloadAction<{
        walletAddress: string;
        celebrity: Contact | null;
      }>
    ) {
      const { walletAddress, celebrity } = action.payload;
      if (walletAddress) {
        state.selectedCelebrityByWallet[walletAddress] = celebrity;
      }
    },
    // 清除指定钱包的选中名人
    clearSelectedCelebrity(state, action: PayloadAction<string>) {
      const walletAddress = action.payload;
      if (walletAddress && state.selectedCelebrityByWallet[walletAddress]) {
        delete state.selectedCelebrityByWallet[walletAddress];
      }
    },
    // 清除所有钱包的选中名人
    clearAllSelectedCelebrities(state) {
      state.selectedCelebrityByWallet = {};
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
  resetChatState,
  setSelectedCelebrity,
  clearSelectedCelebrity,
  clearAllSelectedCelebrities,
  setDraftInput,
  clearDraftInput,
  clearAllDrafts
} = chatSlice.actions;

export default chatSlice.reducer;
