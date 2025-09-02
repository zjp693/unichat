import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2.2';
const MORALIS_API_KEY = process.env.MORALIS_API_KEY;

// Moralis净资产API响应接口
interface MoralisNetWorthResponse {
  total_networth_usd: string;
  total_networth_usd_24hr_percent_change: number | null;
  chains: Array<{
    chain: string;
    native_balance: string;
    native_balance_formatted: string;
    native_balance_usd: string;
    token_balances: Array<{
      token_address: string;
      symbol: string;
      name: string;
      logo: string | null;
      thumbnail: string | null;
      decimals: number;
      balance: string;
      balance_formatted: string;
      usd_price: number | null;
      usd_price_24hr_percent_change: number | null;
      usd_value: number | null;
      usd_value_24hr_usd_change: number | null;
      portfolio_percentage: number | null;
      possible_spam: boolean;
      verified_contract: boolean;
    }>;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // 验证环境变量
    if (!MORALIS_API_KEY) {
      console.error('MORALIS_API_KEY 环境变量未设置');
      return NextResponse.json({ error: '服务配置错误' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json({ error: '缺少必需的 address 参数' }, { status: 400 });
    }

    // 构建Moralis净资产API URL
    const url = new URL(`${MORALIS_BASE_URL}/wallets/${encodeURIComponent(address)}/net-worth`);
    
    // 添加查询参数以提高数据质量
    url.searchParams.set('exclude_spam', 'true');
    url.searchParams.set('exclude_unverified_contracts', 'true');
    url.searchParams.set('max_token_inactivity', '1');
    url.searchParams.set('min_pair_side_liquidity_usd', '1000');

    console.log('🔍 调用Moralis净资产API:', url.toString());

    const moralisResponse = await fetch(url.toString(), {
      headers: {
        'accept': 'application/json',
        'X-API-Key': MORALIS_API_KEY
      },
      cache: 'no-store'
    });

    if (!moralisResponse.ok) {
      const errorText = await moralisResponse.text().catch(() => '无法获取错误详情');
      console.error('❌ Moralis API错误:', {
        status: moralisResponse.status,
        statusText: moralisResponse.statusText,
        response: errorText
      });
      
      let errorMessage = `Moralis API错误 ${moralisResponse.status}`;
      
      // 根据状态码提供更具体的错误信息
      switch (moralisResponse.status) {
        case 400:
          errorMessage = '钱包地址格式无效';
          break;
        case 401:
          errorMessage = 'API密钥无效或已过期';
          break;
        case 403:
          errorMessage = 'API访问权限不足';
          break;
        case 429:
          errorMessage = 'API请求频率超限，请稍后重试';
          break;
        case 500:
          errorMessage = 'Moralis服务器内部错误';
          break;
        case 503:
          errorMessage = 'Moralis服务暂时不可用';
          break;
        default:
          errorMessage = `Moralis API错误: ${moralisResponse.status} ${moralisResponse.statusText}`;
      }
      
      return NextResponse.json(
        { error: errorMessage, details: errorText }, 
        { status: moralisResponse.status }
      );
    }

    const data: MoralisNetWorthResponse = await moralisResponse.json();
    
    console.log('✅ Moralis净资产API响应成功');
    console.log('📊 总净资产:', data.total_networth_usd);
    console.log('📈 24小时变化:', data.total_networth_usd_24hr_percent_change);

    // 返回净资产数据
    return NextResponse.json(data, { status: 200 });
    
  } catch (error: any) {
    console.error('💥 Moralis净资产API代理错误:', {
      message: error?.message || '未知错误',
      stack: error?.stack
    });
    
    const errorMessage = error?.message?.includes('fetch') 
      ? '网络连接失败，请检查网络连接' 
      : `服务器内部错误: ${error?.message || '未知错误'}`;
    
    return NextResponse.json({ 
      error: errorMessage,
      type: 'server_error'
    }, { status: 500 });
  }
}
