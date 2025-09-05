import { useAccount } from 'wagmi';

/**
 * 将 wagmi chain ID 转换为 Moralis API 支持的链名
 * @param chainId wagmi chain ID
 * @returns Moralis API 支持的链名
 */
function chainToMoralisChain(chainId: number | undefined): string {
  if (!chainId) return 'arbitrum'; // 默认返回 Arbitrum
  
  // 根据 chain ID 映射到 Moralis 支持的链名
  const chainMapping: Record<number, string> = {
    1: 'eth',           // 以太坊主网
    42161: 'arbitrum',  // Arbitrum One
    56: 'bsc',          // BNB Smart Chain
    137: 'polygon',     // Polygon
    10: 'optimism',     // Optimism
    43114: 'avalanche', // Avalanche C-Chain
    250: 'fantom',      // Fantom
    25: 'cronos',       // Cronos
    100: 'gnosis',      // Gnosis Chain
  };
  
  return chainMapping[chainId] || 'arbitrum';
}

/**
 * 将 wagmi chain ID 转换为 DexScreener API 支持的链名
 * @param chainId wagmi chain ID
 * @returns DexScreener API 支持的链名
 */
function chainToDexScreenerChain(chainId: number | undefined): string {
  if (!chainId) return 'arbitrum'; // 默认返回 Arbitrum
  
  // 根据 chain ID 映射到 DexScreener 支持的链名
  const chainMapping: Record<number, string> = {
    1: 'ethereum',      // 以太坊主网
    42161: 'arbitrum',  // Arbitrum One
    56: 'bsc',          // BNB Smart Chain
    137: 'polygon',     // Polygon
    10: 'optimism',     // Optimism
    43114: 'avalanche', // Avalanche C-Chain
    250: 'fantom',      // Fantom
    25: 'cronos',       // Cronos
    100: 'gnosis',      // Gnosis Chain
  };
  
  return chainMapping[chainId] || 'arbitrum';
}

/**
 * 获取当前连接的钱包链信息并转换为各种 API 支持的格式
 * @returns 包含各种链名格式的对象
 */
export function useMoralisChain() {
  const { chain } = useAccount();
  
  return {
    // 原始链信息
    chain,
    chainId: chain?.id,
    
    // Moralis API 格式
    moralisChain: chainToMoralisChain(chain?.id),
    
    // DexScreener API 格式
    dexScreenerChain: chainToDexScreenerChain(chain?.id),
    
    // 是否为已知链
    isKnownChain: chain?.id ? chainToMoralisChain(chain.id) !== 'arbitrum' : false,
  };
}

// 导出单独的函数，方便在其他地方使用
export { chainToMoralisChain, chainToDexScreenerChain };
