import { useState } from 'react';
import { useWalletClient, usePublicClient, useReadContract } from 'wagmi';
import {
  parseAbi,
  Abi,
  Address,
  BaseError,
  ContractFunctionRevertedError,
  decodeErrorResult
} from 'viem';
import RedPacketGroupABI from '@/contract/abi/RedPacketGroupImplementation.json';

/**
 * Hook for joining RedPacketGroup contracts
 * RedPacketGroup uses join(uint32 subgroupId, bytes32 referralCode) instead of joinCommunity
 */
export function useJoinRedPacketGroup() {
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const joinRedPacketGroup = async (
    groupAddress: string,
    subgroupId: number = 0,
    referralCode: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000000'
  ) => {
    if (!walletClient || !publicClient) {
      const errorMsg = '请先连接钱包';
      console.error('❌ [加入红包群]', errorMsg);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      setIsJoining(true);
      setError(null);

      // RedPacketGroup ABI for join method
      const redPacketGroupABI = parseAbi([
        'function join(uint32 subgroupId, bytes32 referralCode)',
        'function entryToken() view returns (address)',
        'function entryFeeAmount() view returns (uint256)',
        'function groupToken() view returns (address)'
      ]);

      // 1. 获取入群费信息
      const [entryToken, entryFeeAmount] = await Promise.all([
        publicClient.readContract({
          address: groupAddress as Address,
          abi: redPacketGroupABI,
          functionName: 'entryToken'
        }),
        publicClient.readContract({
          address: groupAddress as Address,
          abi: redPacketGroupABI,
          functionName: 'entryFeeAmount'
        })
      ]);

      // 2. 如果需要入群费，先检查余额再授权代币
      if (entryFeeAmount > BigInt(0)) {
        const erc20ABI = parseAbi([
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)',
          'function balanceOf(address account) view returns (uint256)',
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)'
        ]);

        // ✅ 先读取代币信息（symbol 和 decimals）
        const [tokenSymbol, tokenDecimals] = await Promise.all([
          publicClient.readContract({
            address: entryToken as Address,
            abi: erc20ABI,
            functionName: 'symbol'
          }) as Promise<string>,
          publicClient.readContract({
            address: entryToken as Address,
            abi: erc20ABI,
            functionName: 'decimals'
          }) as Promise<number>
        ]);

        // ✅ 检查用户代币余额
        const userBalance = (await publicClient.readContract({
          address: entryToken as Address,
          abi: erc20ABI,
          functionName: 'balanceOf',
          args: [walletClient.account.address]
        })) as bigint;

        // 计算所需数量（转换为可读格式）
        const requiredAmount =
          Number(entryFeeAmount) / Math.pow(10, tokenDecimals);
        const currentBalance =
          Number(userBalance) / Math.pow(10, tokenDecimals);

        if (userBalance < entryFeeAmount) {
          const errMsg = `${tokenSymbol} 代币余额不足，无法支付入群费用`;
          console.error('❌ [加入红包群]', errMsg);
          setError(errMsg);
          return { success: false, error: errMsg };
        }

        // ✅ 余额足够，检查授权额度
        const currentAllowance = (await publicClient.readContract({
          address: entryToken as Address,
          abi: erc20ABI,
          functionName: 'allowance',
          args: [walletClient.account.address, groupAddress as Address]
        })) as bigint;

        // 如果授权额度不足，则进行授权
        if (currentAllowance < entryFeeAmount) {
          const approveHash = await walletClient.writeContract({
            address: entryToken as Address,
            abi: erc20ABI,
            functionName: 'approve',
            args: [groupAddress as Address, entryFeeAmount],
            account: walletClient.account
          });

          const approveReceipt = await publicClient.waitForTransactionReceipt({
            hash: approveHash
          });

          if (approveReceipt.status !== 'success') {
            throw new Error('授权失败');
          }
        } else {
        }
      }

      // 3. 发送交易
      const hash = await walletClient.writeContract({
        address: groupAddress as `0x${string}`,
        abi: redPacketGroupABI,
        functionName: 'join',
        args: [subgroupId, referralCode],
        account: walletClient.account
      });

      // 4. 等待交易确认
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        return { success: true, hash };
      } else {
        throw new Error('交易失败');
      }
    } catch (err: any) {
      console.error('❌ [加入红包群] 失败:', err);

      // 检测用户取消
      const errorMessage = err?.message || err?.toString() || '';
      const errorLower = errorMessage.toLowerCase();

      if (
        errorLower.includes('user rejected') ||
        errorLower.includes('user denied') ||
        errorLower.includes('user cancelled')
      ) {
        const cancelMsg = '用户取消了交易';
        setError(cancelMsg);
        return { success: false, error: cancelMsg };
      }

      // 使用 viem 的方式解析合约错误
      const baseError = err as BaseError;

      const revertError = baseError.walk(
        (e) => e instanceof ContractFunctionRevertedError
      );

      if (revertError instanceof ContractFunctionRevertedError) {
        try {
          const decodedError = decodeErrorResult({
            abi: RedPacketGroupABI.abi as any,
            data: (revertError.data || '0x') as `0x${string}`
          });

          // 根据错误名称返回友好提示
          let friendlyMessage = '加入红包群失败，请重试';

          switch (decodedError.errorName) {
            case 'AlreadyMember':
              friendlyMessage = '您已经是群成员了';
              break;

            case 'NeedGroupToken':
              friendlyMessage = '需要持有群代币才能加入';
              break;

            case 'InsufficientBalance':
            case 'AmountZero':
              friendlyMessage = '代币余额不足，无法支付入群费用';
              break;

            case 'NotMember':
            case 'NotInSubgroup':
              friendlyMessage = '您不是该群成员';
              break;

            case 'JoinAtGate':
              friendlyMessage = '该群需要通过特定方式加入';
              break;

            default:
              friendlyMessage = `加入失败: ${decodedError.errorName}`;
          }

          setError(friendlyMessage);
          return { success: false, error: friendlyMessage };
        } catch (decodeError) {
          console.error('❌ [加入红包群] 解析错误失败:', decodeError);
        }
      }

      // 降级：使用通用错误处理
      let fallbackMessage = '加入红包群失败，请重试';

      if (errorLower.includes('insufficient funds')) {
        fallbackMessage = '余额不足，无法支付费用';
      } else if (errorLower.includes('insufficient_balance')) {
        fallbackMessage = '代币余额不足';
      } else if (err.shortMessage) {
        fallbackMessage = err.shortMessage;
      }

      // 额外检测已知错误签名 0x31d81212（余额不足）
      if (errorMessage.includes('0x31d81212')) {
        fallbackMessage = '代币余额不足，无法支付入群费用';
      }

      setError(fallbackMessage);
      return { success: false, error: fallbackMessage };
    } finally {
      setIsJoining(false);
    }
  };

  return {
    joinRedPacketGroup,
    isJoining,
    error
  };
}
