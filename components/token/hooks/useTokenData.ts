/**
 * Token 数据获取相关 Hook
 */

import { useMemo } from 'react';
import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { erc20Abi, isAddress, formatUnits } from 'viem';
import {
  useGetRecommendedTokensPaged,
  useRedPacketAddress,
  RedPacketAbi
} from '@/lib/RedPacketAbi';
import { buildIPFSUrl } from '@/lib/ipfs-gateways';
import type { Token, TokenInfo } from '../types';

/**
 * 判断字符串是否是有效的 IPFS CID
 */
function isIPFSCid(str: string): boolean {
  if (!str) return false;

  // 常见的 IPFS CID 前缀
  const ipfsPrefixes = ['Qm', 'bafy', 'bafk', 'bafz', 'f01', 'z'];

  return ipfsPrefixes.some((prefix) => str.startsWith(prefix));
}

/**
 * 将 iconCid 转换为有效的图标 URL
 * @param iconCid 原始图标数据（可能是 IPFS CID、HTTP URL 或空）
 * @returns 有效的图标 URL 或 null（需要显示默认头像）
 */
function getValidIconUrl(iconCid: string): string | null {
  // 1. 完整的 HTTP/HTTPS URL
  if (iconCid.startsWith('http://') || iconCid.startsWith('https://')) {
    return iconCid;
  }

  // 2. IPFS CID
  if (isIPFSCid(iconCid)) {
    return buildIPFSUrl(iconCid);
  }

  // 3. 其他情况，视为无效
  return null;
}

/**
 * 获取推荐代币列表并补全 symbol, name 和 balance
 * @param customAddresses 自定义代币地址列表
 */
