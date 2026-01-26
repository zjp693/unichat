'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import {
  Search,
  ChevronDown,
  Minus,
  Plus,
  Loader2,
  CheckCircle,
  Upload,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { uploadImageToPinata } from '@/lib/pinata-upload';
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
import { parseUnits, formatUnits } from 'viem';
import { useAllowedTokens, TokenInfo } from '@/hooks/contract/useAllowedTokens';
import {
  useCreateGroup,
  CreateGroupParams
} from '@/hooks/contract/useCreateGroup';
import { TokenLogo } from '@/components/contract/TokenLogo';
import { useClickOutside } from '@/hooks/useClickOutside';
import { TokenDropdown } from '@/components/contract/TokenDropdown';
import { TransactionProgress } from '@/components/contract/TransactionProgress';
import { setChatMeta } from '@/lib/chatMetaSlice';
import { useToast } from '@/hooks/use-toast';

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

export function CreateGroupSheet({
  isOpen,
  onClose,
  onCreateGroup
}: CreateGroupSheetProps) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { toast } = useToast();

  // 获取已上币代币列表
  const { tokens: allTokens, isLoading: isLoadingTokens } = useAllowedTokens();

  // 创建群组 Hook
  const {
    createGroup,
    status,
    isLoading: isCreating,
    reset
  } = useCreateGroup();

  // 防止重复跳转的标记
  const hasNavigated = React.useRef(false);

  // 表单状态
  const [name, setName] = React.useState('');
  const [rules, setRules] = React.useState('');
  const [tokenAddress, setTokenAddress] = React.useState('');
  const [entryFee, setEntryFee] = React.useState('1.95');

  // 头像状态
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  // 代币选择状态
  const [selectedToken, setSelectedToken] = React.useState<TokenInfo | null>(
    null
  );
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // 比例状态（固定值，不可调整）
  const [ownerRatio] = React.useState(9);
  const [inviterRatio] = React.useState(31);
  const [memberRatio] = React.useState(60);

  // 点击外部关闭下拉框
  useClickOutside(dropdownRef, () => {
    setIsDropdownOpen(false);
  });

  // 当选中代币变化时，联动更新地址
  React.useEffect(() => {
    if (selectedToken) {
      setTokenAddress(selectedToken.address);
    }
  }, [selectedToken]);

  // 重置表单逻辑
  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setRules('');
      setTokenAddress('');
      setEntryFee('1.95');
      setSelectedToken(null);
      setIsDropdownOpen(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      setIsUploading(false);

      // 重置创建状态
      reset();

      // 重置跳转标记
      hasNavigated.current = false;
    }
  }, [isOpen, reset]);

  // 处理头像选择
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: '文件过大',
        description: '图片大小不能超过 2MB',
        variant: 'destructive'
      });
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  // 监听创建成功并跳转
  React.useEffect(() => {
    if (status.state === 'success' && !hasNavigated.current && selectedToken) {
      hasNavigated.current = true;

      // TypeScript 类型守卫：此时已确认 state === 'success'
      if (status.state === 'success') {
        // 1. 关闭 Sheet
        onClose();

        // 2. 显示成功提示 toast
        toast({
          title: '🎉 群聊创建成功！',
          description: '欢迎来到你的红包群',
          variant: 'success'
        });

        // 3. 存储群聊元信息到 Redux
        dispatch(
          setChatMeta({
            chatId: status.groupAddress,
            meta: {
              type: 'group',
              groupType: 'redpacket', // 新建的群都是红包群
              name: name,
              address: status.groupAddress,
              level: 0, // 红包群没有等级
              memberCount: 1, // 初始只有创建者
              groupCondition: `入群费: ${entryFee}`,
              avatar: '' // 红包群暂无头像
            }
          })
        );

        // 4. 立即跳转到群聊页面
        router.push(
          `/chat/${status.groupAddress}?type=group&groupType=redpacket`
        );

        toast({
          title: '🎉 群聊创建成功！',
          description: '欢迎来到你的红包群',
          variant: 'success'
        });
      }
    }
  }, [status, selectedToken, name, entryFee, dispatch, onClose, router, toast]);

  // 表单验证
  const isFormValid =
    name.trim() !== '' &&
    rules.trim() !== '' &&
    selectedToken !== null &&
    parseFloat(entryFee) > 0;

  // 处理选择代币
  const handleSelectToken = (token: TokenInfo) => {
    setSelectedToken(token);
    setIsDropdownOpen(false);
  };

  // 处理创建群组
  const handleCreate = async () => {
    if (!isFormValid || !selectedToken) return;

    let finalAvatarCid = '';

    try {
      // 1. 如果有头像，先上传到 IPFS
      if (avatarFile) {
        setIsUploading(true);
        try {
          finalAvatarCid = await uploadImageToPinata(avatarFile);
        } catch (uploadError: any) {
          toast({
            title: '头像上传失败',
            description: uploadError.message || '由于网络原因，头像无法上传',
            variant: 'destructive'
          });
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      // 2. 准备合约参数
      const params: CreateGroupParams = {
        groupToken: selectedToken.address,
        entryFee: parseUnits(entryFee, selectedToken.decimals),
        groupName: name,
        groupRules: rules,
        groupAvatar: finalAvatarCid // 传入上一步拿到的 CID
      };

      // 3. 调用合约创建群组
      await createGroup(params);

      // 可选：调用回调函数
      if (onCreateGroup) {
        onCreateGroup({
          name,
          rules,
          tokenAddress: selectedToken.address,
          entryFee,
          ratios: {
            owner: ownerRatio,
            inviter: inviterRatio,
            member: memberRatio
          }
        });
      }
    } catch (error) {
      console.error('创建群组失败:', error);
      // 错误已由 useCreateGroup 处理，这里只做日志
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side="bottom"
          className="rounded-t-[20px] p-0 overflow-hidden h-[82vh] flex flex-col gap-0 border-t-0 bg-white"
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
              {/* 群头像上传 */}
              <div className="flex flex-col items-center justify-center pt-2">
                <input
                  type="file"
                  id="group-avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <label
                  htmlFor="group-avatar-upload"
                  className="relative cursor-pointer"
                >
                  <div
                    className={cn(
                      'w-24 h-24 rounded-2xl bg-gray-50 flex flex-col items-center justify-center overflow-hidden',
                      !avatarPreview &&
                        'border-2 border-dashed border-gray-200',
                      avatarPreview && 'border-0 shadow-sm'
                    )}
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-gray-300 group-hover:text-purple-300" />
                        <span className="text-[10px] text-gray-400 mt-1 font-medium group-hover:text-purple-400">
                          上传群头像
                        </span>
                      </>
                    )}
                  </div>

                  {avatarPreview && !isUploading && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
                      <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                    </div>
                  )}
                </label>
              </div>

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
                  {/* 已选代币徽章 */}
                  {selectedToken && (
                    <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5">
                      <TokenLogo token={selectedToken} size={16} />
                      <span className="text-xs font-semibold text-gray-700">
                        {selectedToken.symbol}
                      </span>
                    </div>
                  )}
                </div>

                {/* 下拉触发器 */}
                <div
                  ref={dropdownRef}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="bg-gray-50 rounded-xl px-3 py-3 flex items-center gap-2 relative cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />

                  <div className="flex-1 text-sm">
                    {selectedToken ? (
                      <span className="text-gray-600 font-mono text-xs">
                        {selectedToken.address}
                      </span>
                    ) : (
                      <span className="text-gray-400">点击选择群代币</span>
                    )}
                  </div>

                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-gray-400 transition-transform flex-shrink-0',
                      isDropdownOpen && 'rotate-180'
                    )}
                  />

                  {/* 代币下拉列表 */}
                  {isDropdownOpen && (
                    <TokenDropdown
                      tokens={allTokens}
                      selectedToken={selectedToken}
                      isLoading={isLoadingTokens}
                      onSelect={handleSelectToken}
                      onClose={() => setIsDropdownOpen(false)}
                    />
                  )}
                </div>
              </div>

              {/* 分配比率 */}
              <div className="space-y-4">
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
                      {selectedToken ? (
                        <>
                          <TokenLogo token={selectedToken} size={16} />
                          <span className="text-xs font-medium text-gray-500">
                            {selectedToken.symbol}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">未选择</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 比率列表 - 固定展示 */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-semibold text-gray-700 mb-2">
                    入群费分配规则（合约固定）
                  </div>
                  <InfoRow label="群主收益" value={`${ownerRatio}%`} />
                  <InfoRow label="推荐人收益" value={`${inviterRatio}%`} />
                  <InfoRow label="红包池" value={`${memberRatio}%`} />
                </div>
              </div>

              {/* 代币发行与模型 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-bold text-gray-900">
                    代币发行数量
                  </Label>
                  {selectedToken ? (
                    <span className="text-sm text-gray-500 font-medium">
                      {formatUnits(
                        selectedToken.totalSupply,
                        selectedToken.decimals
                      )}{' '}
                      {selectedToken.symbol}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">请先选择代币</span>
                  )}
                </div>
              </div>

              <div className="pt-2 pb-2 border-t border-gray-200">
                <Button
                  className="w-full h-12 bg-[#8B5CF6] text-white rounded-xl  text-base font-medium shadow-purple-200 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                  onClick={handleCreate}
                  disabled={!isFormValid || isCreating || isUploading}
                >
                  {isUploading
                    ? '上传图片中...'
                    : isCreating
                      ? '创建中...'
                      : '创建群聊'}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 交易进度展示 */}
      <TransactionProgress
        status={status}
        onClose={() => {
          reset();
          onClose();
        }}
      />
    </>
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

// 信息展示行组件（只读）
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600 text-sm">{label}</span>
      <span className="text-gray-900 text-sm font-medium">{value}</span>
    </div>
  );
}
