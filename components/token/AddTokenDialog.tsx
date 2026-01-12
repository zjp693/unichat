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

export function AddTokenDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [address, setAddress] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [tokenInfo, setTokenInfo] = React.useState<{
    symbol: string;
    decimals: number;
  } | null>(null);

  const { toast } = useToast();
  const publicClient = usePublicClient();
  // const { addToken } = useAllowedTokens(); // 移除未使用的引用

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
      const [symbol, decimals] = await Promise.all([
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
      // 调用 useAllowedTokens 中的 addToken 方法（假设它会处理本地存储更新）
      // 注意：这里的 addToken 可能需要根据实际 hook 实现调整
      // 临时实现：直接存入 localStorage 触发更新

      const customTokens = JSON.parse(
        localStorage.getItem('custom_tokens') || '[]'
      );
      if (!customTokens.includes(address)) {
        customTokens.push(address);
        localStorage.setItem('custom_tokens', JSON.stringify(customTokens));

        // 触发 storage 事件以便其他组件更新
        window.dispatchEvent(new Event('storage'));
      }

      toast({
        title: '添加成功',
        description: `${tokenInfo.symbol} 已添加到列表`,
        variant: 'success'
      });

      setIsOpen(false);
      setAddress('');
      setTokenInfo(null);
    } catch (error) {
      toast({
        title: '添加失败',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full flex items-center justify-center gap-2 border-dashed"
        >
          <Plus className="h-4 w-4" />
          添加自定义代币
        </Button>
      </DialogTrigger>
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
