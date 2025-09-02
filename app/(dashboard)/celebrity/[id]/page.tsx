'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface TokenData {
  symbol: string;
  amount: string;
  value: string;
  change: string;
  usdValue: string;
  isPositive: boolean;
  tokenAddress?: string;
  thumbnail?: string | null;
}

interface MoralisTokenItem {
  symbol: string | null;
  balance_formatted: string | null;
  usd_value: number | null;
  usd_price_24hr_percent_change: number | null;
  token_address?: string;
  thumbnail?: string | null;
}

// DexScreener API 接口定义
interface DexScreenerToken {
  address: string;
  name: string;
  symbol: string;
}

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: DexScreenerToken;
  quoteToken: DexScreenerToken;
  priceUsd: string;
  priceChange: {
    h24?: number;
  };
  volume: {
    h24?: number;
  };
  liquidity: {
    usd: number;
  };
  fdv: number;
  marketCap: number;
  info?: {
    imageUrl?: string;
  };
}

interface DexScreenerSearchResponse {
  pairs: DexScreenerPair[];
}



function formatNumber(value: number | string | null, fractionDigits = 2) {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'string' ? Number(value) : value;
  if (!isFinite(num)) return '0';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits
  });
}

// 获取代币图标颜色
function getTokenIconColor(symbol: string): string {
  const colorMap: Record<string, string> = {
    ETH: 'bg-blue-500',
    ARB: 'bg-gray-800',
    USDT: 'bg-green-500',
    WBTC: 'bg-orange-500',
    AAVE: 'bg-purple-500',
    LINK: 'bg-blue-600',
    BNB: 'bg-yellow-500'
  };
  return colorMap[symbol] || 'bg-gray-500';
}

// 检查是否为地址搜索（0x前缀）
function isValidEthereumAddress(input: string): boolean {
  // 只要以0x开头，就认为用户想搜索地址
  if (!input.startsWith('0x')) return false;
  
  // 检查0x后面是否都是有效的十六进制字符（可以为空）
  const hexPart = input.slice(2);
  
  // 如果只有0x，也当作地址搜索
  if (hexPart.length === 0) return true;
  
  const hexRegex = /^[0-9a-fA-F]+$/;  // 任意长度的十六进制字符
  return hexRegex.test(hexPart);
}

// 头像加载组件（带骨架屏）
function AvatarWithSkeleton({ 
  src, 
  alt, 
  className 
}: { 
  src: string; 
  alt: string; 
  className?: string; 
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* 骨架屏 - 在图片加载时显示 */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full"></div>
      )}
      
      {/* 实际图片 */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover rounded-full transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setIsLoading(false)}
        onError={(e) => {
          setIsLoading(false);
          setHasError(true);
          // 如果IPFS图片加载失败，回退到默认头像
          const target = e.target as HTMLImageElement;
          if (!hasError) {
            target.src = '/me/me1.png';
          }
        }}
      />
    </div>
  );
}

