'use client';

/**
 * 邀请码管理 Hook
 *
 * 提供邀请码查询和生成功能：
 * 1. 查询用户已有的邀请码
 * 2. 生成新的邀请码
 * 3. 验证邀请码是否存在
 */

import { useState, useEffect } from 'react';
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt
} from 'wagmi';
import { parseAbi, keccak256, toHex } from 'viem';
import UniChatRegistryArtifact from '@/contract/abi/UniChatRegistry.json';

const REGISTRY_ABI = parseAbi([
  'function createReferral(uint16 listingShareBps, bytes32 salt) external returns (bytes32 code)',
  'function referralExists(bytes32 code) external view returns (bool)',
  'function getReferrer(bytes32 code) external view returns (address)',
  'function getListingShareBps(bytes32 code) external view returns (uint16)',
  'event ReferralCreated(bytes32 indexed code, address indexed referrer, uint16 listingShareBps)'
]);

/**
 * 获取 Registry 合约地址
 */
function getRegistryAddress(): `0x${string}` | null {
  const address = process.env.NEXT_PUBLIC_UNICHAT_REGISTRY_CONTRACT_ADDRESS;
  if (!address) {
    console.warn('缺少环境变量: NEXT_PUBLIC_UNICHAT_REGISTRY_CONTRACT_ADDRESS');
    return null;
  }
  return address as `0x${string}`;
}

/**
 * 查询用户的邀请码
 */
export function useReferralCode() {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();

  const [referralCode, setReferralCode] = useState<`0x${string}` | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false); // 增加抓取标志，防止并发
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const fetchReferralCode = async () => {
    if (!publicClient || !userAddress || isFetching) {
      if (!publicClient || !userAddress) setIsLoading(false);
      return;
    }

    // 1. 优先尝试从缓存获取
    const cacheKey = `unichat_referral_${userAddress.toLowerCase()}`;
    const cachedCode =
      typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    if (cachedCode && !refetchTrigger) {
      console.log('📦 [获取邀请码] 使用本地缓存:', cachedCode);
      setReferralCode(cachedCode as `0x${string}`);
      setIsLoading(false);
      return;
    }

    const registryAddress = getRegistryAddress();
    if (!registryAddress) {
      setIsLoading(false);
      return;
    }

    setIsFetching(true);
    // 如果是初次加载，显示 loading
    if (!referralCode) setIsLoading(true);
    setError(null);

    try {
      // 2. 动态计算起始区块：获取最新高度，向前推 500 万个区块 (覆盖约 2-3 周，包含 2026 年 1 月 1 日)
      // 优化：仅扫描 2026 年 1 月 7 日前后的事件 (约最近 10w 区块)
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > 100000n ? currentBlock - 100000n : 0n;

      console.log('🔍 [获取邀请码] 扫描 2026-01-07 以来事件...', {
        fromBlock: fromBlock.toString(),
        currentBlock: currentBlock.toString(),
        range: (currentBlock - fromBlock).toString()
      });

      const events = await publicClient.getContractEvents({
        address: registryAddress,
        abi: REGISTRY_ABI,
        eventName: 'ReferralCreated',
        args: { referrer: userAddress },
        fromBlock: fromBlock
      });

      if (events && events.length > 0) {
        // 获取最新的邀请码
        const latestEvent = events[events.length - 1] as any;
        const code = latestEvent.args.code as `0x${string}`;
        console.log('✅ [获取邀请码] 找到邀请码:', code);

        // 存入缓存
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, code);
        }
        setReferralCode(code);
      } else {
        console.log('ℹ️ [获取邀请码] 最近 10w 区块未找到邀请码');
        setReferralCode(null);
      }
    } catch (err) {
      console.error('❌ [获取邀请码] 失败:', err);
      setError(err instanceof Error ? err : new Error('获取邀请码失败'));
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    // 使用 timeout 简单防抖，防止组件短时间多次 mount/unmount 触发请求爆炸
    const timer = setTimeout(() => {
      fetchReferralCode();
    }, 300); // 稍微加长抖动时间
    return () => clearTimeout(timer);
  }, [userAddress, refetchTrigger]); // 移除 publicClient 依赖，它太容易变了

  // 手动重新获取（清除缓存后获取）
  const refetch = () => {
    if (userAddress) {
      const cacheKey = `unichat_referral_${userAddress.toLowerCase()}`;
      localStorage.removeItem(cacheKey);
    }
    setRefetchTrigger((prev) => prev + 1);
  };

  return {
    referralCode,
    isLoading,
    error,
    hasReferralCode: !!referralCode,
    refetch
  };
}

/**
 * 生成邀请码
 */
export function useCreateReferralCode() {
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash
  });

  const createReferralCode = async (listingShareBps: number = 6500) => {
    const registryAddress = getRegistryAddress();
    if (!registryAddress) {
      throw new Error('Registry 合约地址未配置');
    }

    // 验证分润比例范围
    if (listingShareBps < 5000 || listingShareBps > 8000) {
      throw new Error('分润比例必须在 50%-80% 之间');
    }

    // 生成随机 salt
    const salt = keccak256(
      toHex(`${Date.now()}-${Math.random()}-${Math.random()}`)
    );

    // 调用合约
    return writeContract({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'createReferral',
      args: [listingShareBps, salt]
    });
  };

  return {
    createReferralCode,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError
  };
}

/**
 * 验证邀请码是否存在
 */
export function useCheckReferralCode(code: `0x${string}` | null) {
  const publicClient = usePublicClient();
  const [exists, setExists] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!publicClient || !code) {
      setExists(false);
      return;
    }

    const registryAddress = getRegistryAddress();
    if (!registryAddress) return;

    const checkCode = async () => {
      setIsChecking(true);
      try {
        const result = await publicClient.readContract({
          address: registryAddress,
          abi: REGISTRY_ABI,
          functionName: 'referralExists',
          args: [code]
        });
        setExists(!!result);
      } catch (err) {
        console.error('验证邀请码失败:', err);
        setExists(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkCode();
  }, [publicClient, code]);

  return { exists, isChecking };
}
