import { NextRequest, NextResponse } from "next/server";
import { TransactionReceipt } from "@/lib/types/alchemy";

export const dynamic = 'force-dynamic';

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// 网络映射 - 支持的区块链网络
const NETWORK_MAPPING: Record<string, string> = {
  'ethereum': 'eth-mainnet',
  'arbitrum': 'arb-mainnet',
  'polygon': 'polygon-mainnet',
  'bsc': 'bsc-mainnet',
  'optimism': 'opt-mainnet',
  'avalanche': 'avax-mainnet',
  'fantom': 'fantom-mainnet',
  'cronos': 'cronos-mainnet',
  'gnosis': 'gnosis-mainnet',
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
    const network = searchParams.get('network') || 'ethereum';

    if (!transactionHash) {
      return NextResponse.json({ error: '缺少必需的 transactionHash 参数' }, { status: 400 });
    }

    // 验证交易哈希格式
    if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      return NextResponse.json({ error: '无效的交易哈希格式' }, { status: 400 });
    }

    // 获取Alchemy网络名称
    const alchemyNetwork = NETWORK_MAPPING[network.toLowerCase()];
    if (!alchemyNetwork) {
      return NextResponse.json({
        error: `不支持的网络: ${network}。支持的网络: ${Object.keys(NETWORK_MAPPING).join(', ')}`
      }, { status: 400 });
    }

    // 构建Alchemy API URL
    const alchemyUrl = `https://${alchemyNetwork}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

    // 构建请求体
    const requestBody = {
      jsonrpc: "2.0",
      method: "eth_getTransactionReceipt",
      params: [transactionHash],
      id: 1
    };

    console.log(`正在获取交易收据: ${transactionHash} 在网络 ${network}`);

    // 调用Alchemy API
    const alchemyResponse = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store'
    });

    const alchemyData = await alchemyResponse.json();

    // 检查Alchemy API响应
    if (!alchemyResponse.ok) {
      console.error('Alchemy API错误:', alchemyData);
      return NextResponse.json({
        error: `Alchemy API错误: ${alchemyData?.error?.message || '未知错误'}`
      }, { status: alchemyResponse.status });
    }

    // 检查交易是否存在
    if (!alchemyData.result) {
      return NextResponse.json({
        error: '未找到交易收据，可能交易不存在或正在确认中'
      }, { status: 404 });
    }

    const receipt: TransactionReceipt = alchemyData.result;

    // 验证收据数据完整性
    if (!receipt.gasUsed || !receipt.effectiveGasPrice) {
      return NextResponse.json({
        error: '交易收据数据不完整，缺少gas信息'
      }, { status: 422 });
    }

    console.log(`成功获取交易收据: gasUsed=${receipt.gasUsed}, effectiveGasPrice=${receipt.effectiveGasPrice}`);

    // 返回完整的收据数据
    return NextResponse.json({
      success: true,
      receipt: receipt
    });

  } catch (error: any) {
    console.error('Gas费API错误:', error?.message || error);
    return NextResponse.json({
      error: '获取gas费信息失败，请稍后重试'
    }, { status: 500 });
  }
}

// 支持POST请求（可选，用于更复杂的查询）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionHash, network = 'ethereum' } = body;

    if (!transactionHash) {
      return NextResponse.json({ error: '缺少必需的 transactionHash 参数' }, { status: 400 });
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
