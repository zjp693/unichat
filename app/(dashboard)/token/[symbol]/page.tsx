'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TransferItemRaw {
  transaction_hash?: string;
  block_timestamp?: string;
  from_address?: string;
  to_address?: string;
  value?: string;
  value_decimal?: string;
  value_formatted?: string;
  symbol?: string;
  address?: string; // token address
}

interface TransactionItem {
  id: string;
  date: string;
  amount: string;
  usdtAmount: string;
  isPositive: boolean;
  fromAddress: string;
  toAddress: string;
  timestamp: string;
  hasDropdown: boolean;
  transactionHash: string; // 添加真实的交易哈希
  network: string; // 添加网络信息
  usdValue: string; // 添加USD价值
  networkIcon: string; // 添加网络图标路径
}

function formatNumber(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function toDateYMD(ts?: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function toDateTime(ts?: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  const hh = `${d.getHours()}`.padStart(2, '0');
  const mm = `${d.getMinutes()}`.padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export default function TokenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const symbol = (params.symbol as string).toUpperCase();

  const walletAddress = useMemo(() => {
    const a = searchParams?.get('address');
    if (a && a.startsWith('0x')) return a;
    // 默认示例地址（可替换）
    return '0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326';
  }, [searchParams]);

  const [items, setItems] = useState<TransactionItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  async function fetchPage(nextCursor?: string | null, chain: string = 'eth') {
    const url = new URL(`/api/moralis/transfers`, window.location.origin);
    url.searchParams.set('address', walletAddress);
    url.searchParams.set('chain', chain);
    if (nextCursor) url.searchParams.set('cursor', nextCursor);
    url.searchParams.set('limit', '100');

    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return { cursor: null as string | null, list: [] as TransferItemRaw[] };
    const json = await res.json();
    const list = Array.isArray(json?.result) ? (json.result as TransferItemRaw[]) : [];
    const cur = json?.cursor ?? null;
    return { cursor: cur, list };
  }

  function mapToUI(raw: TransferItemRaw[], chain: string = 'eth'): TransactionItem[] {
    const out: TransactionItem[] = [];
    let lastDate = items.length > 0 ? items[items.length - 1].date : '';
    for (const r of raw) {
      const txSymbol = (r.symbol || '').toUpperCase();
      if (txSymbol && txSymbol !== symbol) continue;
      const my = walletAddress.toLowerCase();
      const from = (r.from_address || '').toLowerCase();
      const to = (r.to_address || '').toLowerCase();
      const positive = to === my && from !== my;
      const negative = from === my && to !== my;
      const signed = positive ? '+' : negative ? '-' : '';

      const valueStr = r.value_decimal || r.value_formatted || '0';
      const amountAbs = Number(valueStr || '0');
      const amountText = `${signed}$ ${formatNumber(amountAbs)}`;
      const usdtText = `${signed} ${symbol} ${formatNumber(amountAbs)}`;

      const date = toDateYMD(r.block_timestamp);
      const showDate = date !== lastDate;
      if (showDate) lastDate = date;

      // 根据当前链设置网络信息和图标
      const networkInfo = getNetworkInfo(chain);
      
      // 计算USD价值（这里使用简单的1:1比例，实际应该从API获取汇率）
      const usdValue = `$${formatNumber(amountAbs)}`;

      out.push({
        id: (r.transaction_hash || '') + '-' + out.length,
        date: showDate ? date : '',
        amount: amountText,
        usdtAmount: usdtText,
        isPositive: positive,
        fromAddress: r.from_address || '',
        toAddress: r.to_address || '',
        timestamp: toDateTime(r.block_timestamp),
        hasDropdown: true,
        transactionHash: r.transaction_hash || '',
        network: networkInfo.name,
        usdValue: usdValue,
        networkIcon: networkInfo.icon
      });
    }
    return out;
  }

  // 根据chain参数获取网络信息
  function getNetworkInfo(chain: string) {
    switch (chain.toLowerCase()) {
      case 'eth':
      case 'ethereum':
        return { name: 'Ethereum', icon: '/discover/chain.png' }; // 使用通用链图标
      case 'arbitrum':
      case 'arbitrum_one':
        return { name: 'Arbitrum', icon: '/discover/arbitrum.png' };
      case 'polygon':
        return { name: 'Polygon', icon: '/discover/chain.png' }; // 使用通用链图标
      case 'bsc':
      case 'binance':
        return { name: 'BSC', icon: '/top/bnb.png' };
      default:
        return { name: 'Ethereum', icon: '/discover/chain.png' }; // 使用通用链图标
    }
  }

  // 初始加载最近 N 页
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setInitialLoading(true);
        let nextCursor: string | null = null;
        const initialPages = 2; // 初次加载页数
        let aggregated: TransactionItem[] = [];
        const chain = 'arbitrum'; // 可以根据需要修改为不同的网络
        for (let i = 0; i < initialPages; i++) {
          const { cursor: c, list } = await fetchPage(nextCursor, chain);
          aggregated = aggregated.concat(mapToUI(list, chain));
          nextCursor = c;
          if (!nextCursor) break;
        }
        if (aborted) return;
        setItems(aggregated);
        setCursor(nextCursor);
        setHasMore(Boolean(nextCursor));
      } finally {
        if (!aborted) setInitialLoading(false);
      }
    })();
    return () => { aborted = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, symbol]);

  // 触底加载更多
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && !loadingMore && hasMore && !initialLoading) {
        setLoadingMore(true);
        const chain = 'arbitrum'; // 与初始加载保持一致
        fetchPage(cursor, chain).then(({ cursor: c, list }) => {
          const mapped = mapToUI(list, chain);
          setItems((prev) => prev.concat(mapped));
          setCursor(c);
          setHasMore(Boolean(c));
        }).finally(() => setLoadingMore(false));
      }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, hasMore, loadingMore, initialLoading]);

  // 骨架屏
  if (initialLoading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center px-4 py-4 bg-white">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 flex items-center justify-center"
            onClick={() => router.back()}
          >
            <img src="/contacts/arrow_left.png" alt="" className="h-4 object-cover" />
          </Button>
          <div className="flex items-center space-x-2 ml-3">
            <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
            <div className="text-sm">
              <div className="h-4 bg-gray-200 rounded w-12 animate-pulse mb-1"></div>
              <div className="h-3 bg-gray-100 rounded w-16 animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="px-6 py-8">
          <div className="h-8 bg-gray-200 rounded w-40 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-32 animate-pulse" />
        </div>

        <div className="px-6 py-1 bg-gray-100">
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-4 bg-gray-200 rounded w-28" />
                    <div className="h-4 bg-gray-200 rounded w-24" />
                  </div>
                  <div className="h-3 bg-gray-100 rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部导航栏 */}
      <div className="flex items-center px-4 py-4 bg-white">
        <Button
          variant="ghost"
          size="sm"
          className="p-2 flex items-center justify-center"
          onClick={() => router.back()}
        >
          <img src="/contacts/arrow_left.png" alt="" className="h-4 object-cover" />
        </Button>
        {/* USDT 图标和名称 - 紧邻返回按钮 */}
        <div className="flex items-center space-x-2 ml-3">
          <div className="w-6 h-6 bg-[#26a37b] rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <div className="text-sm">
            <div className="text-[#303133] font-medium">{symbol}</div>
            <div className="text-xs text-gray-400">Arbitrum</div>
          </div>
        </div>
      </div>

      {/* 余额显示 */}
      <div className="px-6 py-8">
        <div className="text-3xl font-semibold text-[#012332] mb-2">202,081,514</div>
        <div className="text-sm text-gray-500">$202,081,514</div>
      </div>

      {/* 交易历史标题 */}
      <div className="px-6 py-1 bg-gray-100">
        <h3 className="text-base font-semibold text-black">交易历史</h3>
      </div>

      {/* 交易列表 */}
      <div className="flex-1 overflow-y-auto">
        {items.map((transaction, index) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            showDate={transaction.date !== ''}
            onClick={() => {
              // 将完整的交易对象数据编码到 URL 参数中
              const transactionData = encodeURIComponent(JSON.stringify(transaction));
              router.push(`/token/${symbol}/tx/${transaction.id}?data=${transactionData}`);
            }}
          />
        ))}
        {items.length === 0 && (
          <div className="h-full flex items-center justify-center py-12">
            <div className="text-gray-500 text-sm">暂无数据</div>
          </div>
        )}
        <div ref={sentinelRef} />
        {loadingMore && (
          <div className="flex items-center justify-center py-4 text-gray-400 text-xs">
            <div className="h-3 w-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mr-2" />
            加载更多...
          </div>
        )}
        {!hasMore && items.length > 0 && (
          <div className="flex items-center justify-center py-4 text-gray-400 text-xs">没有更多了</div>
        )}
      </div>
    </div>
  );
}

