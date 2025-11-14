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

    // 1. 查询用户的 proof 数据
    const userProofs = await getUserProofs(address);

    if (userProofs.length === 0) {
      return NextResponse.json({
        success: true,
        data: { communities: [] }
      });
    }

    // 2. 批量处理每个群聊的状态
    const statusPromises = userProofs.map(async (proof) => {
      const parsedProof = parseProof(proof.proof);
      const isJoined = await checkMembership(proof.community, address);
      const hasValidProof = parsedProof.length > 0;

      return {
        communityAddress: proof.community,
        canJoin: hasValidProof,
        isJoined,
        proofData: {
          maxTier: proof.max_tier,
          epoch: proof.epoch,
          validUntil: proof.valid_until,
          nonce: proof.nonce,
          proof: parsedProof,
          leafHash: proof.leaf_hash
        }
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
