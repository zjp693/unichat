import { NextRequest, NextResponse } from 'next/server';
import { TransactionReceipt } from '@/lib/types/alchemy';

export const dynamic = 'force-dynamic';

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// 网络映射 - 支持的区块链网络
const NETWORK_MAPPING: Record<string, string> = {
  ethereum: 'eth-mainnet',
  arbitrum: 'arb-mainnet',
  polygon: 'polygon-mainnet',
  bsc: 'bsc-mainnet',
  optimism: 'opt-mainnet',
  avalanche: 'avax-mainnet',
  fantom: 'fantom-mainnet',
  cronos: 'cronos-mainnet',
  gnosis: 'gnosis-mainnet'
};

export async function GET(request: NextRequest) {
  try {
    // 验证环境变量
    if (!ALCHEMY_API_KEY) {
      console.error('ALCHEMY_API_KEY 环境变量未设置');
      return NextResponse.json({ error: '服务配置错误' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const transactionHash = searchParams.get('transactionHash');
    const networkParam = searchParams.get('network') || 'ethereum';

    if (!transactionHash) {
      return NextResponse.json(
        { error: '缺少必需的 transactionHash 参数' },
        { status: 400 }
      );
    }

    // 验证交易哈希格式
    if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      return NextResponse.json(
        { error: '无效的交易哈希格式' },
        { status: 400 }
      );
    }

    // 规范化网络名称：移除空格和数字，转换为小写
    // 例如 "Arbitrum" -> "arbitrum", "Arbitrum 5" -> "arbitrum"
    const normalizedNetwork = networkParam
      .toLowerCase()
      .replace(/\s+\d+.*$/, '') // 移除空格后的数字和后续内容
      .replace(/\s+mainnet.*$/i, '') // 移除 "mainnet" 及其后续内容
      .replace(/\s+/g, '') // 移除所有空格
      .trim();

    // 获取Alchemy网络名称
    const alchemyNetwork = NETWORK_MAPPING[normalizedNetwork];
    if (!alchemyNetwork) {
      console.error(
        `不支持的网络: ${networkParam} (规范化后: ${normalizedNetwork})`
      );
      return NextResponse.json(
        {
          error: `不支持的网络: ${networkParam}`,
          normalized: normalizedNetwork,
          supported: Object.keys(NETWORK_MAPPING)
        },
        { status: 400 }
      );
    }

    // 构建Alchemy API URL
    const alchemyUrl = `https://${alchemyNetwork}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

    // 构建请求体
    const requestBody = {
      jsonrpc: '2.0',
      method: 'eth_getTransactionReceipt',
      params: [transactionHash],
      id: 1
    };

    console.log(
      `正在获取交易收据: ${transactionHash} 在网络 ${normalizedNetwork} (${alchemyNetwork})`
    );

    // 调用Alchemy API
    let alchemyResponse: Response;
    try {
      alchemyResponse = await fetch(alchemyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(requestBody),
        cache: 'no-store'
      });
    } catch (fetchError: any) {
      console.error('Alchemy API请求失败:', fetchError);
      return NextResponse.json(
        {
          error: '无法连接到Alchemy API',
          details: fetchError?.message || String(fetchError),
          hint: '请检查网络连接和 ALCHEMY_API_KEY 环境变量'
        },
        { status: 503 }
      );
    }

    // 先读取响应文本，然后尝试解析JSON
    const responseText = await alchemyResponse.text();

    // 检查是否是网络未启用的错误（Alchemy返回纯文本而不是JSON）
    if (
      responseText.includes('is not enabled for this app') ||
      responseText.includes('not enabled') ||
      responseText.includes('Visit this page to enable')
    ) {
      console.error('Alchemy网络未启用:', responseText);

      // 尝试提取网络名称和启用链接
      const networkMatch = responseText.match(/([A-Z_]+)\s+is not enabled/i);
      const urlMatch = responseText.match(/https:\/\/[^\s]+/);

      return NextResponse.json(
        {
          error: 'Alchemy API网络未启用',
          details: responseText.trim(),
          hint: `您的 Alchemy API Key 未启用 ${networkMatch?.[1] || normalizedNetwork} 网络。请在 Alchemy Dashboard 中启用该网络。`,
          enableUrl: urlMatch?.[0] || 'https://dashboard.alchemy.com',
          network: normalizedNetwork,
          solution:
            '请访问 Alchemy Dashboard → 选择您的应用 → Networks → 启用所需的网络'
        },
        { status: 403 }
      );
    }

    let alchemyData: any;
    try {
      alchemyData = JSON.parse(responseText);
    } catch (jsonError: any) {
      console.error('解析Alchemy API响应失败:', jsonError);
      console.error('原始响应:', responseText);
      return NextResponse.json(
        {
          error: 'Alchemy API响应格式错误',
          details: jsonError?.message || String(jsonError),
          rawResponse: responseText.substring(0, 500) // 只返回前500个字符
        },
        { status: 502 }
      );
    }

    // 检查Alchemy API HTTP状态
    if (!alchemyResponse.ok) {
      console.error(
        'Alchemy API HTTP错误:',
        alchemyResponse.status,
        alchemyData
      );
      return NextResponse.json(
        {
          error: `Alchemy API错误 (HTTP ${alchemyResponse.status})`,
          details:
            alchemyData?.error?.message || alchemyData?.error || '未知错误',
          response: alchemyData
        },
        { status: alchemyResponse.status }
      );
    }

    // 检查JSON-RPC错误响应
    if (alchemyData.error) {
      console.error('Alchemy JSON-RPC错误:', alchemyData.error);
      return NextResponse.json(
        {
          error: `Alchemy API错误: ${alchemyData.error.message || JSON.stringify(alchemyData.error)}`,
          code: alchemyData.error.code,
          details: alchemyData.error
        },
        { status: 400 }
      );
    }

    // 检查交易是否存在
    if (!alchemyData.result || alchemyData.result === null) {
      return NextResponse.json(
        {
          error: '未找到交易收据',
          hint: '交易可能不存在、尚未确认或网络不匹配',
          transactionHash,
          network: normalizedNetwork
        },
        { status: 404 }
      );
    }

    const receipt: TransactionReceipt = alchemyData.result;

    // 验证收据数据完整性
    if (!receipt.gasUsed || !receipt.effectiveGasPrice) {
      return NextResponse.json(
        {
          error: '交易收据数据不完整，缺少gas信息'
        },
        { status: 422 }
      );
    }

    console.log(
      `成功获取交易收据: gasUsed=${receipt.gasUsed}, effectiveGasPrice=${receipt.effectiveGasPrice}`
    );

    // 返回完整的收据数据
    return NextResponse.json({
      success: true,
      receipt: receipt
    });
  } catch (error: any) {
    console.error('Gas费API错误:', error?.message || error);
    console.error('错误堆栈:', error?.stack);

    // 提供更详细的错误信息
    const errorMessage = error?.message || String(error);
    const isNetworkError =
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ETIMEDOUT');

    return NextResponse.json(
      {
        error: '获取gas费信息失败',
        details: errorMessage,
        ...(isNetworkError && {
          hint: '可能是网络连接问题，请检查：1) 网络连接 2) ALCHEMY_API_KEY 是否正确 3) Alchemy服务是否可用'
        }),
        ...(process.env.NODE_ENV === 'development' && {
          stack: error?.stack
        })
      },
      { status: 500 }
    );
  }
}

// 支持POST请求（可选，用于更复杂的查询）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionHash, network = 'ethereum' } = body;

    if (!transactionHash) {
      return NextResponse.json(
        { error: '缺少必需的 transactionHash 参数' },
        { status: 400 }
      );
    }

    // 重定向到GET请求处理
    const url = new URL(request.url);
    url.searchParams.set('transactionHash', transactionHash);
    url.searchParams.set('network', network);

    return NextResponse.redirect(url);
  } catch (error: any) {
    console.error('POST请求错误:', error?.message || error);
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}
