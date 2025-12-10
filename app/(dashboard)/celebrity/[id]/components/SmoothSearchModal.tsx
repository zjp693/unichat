'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

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

interface SmoothSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenClick: (token: TokenData) => void;
  dexScreenerChain: string;
  onSearch: (query: string, chain: string) => Promise<TokenData[]>;
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

export function SmoothSearchModal({
  isOpen,
  onClose,
  onTokenClick,
  dexScreenerChain,
  onSearch
}: SmoothSearchModalProps) {
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
        const results = await onSearch(debouncedSearchQuery, dexScreenerChain);
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
  }, [debouncedSearchQuery, dexScreenerChain, onSearch]);

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
    <div
      className={`fixed inset-0 z-50 bg-white transition-opacity duration-300 ease-in-out ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* 搜索头部 - 带动画 */}
      <div
        className={`flex items-center px-4 py-3 border-b border-gray-200 transition-opacity duration-200 ${
          isOpen ? 'opacity-100 delay-100' : 'opacity-0 delay-0'
        }`}
      >
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
      <div
        className={`flex-1 overflow-y-auto transition-opacity duration-250 ${
          isOpen ? 'opacity-100 delay-150' : 'opacity-0 delay-0'
        }`}
      >
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
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${getTokenIconColor(token.symbol)}`}
                    >
                      <span className="text-white text-xs font-bold">
                        {token.symbol}
                      </span>
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
                        {token.tokenAddress?.slice(0, 10)}...
                        {token.tokenAddress?.slice(-8)}
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
          <div
            className={`flex flex-col items-center justify-center py-20 transition-opacity duration-300 ${
              isOpen ? 'opacity-100 delay-200' : 'opacity-0 delay-0'
            }`}
          >
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
