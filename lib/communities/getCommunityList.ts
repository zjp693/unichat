/**
 * 群聊列表获取逻辑（公共函数）
 * 供 API 路由直接调用，避免内部 HTTP 请求
 */

import { createPublicClient, http } from 'viem';
import { getContractAddress } from '@/lib/web3/contracts';
import { getNetworkById, type SupportedChainId } from '@/lib/web3/networks';
import communityFactoryABI from '@/contract/abi/CommunityFactory.json';

export interface CommunityMetadata {
  communityAddress: string;
  owner: string;
  topicToken: string;
  maxTier: number;
  name: string;
  avatarCid: string;
  currentEpoch: string;
}

export interface CommunityListResult {
  communities: CommunityMetadata[];
  total: number;
}

/**
 * 获取所有群聊列表（直接调用链上合约）
 * @param chainId 链ID (42161 = Arbitrum, 204 = opBNB)
 */
export async function getCommunityList(
  chainId: SupportedChainId
): Promise<CommunityListResult> {
  // 获取对应链的配置
  const network = getNetworkById(chainId);
  const factoryAddress = getContractAddress(chainId, 'communityFactory');

  if (!network || !factoryAddress) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  // 创建对应链的 publicClient
  const publicClient = createPublicClient({
    chain: network,
    transport: http()
  });

  // 1. 获取群聊总数
  const totalCount = await publicClient.readContract({
    address: factoryAddress,
    abi: communityFactoryABI.abi,
    functionName: 'getAllCommunitiesCount'
  });

  if (Number(totalCount) === 0) {
    return { communities: [], total: 0 };
  }

  // 2. 获取所有群聊地址
  const communityAddresses = await publicClient.readContract({
    address: factoryAddress,
    abi: communityFactoryABI.abi,
    functionName: 'getCommunities',
    args: [BigInt(0), totalCount]
  });

  // 3. 批量获取群聊元数据
  const metadata = await publicClient.readContract({
    address: factoryAddress,
    abi: communityFactoryABI.abi,
    functionName: 'batchGetCommunityMetadata',
    args: [communityAddresses]
  });

  // 4. 格式化返回数据
  const communities = (metadata as any[]).map(
    (meta: any, index: number): CommunityMetadata => ({
      communityAddress: (communityAddresses as string[])[index],
      owner: meta.owner,
      topicToken: meta.topicToken,
      maxTier: meta.maxTier,
      name: meta.name,
      avatarCid: meta.avatarCid,
      currentEpoch: meta.currentEpoch.toString()
    })
  );

  return {
    communities,
    total: Number(totalCount)
  };
}
