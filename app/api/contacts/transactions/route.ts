import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Cursor 类型定义
interface Cursor {
  timestamp: number;
  tx_hash: string;
  log_index: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');
    const counterpartyAddress = searchParams.get('counterpartyAddress'); // 可选
    const directionFlag = searchParams.get('directionFlag'); // 'all' | 'income' | 'expense'
    const cursorParam = searchParams.get('cursor');

    // 验证必需参数
    if (!userAddress) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必需的 userAddress 参数'
        },
        { status: 400 }
      );
    }

    // 将地址转换为小写
    const lowercaseUser = userAddress.toLowerCase();
    const lowercaseCounterparty = counterpartyAddress?.toLowerCase() || null;

    // 解析 cursor（如果提供）
    let cursor: Cursor | null = null;
    if (cursorParam) {
      try {
        const decodedCursor = decodeURIComponent(cursorParam);
        cursor = JSON.parse(decodedCursor) as Cursor;

        if (
          !cursor.timestamp ||
          !cursor.tx_hash ||
          cursor.log_index === undefined
        ) {
          throw new Error('cursor 格式错误');
        }
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'cursor 解析失败',
            message:
              'cursor 必须是有效的 JSON 字符串，包含 timestamp, tx_hash, log_index'
          },
          { status: 400 }
        );
      }
    }

    // 构建查询 - 使用 sql 模板字符串
    let rows: any[];

    if (cursor) {
      // 有 cursor 的分页查询
      if (lowercaseCounterparty) {
        // 有对手方地址
        if (directionFlag === 'income') {
          rows = await sql`
            SELECT 
              timestamp, 
              tx_hash, 
              log_index, 
              block_number, 
              token_address,
              raw_amount, 
              usd_value, 
              "from", 
              "to",
              user_address, 
              counterparty_address, 
              direction_flag,
              CASE
                WHEN direction_flag=0 THEN +usd_value
                WHEN direction_flag=1 THEN -usd_value
                ELSE 0
              END AS signed_usd
            FROM contacts.edge_events
            WHERE user_address = ${lowercaseUser}
              AND counterparty_address = ${lowercaseCounterparty}
              AND direction_flag = 0
              AND (timestamp, tx_hash, log_index) < (${cursor.timestamp}, ${cursor.tx_hash}, ${cursor.log_index})
            ORDER BY timestamp DESC, tx_hash DESC, log_index DESC
            LIMIT 10
          `;
        } else if (directionFlag === 'expense') {
          rows = await sql`
            SELECT 
              timestamp, 
              tx_hash, 
              log_index, 
              block_number, 
              token_address,
              raw_amount, 
              usd_value, 
              "from", 
              "to",
              user_address, 
              counterparty_address, 
              direction_flag,
              CASE
                WHEN direction_flag=0 THEN +usd_value
                WHEN direction_flag=1 THEN -usd_value
                ELSE 0
              END AS signed_usd
            FROM contacts.edge_events
            WHERE user_address = ${lowercaseUser}
              AND counterparty_address = ${lowercaseCounterparty}
              AND direction_flag = 1
              AND (timestamp, tx_hash, log_index) < (${cursor.timestamp}, ${cursor.tx_hash}, ${cursor.log_index})
            ORDER BY timestamp DESC, tx_hash DESC, log_index DESC
            LIMIT 10
          `;
        } else {
          // all
          rows = await sql`
            SELECT 
              timestamp, 
              tx_hash, 
              log_index, 
              block_number, 
              token_address,
              raw_amount, 
              usd_value, 
              "from", 
              "to",
              user_address, 
              counterparty_address, 
              direction_flag,
              CASE
                WHEN direction_flag=0 THEN +usd_value
                WHEN direction_flag=1 THEN -usd_value
                ELSE 0
              END AS signed_usd
            FROM contacts.edge_events
            WHERE user_address = ${lowercaseUser}
              AND counterparty_address = ${lowercaseCounterparty}
              AND (timestamp, tx_hash, log_index) < (${cursor.timestamp}, ${cursor.tx_hash}, ${cursor.log_index})
            ORDER BY timestamp DESC, tx_hash DESC, log_index DESC
            LIMIT 10
          `;
        }
      } else {
        // 没有对手方地址
        if (directionFlag === 'income') {
          rows = await sql`
            SELECT 
              timestamp, 
              tx_hash, 
              log_index, 
              block_number, 
              token_address,
              raw_amount, 
              usd_value, 
              "from", 
              "to",
              user_address, 
              counterparty_address, 
              direction_flag,
              CASE
                WHEN direction_flag=0 THEN +usd_value
                WHEN direction_flag=1 THEN -usd_value
                ELSE 0
              END AS signed_usd
            FROM contacts.edge_events
            WHERE user_address = ${lowercaseUser}
              AND direction_flag = 0
              AND (timestamp, tx_hash, log_index) < (${cursor.timestamp}, ${cursor.tx_hash}, ${cursor.log_index})
            ORDER BY timestamp DESC, tx_hash DESC, log_index DESC
            LIMIT 10
          `;
        } else if (directionFlag === 'expense') {
          rows = await sql`
            SELECT 
              timestamp, 
              tx_hash, 
              log_index, 
              block_number, 
              token_address,
              raw_amount, 
              usd_value, 
              "from", 
              "to",
              user_address, 
              counterparty_address, 
              direction_flag,
              CASE
                WHEN direction_flag=0 THEN +usd_value
                WHEN direction_flag=1 THEN -usd_value
                ELSE 0
              END AS signed_usd
            FROM contacts.edge_events
            WHERE user_address = ${lowercaseUser}
              AND direction_flag = 1
              AND (timestamp, tx_hash, log_index) < (${cursor.timestamp}, ${cursor.tx_hash}, ${cursor.log_index})
            ORDER BY timestamp DESC, tx_hash DESC, log_index DESC
            LIMIT 10
          `;
        } else {
          // all
          rows = await sql`
            SELECT 
              timestamp, 
              tx_hash, 
              log_index, 
              block_number, 
              token_address,
              raw_amount, 
              usd_value, 
              "from", 
              "to",
              user_address, 
              counterparty_address, 
              direction_flag,
              CASE
                WHEN direction_flag=0 THEN +usd_value
                WHEN direction_flag=1 THEN -usd_value
                ELSE 0
              END AS signed_usd
            FROM contacts.edge_events
            WHERE user_address = ${lowercaseUser}
              AND (timestamp, tx_hash, log_index) < (${cursor.timestamp}, ${cursor.tx_hash}, ${cursor.log_index})
            ORDER BY timestamp DESC, tx_hash DESC, log_index DESC
            LIMIT 10
          `;
        }
      }
    } else {
      // 首页查询（无 cursor）
      if (lowercaseCounterparty) {
        // 有对手方地址
        if (directionFlag === 'income') {
          rows = await sql`
            SELECT 
              timestamp, 
              tx_hash, 
              log_index, 
              block_number, 
              token_address,
              raw_amount, 
              usd_value, 
              "from", 
              "to",
              user_address, 
              counterparty_address, 
              direction_flag,
              CASE
                WHEN direction_flag=0 THEN +usd_value
                WHEN direction_flag=1 THEN -usd_value
                ELSE 0
              END AS signed_usd
            FROM contacts.edge_events
            WHERE user_address = ${lowercaseUser}
              AND counterparty_address = ${lowercaseCounterparty}
              AND direction_flag = 0
            ORDER BY timestamp DESC, tx_hash DESC, log_index DESC
            LIMIT 10
          `;
        } else if (directionFlag === 'expense') {
          rows = await sql`
            SELECT 
              timestamp, 
              tx_hash, 
              log_index, 
              block_number, 
              token_address,
              raw_amount, 
              usd_value, 
              "from", 
              "to",
              user_address, 
              counterparty_address, 
              direction_flag,
              CASE
                WHEN direction_flag=0 THEN +usd_value
                WHEN direction_flag=1 THEN -usd_value
                ELSE 0
              END AS signed_usd
            FROM contacts.edge_events
            WHERE user_address = ${lowercaseUser}
              AND counterparty_address = ${lowercaseCounterparty}
              AND direction_flag = 1
            ORDER BY timestamp DESC, tx_hash DESC, log_index DESC
            LIMIT 10
          `;
        } else {
          // all
          rows = await sql`
            SELECT 
              timestamp, 
              tx_hash, 
              log_index, 
              block_number, 
              token_address,
              raw_amount, 
              usd_value, 
              "from", 
              "to",
              user_address, 
              counterparty_address, 
              direction_flag,
              CASE
                WHEN direction_flag=0 THEN +usd_value
                WHEN direction_flag=1 THEN -usd_value
                ELSE 0
              END AS signed_usd
            FROM contacts.edge_events
            WHERE user_address = ${lowercaseUser}
              AND counterparty_address = ${lowercaseCounterparty}
            ORDER BY timestamp DESC, tx_hash DESC, log_index DESC
            LIMIT 10
          `;
        }
      } else {
        // 没有对手方地址
        if (directionFlag === 'income') {
          rows = await sql`
            SELECT 
              timestamp, 
              tx_hash, 
              log_index, 
              block_number, 
              token_address,
              raw_amount, 
              usd_value, 
              "from", 
              "to",
              user_address, 
              counterparty_address, 
              direction_flag,
              CASE
                WHEN direction_flag=0 THEN +usd_value
                WHEN direction_flag=1 THEN -usd_value
                ELSE 0
              END AS signed_usd
            FROM contacts.edge_events
            WHERE user_address = ${lowercaseUser}
              AND direction_flag = 0
            ORDER BY timestamp DESC, tx_hash DESC, log_index DESC
            LIMIT 10
          `;
        } else if (directionFlag === 'expense') {
          rows = await sql`
            SELECT 
              timestamp, 
              tx_hash, 
              log_index, 
              block_number, 
              token_address,
              raw_amount, 
              usd_value, 
              "from", 
              "to",
              user_address, 
              counterparty_address, 
              direction_flag,
              CASE
                WHEN direction_flag=0 THEN +usd_value
                WHEN direction_flag=1 THEN -usd_value
                ELSE 0
              END AS signed_usd
            FROM contacts.edge_events
            WHERE user_address = ${lowercaseUser}
              AND direction_flag = 1
            ORDER BY timestamp DESC, tx_hash DESC, log_index DESC
            LIMIT 10
          `;
        } else {
          // all
          rows = await sql`
            SELECT 
              timestamp, 
              tx_hash, 
              log_index, 
              block_number, 
              token_address,
              raw_amount, 
              usd_value, 
              "from", 
              "to",
              user_address, 
              counterparty_address, 
              direction_flag,
              CASE
                WHEN direction_flag=0 THEN +usd_value
                WHEN direction_flag=1 THEN -usd_value
                ELSE 0
              END AS signed_usd
            FROM contacts.edge_events
            WHERE user_address = ${lowercaseUser}
            ORDER BY timestamp DESC, tx_hash DESC, log_index DESC
            LIMIT 10
          `;
        }
      }
    }

    // 判断是否有更多数据
    const hasMore = rows.length === 10;

    // 获取最后一个记录的 cursor（如果有数据）
    let nextCursor: Cursor | null = null;
    if (hasMore && rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      nextCursor = {
        timestamp: Number(lastRow.timestamp),
        tx_hash: String(lastRow.tx_hash),
        log_index: Number(lastRow.log_index)
      };
    }

    // 格式化返回数据
    const transactions = rows.map((row: any) => ({
      timestamp: Number(row.timestamp),
      tx_hash: String(row.tx_hash),
      log_index: Number(row.log_index),
      block_number: Number(row.block_number),
      token_address: String(row.token_address),
      raw_amount: String(row.raw_amount),
      usd_value: String(row.usd_value),
      from: String(row.from),
      to: String(row.to),
      user_address: String(row.user_address),
      counterparty_address: String(row.counterparty_address),
      direction_flag: Number(row.direction_flag),
      signed_usd: String(row.signed_usd)
    }));

    return NextResponse.json({
      success: true,
      transactions,
      hasMore,
      nextCursor,
      count: transactions.length
    });
  } catch (error) {
    console.error('查询交易记录失败:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        success: false,
        error: '查询失败',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
