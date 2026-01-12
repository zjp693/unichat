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
import { Loader2, Plus } from 'lucide-react';
import { useAllowedTokens } from '@/hooks/contract/useAllowedTokens';

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

  const { toast } = useToast();
  const publicClient = usePublicClient();

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

  const handleAddToken = async () => {
    if (!tokenInfo || !address) return;

    try {
      setIsLoading(true);

      const newToken: Token = {
        address: address,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        iconCid: undefined,
        iconUrl: null
      };

      // 这里保留 localStorage 的逻辑，如果需要的话
      const customTokens = JSON.parse(
        localStorage.getItem('custom_tokens') || '[]'
      );
      if (!customTokens.includes(address)) {
        customTokens.push(address);
        localStorage.setItem('custom_tokens', JSON.stringify(customTokens));
        window.dispatchEvent(new Event('storage'));
      }

      toast({
        title: '添加成功',
        description: `${tokenInfo.symbol} 已添加到列表`,
        variant: 'success'
      });

      onConfirm(newToken);
      // onClose is responsible for closing the dialog
      onClose();

      // Reset state
      setAddress('');
      setTokenInfo(null);
    } catch (error) {
      console.error('添加失败', error);
      toast({
        title: '添加失败',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
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

          {tokenInfo && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
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
            {!tokenInfo ? (
              <Button
                onClick={handleCheckToken}
                disabled={!address || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '检查代币'
                )}
              </Button>
            ) : (
              <Button
                onClick={handleAddToken}
                disabled={isLoading}
                className="w-full"
              >
                确认添加
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
