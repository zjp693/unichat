import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { FOOTER_HEIGHT } from '@/lib/chat/constants';

interface ChatInputAreaProps {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  inputMessage: string;
  setInputMessage: (msg: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSendMessage: () => void;
  handleOpenActions: () => void;
  setIsActionsOpen: (isOpen: boolean) => void;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  inputRef,
  inputMessage,
  setInputMessage,
  handleKeyDown,
  handleSendMessage,
  handleOpenActions,
  setIsActionsOpen
}) => {
  return (
    <div
      className="p-2 flex items-center bg-gray-100 border-t border-gray-100"
      style={{
        minHeight: `${FOOTER_HEIGHT}px`
      }}
    >
      <Button variant="ghost" className="flex-shrink-0 px-2 py-0">
        <Image
          src="/chats/voice.png"
          alt="Voice"
          width={24}
          height={24}
          className="text-gray-500"
        />
      </Button>
      <textarea
        ref={inputRef}
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        onClick={() => setIsActionsOpen(false)} // 点击输入框时隐藏功能面板
        enterKeyHint="send"
        placeholder=""
        className="flex-1 bg-white border-none rounded-sm min-h-[32px] max-h-[120px] px-1 py-2 text-base focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none resize-none overflow-y-auto" // 改为 textarea 样式
        autoComplete="off"
        rows={1}
      />
      <Button variant="ghost" className="flex-shrink-0 px-2 py-0">
        <Image
          src="/chats/face.png"
          alt="Face"
          width={24}
          height={24}
          className="text-gray-500"
        />
      </Button>
      {/* 发送按钮 */}
      <Button
        onClick={handleSendMessage}
        className={`rounded-lg transition-all duration-300 ease-in-out
          ${inputMessage.trim() !== '' ? 'opacity-100 h-4 w-6 py-4 px-6 pointer-events-auto' : 'opacity-0 w-0 p-0 m-0 overflow-hidden pointer-events-none'}`}
        style={{
          backgroundColor: '#5436f1',
          color: 'white',
          fontSize: '14px'
        }} // 应用发送按钮样式
      >
        发送
      </Button>

      {/* 加号按钮 */}
      <Button
        variant="ghost"
        onClick={handleOpenActions}
        className={`rounded-lg transition-all duration-300 ease-in-out
          ${inputMessage.trim() !== '' ? 'opacity-0 w-0 p-0 m-0 overflow-hidden pointer-events-none' : 'opacity-100 w-8 pl-0 pr-2 py-0 pointer-events-auto'}`}
      >
        <Image
          src="/chats/plus.png"
          alt="Plus"
          width={24}
          height={24}
          className="text-gray-600"
        />
      </Button>
    </div>
  );
};
