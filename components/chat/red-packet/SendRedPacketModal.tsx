'use client';

import * as React from 'react';
import { ChevronLeft, ChevronDown, Loader2 } from 'lucide-react';
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
import { TokenSelector } from '@/components/token';
import { useRecommendedTokens } from '@/components/token/hooks/useTokenData';
import type { Token } from '@/components/token/types';

interface SendRedPacketModalProps {
  trigger?: React.ReactNode;
  onSend?: (config: RedPacketConfig) => Promise<void>;
  chatType: 'private' | 'group';
  memberCount?: number;
  groupType?: 'community' | 'redpacket';
}

export function SendRedPacketModal({
  trigger,
  onSend,
  chatType,
  memberCount,
  groupType = 'community'
}: SendRedPacketModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isTypeSwitcherOpen, setIsTypeSwitcherOpen] = React.useState(false);
  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = React.useState(false);

  // 获取推荐代币列表
  const { tokens: recommendedTokens, isLoading: isLoadingTokens } =
    useRecommendedTokens([]);

  // 选中的代币
  const [selectedToken, setSelectedToken] = React.useState<Token | null>(null);

  // 自动选中第一个代币
  React.useEffect(() => {
    if (!selectedToken && recommendedTokens.length > 0 && !isLoadingTokens) {
      // console.log('🎯 自动选中第一个代币:', recommendedTokens[0]);
      setSelectedToken(recommendedTokens[0]);
    }
  }, [selectedToken, recommendedTokens, isLoadingTokens]);

  // 红包类型默认值：
  // - 私聊：只能普通红包
  // - 红包群：只能拼手气红包
  // - 官方群：默认拼手气红包 + 可切换普通红包
  const getDefaultPacketType = (): RedPacketType => {
    if (chatType === 'private') return 'NORMAL';
    if (groupType === 'redpacket') return 'LUCKY';
    return 'LUCKY';
  };

  const [packetType, setPacketType] = React.useState<RedPacketType>(
    getDefaultPacketType()
  );
  // Default count to '1' for private chats
  const [count, setCount] = React.useState<string>(
    chatType === 'private' ? '1' : ''
  );
  const [amount, setAmount] = React.useState<string>('');
  const [message, setMessage] = React.useState<string>('');

  // Ref to track if user is using IME (e.g. Pinyin)
  const isComposing = React.useRef(false);

  // 使用选中代币的信息
  const tokenSymbol = selectedToken?.symbol || 'UNICHAT';

  // Reset state when modal opens or chatType changes
  React.useEffect(() => {
    if (isOpen) {
      setPacketType(getDefaultPacketType());
      setCount(chatType === 'private' ? '1' : '');
      setAmount('');
      setMessage('');
    }
  }, [isOpen, chatType, groupType]);

  const totalAmount = React.useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    const numCount = parseInt(count) || 0;

    if (packetType === 'LUCKY') {
      return numAmount.toFixed(6);
    } else {
      return (numAmount * numCount).toFixed(6);
    }
  }, [amount, count, packetType]);

  const [isSending, setIsSending] = React.useState(false);

  const handleSend = async () => {
    if (!amount || !count) return;

    if (!selectedToken) {
      alert('请选择代币');
      return;
    }

    try {
      setIsSending(true);
      await onSend?.({
        type: packetType,
        tokenSymbol: selectedToken.symbol,
        tokenAddress: selectedToken.address,
        amount,
        count: parseInt(count),
        message: message || '恭喜发财，大吉大利'
      });
      setIsOpen(false);
    } catch (error) {
      console.error('发送红包失败:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleTypeSelect = (type: RedPacketType) => {
    setPacketType(type);
    setCount('');
    setAmount('');
    setIsTypeSwitcherOpen(false);
  };

  const handleTokenSelect = (token: Token) => {
    setSelectedToken(token);
    setIsTokenSelectorOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">发红包</Button>}
      </DialogTrigger>

      <DialogContent className="w-full h-full max-w-none sm:max-w-[400px] sm:h-[800px] p-0 gap-0 bg-[#f7f7f7] !border-0 shadow-none sm:shadow-lg sm:rounded-xl flex flex-col [&>button]:hidden">
        <DialogTitle className="sr-only">发红包</DialogTitle>

        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between px-4 h-[56px] bg-[#f7f7f7] flex-shrink-0">
          <DialogClose className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-black" />
          </DialogClose>
          <span className="text-[17px] font-medium text-black">发红包</span>
          <div className="w-8"></div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col">
          {/* Type Switcher Trigger - Only for Official Group (community) */}
          {chatType === 'group' && groupType === 'community' && (
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

          {(chatType === 'private' || groupType === 'redpacket') && (
            <div className="mt-4"></div>
          )}

          {/* Form Group */}
          <div className="space-y-4">
            {/* Row 1: Count - Only for Group Chat */}
            {chatType === 'group' && (
              <>
                <div className="bg-white rounded-lg p-4 flex items-center justify-between h-[60px]">
                  <span className="text-[16px] text-[#1a1a1a]">红包个数</span>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <Input
                      type="number"
                      placeholder="填写个数"
                      className="text-right !border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-[16px] w-full placeholder:text-gray-300 !bg-transparent"
                      value={count}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d]/g, '');
                        setCount(val);
                      }}
                    />
                    <span className="text-[16px] text-[#1a1a1a]">个</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 pl-4">
                  本群共 {memberCount || 0} 人
                </div>
              </>
            )}

            {/* Row 2: Token Selection (New) */}
            <div
              className="bg-white rounded-lg p-4 flex items-center justify-between h-[60px] cursor-pointer"
              onClick={() => setIsTokenSelectorOpen(true)}
            >
              <span className="text-[16px] text-black font-normal">
                选择代币
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[16px] text-black">{tokenSymbol}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div className="text-xs text-gray-400 pl-4">
              可用余额: {selectedToken?.symbol || 'UNICHAT'}{' '}
              {selectedToken?.balance || '0'}
            </div>

            {/* Row 3: Amount */}
            <div className="bg-white rounded-lg p-4 flex items-center justify-between h-[60px]">
              <div className="flex items-center gap-2 min-w-[60px]">
                {packetType === 'LUCKY' && (
                  <div className="bg-[#d4b078] rounded text-[10px] text-white px-1 py-0.5 mr-1">
                    拼
                  </div>
                )}
                <span className="text-[16px] text-[#1a1a1a]">
                  {packetType === 'LUCKY' ? '总金额' : '单个红包'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="text-right !border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-[16px] w-full placeholder:text-gray-300 !bg-transparent"
                  value={amount}
                  onCompositionStart={() => (isComposing.current = true)}
                  onCompositionEnd={(e) => {
                    isComposing.current = false;
                    const target = e.target as HTMLInputElement;
                    let value = target.value.replace(/[^\d.]/g, '');
                    const parts = value.split('.');
                    if (parts.length > 2) {
                      value = parts[0] + '.' + parts.slice(1).join('');
                    }
                    if (value.split('.')[0].length > 7) return;
                    if (parts[1] && parts[1].length > 6) {
                      const p = value.split('.');
                      p[1] = p[1].slice(0, 6);
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
                className="!border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-[16px] w-full placeholder:text-gray-300 !bg-transparent"
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
            className="w-fit self-center px-10 h-[48px] text-[16px] bg-[#fa5151] hover:bg-[#d64e3e] text-white rounded-lg font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                处理中...
              </>
            ) : (
              '塞钱进红包'
            )}
          </Button>

          {/* Footer Note */}
          <div className="mt-auto pt-8 text-center text-xs text-gray-400">
            未领取的红包,将于5天后发起退款
          </div>
        </div>

        {/* Type Switcher Action Sheet */}
        <ActionSheet
          isOpen={isTypeSwitcherOpen}
          onClose={() => setIsTypeSwitcherOpen(false)}
          title="红包类型"
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

        {/* Token Selector */}
        <TokenSelector
          isOpen={isTokenSelectorOpen}
          onClose={() => setIsTokenSelectorOpen(false)}
          selectedToken={selectedToken}
          onSelectToken={handleTokenSelect}
        />
      </DialogContent>
    </Dialog>
  );
}
