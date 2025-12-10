import React, { useState, useImperativeHandle, forwardRef } from 'react';
import Image from 'next/image';
import { useDispatch } from 'react-redux';
import { Button } from '@/components/ui/button';
import { FOOTER_HEIGHT } from '@/lib/chat/constants';
import { setIsActionsOpen } from '@/lib/chatSlice';

export interface ChatInputAreaRef {
  setValue: (value: string) => void;
}

interface ChatInputAreaProps {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSendMessage: (content: string) => void;
  handleOpenActions: () => void;
}

export const ChatInputArea = forwardRef<ChatInputAreaRef, ChatInputAreaProps>(
  ({ inputRef, handleKeyDown, handleSendMessage, handleOpenActions }, ref) => {
    const dispatch = useDispatch();
    const [inputMessage, setInputMessage] = useState('');

    useImperativeHandle(ref, () => ({
      setValue: (value: string) => {
        setInputMessage(value);
      }
    }));

    const onSend = () => {
      if (!inputMessage.trim()) return;
      handleSendMessage(inputMessage);
      setInputMessage('');
    };

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
            width={32}
            height={32}
            className="text-gray-500"
          />
        </Button>
        <textarea
          ref={inputRef}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            } else {
              handleKeyDown(e);
            }
          }}
          onClick={() => dispatch(setIsActionsOpen(false))}
          enterKeyHint="send"
          placeholder=""
          className="flex-1 bg-white border-none rounded-sm min-h-[32px] max-h-[120px] px-1 py-2 text-base focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none resize-none overflow-y-auto"
          autoComplete="off"
          rows={1}
        />
        <Button variant="ghost" className="flex-shrink-0 px-2 py-0">
          <Image
            src="/chats/face.png"
            alt="Face"
            width={32}
            height={32}
            className="text-gray-500"
          />
        </Button>
        {/* 发送按钮 */}
        <Button
          onClick={onSend}
          className={`rounded-lg transition-all duration-300 ease-in-out
          ${inputMessage.trim() !== '' ? 'opacity-100 h-4 w-6 py-4 px-6 pointer-events-auto' : 'opacity-0 w-0 p-0 m-0 overflow-hidden pointer-events-none'}`}
          style={{
            backgroundColor: '#5436f1',
            color: 'white',
            fontSize: '14px'
          }}
        >
          发送
        </Button>

        {/* 加号按钮 */}
        <Button
          variant="ghost"
          onClick={handleOpenActions}
          className={`rounded-lg transition-all duration-300 ease-in-out
          ${inputMessage.trim() !== '' ? 'opacity-0 w-0 p-0 m-0 overflow-hidden pointer-events-none' : 'opacity-100 pl-0 pr-2 py-0 pointer-events-auto'}`}
        >
          <Image
            src="/chats/plus.png"
            alt="Plus"
            width={32}
            height={32}
            className="text-gray-600"
          />
        </Button>
      </div>
    );
  }
);

ChatInputArea.displayName = 'ChatInputArea';
