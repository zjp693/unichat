import { Address, Abi } from 'viem';
import { useReadContracts, useChainId } from 'wagmi';
import UniChatProfileABI from '@/contract/abi/UniChatProfile.json';
import { getContractAddress } from '@/lib/web3/contracts';
import { PeerProfile } from './usePeerProfile';

export function useBatchPeerProfiles(addresses: Address[]) {
  const chainId = useChainId();
  const profileAddress = getContractAddress(chainId, 'profile');

  // 1. 第一步：批量获取每个地址的 Profile IDs
  const { data: profilesIdsList, isLoading: isLoadingIds } = useReadContracts({
    contracts: addresses.map((addr) => ({
      address: profileAddress || undefined,
      abi: UniChatProfileABI.abi as Abi,
      functionName: 'getProfilesOf',
      args: [addr]
    })),
    query: {
      enabled: addresses.length > 0 && !!profileAddress
    }
  });

  // 提取每个用户的主 Token ID (取第一个)
  const tokenIds = profilesIdsList?.map((result) => {
    if (
      result.status === 'success' &&
      Array.isArray(result.result) &&
      result.result.length > 0
    ) {
      return result.result[0] as bigint;
    }
    return null;
  });

  // 2. 第二步：批量获取 Profile 详情
  // 过滤出有效的 tokenId 进行查询，为了保持索引对应，我们查询所有（null 的跳过或 dummy）
  const { data: profilesDataList, isLoading: isLoadingProfiles } =
    useReadContracts({
      contracts: tokenIds
        ?.map((tokenId) => {
          if (tokenId === null) return null;
          return {
            address: profileAddress || undefined,
            abi: UniChatProfileABI.abi as Abi,
            functionName: 'getProfile',
            args: [tokenId]
          };
        })
        .filter(Boolean) as any[], // 过滤掉 null contract 配置，wagmi 会处理
      query: {
        enabled:
          !!tokenIds && tokenIds.some((id) => id !== null) && !!profileAddress
      }
    });

  // 3. 第三步：获取默认头像
  // 这里简化，不调合约了， hardcode 或者从单个 hook 拿。
  // 为了严谨，还是调一次
  const { data: defaultAvatarData } = useReadContracts({
    contracts: [
      {
        address: profileAddress || undefined,
        abi: UniChatProfileABI.abi as Abi,
        functionName: 'defaultAvatarCid'
      }
    ],
    query: { enabled: !!profileAddress }
  });
  const defaultAvatarCid = (defaultAvatarData?.[0]?.result as string) || '';

  // 组装结果
  const profileMap = new Map<string, PeerProfile>();

  if (addresses && tokenIds) {
    let profileDataIndex = 0;

    addresses.forEach((addr, index) => {
      const tokenId = tokenIds[index];
      // 标准化 key 为小写，方便查找
      const key = addr.toLowerCase();

      if (tokenId === null) {
        // 没有 Profile
        profileMap.set(key, {
          name: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
          avatarCid: defaultAvatarCid,
          bio: '',
          tokenId: null,
          hasProfile: false
        });
      } else {
        // 有 Profile
        const result = profilesDataList?.[profileDataIndex];
        profileDataIndex++;

        if (result && result.status === 'success') {
          const data = result.result as any;
          const name = data.name || data[2] || '';
          const description = data.description || data[3] || '';
          const avatarCid = data.avatarCid || data[4] || defaultAvatarCid;

          profileMap.set(key, {
            name: name || `${addr.slice(0, 6)}...${addr.slice(-4)}`,
            avatarCid: String(avatarCid),
            bio: description,
            tokenId: tokenId,
            hasProfile: true
          });
        } else {
          // Fallback
          profileMap.set(key, {
            name: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
            avatarCid: defaultAvatarCid,
            bio: '',
            tokenId: tokenId,
            hasProfile: true
          });
        }
      }
    });
  }

  return {
    profileMap, // 返回 Map
    isLoading: isLoadingIds || isLoadingProfiles
  };
}
