import React, { useSyncExternalStore } from 'react';
import { useDispatch } from 'react-redux';
import { KeyManagementModal } from '@/components/chat/KeyManagementModal';
import { KeyGenerationModal } from '@/components/chat/KeyGenerationModal';
import { DecryptionModal } from '@/components/chat/DecryptionModal';
import { MessageSendModeModal } from '@/components/chat/MessageSendModeModal';
import GroupChatInfoPanel from '@/components/chat/GroupChatInfoPanel';
import PrivateChatSettingsPanel from '@/components/chat/PrivateChatSettingsPanel';
import type { KeyPair } from '@/lib/keyManagement';
import {
  setShowGenerationModal,
  setShowDecryptModal,
  setShowSendModeModal,
  setShowGroupInfoPanel,
  setShowPrivateChatSettingsPanel,
  setShowKeyModal
} from '@/lib/chatSlice';
import { store } from '@/lib/store';

interface ChatModalsProps {
  // Key Generation
  handleKeyGenerated: (key: KeyPair) => void;

  // Decryption
  handleKeySelect: (key: KeyPair) => void;
  handleBatchDecrypt: (key: KeyPair) => void;

  // Send Mode
  handleSendModeSelect: (mode: 'plaintext' | 'encrypted') => void;

  // Group Info
  chatType: 'private' | 'group';
  conversationId: string;
  memberCount: number;
}

export const ChatModals: React.FC<ChatModalsProps> = ({
  handleKeyGenerated,
  handleKeySelect,
  handleBatchDecrypt,
  handleSendModeSelect,
  chatType,
  conversationId,
  memberCount
}) => {
  const dispatch = useDispatch();

  // 使用 useSyncExternalStore 直接订阅 store
  const chatState = useSyncExternalStore(
    store.subscribe,
    () => store.getState().chat,
    () => store.getState().chat // SSR 回退
  );

  const {
    showGenerationModal,
    showDecryptModal,
    showSendModeModal,
    showGroupInfoPanel,
    showPrivateChatSettingsPanel,
    showKeyModal
  } = chatState;

  return (
    <>
      <KeyManagementModal
        isOpen={showKeyModal}
        onClose={() => dispatch(setShowKeyModal(false))}
        onKeySelect={handleKeySelect}
        onBatchDecrypt={handleBatchDecrypt}
      />

      <KeyGenerationModal
        isOpen={showGenerationModal}
        onClose={() => dispatch(setShowGenerationModal(false))}
        onKeyGenerated={handleKeyGenerated}
      />

      <DecryptionModal
        isOpen={showDecryptModal}
        onClose={() => dispatch(setShowDecryptModal(false))}
        onKeySelect={handleKeySelect}
        onBatchDecrypt={handleBatchDecrypt}
      />

      {/* 群聊发送模式选择弹窗 */}
      <MessageSendModeModal
        isOpen={showSendModeModal}
        onClose={() => {
          dispatch(setShowSendModeModal(false));
        }}
        onSelectMode={handleSendModeSelect}
      />

      {/* 条件性渲染 GroupChatInfoPanel */}
      {showGroupInfoPanel && chatType === 'group' && (
        <GroupChatInfoPanel
          conversationId={conversationId}
          chatType={chatType}
          memberCount={memberCount}
          onClose={() => dispatch(setShowGroupInfoPanel(false))}
        />
      )}

      {/* 新增：条件性渲染 PrivateChatSettingsPanel */}
      {showPrivateChatSettingsPanel && chatType === 'private' && (
        <PrivateChatSettingsPanel
          isOpen={showPrivateChatSettingsPanel}
          onClose={() => dispatch(setShowPrivateChatSettingsPanel(false))}
          conversationId={conversationId}
        />
      )}
    </>
  );
};
