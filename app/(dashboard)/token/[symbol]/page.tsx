'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TransactionItem } from './components/TransactionItem';
import { TokenDetailSkeleton } from './components/TokenDetailSkeleton';
import { formatNumber, toDateYMD, toDateTime, fetchErc20Transfers } from './lib/token-utils';
import { useSelectedCelebrity } from '@/hooks/useSelectedCelebrity';
import { useToast } from '@/hooks/use-toast';

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



export default function TokenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const symbol = (params.symbol as string).toUpperCase();
  const chain = (searchParams.get('chain') || 'arbitrum').toLowerCase();
  const { selected, hydrated } = useSelectedCelebrity();
  const { toast } = useToast();

  const walletAddress = useMemo(() => {
    // 首选：本地存储 Hook 中的地址
    const fromHook = (selected as any)?.walletAddress;
    return fromHook
  }, [selected, searchParams]);

  const hasAddress = useMemo(() => {
    return typeof walletAddress === 'string' && walletAddress.startsWith('0x');
  }, [walletAddress]);

  const [items, setItems] = useState<TransactionItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [tokenData, setTokenData] = useState<{thumbnail?: string | null; tokenAddress?: string; amount?: string; usdValue?: string} | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 复制函数
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "复制成功",
        description: "内容已复制到剪贴板",
        variant: "success"
      });
    } catch (err) {
      toast({
        title: "复制失败",
        description: "无法复制内容，请手动复制",
        variant: "destructive"
      });
    }
  };

  // 接收从上一个页面传递的 token 数据
  useEffect(() => {
    const thumbnail = searchParams?.get('thumbnail');
    const tokenAddress = searchParams?.get('tokenAddress');
    const amount = searchParams?.get('amount');
    const usdValue = searchParams?.get('usdValue');
    if (thumbnail || tokenAddress || amount || usdValue) {
      setTokenData({ 
        thumbnail: thumbnail || undefined, 
        tokenAddress: tokenAddress || undefined,
        amount: amount || undefined,
        usdValue: usdValue || undefined
      });
    }
  }, [searchParams]);

  async function fetchPage(nextCursor?: string | null, chainParam: string = chain) {
    const { cursor, list } = await fetchErc20Transfers({
      address: walletAddress,
      chain: chainParam,
      cursor: nextCursor,
      limit: 20,
      order: 'DESC',
      tokenAddress: tokenData?.tokenAddress
    });
    return { cursor, list: list as TransferItemRaw[] };
  }

  function mapToUI(raw: TransferItemRaw[], chainParam: string = chain): TransactionItem[] {
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
      const networkInfo = getNetworkInfo(chainParam);
      
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
        // 确保所有必要数据都已准备好
        if (!hydrated || !hasAddress || !tokenData) {
          if (hydrated && !hasAddress) {
            console.warn('未找到钱包地址');
            setItems([]);
            setCursor(null);
            setHasMore(false);
          }
          setInitialLoading(false);
          return;
        }
        
        setInitialLoading(true);
        let nextCursor: string | null = null;
        const initialPages = 2; // 初次加载页数
        let aggregated: TransactionItem[] = [];
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
  }, [hydrated, hasAddress, tokenData, symbol, chain]);

  // 触底加载更多
  useEffect(() => {
    if (!sentinelRef.current || !hasAddress || !tokenData) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && !loadingMore && hasMore && !initialLoading) {
        setLoadingMore(true);
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
  }, [cursor, hasMore, loadingMore, initialLoading, chain, tokenData, hasAddress]);

  // 骨架屏
  if (!hasAddress) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-500">
        未找到钱包地址
      </div>
    );
  }

  if (initialLoading) {
    return <TokenDetailSkeleton />;
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
        {/* Token 图标和名称 - 紧邻返回按钮 */}
        <div className="flex items-center space-x-2 ml-3">
          {tokenData?.thumbnail ? (
            <img 
              src={tokenData.thumbnail} 
              alt={symbol} 
              className="w-6 h-6 rounded object-cover" 
            />
          ) : (
            <div className="w-6 h-6 bg-gray-500 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">{symbol.charAt(0)}</span>
            </div>
          )}
          <div className="text-sm">
            <div className="text-[#303133] font-medium">{symbol}</div>
            <div className="text-xs text-gray-400">{getNetworkInfo(chain).name}</div>
          </div>
        </div>
      </div>

      {/* 余额显示 */}
      <div className="px-4 sm:mx-6 sm:py-6 py-8">
        <div className="text-3xl font-semibold text-[#012332] mb-2">{tokenData?.amount || '0'}</div>
        <div className="text-sm text-gray-500">{tokenData?.usdValue || '$0'}</div>
      </div>

      {/* 交易历史标题 */}
      <div className="px-3 sm:px-4 py-1 bg-gray-100">
        <h3 className="text-base font-semibold text-black">交易历史</h3>
      </div>

      {/* 交易列表 */}
      <div className="flex-1 overflow-y-auto">
        {items.map((transaction, index) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            showDate={transaction.date !== ''}
            onCopy={copy}
            onClick={() => {
              // 将完整的交易对象数据编码到 URL 参数中
              const transactionData = encodeURIComponent(JSON.stringify(transaction));
              const thumbnailParam = tokenData?.thumbnail ? `&thumbnail=${encodeURIComponent(tokenData.thumbnail)}` : '';
              router.push(`/token/${symbol}/tx/${transaction.id}?data=${transactionData}${thumbnailParam}`);
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


