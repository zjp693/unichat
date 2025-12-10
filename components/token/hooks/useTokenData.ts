/**
 * Token 数据获取相关 Hook
 */

import { useMemo } from 'react';
import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { erc20Abi, isAddress, formatUnits } from 'viem';
import { useGetAllRecommendedTokenInfos } from '@/lib/RedPacketAbi';
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
  const { data: recommendedTokensData, isLoading: isLoadingRecommended } =
    useGetAllRecommendedTokenInfos();

  // 解析推荐代币的地址和 iconCid
  const tokenAddresses = useMemo(() => {
    const recommended: {
      address: string;
      iconCid: string;
      isRecommended: boolean;
    }[] = [];

    if (recommendedTokensData) {
      const [addresses, infos] = recommendedTokensData as [string[], any[]];
      addresses.forEach((addr, index) => {
        if (infos[index]?.isRecommended) {
          recommended.push({
            address: addr.toLowerCase(),
            iconCid: infos[index]?.iconCid || '',
            isRecommended: true
          });
        }
      });
    }

    // 合并自定义代币（去重）
    const custom = customAddresses
      .map((addr) => ({
        address: addr.toLowerCase(),
        iconCid: '', // 自定义代币暂时没有图标
        isRecommended: false
      }))
      .filter((c) => !recommended.some((r) => r.address === c.address)); // 避免重复

    return [...custom, ...recommended];
  }, [recommendedTokensData, customAddresses]);

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
        iconUrl: getValidIconUrl(tokenAddr.iconCid), // 新增：智能处理图标URL
        decimals: decimals,
        balance: balance
      } as Token;

      // // 🔍 打印代币数据调试信息 - 重点查看图标信息
      // console.log(`🪙 Token [${token.symbol}]:`, {
      //   name: token.name,
      //   address: token.address,
      //   balance: token.balance,
      //   decimals: token.decimals,
      //   iconCid: token.iconCid,
      //   iconUrl: token.iconUrl,
      //   hasIcon: !!token.iconUrl
      // });

      return token;
    });
  }, [contractsData, tokenAddresses, userAddress]);

  return {
    tokens,
    isLoading: isLoadingRecommended || isLoadingContracts,
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
