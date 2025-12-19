import { NextRequest, NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem';
import { getUserProofs } from '@/lib/db';
import {
  getCommunityList,
  CommunityMetadata
} from '@/lib/communities/getCommunityList';
import communityABI from '@/contract/abi/community.json';
import { Abi } from 'viem';

export const dynamic = 'force-dynamic';

/**
 * 解析 proof 字段
 */
function parseProof(proofData: string | any[]): string[] {
  try {
    if (Array.isArray(proofData)) {
      return proofData;
    }
    if (typeof proofData === 'string') {
      const fixed = proofData
        .replace(/\[/g, '["')
        .replace(/\]/g, '"]')
        .replace(/,/g, '","');
      return JSON.parse(fixed);
    }
    return [];
  } catch (error) {
    console.error('❌ Proof 解析失败:', error);
    return [];
  }
}

/**
 * 批量检查用户是否已加入多个群聊（使用 multicall）
 */
async function batchCheckMembership(
  communities: CommunityMetadata[],
  userAddress: string
): Promise<Map<string, boolean>> {
  const resultMap = new Map<string, boolean>();

  if (communities.length === 0) {
    return resultMap;
  }

  try {
    // 构建 multicall 请求
    const calls = communities.map((community) => ({
      address: community.communityAddress as `0x${string}`,
      abi: communityABI.abi as Abi,
      functionName: 'isActiveMember',
      args: [userAddress as `0x${string}`]
    }));

    // 使用 multicall 批量调用
    const results = await publicClient.multicall({
      contracts: calls
    });

    // 解析结果
    communities.forEach((community, index) => {
      const result = results[index];
      const isJoined =
        result.status === 'success' ? Boolean(result.result) : false;
      resultMap.set(community.communityAddress.toLowerCase(), isJoined);
    });
  } catch (error) {
    console.error('❌ 批量检查成员状态失败:', error);
    // 失败时返回空 map，所有群聊默认未加入
  }

  return resultMap;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { success: false, error: '缺少 address 参数' },
        { status: 400 }
      );
    }

    // 1. 获取群聊列表
    const { communities: allCommunities } = await getCommunityList();

    if (!allCommunities.length) {
      return NextResponse.json({
        success: true,
        data: { communities: [] }
      });
    }

    // 2. 并行执行：查询 proof + 批量检查成员状态
    const [userProofs, membershipMap] = await Promise.all([
      getUserProofs(address),
      batchCheckMembership(allCommunities, address)
    ]);

    // 3. 组装结果
    const communities = allCommunities.map((community) => {
      const proof = userProofs.find(
        (p) =>
          p.community.toLowerCase() === community.communityAddress.toLowerCase()
      );
      const parsedProof = proof ? parseProof(proof.proof) : [];
      const hasValidProof = parsedProof.length > 0;

      const isJoined =
        membershipMap.get(community.communityAddress.toLowerCase()) || false;

      return {
        ...community,
        canJoin: hasValidProof,
        isJoined,
        proofData: proof
          ? {
              maxTier: proof.max_tier,
              epoch: proof.epoch,
              validUntil: proof.valid_until,
              nonce: proof.nonce,
              proof: parsedProof,
              leafHash: proof.leaf_hash
            }
          : undefined
      };
    });

    return NextResponse.json({
      success: true,
      data: { communities }
    });
  } catch (error) {
    console.error('❌ 获取用户状态失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取用户状态失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
