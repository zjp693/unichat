import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');
    const cursorParam = searchParams.get('cursor');

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

    // 解析 cursor（如果提供）
    let cursor: {
      total_usd_qualified: string;
      counterparty_address: string;
    } | null = null;
    if (cursorParam) {
      try {
        const decodedCursor = decodeURIComponent(cursorParam);
        const parsedCursor = JSON.parse(decodedCursor);

        // 验证 cursor 格式
        if (
          !parsedCursor ||
          typeof parsedCursor !== 'object' ||
          !parsedCursor.total_usd_qualified ||
          !parsedCursor.counterparty_address
        ) {
          return NextResponse.json(
            {
              success: false,
              error: 'cursor 格式错误',
              message:
                'cursor 必须包含 total_usd_qualified 和 counterparty_address'
            },
            { status: 400 }
          );
        }

        cursor = parsedCursor as {
          total_usd_qualified: string;
          counterparty_address: string;
        };
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'cursor 解析失败',
            message: 'cursor 必须是有效的 JSON 字符串'
          },
          { status: 400 }
        );
      }
    }

    // 确定查询限制（首页和分页都是10条）
    const limit = 10;

    // 执行查询
    let rows: any[];

    if (cursor) {
      // 分页查询：使用元组比较
      rows = await sql`
        SELECT 
          counterparty_address,
          tx_count_qualified,
          total_usd_qualified,
          first_seen_ts,
          last_seen_ts
        FROM contacts.contacts_snapshot
        WHERE user_address = ${lowercaseAddress}
          AND (total_usd_qualified, counterparty_address) < (${cursor.total_usd_qualified}, ${cursor.counterparty_address})
        ORDER BY total_usd_qualified DESC, counterparty_address ASC
        LIMIT ${limit}
      `;
    } else {
      // 首页查询
      rows = await sql`
        SELECT 
          counterparty_address,
          tx_count_qualified,
          total_usd_qualified,
          first_seen_ts,
          last_seen_ts
        FROM contacts.contacts_snapshot
        WHERE user_address = ${lowercaseAddress}
        ORDER BY total_usd_qualified DESC, counterparty_address ASC
        LIMIT ${limit}
      `;
    }

    // 判断是否有更多数据
    const hasMore = rows.length === limit;

    // 生成 nextCursor（如果有更多数据）
    let nextCursor: {
      total_usd_qualified: string;
      counterparty_address: string;
    } | null = null;
    if (hasMore && rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      nextCursor = {
        total_usd_qualified: String(lastRow.total_usd_qualified),
        counterparty_address: lastRow.counterparty_address
      };
    }

    // 数据为空时，提示需要连接钱包（实际上是提示没有数据）
    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        contacts: [],
        count: 0,
        hasMore: false,
        nextCursor: null,
        message: '暂无交易过的地址'
      });
    }

    // 格式化返回数据
    const contacts = rows.map((row) => ({
      counterparty_address: row.counterparty_address,
      tx_count_qualified: Number(row.tx_count_qualified),
      total_usd_qualified: String(row.total_usd_qualified), // 保持为字符串避免精度丢失
      first_seen_ts: Number(row.first_seen_ts),
      last_seen_ts: Number(row.last_seen_ts)
    }));

    return NextResponse.json({
      success: true,
      contacts,
      count: contacts.length,
      hasMore,
      nextCursor
    });
  } catch (error) {
    console.error('查询联系人失败:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 检查是否是表不存在的错误
    if (
      errorMessage.includes('does not exist') ||
      errorMessage.includes('relation')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: '表不存在',
          details: errorMessage,
          message: '数据库表 contacts.contacts_snapshot 不存在'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '查询联系人失败',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
