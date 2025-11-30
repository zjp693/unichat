'use client';

import { useState, useEffect } from 'react';
import { isAddress } from 'viem';
import { Loader2, AlertCircle, Info, Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTokenInfo } from './hooks/useTokenData';
import { useRecommendToken } from './hooks/useRecommendToken';
import { useReadContract } from 'wagmi';
import { RedPacketAbi, RED_PACKET_CONTRACT_ADDRESS } from '@/lib/RedPacketAbi';
import { uploadImageToPinata } from '@/lib/pinata-upload';
import { useToast } from '@/hooks/use-toast';
import type { AddTokenDialogProps, Token } from './types';

export function AddTokenDialog({
  isOpen,
  onClose,
  onConfirm
}: AddTokenDialogProps) {
  const { toast } = useToast();
  const [address, setAddress] = useState('');
  const [debouncedAddress, setDebouncedAddress] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>('');
  const [iconCid, setIconCid] = useState<string>('');
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  const { tokenInfo, isLoading } = useTokenInfo(debouncedAddress);
  const {
    formattedStakeAmount,
    isAllowanceSufficient,
    approve,
    recommend,
    isProcessing,
    refetchAllowance
  } = useRecommendToken();

  // 🔍 检查代币是否已在推荐列表中
  const { data: isRecommended, isLoading: isCheckingRecommended } =
    useReadContract({
      address: RED_PACKET_CONTRACT_ADDRESS,
      abi: RedPacketAbi,
      functionName: 'isTokenRecommended',
      args:
        debouncedAddress && isAddress(debouncedAddress)
          ? [debouncedAddress as `0x${string}`]
          : undefined,
      query: {
        enabled: !!debouncedAddress && isAddress(debouncedAddress)
      }
    });

  // 防抖处理
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAddress(address)) {
        setDebouncedAddress(address);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [address]);

  const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast({
        title: '文件格式错误',
        description: '请上传图片文件',
        variant: 'destructive'
      });
      return;
    }

    // 验证文件大小 (比如 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: '文件过大',
        description: '图片大小不能超过 2MB',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsUploadingIcon(true);
      setIconFile(file);

      // 创建本地预览
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // 上传到 Pinata
      const cid = await uploadImageToPinata(file);
      setIconCid(cid);
    } catch (error) {
      console.error('上传头像失败:', error);
      toast({
        title: '上传失败',
        description: '上传头像失败，请重试',
        variant: 'destructive'
      });
      handleRemoveIcon();
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const handleRemoveIcon = () => {
    setIconFile(null);
    setIconPreview('');
    setIconCid('');
    if (document.getElementById('icon-upload')) {
      (document.getElementById('icon-upload') as HTMLInputElement).value = '';
    }
  };

  const handleConfirm = async () => {
    if (!tokenInfo || !debouncedAddress) return;

    // 强制要求上传头像
    if (!iconCid) {
      toast({
        title: '请上传图标',
        description: '推荐代币必须上传图标',
        variant: 'destructive'
      });
      return;
    }

    const token: Token = {
      address: debouncedAddress.toLowerCase(),
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      decimals: tokenInfo.decimals,
      iconCid: iconCid // 使用上传后的 CID
    };

    // 🔥 直接执行推荐上链流程（两步交易）
    try {
      console.log('💰 开始推荐代币上链流程...');

      if (!isAllowanceSufficient) {
        console.log('📝 第1步：需要授权，调用 approve...');
        // 1. 授权交易
        const approveTx = await approve();
        console.log('✅ 授权交易已提交，hash:', approveTx);

        // 等待授权额度更新（wagmi 会自动更新）
        // 用户需要等待钱包确认后，再次点击按钮进行第2步
        console.log('⏳ 请在钱包中确认授权交易，完成后再次点击按钮进行推荐');
        toast({
          title: '授权成功',
          description: '请再次点击按钮进行支付推荐'
        });
        await refetchAllowance();
        return; // 🔴 这里返回，让用户再次点击按钮
      } else {
        console.log('📝 第2步：已授权，调用 recommendToken...');
        // 2. 推荐交易
        // 传入 iconCid
        const recommendTx = await recommend(token.address, iconCid);
        console.log('✅ 推荐交易已提交，hash:', recommendTx);
        console.log('🎉 代币已成功推荐上链！');

        toast({
          title: '推荐成功',
          description: '代币已成功推荐上链！'
        });

        // 成功发起交易后，添加到本地列表以便即时反馈
        onConfirm(token);
        handleClose();
      }
    } catch (e) {
      console.error('❌ 操作失败:', e);
      toast({
        title: '操作失败',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive'
      });
    }
  };

  const handleClose = () => {
    setAddress('');
    setDebouncedAddress('');
    handleRemoveIcon(); // 清理图标状态
    onClose();
  };

  const isValidAddress = isAddress(address);
  const showLoading = isValidAddress && (isLoading || isCheckingRecommended);
  const showInfo =
    isValidAddress &&
    !isLoading &&
    !isCheckingRecommended &&
    tokenInfo &&
    !(isRecommended as boolean);
  const showError =
    isValidAddress && !isLoading && !isCheckingRecommended && !tokenInfo;
  const showAlreadyRecommended =
    isValidAddress &&
    !isLoading &&
    !isCheckingRecommended &&
    tokenInfo &&
    (isRecommended as boolean);

  // 按钮文案逻辑
  let buttonText = '确认添加';
  if (showInfo) {
    // 只有查询到代币信息后才显示金额
    if (isProcessing) {
      buttonText = '处理中...';
    } else if (isUploadingIcon) {
      buttonText = '上传图标中...';
    } else if (!isAllowanceSufficient) {
      buttonText = `授权 ${formattedStakeAmount} UNICHAT`;
    } else {
      buttonText = `支付 ${formattedStakeAmount} UNICHAT 并推荐`;
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加自定义代币</DialogTitle>
          <DialogDescription>
            输入 ERC20 代币合约地址并上传图标以添加到列表
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="font-mono text-sm"
            />
            {!isValidAddress && address && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                请输入有效的以太坊地址
              </p>
            )}
          </div>

          {/* 图标上传区域 */}
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
                    支持 JPG, PNG, GIF (最大 2MB)
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

          {showLoading && (
            <div className="flex items-center gap-2 text-gray-600 p-3 bg-gray-50 rounded">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">正在查询代币信息...</span>
            </div>
          )}

          {showInfo && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">代币名称</span>
                  <span className="font-medium">{tokenInfo.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">符号</span>
                  <span className="font-medium">{tokenInfo.symbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">精度</span>
                  <span className="font-medium">{tokenInfo.decimals}</span>
                </div>
              </div>
            </div>
          )}

          {showAlreadyRecommended && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-yellow-800">
                    代币已在推荐列表中
                  </p>
                  <div className="space-y-1 text-sm text-yellow-700">
                    <div className="flex justify-between">
                      <span className="text-gray-600">代币名称</span>
                      <span className="font-medium">{tokenInfo?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">符号</span>
                      <span className="font-medium">{tokenInfo?.symbol}</span>
                    </div>
                  </div>
                  <p className="text-xs text-yellow-600 mt-2">
                    该代币已经被推荐到公共列表，无需重复推荐
                  </p>
                </div>
              </div>
            </div>
          )}

          {showError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              无法获取代币信息，请确认地址是否正确
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !showInfo ||
              isProcessing ||
              !!showAlreadyRecommended ||
              isUploadingIcon ||
              !iconCid
            }
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
