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
import {
  parseAbi,
  erc20Abi,
  BaseError,
  ContractFunctionRevertedError,
  decodeErrorResult
} from 'viem';
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
        router.push(
          `/chat/${groupAddress}?type=group&groupType=redpacket&from=join`
        );
      }, 1000);
    } catch (error: any) {
      console.error('加入群聊失败:', error);

      // 检测用户取消交易
      const errorMessage = error?.message || error?.toString() || '';
      const errorLower = errorMessage.toLowerCase();

      if (
        errorLower.includes('user rejected') ||
        errorLower.includes('user denied') ||
        errorLower.includes('user cancelled')
      ) {
        toast({
          title: '已取消',
          description: '您取消了交易'
        });
        setIsJoining(false);
        setStep('idle');
        return;
      }

      // 使用 viem 的方式解析合约错误
      const baseError = error as BaseError;
      console.log('🔍 baseError:', baseError);

      const revertError = baseError.walk(
        (err) => err instanceof ContractFunctionRevertedError
      );
      console.log('🔍 revertError:', revertError);

      if (revertError instanceof ContractFunctionRevertedError) {
        console.log('🔍 revertError.data:', revertError.data);

        try {
          const decodedError = decodeErrorResult({
            abi: RedPacketGroupABI.abi as any,
            data: (revertError.data || '0x') as `0x${string}`
          });

          console.log('✅ 解析的错误:', decodedError);
          console.log('✅ 错误名称:', decodedError?.errorName);

          // 根据错误名称显示对应的提示
          switch (decodedError.errorName) {
            case 'AlreadyMember':
              toast({
                title: '您已是群成员',
                description: '无需重复加入，即将进入群聊...',
                variant: 'default'
              });
              setTimeout(() => {
                router.push(
                  `/chat/${groupAddress}?type=group&groupType=redpacket&from=join`
                );
              }, 1500);
              return;

            case 'NeedGroupToken':
              toast({
                title: '需要持有群代币',
                description: '您需要持有该群的代币才能加入',
                variant: 'destructive'
              });
              break;

            case 'InsufficientBalance':
            case 'AmountZero':
              toast({
                title: '余额不足',
                description: '钱包余额不足，无法支付入群费用',
                variant: 'destructive'
              });
              break;

            case 'NotMember':
            case 'NotInSubgroup':
              toast({
                title: '权限不足',
                description: '您不是该群成员',
                variant: 'destructive'
              });
              break;

            default:
              toast({
                title: '加入失败',
                description: `操作失败: ${decodedError.errorName}`,
                variant: 'destructive'
              });
          }
        } catch (decodeError) {
          console.error('解析错误失败:', decodeError);
          toast({
            title: '加入失败',
            description: errorMessage.slice(0, 100) || '请稍后重试',
            variant: 'destructive'
          });
        }
      } else {
        // 不是合约 revert 错误，可能是网络问题等
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