// 防抖Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// DexScreener API搜索
async function searchDexScreener(query: string): Promise<TokenData[]> {
  if (!query.trim()) return [];
  
  try {
    const isContractAddress = isValidEthereumAddress(query);
    let url: string;
    
    if (isContractAddress) {
      // 搜索合约地址
      url = `https://api.dexscreener.com/tokens/v1/arbitrum/${query}`;
    } else {
      // 模糊搜索
      url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('API request failed');
    }
    
    const data: DexScreenerSearchResponse | DexScreenerPair[] = await response.json();
    const pairs = Array.isArray(data) ? data : data.pairs;
    
    if (!pairs || pairs.length === 0) {
      return [];
    }
    
    return pairs.slice(0, 10).map((pair: DexScreenerPair) => {
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

// 流畅的搜索模态框
function SmoothSearchModal({ isOpen, onClose, onTokenClick }: {
  isOpen: boolean;
  onClose: () => void;
  onTokenClick: (token: TokenData) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<TokenData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // 执行搜索
  useEffect(() => {
    let cancelled = false;
    
    async function performSearch() {
      if (!debouncedSearchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      setIsSearching(true);
      
      try {
        const results = await searchDexScreener(debouncedSearchQuery);
        if (!cancelled) {
          setSearchResults(results);
        }
      } catch (error) {
        console.error('搜索错误:', error);
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }
    
    performSearch();
    
    return () => {
      cancelled = true;
    };
  }, [debouncedSearchQuery]);

  // 处理动画显示/隐藏
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      // 关闭时清空搜索内容
      setSearchQuery('');
      setSearchResults([]);
      // 渐现效果关闭时间更短
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-white transition-opacity duration-300 ease-in-out ${
      isOpen ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* 搜索头部 - 带动画 */}
      <div className={`flex items-center px-4 py-3 border-b border-gray-200 transition-opacity duration-200 ${
        isOpen ? 'opacity-100 delay-100' : 'opacity-0 delay-0'
      }`}>
        <div className="flex-1 flex items-center bg-gray-100 rounded-lg px-3 py-2 transition-all duration-200">
          <Search className="w-4 h-4 text-gray-400 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索代币名称或地址"
            className="flex-1 border-0 bg-transparent py-1 text-sm placeholder:text-gray-400 focus:outline-none focus:border-0 focus:ring-0"
            autoFocus={isOpen}
            style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-0 rounded-full hover:bg-gray-200 transition-colors duration-150 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-3 text-sm text-blue-500 font-medium hover:text-blue-600 transition-colors duration-150"
        >
          取消
        </button>
      </div>

      {/* 搜索结果 - 带动画 */}
      <div className={`flex-1 overflow-y-auto transition-opacity duration-250 ${
        isOpen ? 'opacity-100 delay-150' : 'opacity-0 delay-0'
      }`}>
        {isSearching ? (
          <div className="p-4">
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 mr-3" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-3 bg-gray-200 rounded w-24" />
                      <div className="h-3 bg-gray-200 rounded w-8" />
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-32" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {searchResults.map((token, index) => (
              <div
                key={`search-${token.tokenAddress || token.symbol}-${index}`}
                className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 transition-opacity duration-200 ${
                  isOpen ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ 
                  transitionDelay: isOpen ? `${200 + index * 50}ms` : '0ms'
                }}
                onClick={() => onTokenClick(token)}
              >
                {/* 代币图标 */}
                <div className="mr-3 flex-shrink-0 relative">
                  {token.thumbnail ? (
                    <img
                      src={token.thumbnail}
                      alt={token.symbol}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTokenIconColor(token.symbol)}`}>
                      <span className="text-white text-xs font-bold">{token.symbol}</span>
                    </div>
                  )}
                </div>

                {/* 代币信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-base font-medium text-gray-900">
                        {token.symbol}
                      </span>
                      <span className="text-sm text-gray-500 truncate">
                        {token.tokenAddress?.slice(0, 10)}...{token.tokenAddress?.slice(-8)}
                      </span>
                    </div>
                    <button 
                      className="w-4 h-4 rounded-full border border-blue-500 flex items-center justify-center hover:bg-blue-50 transition-colors duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTokenClick(token);
                      }}
                    >
                      <span className="text-blue-500 text-sm font-bold">+</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center py-20 transition-opacity duration-300 ${
            isOpen ? 'opacity-100 delay-200' : 'opacity-0 delay-0'
          }`}>
            <Search className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-sm">
              {searchQuery ? '未找到相关代币' : '请输入搜索内容'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CelebrityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tokensData, setTokensData] = useState<TokenData[]>([]);
  const [netWorthData, setNetWorthData] = useState<{
    total: number;
    change24h: number | null;
    loading: boolean;
  }>({ total: 0, change24h: null, loading: true });
  const [loading, setLoading] = useState<boolean>(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 从URL参数获取名字、头像和钱包地址
  const celebrityName = searchParams.get('name') || 'Vitalik';
  const celebrityAvatar = searchParams.get('avatar') || '/me/me2.png';
  const passedWalletAddress = searchParams.get('address');

  const walletAddress = useMemo(() => {
    // 优先使用传递过来的钱包地址
    if (passedWalletAddress && passedWalletAddress.startsWith('0x')) {
      return passedWalletAddress;
    }
    
    // 回退到从ID解析
    const id = params?.id as string | undefined;
    if (id && id.startsWith('0x') && id.length >= 10) return id;
    return undefined;
  }, [params, passedWalletAddress]);

  useEffect(() => {
    let aborted = false;
    
    async function loadTokens() {
      try {
        setLoading(true);
        const address = walletAddress 
        const res = await fetch(`/api/moralis?address=${encodeURIComponent(address || '')}&chain=eth`, {
          cache: 'no-store'
        });
        if (!res.ok) {
          setTokensData([]);
          return;
        }
        const json = await res.json();
        const list: MoralisTokenItem[] = Array.isArray(json?.result) ? json.result : [];
        if (aborted) return;
        const mapped: TokenData[] = list.map((item) => {
          const pct = item.usd_price_24hr_percent_change ?? 0;
          const isPositive = pct >= 0;
          return {
            symbol: (item.symbol || 'UNKNOWN').toUpperCase(),
            amount: item.balance_formatted ? String(item.balance_formatted) : '0',
            value: formatNumber(item.usd_value ?? 0),
            change: `${pct >= 0 ? '+' : ''}${formatNumber(Math.abs(pct), 2)}%`,
            usdValue: `$${formatNumber(item.usd_value ?? 0)}`,
            isPositive,
            tokenAddress: item.token_address,
            thumbnail: item.thumbnail || null
          };
        });
        setTokensData(mapped);
      } catch (e) {
        setTokensData([]);
      } finally {
        setLoading(false);
      }
    }

    async function loadNetWorth() {
      try {
        setNetWorthData(prev => ({ ...prev, loading: true }));
        const address = walletAddress;
        
        if (!address) {
          console.error('❌ 钱包地址为空，无法获取净资产');
          setNetWorthData({ total: 0, change24h: null, loading: false });
          return;
        }
        
        // console.log('🔍 开始获取净资产数据，地址:', address);
        
        const res = await fetch(`/api/moralis/net-worth?address=${encodeURIComponent(address)}`, {
          cache: 'no-store'
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const errorMessage = errorData.error || `HTTP ${res.status}: ${res.statusText}`;
          console.error('❌ 净资产API调用失败:', {
            status: res.status,
            statusText: res.statusText,
            error: errorMessage
          });
          setNetWorthData({ total: 0, change24h: null, loading: false });
          return;
        }
        
        const data = await res.json();
        // console.log('✅ 净资产数据获取成功:', data);
        
        if (aborted) return;
        
        // 检查数据完整性
        if (!data || typeof data.total_networth_usd === 'undefined') {
          console.error('❌ 净资产数据格式错误:', data);
          setNetWorthData({ total: 0, change24h: null, loading: false });
          return;
        }
        
        const totalNetWorth = parseFloat(data.total_networth_usd || '0');
        const change24h = data.total_networth_usd_24hr_percent_change;
        
        setNetWorthData({
          total: isNaN(totalNetWorth) ? 0 : totalNetWorth,
          change24h: change24h,
          loading: false
        });
        
      } catch (e: any) {
        const errorMessage = e?.message || '未知错误';
        console.error('💥 净资产数据获取错误:', {
          error: errorMessage,
          stack: e?.stack
        });
        setNetWorthData({ total: 0, change24h: null, loading: false });
      }
    }

    // 并行加载代币和净资产数据
    Promise.all([loadTokens(), loadNetWorth()]);
    
    return () => {
      aborted = true;
    };
  }, [walletAddress]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部导航栏 */}
      <div className="flex justify-between items-center py-3 px-4 bg-white border-gray-100">
        <Link href="/contacts">
          <Button variant="ghost" size="sm" className="p-2 flex items-center justify-center">
            <img src="/contacts/arrow_left.png" alt="" className="h-4 object-cover" />
          </Button>
        </Link>

        <h1 className="text-base font-medium text-gray-900">观察钱包</h1>

        <div className="flex items-center space-x-3 w-5"></div>
      </div>

      {/* 头像和资产信息区域 */}
      <div className="flex flex-col items-center py-6 px-4 bg-white border-gray-100">
        {/* 头像 */}
        <div className="relative mb-2">
          <AvatarWithSkeleton
            src={celebrityAvatar}
            alt={celebrityName}
            className="w-16 h-16 rounded-full overflow-hidden"
          />
          {/* 认证徽章 */}
          <div className="absolute -bottom-1 right-1">
            <img
              src="/contacts/badge.png"
              alt="认证徽章"
              className="w-4 h-4"
            />
          </div>
        </div>

        {/* 名字 */}
        <h2 className="text-base font-medium text-gray-900 mb-3">{celebrityName}</h2>

        {/* 总资产 */}
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {netWorthData.loading ? (
            <div className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] h-9 w-48 rounded"></div>
          ) : (
            <div className="flex items-center">
              <span>${formatNumber(netWorthData.total)}</span>
              {/* {netWorthData.change24h !== null && (
                <span className={`ml-2 text-lg ${netWorthData.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({netWorthData.change24h >= 0 ? '+' : ''}{formatNumber(netWorthData.change24h, 2)}%)
                </span>
                这是增长百分比
              )} */}
            </div>
          )}
        </div>
      </div>

      {/* 代币信息 */}
      <div className="flex justify-between items-center text-sm text-gray-500 space-x-4 px-3 py-3 bg-[#f6f6f6]">
        <div className="flex items-baseline">
          <span>代币</span>
          <span className="text-black pl-2">
            {netWorthData.loading ? (
              <span className="inline-block bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] h-4 w-24 rounded align-baseline translate-y-0.5"></span>
            ) : (
              `$${formatNumber(netWorthData.total)}`
            )}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            className="w-4 h-4 flex items-center justify-center transition-transform duration-150 hover:scale-110 active:scale-95"
            onClick={() => setIsSearchOpen(true)}
          >
            <img className="w-4 h-4" src="/contacts/search.png" alt="搜索" />
          </button>
          <img className="w-4 h-4" src="/contacts/set.png" alt="" />
          <img className="w-4 h-4" src="/contacts/add.png" alt="" />
        </div>
      </div>

      {/* 代币列表 */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loading && (
          <div className="p-4">
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center px-0 py-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-200 mr-3" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-3 bg-gray-200 rounded w-24" />
                      <div className="h-3 bg-gray-200 rounded w-20" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-3 bg-gray-200 rounded w-28" />
                      <div className="h-3 bg-gray-200 rounded w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="h-full flex items-center justify-center py-4">
              <div className="flex items-center space-x-2 text-gray-400 text-xs">
                <div className="h-3 w-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                <span>加载中...</span>
              </div>
            </div>
          </div>
        )}
        {tokensData.map((token, index) => (
          <TokenListItem
            key={`main-${token.tokenAddress || token.symbol}-${index}`}
            token={token}
            isLast={index === tokensData.length - 1}
            onClick={() => router.push(`/token/${token.symbol}`)}
          />
        ))}
        {(!loading && tokensData.length === 0) && (
          <div className="h-full flex items-center justify-center py-12">
            <div className="text-gray-500 text-sm">暂无数据</div>
          </div>
        )}
      </div>

      {/* 搜索模态框 */}
      <SmoothSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onTokenClick={(token) => {
          setIsSearchOpen(false);
          // 不跳转，只关闭搜索框
        }}
      />
    </div>
  );
}

// 代币列表项组件
function TokenListItem({
  token,
  isLast,
  onClick
}: {
  token: TokenData;
  isLast?: boolean;
  onClick?: () => void;
}) {
  // 获取代币图标背景色
  const getTokenIcon = (symbol: string) => {
    const iconConfig: Record<string, { bg: string }> = {
      USDT: { bg: 'bg-green-500' },
      WBTC: { bg: 'bg-orange-500' },
      ETH: { bg: 'bg-blue-500' },
      BNB: { bg: 'bg-yellow-500' },
      AAVE: { bg: 'bg-purple-500' },
      LINK: { bg: 'bg-blue-600' },
      ARB: { bg: 'bg-gray-800' }
    };
    return iconConfig[symbol] || { bg: 'bg-gray-500' };
  };

  const iconConfig = getTokenIcon(token.symbol);

  return (
    <div className="bg-white">
      <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={onClick}>
        {/* 代币图标 */}
        <div className="mr-3 flex-shrink-0 relative">
          {token.thumbnail ? (
            <img
              src={token.thumbnail}
              alt={token.symbol}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-lg ${iconConfig.bg} flex items-center justify-center`}
            >
              <span className="text-white text-xs font-bold">{token.symbol}</span>
            </div>
          )}
        </div>

        {/* 代币信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            {/* 代币符号和涨跌幅 */}
            <div className="flex items-center">
              <span className="text-base font-medium text-gray-900 mr-2">
                {token.symbol}
              </span>
            </div>

            {/* 数量 */}
            <div className="text-base font-medium text-gray-900">
              {token.value}
            </div>
          </div>

          {/* 底部信息 */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 ">{token.amount}
            {token.change  && (
                <span
                  className={`text-xs pl-1 ${
                    token.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {token.change}
                </span>
              )}
            </span>
            <span className="text-xs text-gray-500">{token.usdValue}</span>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      {!isLast && (
        <div className="mx-4">
          <div className="border-t border-gray-300"></div>
        </div>
      )}
    </div>
  );
}