import { useReadContract } from 'wagmi';
import { Address } from 'viem';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import communityFactoryABI from '@/contract/abi/CommunityFactory.json';
import { FACTORY_ADDRESS } from '@/lib/viem';
import { updateChatMeta } from '@/lib/chatMetaSlice';

interface CommunityMetadata {
  communityAddress: Address;
  owner: Address;
  topicToken: Address;
  maxTier: number;
  name: string;
  avatarCid: string;
  currentEpoch: bigint;
}

/**
 * 获取单个群聊的元信息并同步到 Redux
 * 用于进入群聊页面后刷新最新数据
 */
export function useCommunityMeta(communityAddress?: string) {
  const dispatch = useDispatch();

  const { data, isLoading, error } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: communityFactoryABI.abi,
    functionName: 'getCommunityMetadataExternal',
    args: communityAddress ? [communityAddress as Address] : undefined,
    query: {
      enabled: !!communityAddress
    }
  });

  const metadata = data as CommunityMetadata | undefined;

  // 获取到数据后同步到 Redux
  useEffect(() => {
    if (metadata && communityAddress) {
      dispatch(
        updateChatMeta({
          chatId: communityAddress,
          meta: {
            name: metadata.name,
            avatar: metadata.avatarCid,
            level: metadata.maxTier,
            address: metadata.communityAddress
          }
        })
      );
    }
  }, [metadata, communityAddress, dispatch]);

  return {
    metadata,
    isLoading,
    error,
    name: metadata?.name,
    avatarCid: metadata?.avatarCid,
    maxTier: metadata?.maxTier
  };
}
