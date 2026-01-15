'use client';

/**
 * 邀请码管理 Hook
 *
 * 提供邀请码查询和生成功能：
 * 1. 查询用户已有的邀请码
 * 2. 生成新的邀请码
 * 3. 验证邀请码是否存在
 */

import { useState, useEffect, useCallback } from 'react';
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId
} from 'wagmi';
import { parseAbi, keccak256, toHex, decodeEventLog } from 'viem';
import UniChatRegistryArtifact from '@/contract/abi/UniChatRegistry.json';
import { getContractAddress } from '@/lib/web3/contracts';

const REGISTRY_ABI = parseAbi([
  'function createReferral(uint16 listingShareBps, bytes32 salt) external returns (bytes32 code)',
  'function referralExists(bytes32 code) external view returns (bool)',
  'function getReferrer(bytes32 code) external view returns (address)',
  'function getListingShareBps(bytes32 code) external view returns (uint16)',
  'function getCodesByAddress(address addr) external view returns (bytes32[] memory codes)',
  'event ReferralCreated(bytes32 indexed code, address indexed referrer, uint16 listingShareBps)'
]);

/**
 * 查询用户的邀请码
 */
export function useReferralCode() {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const [referralCode, setReferralCode] = useState<`0x${string}` | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const fetchReferralCode = useCallback(async () => {
    if (!publicClient || !userAddress || isFetching) {
      if (!publicClient || !userAddress) setIsLoading(false);
      return;
    }

    const registryAddress = getContractAddress(chainId, 'registry');
    if (!registryAddress) {
      setIsLoading(false);
      return;
    }

    setIsFetching(true);
    // 如果是初次加载，显示 loading
    if (!referralCode) setIsLoading(true);
    setError(null);

    try {
      // ✅ 直接调用合约方法查询邀请码
      const codes = (await publicClient.readContract({
        address: registryAddress,
        abi: REGISTRY_ABI,
        functionName: 'getCodesByAddress',
        args: [userAddress]
      })) as `0x${string}`[];

      if (codes && codes.length > 0) {
        // 获取最新的邀请码（数组最后一个）
        const latestCode = codes[codes.length - 1];
        setReferralCode(latestCode);
      } else {
        setReferralCode(null);
      }
    } catch (err) {
      console.error('❌ [获取邀请码] 失败:', err);
      setError(err instanceof Error ? err : new Error('获取邀请码失败'));
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [publicClient, userAddress]); // ✅ 只依赖外部稳定的值

  useEffect(() => {
    fetchReferralCode();
  }, [fetchReferralCode, refetchTrigger]);

  // 手动重新获取
  const refetch = () => {
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
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError
  } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt
  } = useWaitForTransactionReceipt({
    hash
  });

  const [createdCode, setCreatedCode] = useState<`0x${string}` | null>(null);

  // ✅ 监听交易成功，从 receipt 中解析邀请码
  useEffect(() => {
    if (isSuccess && receipt) {
      try {
        // 从 logs 中查找 ReferralCreated 事件
        const log = receipt.logs.find((log) => {
          try {
            const decoded = decodeEventLog({
              abi: REGISTRY_ABI,
              data: log.data,
              topics: log.topics
            });
            return decoded.eventName === 'ReferralCreated';
          } catch {
            return false;
          }
        });

        if (log) {
          const decoded = decodeEventLog({
            abi: REGISTRY_ABI,
            data: log.data,
            topics: log.topics
          }) as any;

          const code = decoded.args.code as `0x${string}`;
          setCreatedCode(code);
        }
      } catch (err) {
        console.error('❌ [创建邀请码] 解析事件失败:', err);
      }
    }
  }, [isSuccess, receipt]);

  const createReferralCode = async (listingShareBps: number = 6500) => {
    const registryAddress = getContractAddress(chainId, 'registry');
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
    createdCode, // ✅ 新增：直接返回创建的邀请码
    error: writeError
  };
}

/**
 * 验证邀请码是否存在
 */
export function useCheckReferralCode(code: `0x${string}` | null) {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const [exists, setExists] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!publicClient || !code) {
      setExists(false);
      return;
    }

    const registryAddress = getContractAddress(chainId, 'registry');
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
  }, [publicClient, code, chainId]);

  return { exists, isChecking };
}
