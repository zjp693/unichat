import { NextResponse } from 'next/server';
import { publicClient, FACTORY_ADDRESS } from '@/lib/viem';
import communityFactoryABI from '@/contract/abi/CommunityFactory.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // console.log('🚀 [API] 开始获取群聊列表...');
    // console.log('📍 [API] Factory 地址:', FACTORY_ADDRESS);

    // 1. 获取群聊总数
    const totalCount = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: communityFactoryABI.abi,
      functionName: 'getAllCommunitiesCount'
    });

    // console.log('📊 [API] 群聊总数:', totalCount);

    if (Number(totalCount) === 0) {
      // console.log('⚠️ [API] 没有群聊');
      return NextResponse.json({
        success: true,
        data: {
          communities: [],
          total: 0
        }
      });
    }

    // 2. 获取所有群聊地址
    // console.log('🔍 [API] 获取群聊地址列表...');
    const communityAddresses = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: communityFactoryABI.abi,
      functionName: 'getCommunities',
      args: [BigInt(0), totalCount]
    });

    // console.log('📋 [API] 群聊地址:', communityAddresses);

    // 3. 批量获取群聊元数据
    // console.log('🔍 [API] 批量获取元数据...');
    const metadata = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: communityFactoryABI.abi,
      functionName: 'batchGetCommunityMetadata',
      args: [communityAddresses]
    });

    // console.log('📦 [API] 原始元数据:', metadata);

    // 4. 格式化返回数据
    // 使用 communityAddresses 数组的地址，而不是 metadata 中的 communityAddress
    // 因为合约可能返回的 communityAddress 都是同一个值
    const communities = (metadata as any[]).map((meta: any, index: number) => ({
      communityAddress: (communityAddresses as string[])[index], // 使用地址数组中的值
      owner: meta.owner,
      topicToken: meta.topicToken,
      maxTier: meta.maxTier,
      name: meta.name,
      avatarCid: meta.avatarCid,
      currentEpoch: meta.currentEpoch.toString()
    }));

    // console.log('✅ [API] 格式化后的数据:', communities);

    return NextResponse.json({
      success: true,
      data: {
        communities,
        total: Number(totalCount)
      }
    });
  } catch (error) {
    console.error('❌ [API] 获取群聊列表失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取群聊列表失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
