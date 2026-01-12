import {
  useReadContract,
  useWriteContract,
  useAccount,
  useWaitForTransactionReceipt
} from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { RedPacketAbi, useRedPacketAddress } from '@/lib/RedPacketAbi';
import { useState, useEffect } from 'react';

export function useRecommendToken() {
  const { address: userAddress } = useAccount();
  const redPacketAddress = useRedPacketAddress();

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
      const tx = await writeApprove({
        address: unichatTokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [redPacketAddress, stakeAmount as bigint]
      });
      // 这里通常需要等待交易确认，但在简单的 UI 中，我们可以让用户手动进行下一步
      // 或者使用 useWaitForTransactionReceipt 在组件层处理
      return tx;
    } catch (error) {
      console.error('Approve failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // 执行推荐
  const recommend = async (tokenAddress: string, iconCid: string = '') => {
    if (!redPacketAddress) return;
    try {
      setIsProcessing(true);
      const tx = await writeRecommend({
        address: redPacketAddress,
        abi: RedPacketAbi,
        functionName: 'recommendToken',
        args: [tokenAddress, iconCid]
      });
      return tx;
    } catch (error) {
      console.error('Recommend failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const formattedStakeAmount = stakeAmount
    ? formatUnits(stakeAmount as bigint, 18)
    : '...';
  // 假设 UNICHAT 也是 18 位精度，通常是的

  const isAllowanceSufficient =
    allowance && stakeAmount
      ? (allowance as bigint) >= (stakeAmount as bigint)
      : false;

  return {
    stakeAmount: stakeAmount as bigint | undefined,
    formattedStakeAmount,
    isAllowanceSufficient,
    approve,
    recommend,
    isProcessing: isProcessing || isApproving || isRecommending,
    refetchAllowance
  };
}
