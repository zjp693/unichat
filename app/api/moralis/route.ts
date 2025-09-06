import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2.2';
const MORALIS_API_KEY = process.env.MORALIS_API_KEY;

export async function GET(request: NextRequest) {
  try {
    // 验证环境变量
    if (!MORALIS_API_KEY) {
      console.error('MORALIS_API_KEY 环境变量未设置');
      return NextResponse.json({ error: '服务配置错误' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const chain = searchParams.get('chain') || 'eth';

    if (!address) {
      return NextResponse.json({ error: '缺少必需的 address 参数' }, { status: 400 });
    }

    const url = `${MORALIS_BASE_URL}/wallets/${encodeURIComponent(address)}/tokens?chain=${encodeURIComponent(chain)}&exclude_spam=true&exclude_unverified_contracts=true`;

    const moralisResponse = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': MORALIS_API_KEY
      },
      cache: 'no-store'
    });

    const data = await moralisResponse.json().catch(() => ({}));

    // 透传 Moralis 的状态码与数据
    return NextResponse.json(data, { status: moralisResponse.status });
  } catch (error: any) {
    console.error('Moralis 代理错误:', error?.message || error);
    return NextResponse.json({ error: 'Moralis 代理请求失败' }, { status: 500 });
  }
}


