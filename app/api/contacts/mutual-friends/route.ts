import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');

    // 验证必需参数
    if (!userAddress) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必需的 userAddress 参数',
          message: '请连接钱包以查看联系人'
        },
        { status: 400 }
      );
    }

    // 将地址转换为小写
    const lowercaseAddress = userAddress.toLowerCase();

    // 查询数据库：多个共同好友交易的地址（要求2个及以上共同好友）
    const rows = await sql`
      SELECT 
        base_user,
        target,
        mutual_friends_cnt,
        total_usd_via_friends,
        last_seen_ts,
        which_friends
      FROM contacts.v_mutual_targets
      WHERE base_user = ${lowercaseAddress}
        AND is_direct = FALSE
        AND mutual_friends_cnt >= 2
      ORDER BY 
        mutual_friends_cnt DESC, 
        total_usd_via_friends DESC, 
        target ASC
      LIMIT 10
    `;

    // 数据为空时，返回空数组
    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        contacts: [],
        count: 0,
        message: '暂无多个共同好友交易的地址'
      });
    }

    // 格式化返回数据
    const contacts = rows.map((row) => ({
      base_user: row.base_user,
      target: row.target,
      mutual_friends_cnt: Number(row.mutual_friends_cnt),
      total_usd_via_friends: String(row.total_usd_via_friends), // 保持为字符串避免精度丢失
      last_seen_ts: row.last_seen_ts ? Number(row.last_seen_ts) : null,
      which_friends: row.which_friends // 可能是数组或字符串
    }));

    return NextResponse.json({
      success: true,
      contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error('查询共同好友联系人失败:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 检查是否是视图不存在的错误
    if (
      errorMessage.includes('does not exist') ||
      errorMessage.includes('relation')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: '视图不存在',
          details: errorMessage,
          message: '数据库视图 contacts.v_mutual_targets 不存在'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '查询共同好友联系人失败',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
