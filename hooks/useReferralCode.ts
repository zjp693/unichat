'use client';

/**
 * 邀请码管理 Hook
 *
 * ⚠️ 重要变更：合约已升级，createReferral 函数已被移除
 *
 * 新方案：邀请码直接在前端由推荐人地址编码生成（见 lib/referral.ts）
 * - 无需链上交易
 * - 任何用户都可以生成
 * - 节省 Gas，用户体验更好
 *
 * 本文件保留的功能：
 * 1. 查询用户已有的邀请码（兼容旧数据）
 * 2. 验证邀请码格式和存在性
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useChainId } from 'wagmi';
import { parseAbi } from 'viem';
import { getContractAddress } from '@/lib/web3/contracts';

const REGISTRY_ABI = parseAbi([
  'function referralExists(bytes32 code) external view returns (bool)',
  'function getReferrer(bytes32 code) external view returns (address)',
  'function getCodesByAddress(address addr) external view returns (bytes32[] memory codes)'
]);

/**
 * 查询用户的邀请码（查询旧的链上创建的邀请码，如果存在）
 *
 * ⚠️ 注意：新方案中不再需要此功能，因为邀请码由前端直接生成
 * 此 Hook 仅用于兼容可能存在的旧邀请码数据
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
    if (!referralCode) setIsLoading(true);
    setError(null);

    try {
      // 尝试查询旧的邀请码（如果合约仍支持此方法）
      const codes = (await publicClient.readContract({
        address: registryAddress,
        abi: REGISTRY_ABI,
        functionName: 'getCodesByAddress',
        args: [userAddress]
      })) as `0x${string}`[];

      if (codes && codes.length > 0) {
        const latestCode = codes[codes.length - 1];
        setReferralCode(latestCode);
      } else {
        setReferralCode(null);
      }
    } catch (err) {
      // 如果合约不支持此方法，静默失败（这是正常的）
      console.log('ℹ️ [查询邀请码] 合约可能不支持此功能（新方案无需查询）');
      setReferralCode(null);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [publicClient, userAddress, chainId, isFetching, referralCode]);

  useEffect(() => {
    fetchReferralCode();
  }, [fetchReferralCode, refetchTrigger]);

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
 * 验证邀请码是否存在
 *
 * 用途：检查用户输入的邀请码是否在合约中注册
 * 新方案中：由于邀请码是地址编码，可以通过提取地址来验证有效性
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
