'use client';

import { useState, useEffect } from 'react';
import { isAddress } from 'viem';
import { Loader2, AlertCircle } from 'lucide-react';
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
import type { AddTokenDialogProps, Token } from './types';

export function AddTokenDialog({
  isOpen,
  onClose,
  onConfirm
}: AddTokenDialogProps) {
  const [address, setAddress] = useState('');
  const [debouncedAddress, setDebouncedAddress] = useState('');

  const { tokenInfo, isLoading } = useTokenInfo(debouncedAddress);

  // 防抖处理
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAddress(address)) {
        setDebouncedAddress(address);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [address]);

  const handleConfirm = () => {
    if (!tokenInfo || !debouncedAddress) return;

    const token: Token = {
      address: debouncedAddress.toLowerCase(),
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      decimals: tokenInfo.decimals
    };

    onConfirm(token);
    handleClose();
  };

  const handleClose = () => {
    setAddress('');
    setDebouncedAddress('');
    onClose();
  };

  const isValidAddress = isAddress(address);
  const showLoading = isValidAddress && isLoading;
  const showInfo = isValidAddress && !isLoading && tokenInfo;
  const showError = isValidAddress && !isLoading && !tokenInfo;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加自定义代币</DialogTitle>
          <DialogDescription>
            输入 ERC20 代币合约地址以添加到列表
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

          {showLoading && (
            <div className="flex items-center gap-2 text-gray-600 p-3 bg-gray-50 rounded">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">正在查询代币信息...</span>
            </div>
          )}

          {showInfo && (
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
          <Button onClick={handleConfirm} disabled={!showInfo}>
            确认添加
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
