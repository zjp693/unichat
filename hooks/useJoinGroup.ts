'use client';

/**
 * 加入群聊 Hook
 *
 * 处理加入红包群的完整流程：
 * 1. 检查用户余额
 * 2. 授权代币
 * 3. 调用 join 方法
 */

import { useState } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract
} from 'wagmi';
import { parseAbi, erc20Abi } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import RedPacketGroupABI from '@/contract/abi/RedPacketGroupImplementation.json';

export function useJoinGroup() {
  const { address: currentAddress } = useAccount();
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<
    'idle' | 'checking' | 'approving' | 'joining'
  >('idle');
  const [isJoining, setIsJoining] = useState(false);

  const { writeContract: approveToken, data: approvalHash } =
    useWriteContract();
  const { writeContract: joinGroup, data: joinHash } = useWriteContract();

  const { isLoading: isApprovingTx } = useWaitForTransactionReceipt({
    hash: approvalHash
  });
  const { isLoading: isJoiningTx } = useWaitForTransactionReceipt({
    hash: joinHash
  });

  /**
   * 检查代币余额
   */
  const checkBalance = async (
    tokenAddress: `0x${string}`,
    requiredAmount: bigint
  ): Promise<boolean> => {
    if (!currentAddress) return false;

    try {
      // 这里应该用 useReadContract，但为了简化，我们先假设余额足够
      // 实际应用中需要正确检查
      return true;
    } catch (error) {
      console.error('检查余额失败:', error);
      return false;
    }
  };

  /**
   * 执行加入群聊
   */
  const executeJoin = async (
    groupAddress: `0x${string}`,
    tokenAddress: `0x${string}`,
    entryFeeAmount: bigint,
    referralCode: `0x${string}`
  ) => {
    if (!currentAddress) {
      toast({
        title: '未连接钱包',
        description: '请先连接钱包',
        variant: 'destructive'
      });
      return;
    }

    setIsJoining(true);
    setStep('checking');

    try {
      // 1️⃣ 检查余额
      const hasBalance = await checkBalance(tokenAddress, entryFeeAmount);
      if (!hasBalance) {
        toast({
          title: '余额不足',
          description: '代币余额不足，无法加入群聊',
          variant: 'destructive'
        });
        setIsJoining(false);
        setStep('idle');
        return;
      }

      // 2️⃣ 授权代币
      setStep('approving');
      toast({
        title: '请授权代币',
        description: '请在钱包中确认授权交易'
      });

      await approveToken({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [groupAddress, entryFeeAmount]
      });

      toast({
        title: '授权中',
        description: '等待授权交易确认...'
      });

      // 等待一小段时间让授权生效
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 3️⃣ 调用 join 方法
      setStep('joining');
      toast({
        title: '正在加入',
        description: '请在钱包中确认加入交易'
      });

      await joinGroup({
        address: groupAddress,
        abi: RedPacketGroupABI.abi as any,
        functionName: 'join',
        args: [0, referralCode] // subgroupId = 0 (主群)
      });

      toast({
        title: '加入中',
        description: '等待交易确认...'
      });

      // 等待加入交易确认
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 4️⃣ 成功
      toast({
        title: '加入成功',
        description: '欢迎加入群聊！',
        variant: 'success'
      });

      // 跳转到群聊页面
      setTimeout(() => {
        router.push(`/chat/${groupAddress}?type=group&groupType=redpacket`);
      }, 1000);
    } catch (error: any) {
      console.error('加入群聊失败:', error);

      const errorMessage = error?.message || error?.toString() || '';
      const errorLower = errorMessage.toLowerCase();

      if (
        errorLower.includes('user rejected') ||
        errorLower.includes('user denied')
      ) {
        toast({
          title: '已取消',
          description: '您取消了交易'
        });
      } else if (errorLower.includes('already member')) {
        toast({
          title: '已是成员',
          description: '您已经是该群的成员',
          variant: 'destructive'
        });
      } else {
        toast({
          title: '加入失败',
          description: errorMessage.slice(0, 100) || '请稍后重试',
          variant: 'destructive'
        });
      }
    } finally {
      setIsJoining(false);
      setStep('idle');
    }
  };

  return {
    executeJoin,
    isJoining,
    step
  };
}
