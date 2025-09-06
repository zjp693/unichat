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
    const chain = searchParams.get('chain') || 'arbitrum';
    const cursor = searchParams.get('cursor');
    const limit = searchParams.get('limit');
    const tokenAddress = searchParams.get('contract_addresses');

    if (!address) {
      return NextResponse.json({ error: '缺少必需的 address 参数' }, { status: 400 });
    }

    const query: string[] = [`chain=${encodeURIComponent(chain)}`];
    if (cursor) query.push(`cursor=${encodeURIComponent(cursor)}`);
    if (limit) query.push(`limit=${encodeURIComponent(limit)}`);
    if (tokenAddress) query.push(`contract_addresses=${encodeURIComponent(tokenAddress)}`);

    // 兼容你提供的路径形式
    const url = `${MORALIS_BASE_URL}/${encodeURIComponent(address)}/erc20/transfers?${query.join('&')}`;

    const moralisResponse = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': MORALIS_API_KEY
      },
      cache: 'no-store'
    });

    const data = await moralisResponse.json().catch(() => ({}));
    return NextResponse.json(data, { status: moralisResponse.status });
  } catch (error: any) {
    console.error('Moralis transfers 代理错误:', error?.message || error);
    return NextResponse.json({ error: 'Moralis transfers 代理请求失败' }, { status: 500 });
  }
}


