'use client';

import { useState, useEffect } from 'react';
import { readContract } from 'wagmi/actions';
import { erc20Abi } from 'viem';
import UniChatRegistryArtifact from '@/contract/abi/UniChatRegistry.json';
import { config } from 'config/appkit';

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

  useEffect(() => {
    let isMounted = true;

    async function fetchAllowedTokens() {
      try {
        setIsLoading(true);
        setError(null);

        // 从环境变量获取 Registry 合约地址
        const registryAddress =
          process.env.NEXT_PUBLIC_UNICHAT_REGISTRY_CONTRACT_ADDRESS;
        if (!registryAddress) {
          throw new Error(
            '缺少环境变量: NEXT_PUBLIC_UNICHAT_REGISTRY_CONTRACT_ADDRESS'
          );
        }

        // 1. 获取已上币代币总数
        const totalCount = await readContract(config, {
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
            readContract(config, {
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
              readContract(config, {
                address: address as `0x${string}`,
                abi: erc20Abi,
                functionName: 'symbol'
              }),
              readContract(config, {
                address: address as `0x${string}`,
                abi: erc20Abi,
                functionName: 'name'
              }),
              readContract(config, {
                address: address as `0x${string}`,
                abi: erc20Abi,
                functionName: 'decimals'
              }),
              readContract(config, {
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
  }, []);

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
