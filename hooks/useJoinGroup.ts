'use client';

/**
 * 加入群聊 Hook
 *
 * 处理加入红包群的完整流程：
 * 1. 检查用户余额
 * 2. 检查授权额度（如果已授权则跳过）
 * 3. 授权代币（无限额度）
 * 4. 等待授权交易确认
 * 5. 调用 join 方法
 * 6. 等待加入交易确认
 */

import { useState } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import {
  erc20Abi,
  BaseError,
  ContractFunctionRevertedError,
  decodeErrorResult,
  maxUint256,
  type PublicClient
} from 'viem';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import RedPacketGroupABI from '@/contract/abi/RedPacketGroupImplementation.json';

// ============================================================================
// 类型定义
// ============================================================================

type JoinStep = 'idle' | 'checking' | 'approving' | 'joining';

// ============================================================================
// 辅助函数：错误处理
// ============================================================================

/**
 * 检查是否为用户取消交易
 */
function isUserRejectedError(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || '';
  const errorLower = errorMessage.toLowerCase();
  return (
    errorLower.includes('user rejected') ||
    errorLower.includes('user denied') ||
    errorLower.includes('user cancelled')
  );
}

/**
 * 解析合约错误并返回用户友好的错误信息
 */
function parseContractError(error: any): {
  errorName: string | null;
  title: string;
  description: string;
  shouldRedirect?: boolean;
} {
  const baseError = error as BaseError;

  const revertError = baseError.walk(
    (err) => err instanceof ContractFunctionRevertedError
  );

  if (!(revertError instanceof ContractFunctionRevertedError)) {
    const errorMessage = error?.message || error?.toString() || '';
    return {
      errorName: null,
      title: '加入失败',
      description: errorMessage.slice(0, 100) || '请稍后重试'
    };
  }

  try {
    const decodedError = decodeErrorResult({
      abi: RedPacketGroupABI.abi as any,
      data: (revertError.data || '0x') as `0x${string}`
    });

    const errorMap: Record<
      string,
      { title: string; description: string; shouldRedirect?: boolean }
    > = {
      AlreadyMember: {
        title: '您已是群成员',
        description: '无需重复加入，即将进入群聊...',
        shouldRedirect: true
      },
      NeedGroupToken: {
        title: '需要持有群代币',
        description: '您需要持有该群的代币才能加入'
      },
      InsufficientBalance: {
        title: '余额不足',
        description: '钱包余额不足，无法支付入群费用'
      },
      AmountZero: {
        title: '余额不足',
        description: '钱包余额不足，无法支付入群费用'
      },
      NotMember: {
        title: '权限不足',
        description: '您不是该群成员'
      },
      NotInSubgroup: {
        title: '权限不足',
        description: '您不是该群成员'
      }
    };

    const mapped = errorMap[decodedError.errorName];
    if (mapped) {
      return { errorName: decodedError.errorName, ...mapped };
    }

    return {
      errorName: decodedError.errorName,
      title: '加入失败',
      description: `操作失败: ${decodedError.errorName}`
    };
  } catch (decodeError) {
    console.error('解析错误失败:', decodeError);
    const errorMessage = error?.message || error?.toString() || '';
    return {
      errorName: null,
      title: '加入失败',
      description: errorMessage.slice(0, 100) || '请稍后重试'
    };
  }
}

// ============================================================================
// Hook 主体
// ============================================================================

