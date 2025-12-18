import { NextRequest, NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem';
import { getUserProofs } from '@/lib/db';
import communityABI from '@/contract/abi/community.json';
import { Abi } from 'viem';

export const dynamic = 'force-dynamic';

/**
 * 解析 proof 字段
 * 数据库格式: [0xabc...,0xdef...] (字符串，缺少引号)
 * 目标格式: ["0xabc...","0xdef..."] (JSON 数组)
 */
function parseProof(proofData: string | any[]): string[] {
  try {
    // 如果已经是数组，直接返回
    if (Array.isArray(proofData)) {
      return proofData;
    }

    // 如果是字符串，修复格式并解析
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
 * 检查用户是否已加入群聊
 */
async function checkMembership(
  communityAddress: string,
  userAddress: string
): Promise<boolean> {
  try {
    const isJoined = await publicClient.readContract({
      address: communityAddress as `0x${string}`,
      abi: communityABI.abi as Abi,
      functionName: 'isActiveMember',
      args: [userAddress as `0x${string}`]
    });
    return Boolean(isJoined);
  } catch (error) {
    console.error(`❌ 检查群聊 ${communityAddress} 成员状态失败:`, error);
    return false;
  }
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

    // 1. 获取所有群聊列表（从 Factory 合约）
    const allCommunitiesResponse = await fetch(
      `${request.nextUrl.origin}/api/communities/list`
    );
    const allCommunitiesResult = await allCommunitiesResponse.json();

    if (
      !allCommunitiesResult.success ||
      !allCommunitiesResult.data?.communities
    ) {
      console.error('❌ 获取群聊列表失败');
      return NextResponse.json({
        success: true,
        data: { communities: [] }
      });
    }

    const allCommunities = allCommunitiesResult.data.communities;

    // 2. 查询用户的 proof 数据（用于判断 canJoin）
    const userProofs = await getUserProofs(address);

    // 3. 并发查询所有群聊的状态
    const statusPromises = allCommunities.map(async (community: any) => {
      // 查数据库：用户是否有这个群聊的 proof？
      const proof = userProofs.find(
        (p) =>
          p.community.toLowerCase() === community.communityAddress.toLowerCase()
      );
      const parsedProof = proof ? parseProof(proof.proof) : [];
      const hasValidProof = parsedProof.length > 0;

      // ✅ 查链上：用户是否已加入？（不管有没有 proof 都查）
      const isJoined = await checkMembership(
        community.communityAddress,
        address
      );

      return {
        communityAddress: community.communityAddress,
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

    const communities = await Promise.all(statusPromises);

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