// 交易记录项组件
function TransactionItem({
  transaction,
  showDate,
  onClick
}: {
  transaction: TransactionItem;
  showDate: boolean;
  onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={onClick ? 'cursor-pointer' : undefined}>
      {/* 日期分组头 */}
      {showDate && (
        <div className="px-6 py-3 bg-white border-b border-gray-100">
          <div className="text-sm font-medium text-black">
            {transaction.date}
          </div>
        </div>
      )}

      {/* 交易项 */}
      <div className="px-6 py-4 bg-white">
        <div className="flex items-center justify-between">
          {/* 左侧金额信息 */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className={`text-base font-semibold text-[#303133]`}>
                {transaction.amount}
              </span>
              {transaction.hasDropdown && (
                <Check className="h-4 w-4 text-[#0B8A64]" />
              )}
            </div>
            <span
              className={`text-sm bg-gray-100 px-2 py-1 rounded-sm font-semibold ${
                transaction.isPositive ? 'text-[#0B8A64]' : 'text-[#303133]'
              }`}
            >
              {transaction.usdtAmount}
            </span>

            {/* 地址信息 */}
            {transaction.fromAddress && (
              <div className="mt-2 text-xs text-gray-400 space-y-1.5">
                {transaction.isPositive ? (
                  <>
                    <div className="">
                      <span className="text-[#606266] text-sm">To</span>{' '}
                      <span
                        className={`text-xs ${
                          transaction.isPositive ? 'text-[#0B8A64]' : 'text-[#303133]'
                        }`}
                      >
                        {transaction.toAddress}
                      </span>
                      <img
                        src="/contacts/copy.svg"
                        alt="Copy address"
                        className="inline-block w-3.5 h-3.5 ml-1 cursor-pointer opacity-70 hover:opacity-100 align-[-2px]"
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(transaction.toAddress); }}
                      />
                    </div>
                    <div className="">
                      <span className="text-[#606266] text-sm">From</span>{' '}
                      <span className="text-xs">{transaction.fromAddress}</span>
                      <img
                        src="/contacts/copy.svg"
                        alt="Copy address"
                        className="inline-block w-3.5 h-3.5 ml-1 cursor-pointer opacity-70 hover:opacity-100 align-[-2px]"
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(transaction.fromAddress); }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="">
                      <span className="text-[#606266] text-sm">From</span>{' '}
                      <span className="text-xs">{transaction.fromAddress}</span>
                      <img
                        src="/contacts/copy.svg"
                        alt="Copy address"
                        className="inline-block w-3.5 h-3.5 ml-1 cursor-pointer opacity-70 hover:opacity-100 align-[-2px]"
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(transaction.fromAddress); }}
                      />
                    </div>
                    <div className="">
                      <span className="text-[#606266] text-sm">To</span>{' '}
                      <span className="text-xs text-[#303133]">{transaction.toAddress}</span>
                      <img
                        src="/contacts/copy.svg"
                        alt="Copy address"
                        className="inline-block w-3.5 h-3.5 ml-1 cursor-pointer opacity-70 hover:opacity-100 align-[-2px]"
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(transaction.toAddress); }}
                      />
                    </div>
                  </>
                )}
                <div>{transaction.timestamp}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
