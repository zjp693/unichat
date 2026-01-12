'use client';

/**
 * 根据当前网络自动获取合约地址的 Hook
 */
import { useMemo } from 'react';
import { useAppKitNetwork } from '@reown/appkit/react';
import { useChainId } from 'wagmi';
import {
  type ChainContracts,
  type ContractName,
  getChainContracts,
  getContractAddress
} from '../contracts';
import { isSupportedChainId, type SupportedChainId } from '../networks';
import type { Address } from 'viem';

/**
 * 将 chainId 转换为 number 类型
 * AppKit 返回的 chainId 可能是 string | number | undefined
 */
function normalizeChainId(
  chainId: string | number | undefined
): number | undefined {
  if (chainId === undefined) return undefined;
  if (typeof chainId === 'string') return parseInt(chainId, 10);
  return chainId;
}

/**
 * 获取当前链的所有合约地址
 * @returns 合约地址集合，如果链不支持则返回 null
 */
export function useActiveContracts(): ChainContracts | null {
  // 优先使用 wagmi 的 chainId（更可靠）
  const wagmiChainId = useChainId();
  const { chainId: appKitChainId } = useAppKitNetwork();

  const chainId = wagmiChainId || normalizeChainId(appKitChainId);

  return useMemo(() => {
    if (!chainId || !isSupportedChainId(chainId)) {
      return null;
    }
    return getChainContracts(chainId);
  }, [chainId]);
}

/**
 * 获取当前链的指定合约地址
 * @param contractName 合约名称
 * @returns 合约地址，如果链不支持则返回 null
 */
export function useContractAddress(contractName: ContractName): Address | null {
  const wagmiChainId = useChainId();
  const { chainId: appKitChainId } = useAppKitNetwork();

  const chainId = wagmiChainId || normalizeChainId(appKitChainId);

  return useMemo(() => {
    return getContractAddress(chainId, contractName);
  }, [chainId, contractName]);
}

/**
 * 获取当前链 ID
 * @returns 当前链 ID，如果未连接则返回 undefined
 */
export function useCurrentChainId(): SupportedChainId | undefined {
  const wagmiChainId = useChainId();
  const { chainId: appKitChainId } = useAppKitNetwork();

  const chainId = wagmiChainId || normalizeChainId(appKitChainId);

  if (!chainId || !isSupportedChainId(chainId)) {
    return undefined;
  }
  return chainId;
}

/**
 * 检查当前链是否受支持
 */
export function useIsSupportedChain(): boolean {
  const wagmiChainId = useChainId();
  const { chainId: appKitChainId } = useAppKitNetwork();

  const chainId = wagmiChainId || normalizeChainId(appKitChainId);

  return isSupportedChainId(chainId);
}
