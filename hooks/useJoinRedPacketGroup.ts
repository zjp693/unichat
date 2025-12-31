import { useState } from 'react';
import { useWalletClient, usePublicClient, useReadContract } from 'wagmi';
import { parseAbi, Abi, Address } from 'viem';

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

      console.log('🔍 [加入红包群] 开始加入...', {
        groupAddress,
        subgroupId,
        referralCode
      });

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

      console.log('📊 [加入红包群] 入群费信息:', {
        entryToken,
        entryFeeAmount: entryFeeAmount.toString()
      });

      // 2. 如果需要入群费，先授权代币
      if (entryFeeAmount > BigInt(0)) {
        console.log('💰 [加入红包群] 需要授权入群费...');

        const erc20ABI = parseAbi([
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ]);

        // 检查当前授权额度
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

          console.log('⏳ [加入红包群] 等待授权确认...', approveHash);
          const approveReceipt = await publicClient.waitForTransactionReceipt({
            hash: approveHash
          });

          if (approveReceipt.status !== 'success') {
            throw new Error('授权失败');
          }

          console.log('✅ [加入红包群] 授权成功');
        } else {
          console.log('✅ [加入红包群] 已有足够授权额度');
        }
      }

      // 3. 模拟合约调用（检查参数）
      console.log('🔍 [加入红包群] 模拟合约调用...');
      const { request } = await publicClient.simulateContract({
        address: groupAddress as `0x${string}`,
        abi: redPacketGroupABI,
        functionName: 'join',
        args: [subgroupId, referralCode],
        account: walletClient.account
      });

      // 4. 发送交易
      console.log('📝 [加入红包群] 发送加入交易...');
      const hash = await walletClient.writeContract(request);

      // 5. 等待交易确认
      console.log('⏳ [加入红包群] 等待交易确认...', hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        console.log('✅ [加入红包群] 成功加入红包群!');
        return { success: true, hash };
      } else {
        throw new Error('交易失败');
      }
    } catch (err: any) {
      console.error('❌ [加入红包群] 失败:', err);

      // 提取更友好的错误信息
      let errorMessage = '加入红包群失败，请重试';

      if (err?.message) {
        if (err.message.includes('User rejected')) {
          errorMessage = '用户取消了交易';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = '余额不足，无法支付费用';
        } else if (err.message.includes('already a member')) {
          errorMessage = '您已经是群成员了';
        } else if (err.message.includes('INSUFFICIENT_BALANCE')) {
          errorMessage = '代币余额不足';
        } else {
          errorMessage = err.shortMessage || err.message;
        }
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
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
