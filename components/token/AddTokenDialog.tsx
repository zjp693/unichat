'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { usePublicClient } from 'wagmi';
import { getAddress, isAddress, erc20Abi } from 'viem';
import { Loader2, Plus, Upload, X, AlertCircle } from 'lucide-react';
import { useAllowedTokens } from '@/hooks/contract/useAllowedTokens';
import {
  useRedPacketAddress,
  RedPacketAbi,
  useGetRecommendedTokenInfo
} from '@/lib/RedPacketAbi';
import { useRecommendToken } from './hooks/useRecommendToken';
import { uploadImageToPinata } from '@/lib/pinata-upload';

import type { AddTokenDialogProps, Token } from './types';

export function AddTokenDialog({
  isOpen,
  onClose,
  onConfirm
}: AddTokenDialogProps) {
  const [address, setAddress] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [tokenInfo, setTokenInfo] = React.useState<{
    name: string;
    symbol: string;
    decimals: number;
  } | null>(null);

  // 头像相关状态
  const [iconPreview, setIconPreview] = React.useState<string | null>(null);
  const [iconCid, setIconCid] = React.useState<string>('');
  const [isUploadingIcon, setIsUploadingIcon] = React.useState(false);

  const { toast } = useToast();
  const publicClient = usePublicClient();

  // 检查是否已在推荐列表中
  const { data: recommendedInfo, isLoading: isCheckingRecommended } =
    useGetRecommendedTokenInfo(isAddress(address) ? address : undefined);

  const isRecommended = React.useMemo(() => {
    if (!recommendedInfo) return false;
    // 返回值是 RecommendedTokenInfo 结构体
    return (recommendedInfo as any)[0] === true;
  }, [recommendedInfo]);

  const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. 验证文件
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: '文件过大',
        description: '图片大小不能超过 2MB',
        variant: 'destructive'
      });
      return;
    }

    // 2. 显示预览
    const reader = new FileReader();
    reader.onloadend = () => {
      setIconPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 3. 上传到 IPFS
    try {
      setIsUploadingIcon(true);
      const cid = await uploadImageToPinata(file);
      setIconCid(cid);
      toast({
        title: '上传成功',
        description: '代币图标已保存到 IPFS',
        variant: 'success'
      });
    } catch (error: any) {
      console.error('上传失败:', error);
      toast({
        title: '上传失败',
        description: error.message || '图片上传失败，请重试',
        variant: 'destructive'
      });
      setIconPreview(null);
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const handleRemoveIcon = () => {
    setIconPreview(null);
    setIconCid('');
  };

  const handleCheckToken = async () => {
    if (!isAddress(address)) {
      toast({
        title: '无效地址',
        description: '请输入正确的合约地址',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setTokenInfo(null);

    try {
      const [name, symbol, decimals] = await Promise.all([
        publicClient?.readContract({
          address: getAddress(address),
          abi: erc20Abi,
          functionName: 'name'
        }),
        publicClient?.readContract({
          address: getAddress(address),
          abi: erc20Abi,
          functionName: 'symbol'
        }),
        publicClient?.readContract({
          address: getAddress(address),
          abi: erc20Abi,
          functionName: 'decimals'
        })
      ]);

      setTokenInfo({
        name: name as string,
        symbol: symbol as string,
        decimals: Number(decimals)
      });
    } catch (error) {
      console.error('获取代币信息失败:', error);
      toast({
        title: '获取失败',
        description: '无法获取代币信息，请检查地址是否正确',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const {
    stakeAmount,
    formattedStakeAmount,
    isAllowanceSufficient,
    isProcessing,
    handleExecuteRecommend
  } = useRecommendToken();
  const redPacketAddress = useRedPacketAddress();

  const handleAddToken = async () => {
    if (!tokenInfo || !address || !redPacketAddress) return;
    if (!iconCid) {
      toast({
        title: '缺少图标',
        description: '请先上传代币图标',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);

      const hash = await handleExecuteRecommend(address, iconCid, (msg) => {
        toast({
          title: '正在处理',
          description: msg
        });
      });

      if (hash) {
        toast({
          title: '提交成功',
          description: `${tokenInfo.symbol} 已提交到链上推荐列表，请刷新查看`,
          variant: 'success'
        });

        onConfirm({
          address: address,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          iconCid: iconCid,
          iconUrl: iconPreview
        });

        onClose();
        // 重置状态
        setAddress('');
        setTokenInfo(null);
        handleRemoveIcon();
      }
    } catch (error: any) {
      toast({
        title: '操作失败',
        description: error.message || '链上交互失败，请重试',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 动态按钮文案
  const getButtonText = () => {
    if (isLoading || isProcessing) return '处理中...';
    if (isUploadingIcon) return '上传图标中...';
    if (!isAllowanceSufficient && tokenInfo && !isRecommended) {
      return `授权 ${formattedStakeAmount} UNICHAT`;
    }
    return `支付 ${formattedStakeAmount} UNICHAT 并推荐`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加自定义代币</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              placeholder="输入代币合约地址 (0x...)"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setTokenInfo(null);
              }}
            />
          </div>

          {tokenInfo && isRecommended && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <p className="text-amber-800 font-medium">代币已存在</p>
              <p className="text-sm text-amber-600">
                该代币已经在推荐列表中了，无需重复推荐。
              </p>
            </div>
          )}

          {/* 图标上传区域 - 只有在查询到合法的代币信息且它尚未被推荐时才显示 */}
          {tokenInfo && !isRecommended && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                代币图标 <span className="text-red-500">*</span>
              </label>

              {!iconPreview ? (
                <div className="relative">
                  <input
                    type="file"
                    id="icon-upload"
                    accept="image/*"
                    onChange={handleIconChange}
                    className="hidden"
                    disabled={isUploadingIcon}
                  />
                  <label
                    htmlFor="icon-upload"
                    className={`
                      flex flex-col items-center justify-center w-full h-32
                      border-2 border-dashed border-gray-300 rounded-lg
                      cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors
                      ${isUploadingIcon ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {isUploadingIcon ? (
                      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    )}
                    <span className="text-sm text-gray-500">
                      {isUploadingIcon ? '上传中...' : '点击上传图标'}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      支持 JPG, PNG (最大 2MB)
                    </span>
                  </label>
                </div>
              ) : (
                <div className="relative w-24 h-24 mx-auto border rounded-lg overflow-hidden group">
                  <img
                    src={iconPreview}
                    alt="Token Icon"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={handleRemoveIcon}
                    className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {tokenInfo && !isRecommended && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">名称:</span>
                <span className="font-medium">{tokenInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">代币符号:</span>
                <span className="font-medium">{tokenInfo.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">精度:</span>
                <span className="font-medium">{tokenInfo.decimals}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            {!tokenInfo || isRecommended ? (
              <Button
                onClick={handleCheckToken}
                disabled={
                  !address ||
                  isLoading ||
                  isCheckingRecommended ||
                  !!(tokenInfo && isRecommended)
                }
                className="w-full h-11"
              >
                {isLoading || isCheckingRecommended ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : tokenInfo && isRecommended ? (
                  '代币已存在'
                ) : (
                  '检查代币'
                )}
              </Button>
            ) : (
              <Button
                onClick={handleAddToken}
                disabled={
                  isLoading || isProcessing || isUploadingIcon || !iconCid
                }
                className="w-full h-11 bg-purple-600 hover:bg-purple-700 font-bold"
              >
                {(isLoading || isProcessing) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {getButtonText()}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
