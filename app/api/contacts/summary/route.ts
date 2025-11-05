import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress'); // 当前用户地址
    const counterpartyAddress = searchParams.get('counterpartyAddress'); // 对方地址

    // 验证必需参数
    if (!userAddress || !counterpartyAddress) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必需参数',
          message: 'userAddress 和 counterpartyAddress 都是必需的'
        },
        { status: 400 }
      );
    }

    // 将地址转换为小写
    const lowercaseUser = userAddress.toLowerCase();
    const lowercaseCounterparty = counterpartyAddress.toLowerCase();

    // 执行SQL查询
    const rows = await sql`
      SELECT
        tx_count_qualified AS total_txs,
        total_usd_qualified AS total_usd,
        first_seen_ts,
        last_seen_ts
      FROM contacts.contacts_snapshot
      WHERE user_address = ${lowercaseUser} 
        AND counterparty_address = ${lowercaseCounterparty}
      LIMIT 1
    `;

    // 如果没有数据，返回默认值
    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          total_txs: 0,
          total_usd: '0',
          first_seen_ts: null,
          last_seen_ts: null
        }
      });
    }

    const row = rows[0];

    return NextResponse.json({
      success: true,
      data: {
        total_txs: Number(row.total_txs) || 0,
        total_usd: String(row.total_usd) || '0', // 保持字符串避免精度丢失
        first_seen_ts: row.first_seen_ts ? Number(row.first_seen_ts) : null,
        last_seen_ts: row.last_seen_ts ? Number(row.last_seen_ts) : null
      }
    });
  } catch (error) {
    console.error('查询联系人摘要失败:', error);

    // 检查是否是环境变量问题
    if (!process.env.POSTGRES_URL) {
      return NextResponse.json(
        {
          success: false,
          error: '数据库配置错误',
          details: 'POSTGRES_URL 环境变量未设置',
          message: '请检查 .env.local 文件中是否配置了 POSTGRES_URL'
        },
        { status: 500 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // 检查是否是网络连接问题
    const isNetworkError =
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND');

    return NextResponse.json(
      {
        success: false,
        error: '查询失败',
        details: errorMessage,
        ...(isNetworkError && {
          hint: '可能是数据库连接问题，请检查：1) POSTGRES_URL 是否正确 2) 网络连接是否正常 3) Neon 数据库服务是否可用'
        }),
        ...(process.env.NODE_ENV === 'development' &&
          errorStack && {
            stack: errorStack
          })
      },
      { status: 500 }
    );
  }
}
