'use client';

import * as React from 'react';
import { ChevronLeft, ChevronDown, MoreHorizontal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionSheet } from '@/components/ui/action-sheet';
import { cn } from '@/lib/utils';
import { RedPacketType, RedPacketConfig } from './types';
import Image from 'next/image';

interface SendRedPacketModalProps {
  trigger?: React.ReactNode;
  onSend?: (config: RedPacketConfig) => void;
  chatType: 'private' | 'group';
}

export function SendRedPacketModal({
  trigger,
  onSend,
  chatType
}: SendRedPacketModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isTypeSwitcherOpen, setIsTypeSwitcherOpen] = React.useState(false);
  // Default to NORMAL for private chats, LUCKY for group chats
  const [packetType, setPacketType] = React.useState<RedPacketType>(
    chatType === 'private' ? 'NORMAL' : 'LUCKY'
  );
  // Default count to '1' for private chats
  const [count, setCount] = React.useState<string>(
    chatType === 'private' ? '1' : ''
  );
  const [amount, setAmount] = React.useState<string>('');
  const [message, setMessage] = React.useState<string>('');
  const [tokenSymbol, setTokenSymbol] = React.useState<string>('USDT');

  // Ref to track if user is using IME (e.g. Pinyin)
  const isComposing = React.useRef(false);

  // Mock data for group member count
  const groupMemberCount = 5;

  // Reset state when modal opens or chatType changes
  React.useEffect(() => {
    if (isOpen) {
      setPacketType(chatType === 'private' ? 'NORMAL' : 'LUCKY');
      setCount(chatType === 'private' ? '1' : '');
      setAmount('');
      setMessage('');
    }
  }, [isOpen, chatType]);

  const totalAmount = React.useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    const numCount = parseInt(count) || 0;

    if (packetType === 'LUCKY') {
      return numAmount.toFixed(6); // Match the screenshot's precision roughly
    } else {
      return (numAmount * numCount).toFixed(6);
    }
  }, [amount, count, packetType]);

  const handleSend = () => {
    if (!amount || !count) return;

    onSend?.({
      type: packetType,
      tokenSymbol,
      amount,
      count: parseInt(count),
      message: message || '恭喜发财，大吉大利'
    });
    setIsOpen(false);
  };

  const handleTypeSelect = (type: RedPacketType) => {
    setPacketType(type);
    setCount('');
    setAmount('');
    setIsTypeSwitcherOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">发红包</Button>}
      </DialogTrigger>
      {/* Full screen on mobile, centered card on desktop */}
      <DialogContent className="w-full h-full max-w-none sm:max-w-[400px] sm:h-[800px] p-0 gap-0 bg-[#f7f7f7] !border-0 shadow-none sm:shadow-lg sm:rounded-xl flex flex-col [&>button]:hidden">
        {/* Hidden Title for Accessibility */}
        <DialogTitle className="sr-only">发红包</DialogTitle>

        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between px-4 h-[56px] bg-[#f7f7f7] flex-shrink-0">
          <DialogClose className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-black" />
          </DialogClose>
          <span className="text-[17px] font-medium text-black">发红包</span>
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col">
          {/* Type Switcher Trigger - Only for Group Chat */}
          {chatType === 'group' && (
            <div className="mb-4 mt-2">
              <button
                className="flex items-center gap-1 text-[#d4b078] text-sm font-medium focus:outline-none"
                onClick={() => setIsTypeSwitcherOpen(true)}
              >
                {packetType === 'LUCKY' ? '拼手气红包' : '普通红包'}
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Spacer for Private Chat to match layout if needed, or just less margin */}
          {chatType === 'private' && <div className="mt-4"></div>}

          {/* Form Group */}
          <div className="space-y-4">
            {/* Row 1: Count - Only for Group Chat */}
            {chatType === 'group' && (
              <>
                <div className="bg-white rounded-lg p-4 flex items-center justify-between h-[60px]">
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <Image
                      src="/chats/Red envelope.png"
                      alt="Red Packet"
                      width={18}
                      height={18}
                      className="rounded-sm"
                    />
                    <span className="text-[16px] text-black">红包个数</span>
                  </div>
                  <div className="flex items-center flex-1 justify-end gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="填写个数"
                      className="text-right border-none shadow-none focus-visible:ring-0 p-0 h-auto text-[16px] placeholder:text-gray-300 w-full bg-transparent"
                      value={count}
                      onCompositionStart={() => (isComposing.current = true)}
                      onCompositionEnd={(e) => {
                        isComposing.current = false;
                        let value = e.currentTarget.value.replace(/[^\d]/g, '');
                        if (value.length > 7) value = value.slice(0, 7);
                        setCount(value);
                      }}
                      onChange={(e) => {
                        if (isComposing.current) {
                          setCount(e.target.value);
                          return;
                        }
                        const value = e.target.value.replace(/[^\d]/g, '');
                        if (value.length > 7) return;
                        setCount(value);
                      }}
                    />
                    <span className="text-[16px] text-black">个</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 pl-4 -mt-2">
                  本群共{groupMemberCount}人
                </div>
              </>
            )}

            {/* Row 2: Token Selection (New) */}
            <div className="bg-white rounded-lg p-4 flex items-center justify-between h-[60px]">
              <span className="text-[16px] text-black font-normal">
                选择代币
              </span>
              <div className="flex items-center gap-1 cursor-pointer">
                <span className="text-[16px] text-black">{tokenSymbol}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Row 3: Amount */}
            <div className="bg-white rounded-lg p-4 flex items-center justify-between h-[60px]">
              <div className="flex items-center gap-2 min-w-[100px]">
                {packetType === 'LUCKY' && (
                  <div className="w-[18px] h-[18px] bg-[#d4b078] rounded-[4px] flex items-center justify-center text-white text-[11px] font-medium">
                    拼
                  </div>
                )}
                <span className="text-[16px] text-black">
                  {chatType === 'private'
                    ? '金额'
                    : packetType === 'LUCKY'
                      ? '总金额'
                      : '单个金额'}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="text-[16px] text-black">{tokenSymbol}</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="border-none shadow-none focus-visible:ring-0 p-0 h-auto text-[16px] placeholder:text-gray-300 bg-transparent text-right min-w-[34px]"
                  style={{
                    width: `${Math.max((amount || '').length, 4) + 0.5}ch`
                  }}
                  value={amount}
                  onCompositionStart={() => (isComposing.current = true)}
                  onCompositionEnd={(e) => {
                    isComposing.current = false;
                    let value = e.currentTarget.value.replace(/[^\d.]/g, '');
                    const parts = value.split('.');
                    if (parts.length > 2) {
                      value = parts[0] + '.' + parts.slice(1).join('');
                    }
                    if (value.split('.')[0].length > 7) {
                      const p = value.split('.');
                      p[0] = p[0].slice(0, 7);
                      value = p.join('.');
                    }
                    setAmount(value);
                  }}
                  onChange={(e) => {
                    if (isComposing.current) {
                      setAmount(e.target.value);
                      return;
                    }
                    let value = e.target.value.replace(/[^\d.]/g, '');
                    const parts = value.split('.');
                    if (parts.length > 2) {
                      value = parts[0] + '.' + parts.slice(1).join('');
                    }
                    if (value.split('.')[0].length > 7) return;
                    setAmount(value);
                  }}
                />
              </div>
            </div>

            {/* Row 4: Message */}
            <div className="bg-white rounded-lg p-4 h-[60px] flex items-center">
              <Input
                placeholder="恭喜发财，大吉大利"
                className="border-none shadow-none focus-visible:ring-0 p-0 h-auto text-[16px] w-full placeholder:text-gray-300 bg-transparent"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>

          {/* Big Total Display */}
          <div className="mt-12 mb-8 text-center px-4">
            <div className="text-[40px] font-bold text-[#1a1a1a] leading-tight break-all">
              {totalAmount || '0.000000'}
            </div>
            <div className="text-[20px] font-medium text-[#1a1a1a] mt-1">
              {tokenSymbol}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            className="w-fit self-center px-10 h-[48px] text-[16px] bg-[#fa5151] hover:bg-[#d64e3e] text-white rounded-lg font-medium shadow-sm"
            onClick={handleSend}
          >
            塞钱进红包
          </Button>

          {/* Footer Note */}
          <div className="mt-auto pt-8 pb-8 text-center">
            <p className="text-xs text-gray-400">
              未领取的红包，将于5天后发起退款
            </p>
          </div>
        </div>

        {/* Action Sheet */}
        <ActionSheet
          isOpen={isTypeSwitcherOpen}
          onClose={() => setIsTypeSwitcherOpen(false)}
          actions={[
            {
              label: '拼手气红包',
              onClick: () => handleTypeSelect('LUCKY')
            },
            {
              label: '普通红包',
              onClick: () => handleTypeSelect('NORMAL')
            }
          ]}
        />
      </DialogContent>
    </Dialog>
  );
}
