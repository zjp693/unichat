/**
 * 多链网络定义
 * 支持 Arbitrum (42161) 和 opBNB (204)
 */
import { arbitrum, defineChain } from '@reown/appkit/networks';
import type { Chain } from 'viem';

/**
 * opBNB 主网定义
 * 官方文档: https://docs.bnbchain.org/bnb-opbnb/get-started/network-info/
 */
export const opBNB = defineChain({
  id: 204,
  caipNetworkId: 'eip155:204',
  chainNamespace: 'eip155',
  name: 'opBNB',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ['https://opbnb-mainnet-rpc.bnbchain.org']
    }
  },
  blockExplorers: {
    default: {
      name: 'opBNBScan',
      url: 'https://opbnbscan.com'
    }
  }
});

/**
 * 支持的网络列表
 * 第一个网络为默认网络
 */
export const networks: [Chain, ...Chain[]] = [arbitrum, opBNB as Chain];

/**
 * 支持的链 ID
 */
export const SUPPORTED_CHAIN_IDS = [42161, 204] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

/**
 * 检查是否为支持的链 ID
 */
export function isSupportedChainId(
  chainId: number | undefined
): chainId is SupportedChainId {
  if (!chainId) return false;
  return SUPPORTED_CHAIN_IDS.includes(chainId as SupportedChainId);
}

/**
 * 根据链 ID 获取网络对象
 */
export function getNetworkById(chainId: SupportedChainId) {
  return networks.find((n) => n.id === chainId);
}

/**
 * opBNB 的公共 RPC 列表（用于 fallback）
 */
export const opBNBRpcUrls = [
  'https://opbnb-mainnet-rpc.bnbchain.org',
  'https://opbnb.publicnode.com'
];

/**
 * Arbitrum 的公共 RPC 列表（用于 fallback）
 */
export const arbitrumRpcUrls = [
  'https://arbitrum-one.publicnode.com',
  'https://arb1.arbitrum.io/rpc'
];

// 导出 Arbitrum 方便其他地方使用
export { arbitrum };
