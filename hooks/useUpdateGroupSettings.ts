'use client';

/**
 * 更新群设置 Hook
 *
 * 调用合约的 setGroupSettings 函数更新群名称、经济模型、群制度、群公告和进群费用
 */

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { zeroHash } from 'viem';
import { useToast } from '@/hooks/use-toast';
import RedPacketGroupABI from '@/contract/abi/RedPacketGroupImplementation.json';

export function useUpdateGroupSettings() {
  const { toast } = useToast();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash
  });

  const updateSettings = async (
    groupAddress: `0x${string}`,
    settings: {
      groupName?: string;
      economicModel?: string;
      groupRules?: string;
      announcement?: string;
      entryFee?: bigint;
      groupAvatar?: string;
    }
  ) => {
    try {
      toast({
        title: '保存中',
        description: '正在更新群设置...'
      });

      await writeContractAsync({
        address: groupAddress,
        abi: RedPacketGroupABI.abi as any,
        functionName: 'setGroupSettings',
        args: [
          settings.groupName || '',
          settings.economicModel || '',
          settings.groupRules || '',
          settings.announcement || '',
          settings.entryFee || 0n,
          settings.groupAvatar || '' // 空字符串表示不修改
        ]
      });

      toast({
        title: '保存成功',
        description: '群设置已更新',
        variant: 'success'
      });

      return true;
    } catch (error: any) {
      console.error('更新群设置失败:', error);

      // 用户拒绝交易
      if (error?.message?.includes('User rejected')) {
        toast({
          title: '已取消',
          description: '用户取消了交易',
          variant: 'destructive'
        });
        return false;
      }

      toast({
        title: '保存失败',
        description: error?.message || '更新群设置时发生错误',
        variant: 'destructive'
      });

      return false;
    }
  };

  return {
    updateSettings,
    isPending,
    isConfirming,
    isSuccess,
    hash
  };
}
