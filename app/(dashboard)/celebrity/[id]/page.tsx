'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useMoralisChain } from '@/hooks/use-moralis-chain';
import { AvatarWithSkeleton } from './components/AvatarWithSkeleton';
import { TokenListItem } from './components/TokenListItem';
import { NetWorthDisplay } from './components/NetWorthDisplay';
import { TokenListHeader } from './components/TokenListHeader';
import { SmoothSearchModal } from './components/SmoothSearchModal';
import { searchDexScreener } from './lib/celebrity-utils';

interface TokenData {
  symbol: string;
  amount: string;
  value: string;
  change: string;
  usdValue: string;
  priceUsd: string;
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

export default function CelebrityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 获取当前连接的钱包链信息
  const { moralisChain, dexScreenerChain } = useMoralisChain();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 从URL参数获取名字、头像和钱包地址
  const celebrityName = searchParams.get('name') || '';
  const celebrityAvatar = searchParams.get('avatar') || '/me/default.jpg';
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

  const tokensQuery = useQuery({
    queryKey: ['wallet-tokens', walletAddress, moralisChain],
    enabled: Boolean(walletAddress),
    queryFn: async () => {
      const res = await fetch(`/api/moralis?address=${encodeURIComponent(walletAddress || '')}&chain=${moralisChain}`, {
        cache: 'no-store'
      });
      if (!res.ok) return { result: [] };
      return res.json();
    },
    select: (json: any) => {
      const list: MoralisTokenItem[] = Array.isArray(json?.result) ? json.result : [];
      const mapped: TokenData[] = list.map((item) => {
        const pct = item.usd_price_24hr_percent_change ?? 0;
        const isPositive = pct >= 0;
        const amountNum = Number(item.balance_formatted || 0);
        const totalUsd = item.usd_value ?? 0;
        const price = amountNum > 0 ? totalUsd / amountNum : 0;
        return {
          symbol: (item.symbol || 'UNKNOWN').toUpperCase(),
          amount: item.balance_formatted ? String(item.balance_formatted) : '0',
          value: formatNumber(item.usd_value ?? 0),
          change: `${pct >= 0 ? '+' : ''}${formatNumber(Math.abs(pct), 2)}%`,
          usdValue: `$${formatNumber(item.usd_value ?? 0)}`,
          priceUsd: `$${formatNumber(price)}`,
          isPositive,
          tokenAddress: item.token_address,
          thumbnail: item.thumbnail || null
        };
      });
      return mapped;
    }
  });

  const netWorthQuery = useQuery({
    queryKey: ['wallet-net-worth', walletAddress, moralisChain],
    enabled: Boolean(walletAddress),
    queryFn: async () => {
      const res = await fetch(`/api/moralis/net-worth?address=${encodeURIComponent(walletAddress || '')}&chain=${moralisChain}`, {
        cache: 'no-store'
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || typeof data.total_networth_usd === 'undefined') return null;
      const totalNetWorth = parseFloat(data.total_networth_usd || '0');
      const change24h = data.total_networth_usd_24hr_percent_change;
      return {
        total: isNaN(totalNetWorth) ? 0 : totalNetWorth,
        change24h: change24h
      } as { total: number; change24h: number | null };
    }
  });

  // 格式化数字函数
  function formatNumber(value: number | string | null, fractionDigits = 2) {
    if (value === null || value === undefined) return '0';
    const num = typeof value === 'string' ? Number(value) : value;
    if (!isFinite(num)) return '0';
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits
    });
  }

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
        <NetWorthDisplay
          total={netWorthQuery.data?.total || 0}
          change24h={netWorthQuery.data?.change24h ?? null}
          loading={netWorthQuery.isLoading}
        />
      </div>

      {/* 代币信息头部 */}
      <TokenListHeader
        total={netWorthQuery.data?.total || 0}
        loading={netWorthQuery.isLoading}
        onSearchClick={() => setIsSearchOpen(true)}
      />

      {/* 代币列表 */}
      <div className="flex-1 overflow-y-auto bg-white">
        {tokensQuery.isLoading && (
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
        {(tokensQuery.data || []).map((token, index) => (
          <TokenListItem
            key={`main-${token.tokenAddress || token.symbol}-${index}`}
            token={token}
            isLast={index === (tokensQuery.data || []).length - 1}
            onClick={() => router.push(`/token/${token.symbol}`)}
          />
        ))}
        {(!tokensQuery.isLoading && (tokensQuery.data || []).length === 0) && (
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
        dexScreenerChain={dexScreenerChain}
        onSearch={searchDexScreener}
      />
    </div>
  );
}