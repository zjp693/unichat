'use client';

import { useState, useEffect, useMemo } from 'react';
import { erc20Abi } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import UniChatRegistryArtifact from '@/contract/abi/UniChatRegistry.json';
import { getContractAddress } from '@/lib/web3/contracts';
import { isSupportedChainId } from '@/lib/web3/networks';

/**
 * ERC20 代币完整信息（用于合约交互）
 */
export interface TokenInfo {
  /** 代币合约地址 */
  address: `0x${string}`;
  /** 代币符号 (如: ARB, USDT) */
  symbol: string;
  /** 代币名称 (如: Arbitrum, Tether USD) */
  name: string;
  /** 代币精度 (如: 18, 6) */
  decimals: number;
  /** 总供应量 */
  totalSupply: bigint;
}

/**
 * 获取所有已上币代币信息的 Hook
 *
 * 改进版本：
 * - 只有连接钱包后才获取数据（避免用默认链读错数据）
 * - 使用 publicClient.readContract（自动绑定到当前链）
 * - 单一依赖优化
 *
 * 流程:
 * 1. 从 UniChatRegistry 获取代币总数
 * 2. 分页获取代币地址列表
 * 3. 批量获取每个代币的详细信息 (symbol, name, decimals, totalSupply)
 * 4. 按优先级排序
 */
export function useAllowedTokens() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { isConnected } = useAccount();
  const publicClient = usePublicClient();

  // 派生状态：只有连接后才有"有效客户端"
  const activeClient = useMemo(
    () => (isConnected ? publicClient : null),
    [isConnected, publicClient]
  );

  useEffect(() => {
    let isMounted = true;

    async function fetchAllowedTokens() {
      // 未连接或无有效客户端时，不进行请求
      if (!activeClient) {
        setTokens([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // 从 publicClient 获取当前链 ID
        const chainId = activeClient.chain?.id;

        // 验证链是否受支持
        if (!chainId || !isSupportedChainId(chainId)) {
          throw new Error(
            `当前链 ${chainId} 不支持，请切换到 Arbitrum 或 opBNB`
          );
        }

        // 从多链配置获取 Registry 合约地址
        const registryAddress = getContractAddress(chainId, 'registry');
        if (!registryAddress) {
          throw new Error(`当前链 ${chainId} 缺少 Registry 合约地址`);
        }

        // 1. 获取已上币代币总数
        const totalCount = await activeClient.readContract({
          address: registryAddress as `0x${string}`,
          abi: UniChatRegistryArtifact.abi,
          functionName: 'allowedTokensLength'
        });

        if (!totalCount || totalCount === BigInt(0)) {
          if (isMounted) {
            setTokens([]);
            setIsLoading(false);
          }
          return;
        }

        // 2. 分页获取所有代币地址
        const pageSize = 50;
        const totalPages = Math.ceil(Number(totalCount) / pageSize);
        const addressPromises: Promise<any>[] = [];

        for (let i = 0; i < totalPages; i++) {
          const offset = i * pageSize;
          addressPromises.push(
            activeClient.readContract({
              address: registryAddress as `0x${string}`,
              abi: UniChatRegistryArtifact.abi,
              functionName: 'getAllowedTokens',
              args: [BigInt(offset), BigInt(pageSize)]
            })
          );
        }

        const results = await Promise.all(addressPromises);
        const allAddresses = results.flatMap(([tokensList]) => tokensList);

        if (!isMounted) return;

        // 3. 批量获取代币信息
        const tokenInfoPromises = allAddresses.map(async (address) => {
          try {
            const [symbol, name, decimals, totalSupply] = await Promise.all([
              activeClient.readContract({
                address: address as `0x${string}`,
                abi: erc20Abi,
                functionName: 'symbol'
              }),
              activeClient.readContract({
                address: address as `0x${string}`,
                abi: erc20Abi,
                functionName: 'name'
              }),
              activeClient.readContract({
                address: address as `0x${string}`,
                abi: erc20Abi,
                functionName: 'decimals'
              }),
              activeClient.readContract({
                address: address as `0x${string}`,
                abi: erc20Abi,
                functionName: 'totalSupply'
              })
            ]);

            return {
              address: address as `0x${string}`,
              symbol: symbol as string,
              name: name as string,
              decimals: decimals as number,
              totalSupply: totalSupply as bigint
            } as TokenInfo;
          } catch (err) {
            console.error(`Failed to fetch token info for ${address}:`, err);
            // 返回基础信息
            return {
              address: address as `0x${string}`,
              symbol: 'Unknown',
              name: 'Unknown Token',
              decimals: 18,
              totalSupply: BigInt(0)
            } as TokenInfo;
          }
        });

        const tokensInfo = await Promise.all(tokenInfoPromises);

        if (!isMounted) return;

        // 4. 排序：优先展示常用代币
        const sortedTokens = sortTokensByPriority(tokensInfo);

        setTokens(sortedTokens);
      } catch (err) {
        console.error('Failed to fetch allowed tokens:', err);
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchAllowedTokens();

    return () => {
      isMounted = false;
    };
  }, [activeClient]); // 单一依赖：只有 activeClient

  return { tokens, isLoading, error };
}

/**
 * 代币排序：常用代币优先
 */
function sortTokensByPriority(tokens: TokenInfo[]): TokenInfo[] {
  const priority = ['USDT', 'ARB', 'WETH', 'WBTC', 'UNICHAT'];

  return [...tokens].sort((a, b) => {
    const aIndex = priority.indexOf(a.symbol);
    const bIndex = priority.indexOf(b.symbol);

    // 都在优先列表中
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // 只有a在优先列表
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    // 都不在优先列表，按字母排序
    return a.symbol.localeCompare(b.symbol);
  });
}
