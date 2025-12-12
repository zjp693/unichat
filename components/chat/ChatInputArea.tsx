import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect
} from 'react';
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

// 高度配置常量
const LINE_HEIGHT = 24; // 单行高度
const MIN_ROWS = 1; // 最小行数
const MAX_ROWS = 6; // 最大行数（你要求的6行）
const PADDING = 16; // 上下 padding 之和 (py-2 = 8px * 2)
const MIN_HEIGHT = LINE_HEIGHT * MIN_ROWS + PADDING; // 40px
const MAX_HEIGHT = LINE_HEIGHT * MAX_ROWS + PADDING; // 160px

export const ChatInputArea = forwardRef<ChatInputAreaRef, ChatInputAreaProps>(
  ({ inputRef, handleKeyDown, handleSendMessage, handleOpenActions }, ref) => {
    const dispatch = useDispatch();
    const [inputMessage, setInputMessage] = useState('');
    const [textareaHeight, setTextareaHeight] = useState(MIN_HEIGHT);

    useImperativeHandle(ref, () => ({
      setValue: (value: string) => {
        setInputMessage(value);
      }
    }));

    // 自动调整高度
    useEffect(() => {
      const textarea = inputRef.current;
      if (!textarea) return;

      // 暂时设置为 auto 以获取真实的 scrollHeight
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;

      // 计算新高度：在最小和最大之间
      const newHeight = Math.min(
        Math.max(scrollHeight, MIN_HEIGHT),
        MAX_HEIGHT
      );

      setTextareaHeight(newHeight);
      textarea.style.height = `${newHeight}px`;
    }, [inputMessage, inputRef]);

    const onSend = () => {
      if (!inputMessage.trim()) return;
      handleSendMessage(inputMessage);
      setInputMessage('');
      // 重置高度为最小值
      setTextareaHeight(MIN_HEIGHT);
    };

    return (
      <div
        className="p-2 flex items-end bg-gray-100 border-t border-gray-100"
        style={{
          minHeight: `${FOOTER_HEIGHT}px`
        }}
      >
        <Button variant="ghost" className="flex-shrink-0 px-2 py-0">
          <Image src="/chats/voice.png" alt="Voice" width={32} height={32} />
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
          className="flex-1 bg-white border-none rounded-sm px-1 py-2 text-base focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none resize-none"
          style={{
            height: `${textareaHeight}px`,
            lineHeight: `${LINE_HEIGHT}px`,
            overflow: textareaHeight >= MAX_HEIGHT ? 'auto' : 'hidden',
            transition: 'height 0.1s ease'
          }}
          autoComplete="off"
          rows={1}
        />
        <Button variant="ghost" className="flex-shrink-0 px-1 py-0">
          <Image src="/chats/face.png" alt="Face" width={32} height={32} />
        </Button>
        {/* 发送按钮 */}
        <Button
          onClick={onSend}
          className={`rounded-lg transition-all duration-300 ease-in-out mb-1.5
          ${inputMessage.trim() !== '' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          style={{
            backgroundColor: '#5436f1',
            color: 'white',
            fontSize: '12px',
            padding: '4px 12px',
            height: 'auto',
            transform:
              inputMessage.trim() !== '' ? 'translateX(0)' : 'translateX(50px)',
            position: inputMessage.trim() !== '' ? 'relative' : 'absolute',
            right: inputMessage.trim() !== '' ? 'auto' : 0
          }}
        >
          发送
        </Button>

        {/* 加号按钮 */}
        <Button
          variant="ghost"
          onClick={handleOpenActions}
          className={`
          ${inputMessage.trim() !== '' ? 'opacity-0 w-0 pointer-events-none overflow-hidden' : 'opacity-100 pointer-events-auto'}`}
          style={{
            paddingLeft: 0,
            paddingRight: inputMessage.trim() !== '' ? 0 : '8px',
            paddingTop: 0,
            paddingBottom: 0,
            marginBottom: inputMessage.trim() !== '' ? '0' : '0px'
          }}
        >
          <Image src="/chats/plus.png" alt="Plus" width={32} height={32} />
        </Button>
      </div>
    );
  }
);

ChatInputArea.displayName = 'ChatInputArea';
