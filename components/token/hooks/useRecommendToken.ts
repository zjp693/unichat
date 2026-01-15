import {
  useReadContract,
  useWriteContract,
  useAccount,
  usePublicClient
} from 'wagmi';
import { erc20Abi, formatUnits, maxUint256 } from 'viem';
import { RedPacketAbi, useRedPacketAddress } from '@/lib/RedPacketAbi';
import { useState } from 'react';

export function useRecommendToken() {
  const { address: userAddress } = useAccount();
  const redPacketAddress = useRedPacketAddress();
  const publicClient = usePublicClient();

  // 1. 获取质押金额
  const { data: stakeAmount } = useReadContract({
    address: redPacketAddress || undefined,
    abi: RedPacketAbi,
    functionName: 'stakeUnichatAmount'
  });

  // 2. 获取 UNICHAT 代币地址
  const { data: unichatTokenAddress } = useReadContract({
    address: redPacketAddress || undefined,
    abi: RedPacketAbi,
    functionName: 'UNICHAT_TOKEN'
  });

  // 3. 获取用户对红包合约的授权额度
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: unichatTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args:
      userAddress && unichatTokenAddress && redPacketAddress
        ? [userAddress, redPacketAddress]
        : undefined,
    query: {
      enabled: !!userAddress && !!unichatTokenAddress && !!redPacketAddress
    }
  });

  // 4. 写入合约 Hook
  const { writeContractAsync: writeApprove, isPending: isApproving } =
    useWriteContract();
  const { writeContractAsync: writeRecommend, isPending: isRecommending } =
    useWriteContract();

  // 辅助状态
  const [isProcessing, setIsProcessing] = useState(false);

  // 执行授权
  const approve = async () => {
    if (!unichatTokenAddress || !stakeAmount || !redPacketAddress) return;
    try {
      setIsProcessing(true);
      const hash = await writeApprove({
        address: unichatTokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [redPacketAddress, maxUint256]
      });
      return hash;
    } finally {
      setIsProcessing(false);
    }
  };

  // 执行推荐
  const recommend = async (tokenAddress: string, iconCid: string = '') => {
    if (!redPacketAddress) return;
    try {
      setIsProcessing(true);
      const hash = await writeRecommend({
        address: redPacketAddress,
        abi: RedPacketAbi,
        functionName: 'recommendToken',
        args: [tokenAddress as `0x${string}`, iconCid]
      });
      return hash;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 核心 orchestrator：执行完整的推荐流程（含自动授权）
   */
  const handleExecuteRecommend = async (
    tokenAddress: string,
    iconCid: string,
    onProgress?: (msg: string) => void
  ) => {
    if (!redPacketAddress || !stakeAmount) return;

    try {
      setIsProcessing(true);

      // 1. 检查授权
      const isAllowanceSufficient =
        allowance && (allowance as bigint) >= (stakeAmount as bigint);

      if (!isAllowanceSufficient) {
        onProgress?.('正在发起授权交易...');
        const approveHash = await approve();
        if (approveHash) {
          onProgress?.('等待授权确认...');
          await publicClient?.waitForTransactionReceipt({ hash: approveHash });
          await refetchAllowance();
        }
      }

      // 2. 发起推荐
      onProgress?.('正在发起推荐交易...');
      const recommendHash = await recommend(tokenAddress, iconCid);

      if (recommendHash) {
        onProgress?.('等待推荐确认...');
        const receipt = await publicClient?.waitForTransactionReceipt({
          hash: recommendHash
        });
        if (receipt?.status === 'reverted') {
          throw new Error('交易被回滚，请确保账户有足够的 UNICHAT');
        }
        return recommendHash;
      }
    } catch (error) {
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const formattedStakeAmount = stakeAmount
    ? formatUnits(stakeAmount as bigint, 18)
    : '...';

  const isAllowanceSufficient =
    allowance && stakeAmount
      ? (allowance as bigint) >= (stakeAmount as bigint)
      : false;

  return {
    stakeAmount: stakeAmount as bigint | undefined,
    formattedStakeAmount,
    isAllowanceSufficient,
    isProcessing: isProcessing || isApproving || isRecommending,
    handleExecuteRecommend,
    refetchAllowance
  };
}
