/**
 * 多链合约地址映射
 * 统一管理所有链上的合约地址
 *
 * 环境变量命名规则（后缀区分链）：
 * - Arbitrum: NEXT_PUBLIC_*_ARB
 * - opBNB: NEXT_PUBLIC_*_OPBNB
 */
import type { Address } from 'viem';
import type { SupportedChainId } from './networks';

/**
 * 合约名称类型
 */
export type ContractName =
  | 'profile' // 个人资料合约
  | 'redPacket' // 官方群红包合约（快照群）
  | 'directMessage' // 私聊消息合约
  | 'communityFactory' // 社区工厂合约（群聊）
  | 'registry' // 红包群注册中心
  | 'groupFactory'; // 红包群工厂

/**
 * 单链的合约地址集合
 */
export interface ChainContracts {
  profile: Address;
  redPacket: Address;
  directMessage: Address;
  communityFactory: Address;
  registry: Address;
  groupFactory: Address;
}

/**
 * 多链合约地址映射表
 * 从环境变量读取，使用后缀区分链
 */
export const CONTRACTS: Record<SupportedChainId, ChainContracts> = {
  // Arbitrum (42161) - 后缀 _ARB
  42161: {
    profile: process.env.NEXT_PUBLIC_PROFILE_ADDRESS_ARB as Address,
    redPacket: process.env.NEXT_PUBLIC_RED_PACKET_ADDRESS_ARB as Address,
    directMessage: process.env
      .NEXT_PUBLIC_DIRECT_MESSAGE_ADDRESS_ARB as Address,
    communityFactory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_ARB as Address,
    registry: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS_ARB as Address,
    groupFactory: process.env.NEXT_PUBLIC_GROUP_FACTORY_ADDRESS_ARB as Address
  },

  // opBNB (204) - 后缀 _OPBNB
  204: {
    profile: process.env.NEXT_PUBLIC_PROFILE_ADDRESS_OPBNB as Address,
    redPacket: process.env.NEXT_PUBLIC_RED_PACKET_ADDRESS_OPBNB as Address,
    directMessage: process.env
      .NEXT_PUBLIC_DIRECT_MESSAGE_ADDRESS_OPBNB as Address,
    communityFactory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_OPBNB as Address,
    registry: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS_OPBNB as Address,
    groupFactory: process.env.NEXT_PUBLIC_GROUP_FACTORY_ADDRESS_OPBNB as Address
  }
};

/**
 * 获取指定链的合约地址
 * @param chainId 链 ID
 * @param contractName 合约名称
 * @returns 合约地址，如果链不支持则返回 null
 */
export function getContractAddress(
  chainId: number | undefined,
  contractName: ContractName
): Address | null {
  if (!chainId || !(chainId in CONTRACTS)) {
    return null;
  }
  return CONTRACTS[chainId as SupportedChainId][contractName];
}

/**
 * 获取指定链的所有合约地址
 * @param chainId 链 ID
 * @returns 合约地址集合，如果链不支持则返回 null
 */
export function getChainContracts(
  chainId: number | undefined
): ChainContracts | null {
  if (!chainId || !(chainId in CONTRACTS)) {
    return null;
  }
  return CONTRACTS[chainId as SupportedChainId];
}

export function isValidContractAddress(
  address: Address | null | undefined
): boolean {
  return !!address && /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * 获取区块浏览器的合约链接
 */
export function getExplorerContractUrl(
  chainId: SupportedChainId,
  address: Address
): string {
  const explorers: Record<SupportedChainId, string> = {
    42161: 'https://arbiscan.io',
    204: 'https://opbnbscan.com'
  };
  return `${explorers[chainId]}/address/${address}`;
}

/**
 * 获取区块浏览器的交易链接
 */
export function getExplorerTxUrl(
  chainId: SupportedChainId,
  txHash: string
): string {
  const explorers: Record<SupportedChainId, string> = {
    42161: 'https://arbiscan.io',
    204: 'https://opbnbscan.com'
  };
  return `${explorers[chainId]}/tx/${txHash}`;
}
