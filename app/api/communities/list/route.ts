import { NextResponse } from 'next/server';
import { getCommunityList } from '@/lib/communities/getCommunityList';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await getCommunityList();

    return NextResponse.json({
      success: true,
      data: result
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
