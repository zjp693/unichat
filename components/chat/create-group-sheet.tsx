'use client';

import * as React from 'react';
import { Search, ChevronDown, Minus, Plus } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 类型定义
interface CreateGroupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup?: (data: CreateGroupData) => void;
}

export interface CreateGroupData {
  name: string;
  rules: string;
  tokenAddress: string;
  entryFee: string;
  ratios: {
    owner: number;
    inviter: number;
    member: number;
  };
}

const MAX_RATIO = 100;

export function CreateGroupSheet({
  isOpen,
  onClose,
  onCreateGroup
}: CreateGroupSheetProps) {
  // 表单状态
  const [name, setName] = React.useState('');
  const [rules, setRules] = React.useState('');
  const [tokenAddress, setTokenAddress] = React.useState('');
  const [entryFee, setEntryFee] = React.useState('1.95');

  // 比例状态
  const [ownerRatio, setOwnerRatio] = React.useState(9);
  const [inviterRatio, setInviterRatio] = React.useState(31);
  const [memberRatio, setMemberRatio] = React.useState(60);

  // 地址输入状态
  const [isAddressExpanded, setIsAddressExpanded] = React.useState(false);

  // 重置表单逻辑
  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setRules('');
      setTokenAddress('');
      setEntryFee('1.95');
      setOwnerRatio(9);
      setInviterRatio(31);
      setMemberRatio(60);
    }
  }, [isOpen]);

  // 衍生状态
  const currentTotalRatio = ownerRatio + inviterRatio + memberRatio;
  const isRatioValid = currentTotalRatio === MAX_RATIO;
  const isFormValid =
    name.trim() !== '' &&
    rules.trim() !== '' &&
    isRatioValid &&
    tokenAddress.trim() !== '';

  const handleRatioChange = (
    type: 'owner' | 'inviter' | 'member',
    operation: 'increment' | 'decrement'
  ) => {
    const setterMap = {
      owner: setOwnerRatio,
      inviter: setInviterRatio,
      member: setMemberRatio
    };

    const valueMap = {
      owner: ownerRatio,
      inviter: inviterRatio,
      member: memberRatio
    };

    const currentValue = valueMap[type];
    const newValue =
      operation === 'increment' ? currentValue + 1 : currentValue - 1;

    if (newValue >= 0 && newValue <= 100) {
      setterMap[type](newValue);
    }
  };

  const handleCreate = () => {
    if (onCreateGroup && isFormValid) {
      onCreateGroup({
        name,
        rules,
        tokenAddress,
        entryFee,
        ratios: {
          owner: ownerRatio,
          inviter: inviterRatio,
          member: memberRatio
        }
      });
      onClose();
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    if (addr.length < 20) return addr;
    // 格式化为 0x912...6455... (近似截图样式)
    return `${addr.slice(0, 6)}...${addr.slice(-8)}`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-[20px] p-0 overflow-hidden h-[90vh] flex flex-col gap-0 border-t-0 bg-white"
      >
        {/* 顶部拖拽条 */}
        <div className="flex justify-center pt-3 pb-2 bg-white sticky top-0 z-10">
          <div className="w-10 h-1 bg-gray-200 rounded-full"></div>
        </div>

        <SheetHeader className="px-5 pb-4 text-center bg-white border-b-0">
          <SheetTitle className="text-lg font-bold">创建群聊</SheetTitle>
        </SheetHeader>

        {/* 可滚动表单内容 */}
        <div className="flex-1 overflow-y-auto px-5  scrollbar-hide">
          <div className="space-y-6">
            {/* 群组名称 */}
            <div className="space-y-2">
              <Label
                htmlFor="group-name"
                className="text-sm font-bold text-gray-900"
              >
                群名称
              </Label>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <Input
                  id="group-name"
                  placeholder="输入群名称"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0 placeholder:text-gray-400 text-base"
                />
              </div>
            </div>

            {/* 群组规则 */}
            <div className="space-y-2">
              <Label
                htmlFor="group-rules"
                className="text-sm font-bold text-gray-900"
              >
                群制度
              </Label>
              <textarea
                id="group-rules"
                placeholder="请输入进群需要遵守的规则"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="w-full bg-gray-50 rounded-xl px-4 py-3 min-h-[100px] resize-none border-0 focus:outline-none placeholder:text-gray-400 text-base"
              />
            </div>

            {/* 代币合约地址 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-bold text-gray-900">
                  群代币合约地址
                </Label>
                <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5">
                  {/* Placeholder Icon for ARB, using div circle for now */}
                  <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white">
                    A
                  </div>
                  <span className="text-xs font-semibold text-gray-700">
                    ARB
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl px-3 py-3 flex items-center gap-2 relative">
                <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />

                <Input
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  placeholder="输入合约地址"
                  className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0 text-sm w-full placeholder:text-gray-400"
                />

                <ChevronDown className="w-5 h-5 text-gray-400 cursor-pointer flex-shrink-0" />
              </div>
            </div>

            {/* 分配比率 */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <Label className="text-sm font-bold text-gray-900">
                  群聊建群分配比例
                </Label>
                <div
                  className={cn(
                    'text-sm font-medium',
                    isRatioValid ? 'text-gray-900' : 'text-red-500'
                  )}
                >
                  {currentTotalRatio}/{MAX_RATIO}
                </div>
              </div>

              {/* 入群费用 */}
              <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center">
                <span className="text-gray-600 text-sm">进群费用</span>
                <div className="flex items-center gap-2 bg-white py-1 pr-3">
                  <Input
                    value={entryFee}
                    onChange={(e) => setEntryFee(e.target.value)}
                    className="w-16 h-auto p-0 border-0 text-right focus-visible:ring-0 font-semibold bg-transparent"
                    type="number"
                  />
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[8px] text-white">
                      A
                    </div>
                    <span className="text-xs font-medium text-gray-500">
                      ARB
                    </span>
                  </div>
                </div>
              </div>

              {/* 比率列表 */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <RatioRow
                  label="群主可获得收益"
                  value={ownerRatio}
                  onChange={(op) => handleRatioChange('owner', op)}
                />
                <RatioRow
                  label="邀请人可获得收益"
                  value={inviterRatio}
                  onChange={(op) => handleRatioChange('inviter', op)}
                />
                <RatioRow
                  label="群成员可获得收益"
                  value={memberRatio}
                  onChange={(op) => handleRatioChange('member', op)}
                />
              </div>

              {!isRatioValid && (
                <div className="text-red-500 text-xs text-center mt-1">
                  分配比例总和必须为 {MAX_RATIO}%
                </div>
              )}
            </div>

            {/* 代币发行与模型 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-bold text-gray-900">
                  代币发行数量
                </Label>
                <span className="text-sm text-gray-500 font-medium">
                  9,999,998,977.63 ARB
                </span>
              </div>
            </div>

            <div className="pt-2 pb-2 border-t border-gray-200">
              <Button
                className="w-full h-12 bg-[#8B5CF6] text-white rounded-xl  text-base font-medium shadow-purple-200 shadow-lg active:scale-95 transition-all"
                onClick={handleCreate}
                disabled={!isFormValid}
              >
                创建群聊
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// 比率行辅助组件
function RatioRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (op: 'increment' | 'decrement') => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600 text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange('decrement')}
          className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-all"
        >
          <Minus className="w-3 h-3" />
        </button>
        <div className="w-8 text-center text-sm ">{value}%</div>
        <button
          onClick={() => onChange('increment')}
          className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-all"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
