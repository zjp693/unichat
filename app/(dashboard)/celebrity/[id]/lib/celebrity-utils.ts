// 检查是否为地址搜索（0x前缀）
export function isValidEthereumAddress(input: string): boolean {
  // 只要以0x开头，就认为用户想搜索地址
  if (!input.startsWith('0x')) return false;
  
  // 检查0x后面是否都是有效的十六进制字符（可以为空）
  const hexPart = input.slice(2);
  
  // 如果只有0x，也当作地址搜索
  if (hexPart.length === 0) return true;
  
  const hexRegex = /^[0-9a-fA-F]+$/;  // 任意长度的十六进制字符
  return hexRegex.test(hexPart);
}

// 格式化数字
// 从全局工具库导入
export { formatNumber } from '@/lib/utils';

// DexScreener API搜索
export async function searchDexScreener(query: string, dexScreenerChain: string): Promise<any[]> {
  if (!query.trim()) return [];
  
  try {
    const isContractAddress = isValidEthereumAddress(query);
    let url: string;
    
    if (isContractAddress) {
      // 搜索合约地址 - 使用动态链
      url = `https://api.dexscreener.com/tokens/v1/${dexScreenerChain}/${query}`;
    } else {
      // 模糊搜索
      url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('API request failed');
    }
    
    const data = await response.json();
    const pairs = Array.isArray(data) ? data : data.pairs;
    
    if (!pairs || pairs.length === 0) {
      return [];
    }
    
    return pairs.slice(0, 10).map((pair: any) => {
      const priceChange24h = pair.priceChange?.h24 || 0;
      const isPositive = priceChange24h >= 0;
      const volume24h = pair.volume?.h24 || 0;
      const marketCap = pair.marketCap || pair.fdv || 0;
      const priceUsd = parseFloat(pair.priceUsd) || 0;
      
      return {
        symbol: pair.baseToken.symbol || 'UNKNOWN',
        amount: `Vol: ${formatNumber(volume24h)}`,
        value: formatNumber(marketCap),
        change: `${isPositive ? '+' : ''}${formatNumber(Math.abs(priceChange24h), 2)}%`,
        usdValue: `$${formatNumber(priceUsd, 6)}`,
        isPositive,
        tokenAddress: pair.baseToken.address,
        thumbnail: pair.info?.imageUrl || null
      };
    });
  } catch (error) {
    console.error('DexScreener搜索失败:', error);
    // API失败时返回空数组
    return [];
  }
}
