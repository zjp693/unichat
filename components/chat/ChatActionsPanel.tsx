'use client';

import React, { RefObject } from 'react';
import Image from 'next/image';
import { useDispatch, useSelector } from 'react-redux';
import { cn } from '@/lib/utils';
import { SendRedPacketModal } from './red-packet/SendRedPacketModal';
import { RedPacketConfig } from './red-packet/types';
import { setIsActionsOpen } from '@/lib/chatSlice';
import type { RootState } from '@/lib/store';

interface ChatActionsPanelProps {
  onSendRedPacket: (config: RedPacketConfig) => void;
  chatType: 'private' | 'group';
  contentRef?: RefObject<HTMLDivElement | null>;
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
}

/**
 * 单个功能按钮组件
 */
const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick
}) => {
  return (
    <div onClick={onClick} className="flex flex-col items-center gap-1">
      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center relative">
        <Image
          src={icon}
          alt={label}
          fill
          sizes="56px"
          className="object-cover"
        />
      </div>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
};

/**
 * 聊天功能面板组件
 * 包含相册、拍照、语音通话、AI、红包、转账等功能入口
 */
export const ChatActionsPanel: React.FC<ChatActionsPanelProps> = ({
  onSendRedPacket,
  chatType,
  contentRef
}) => {
  const dispatch = useDispatch();
  const { isActionsOpen, panelHeight } = useSelector(
    (state: RootState) => state.chat
  );

  const handleClose = () => {
    dispatch(setIsActionsOpen(false));
  };
  // 功能按钮配置列表
  const actionButtons = [
    { id: 'album', icon: '/chats/Album.png', label: 'Album' },
    { id: 'photography', icon: '/chats/Photography.png', label: 'Photography' },
    { id: 'voicecall', icon: '/chats/Voicecall.png', label: 'Voice call' },
    { id: 'ai', icon: '/chats/AI.png', label: 'AI' },
    // 红包按钮使用自定义渲染
    {
      id: 'red-packet',
      icon: '/chats/fuRedenvelope.png',
      label: 'Red envelope',
      isCustom: true
    },
    { id: 'transfer', icon: '/chats/Transfer.png', label: 'Transfer' },
    { id: 'sendgoods', icon: '/chats/Sendgoods.png', label: 'Send goods' },
    { id: 'vote', icon: '/chats/Vote.png', label: 'Vote' }
  ];

  return (
    <div
      className={cn('bg-gray-100 overflow-hidden')}
      style={{
        height: isActionsOpen ? `${panelHeight}px` : '0px',
        transition: 'height 0.3s ease-in-out'
      }}
    >
      <div
        ref={contentRef}
        className="p-2 pt-4 grid grid-cols-4 gap-y-6 gap-x-4 text-center"
      >
        {actionButtons.map((button) => {
          // 红包按钮需要特殊处理，使用 SendRedPacketModal
          if (button.id === 'red-packet') {
            return (
              <SendRedPacketModal
                key={button.id}
                onSend={onSendRedPacket}
                chatType={chatType}
                trigger={
                  <div
                    onClick={handleClose}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center relative">
                      <Image
                        src={button.icon}
                        alt={button.label}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {button.label}
                    </span>
                  </div>
                }
              />
            );
          }

          // 普通按钮
          return (
            <ActionButton
              key={button.id}
              icon={button.icon}
              label={button.label}
              onClick={handleClose}
            />
          );
        })}
      </div>
    </div>
  );
};
