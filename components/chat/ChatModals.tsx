import React from 'react';
import { KeyGenerationModal } from '@/components/chat/KeyGenerationModal';
import { DecryptionModal } from '@/components/chat/DecryptionModal';
import { MessageSendModeModal } from '@/components/chat/MessageSendModeModal';
import GroupChatInfoPanel from '@/components/chat/GroupChatInfoPanel';
import PrivateChatSettingsPanel from '@/components/chat/PrivateChatSettingsPanel';
import type { KeyPair } from '@/lib/encryption';

interface ChatModalsProps {
  // Key Generation
  showGenerationModal: boolean;
  setShowGenerationModal: (show: boolean) => void;
  handleKeyGenerated: (key: KeyPair) => void;

  // Decryption
  showDecryptModal: boolean;
  setShowDecryptModal: (show: boolean) => void;
  handleKeySelect: (key: KeyPair) => void;
  handleBatchDecrypt: (key: KeyPair) => void;

  // Send Mode
  showSendModeModal: boolean;
  setShowSendModeModal: (show: boolean) => void;
  setPendingGroupMessage: (msg: string) => void;
  handleSendModeSelect: (mode: 'plaintext' | 'encrypted') => void;

  // Group Info
  showGroupInfoPanel: boolean;
  setShowGroupInfoPanel: (show: boolean) => void;
  chatType: 'private' | 'group';
  conversationId: string;
  memberCount: number;

  // Private Settings
  showPrivateChatSettingsPanel: boolean;
  setShowPrivateChatSettingsPanel: (show: boolean) => void;
}

export const ChatModals: React.FC<ChatModalsProps> = ({
  showGenerationModal,
  setShowGenerationModal,
  handleKeyGenerated,
  showDecryptModal,
  setShowDecryptModal,
  handleKeySelect,
  handleBatchDecrypt,
  showSendModeModal,
  setShowSendModeModal,
  setPendingGroupMessage,
  handleSendModeSelect,
  showGroupInfoPanel,
  setShowGroupInfoPanel,
  chatType,
  conversationId,
  memberCount,
  showPrivateChatSettingsPanel,
  setShowPrivateChatSettingsPanel
}) => {
  return (
    <>
      <KeyGenerationModal
        isOpen={showGenerationModal}
        onClose={() => setShowGenerationModal(false)}
        onKeyGenerated={handleKeyGenerated}
      />

      <DecryptionModal
        isOpen={showDecryptModal}
        onClose={() => setShowDecryptModal(false)}
        onKeySelect={handleKeySelect}
        onBatchDecrypt={handleBatchDecrypt}
      />

      {/* 群聊发送模式选择弹窗 */}
      <MessageSendModeModal
        isOpen={showSendModeModal}
        onClose={() => {
          setShowSendModeModal(false);
        }}
        onSelectMode={handleSendModeSelect}
      />

      {/* 条件性渲染 GroupChatInfoPanel */}
      {showGroupInfoPanel && chatType === 'group' && (
        <GroupChatInfoPanel
          conversationId={conversationId}
          chatType={chatType}
          memberCount={memberCount}
          onClose={() => setShowGroupInfoPanel(false)}
        />
      )}

      {/* 新增：条件性渲染 PrivateChatSettingsPanel */}
      {showPrivateChatSettingsPanel && chatType === 'private' && (
        <PrivateChatSettingsPanel
          isOpen={showPrivateChatSettingsPanel}
          onClose={() => setShowPrivateChatSettingsPanel(false)}
          conversationId={conversationId}
        />
      )}
    </>
  );
};