export function useJoinGroup() {
  const { address: currentAddress } = useAccount();
  const { toast } = useToast();
  const router = useRouter();
  const publicClient = usePublicClient();

  const [step, setStep] = useState<JoinStep>('idle');
  const [isJoining, setIsJoining] = useState(false);

  const { writeContractAsync } = useWriteContract();

  // ==========================================================================
  // 链上查询函数
  // ==========================================================================

  /**
   * 检查代币余额
   */
  const checkBalance = async (
    tokenAddress: `0x${string}`,
    requiredAmount: bigint
  ): Promise<boolean> => {
    if (!currentAddress || !publicClient) return false;

    try {
      const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [currentAddress]
      });

      return balance >= requiredAmount;
    } catch (error) {
      console.error('检查余额失败:', error);
      return false;
    }
  };

  /**
   * 检查授权额度
   */
  const checkAllowance = async (
    tokenAddress: `0x${string}`,
    spenderAddress: `0x${string}`
  ): Promise<bigint> => {
    if (!currentAddress || !publicClient) return 0n;

    try {
      const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [currentAddress, spenderAddress]
      });

      return allowance;
    } catch (error) {
      console.error('检查授权额度失败:', error);
      return 0n;
    }
  };

  // ==========================================================================
  // 交易执行函数
  // ==========================================================================

  /**
   * 执行代币授权（无限额度）
   */
  const executeApproval = async (
    tokenAddress: `0x${string}`,
    spenderAddress: `0x${string}`,
    client: PublicClient
  ): Promise<void> => {
    toast({
      title: '请授权代币',
      description: '授权后可直接加入多个群组，无需重复授权'
    });

    const approvalTxHash = await writeContractAsync({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spenderAddress, maxUint256]
    });

    toast({
      title: '授权中',
      description: '等待区块确认...'
    });

    const approvalReceipt = await client.waitForTransactionReceipt({
      hash: approvalTxHash,
      confirmations: 1
    });

    if (approvalReceipt.status !== 'success') {
      throw new Error('授权交易失败');
    }

    toast({
      title: '授权成功',
      description: '开始加入群组...'
    });
  };

  /**
   * 执行加入群组交易
   */
  const executeJoinTransaction = async (
    groupAddress: `0x${string}`,
    referralCode: `0x${string}`,
    client: PublicClient
  ): Promise<void> => {
    toast({
      title: '正在加入',
      description: '请在钱包中确认加入交易'
    });

    const joinTxHash = await writeContractAsync({
      address: groupAddress,
      abi: RedPacketGroupABI.abi as any,
      functionName: 'join',
      args: [0, referralCode] // subgroupId = 0 (主群)
    });

    toast({
      title: '加入中',
      description: '等待区块确认...'
    });

    const joinReceipt = await client.waitForTransactionReceipt({
      hash: joinTxHash,
      confirmations: 1
    });

    if (joinReceipt.status !== 'success') {
      throw new Error('加入群聊交易失败');
    }
  };

  /**
   * 处理加入成功
   */
  const handleJoinSuccess = (groupAddress: `0x${string}`) => {
    toast({
      title: '加入成功',
      description: '欢迎加入群聊！',
      variant: 'success'
    });

    setTimeout(() => {
      router.push(
        `/chat/${groupAddress}?type=group&groupType=redpacket&from=join`
      );
    }, 1000);
  };

  /**
   * 处理错误
   */
  const handleError = (error: any, groupAddress: `0x${string}`) => {
    console.error('加入群聊失败:', error);

    // 用户取消交易
    if (isUserRejectedError(error)) {
      toast({
        title: '已取消',
        description: '您取消了交易'
      });
      return;
    }

    // 解析合约错误
    const parsed = parseContractError(error);

    toast({
      title: parsed.title,
      description: parsed.description,
      variant: parsed.shouldRedirect ? 'default' : 'destructive'
    });

    // 如果是已是成员，跳转到群聊
    if (parsed.shouldRedirect) {
      setTimeout(() => {
        router.push(
          `/chat/${groupAddress}?type=group&groupType=redpacket&from=join`
        );
      }, 1500);
    }
  };

  // ==========================================================================
  // 主入口函数
  // ==========================================================================

  /**
   * 执行加入群聊（主入口）
   */
  const executeJoin = async (
    groupAddress: `0x${string}`,
    tokenAddress: `0x${string}`,
    entryFeeAmount: bigint,
    referralCode: `0x${string}`
  ) => {
    // 前置检查
    if (!currentAddress) {
      toast({
        title: '未连接钱包',
        description: '请先连接钱包',
        variant: 'destructive'
      });
      return;
    }

    if (!publicClient) {
      toast({
        title: '网络错误',
        description: '无法连接到区块链网络',
        variant: 'destructive'
      });
      return;
    }

    setIsJoining(true);
    setStep('checking');

    try {
      // 1️⃣ 检查余额
      toast({
        title: '检查中',
        description: '正在检查代币余额...'
      });

      const hasBalance = await checkBalance(tokenAddress, entryFeeAmount);
      if (!hasBalance) {
        toast({
          title: '余额不足',
          description: '代币余额不足，无法加入群聊',
          variant: 'destructive'
        });
        return;
      }

      // 2️⃣ 检查授权额度
      const currentAllowance = await checkAllowance(tokenAddress, groupAddress);

      // 3️⃣ 如果授权额度不足，需要授权
      if (currentAllowance < entryFeeAmount) {
        setStep('approving');
        await executeApproval(tokenAddress, groupAddress, publicClient);
      } else {
        toast({
          title: '已授权',
          description: '检测到已授权，直接加入群组'
        });
      }

      // 4️⃣ 执行加入群组
      setStep('joining');
      await executeJoinTransaction(groupAddress, referralCode, publicClient);

      // 5️⃣ 成功处理
      handleJoinSuccess(groupAddress);
    } catch (error: any) {
      handleError(error, groupAddress);
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