export function useRecommendedTokens(customAddresses: string[] = []) {
  const { address: userAddress } = useAccount();
  const redPacketAddress = useRedPacketAddress();

  // 使用新的分页 API 获取推荐代币地址列表
  const { data: recommendedAddresses, isLoading: isLoadingAddresses } =
    useGetRecommendedTokensPaged(BigInt(0), BigInt(100));

  // 合并推荐代币和自定义代币地址
  const allTokenAddresses = useMemo(() => {
    const addresses: string[] = [];

    // 添加推荐代币地址
    if (recommendedAddresses && Array.isArray(recommendedAddresses)) {
      recommendedAddresses.forEach((addr: string) => {
        if (addr && addr !== '0x0000000000000000000000000000000000000000') {
          addresses.push(addr.toLowerCase());
        }
      });
    }

    // 合并自定义代币（去重）
    customAddresses.forEach((addr) => {
      const lowerAddr = addr.toLowerCase();
      if (!addresses.includes(lowerAddr)) {
        addresses.push(lowerAddr);
      }
    });

    return addresses;
  }, [recommendedAddresses, customAddresses]);

  // 批量查询每个代币的 recommendedTokens 信息以获取 iconCid
  const tokenInfoContracts = useMemo(() => {
    if (!redPacketAddress) return [];
    return allTokenAddresses.map((addr) => ({
      address: redPacketAddress,
      abi: RedPacketAbi,
      functionName: 'recommendedTokens',
      args: [addr as `0x${string}`]
    }));
  }, [allTokenAddresses, redPacketAddress]);

  const { data: tokenInfosData, isLoading: isLoadingTokenInfos } =
    useReadContracts({
      contracts: tokenInfoContracts as any,
      query: {
        enabled: tokenInfoContracts.length > 0
      }
    });

  // 解析代币信息并构建 tokenAddresses 数组（包含 iconCid）
  const tokenAddresses = useMemo(() => {
    return allTokenAddresses.map((addr, index) => {
      let iconCid = '';

      if (tokenInfosData && tokenInfosData[index]) {
        const info = tokenInfosData[index];
        if (info.status === 'success' && info.result) {
          // recommendedTokens 返回 (bool isRecommended, string iconCid, address submitter, uint256 stakedUnichat, bool isCore)
          const result = info.result as any;
          if (result && result.length > 1) {
            iconCid = result[1] || ''; // iconCid is the second element
          }
        }
      }

      return {
        address: addr,
        iconCid,
        isRecommended:
          (Array.isArray(recommendedAddresses) &&
            recommendedAddresses.includes(addr as `0x${string}`)) ||
          false
      };
    });
  }, [allTokenAddresses, tokenInfosData, recommendedAddresses]);

  // 批量查询 symbol, name, decimals 和 balance
  const contracts = useMemo(
    () =>
      tokenAddresses.flatMap((t) => {
        const baseContracts = [
          {
            address: t.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'symbol'
          },
          {
            address: t.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'name'
          },
          {
            address: t.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'decimals'
          }
        ];

        // 如果用户已连接钱包，添加余额查询
        if (userAddress) {
          baseContracts.push({
            address: t.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [userAddress]
          } as any);
        }

        return baseContracts;
      }),
    [tokenAddresses, userAddress]
  );

  const { data: contractsData, isLoading: isLoadingContracts } =
    useReadContracts({
      contracts,
      query: {
        enabled: tokenAddresses.length > 0
      }
    });

  // 合并数据
  const tokens = useMemo(() => {
    if (!contractsData || !tokenAddresses.length) return [];

    const itemsPerToken = userAddress ? 4 : 3;

    return tokenAddresses.map((tokenAddr, index) => {
      const baseIndex = index * itemsPerToken;
      const symbolData = contractsData[baseIndex];
      const nameData = contractsData[baseIndex + 1];
      const decimalsData = contractsData[baseIndex + 2];

      const decimals = Number(decimalsData?.result || 18);
      let balance = '0';

      if (userAddress) {
        const balanceData = contractsData[baseIndex + 3];
        if (balanceData?.status === 'success') {
          const rawBalance = balanceData.result as bigint;
          // 格式化余额，保留适当的小数位
          const formatted = formatUnits(rawBalance, decimals);
          // 简单的格式化：如果有很多小数位，截断显示
          const [integer, fraction] = formatted.split('.');
          if (fraction) {
            balance = `${integer}.${fraction.slice(0, 4)}`;
          } else {
            balance = integer;
          }
        }
      }

      const token = {
        address: tokenAddr.address,
        symbol: (symbolData?.result as string) || 'UNKNOWN',
        name: (nameData?.result as string) || 'Unknown Token',
        iconCid: tokenAddr.iconCid,
        iconUrl: getValidIconUrl(tokenAddr.iconCid),
        decimals: decimals,
        balance: balance
      } as Token;

      return token;
    });
  }, [contractsData, tokenAddresses, userAddress]);

  return {
    tokens,
    isLoading: isLoadingAddresses || isLoadingTokenInfos || isLoadingContracts,
    error: null
  };
}

/**
 * 查询单个代币的详细信息（用于添加自定义代币）
 */
export function useTokenInfo(address: string) {
  const isValidAddress = isAddress(address);

  const { data: symbolData, isLoading: isLoadingSymbol } = useReadContract({
    address: address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: isValidAddress }
  });

  const { data: nameData, isLoading: isLoadingName } = useReadContract({
    address: address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'name',
    query: { enabled: isValidAddress }
  });

  const { data: decimalsData, isLoading: isLoadingDecimals } = useReadContract({
    address: address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: isValidAddress }
  });

  const tokenInfo = useMemo(() => {
    if (!symbolData || !nameData || decimalsData === undefined) return null;
    return {
      name: nameData as string,
      symbol: symbolData as string,
      decimals: Number(decimalsData)
    } as TokenInfo;
  }, [symbolData, nameData, decimalsData]);

  return {
    tokenInfo,
    isLoading: isLoadingSymbol || isLoadingName || isLoadingDecimals,
    error: null
  };
}

/**
 * 根据搜索关键词过滤代币列表
 */
export function useTokenFilter(tokens: Token[], keyword: string) {
  return useMemo(() => {
    if (!keyword.trim()) return tokens;
    const lowerKeyword = keyword.toLowerCase();
    return tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(lowerKeyword) ||
        t.name.toLowerCase().includes(lowerKeyword) ||
        t.address.toLowerCase().includes(lowerKeyword)
    );
  }, [tokens, keyword]);
}
