import { useState } from 'react';
import { useWalletClient, usePublicClient } from 'wagmi';
import communityABI from '@/contract/abi/community.json';
import { ProofData } from '@/lib/types/community';
import { Abi } from 'viem';

export function useJoinCommunity() {
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const joinCommunity = async (
    communityAddress: string,
    proofData: ProofData
  ) => {
    if (!walletClient || !publicClient) {
      const errorMsg = '请先连接钱包';
      console.error('❌ [加入群聊]', errorMsg);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      setIsJoining(true);
      setError(null);

      // 验证 proofData
      if (
        !proofData.proof ||
        !Array.isArray(proofData.proof) ||
        proofData.proof.length === 0
      ) {
        const errorMsg = 'Merkle Proof 数据无效或为空';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // 1. 模拟合约调用（检查参数）
      // console.log('🔍 [加入群聊] 模拟合约调用...');
      const { request } = await publicClient.simulateContract({
        address: communityAddress as `0x${string}`,
        abi: communityABI.abi as Abi,
        functionName: 'joinCommunity',
        args: [
          BigInt(proofData.maxTier),
          BigInt(proofData.epoch),
          BigInt(proofData.validUntil),
          proofData.nonce as `0x${string}`,
          proofData.proof as `0x${string}`[]
        ],
        account: walletClient.account
      });

      // 2. 发送交易
      const hash = await walletClient.writeContract(request);

      // 3. 等待交易确认
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        console.log('✅ [加入群聊] 成功加入群聊!');
        return { success: true, hash };
      } else {
        throw new Error('交易失败');
      }
    } catch (err: any) {
      console.error('❌ [加入群聊] 失败:', err);

      // 提取更友好的错误信息
      let errorMessage = '加入群聊失败，请重试';

      if (err?.message) {
        if (err.message.includes('User rejected')) {
          errorMessage = '用户取消了交易';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = '余额不足，无法支付 Gas 费用';
        } else if (err.message.includes('already a member')) {
          errorMessage = '您已经是群成员了';
        } else if (err.message.includes('invalid proof')) {
          errorMessage = 'Merkle Proof 验证失败';
        } else if (err.message.includes('expired')) {
          errorMessage = '资格已过期';
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
    joinCommunity,
    isJoining,
    error
  };
}
