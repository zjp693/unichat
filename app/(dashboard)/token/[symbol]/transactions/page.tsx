'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from 'wagmi';
import { TransactionItem } from './components/TransactionItem';
import { TransactionsSkeleton } from './components/TransactionsSkeleton';
import { ContactSummaryCard } from './components/ContactSummaryCard';
import { FilterTabs } from './components/FilterTabs';
import {
  formatAddress,
  fetchTransactions,
  fetchContactSummary
} from './lib/transactions-utils';

// 从外部导入接口类型
import type {
  TransactionRecord,
  ContactSummary,
  Cursor
} from './lib/transactions-utils';

export default function TransactionsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const symbol = (params.symbol as string)?.toUpperCase();
  const { toast } = useToast();
  const { address: currentAddress, isConnected } = useAccount();

  // 跳转至交易详情
  const gotoTxDetail = (tx: TransactionRecord) => {
    const data = encodeURIComponent(
      JSON.stringify({
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        usdtAmount: tx.usdValue,
        isPositive: tx.isPositive,
        fromAddress: tx.fromAddress,
        toAddress: tx.toAddress,
        timestamp: tx.timestamp,
        hasDropdown: false,
        transactionHash: tx.transactionHash,
        network: tx.network,
        usdValue: tx.usdValue,
        networkIcon: tx.networkIcon
      })
    );
    router.push(`/token/${symbol}/tx/${tx.id}?data=${data}`);
  };

  // 从URL参数获取联系人信息
  const contactName = searchParams.get('contact') || 'Unknown';
  const contactAddress = searchParams.get('address') || '';

  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>(
    'all'
  );
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [contactSummary, setContactSummary] = useState<ContactSummary | null>(
    null
  );
  const [loading, setLoading] = useState(true); // 首次加载全页骨架屏
  const [loadingTransactions, setLoadingTransactions] = useState(false); // 列表加载状态
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<Cursor | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 首次加载：获取联系人摘要（只加载一次）
  useEffect(() => {
    const loadSummary = async () => {
      if (!isConnected || !currentAddress || !contactAddress) {
        setLoading(false);
        return;
      }

      try {
        const summaryData = await fetchContactSummary(
          contactName,
          contactAddress,
          currentAddress as string
        );
        setContactSummary(summaryData);
      } catch (error) {
        console.error('加载联系人摘要失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [toast, contactName, contactAddress, currentAddress, isConnected]);

  // 加载交易记录列表（首次加载或切换筛选时）
  useEffect(() => {
    const loadTransactions = async () => {
      // 检查必要参数
      if (!isConnected || !currentAddress || !contactAddress) {
        return;
      }

      try {
        setLoadingTransactions(true);
        // 重置状态
        setTransactions([]);
        setHasMore(false);
        setNextCursor(null);

        const transactionsResult = await fetchTransactions(
          contactName,
          contactAddress,
          currentAddress as string,
          activeTab
        );

        setTransactions(transactionsResult.transactions);
        setHasMore(transactionsResult.hasMore);
        setNextCursor(transactionsResult.nextCursor);
      } catch (error) {
        console.error('加载交易记录失败:', error);
        toast({
          title: '加载失败',
          description: '无法加载交易记录，请重试',
          variant: 'destructive'
        });
      } finally {
        setLoadingTransactions(false);
      }
    };

    loadTransactions();
  }, [
    toast,
    contactName,
    contactAddress,
    currentAddress,
    isConnected,
    activeTab
  ]);

  // 加载更多函数
  const loadMore = useCallback(async () => {
    if (
      !nextCursor ||
      isLoadingMore ||
      !hasMore ||
      !currentAddress ||
      !contactAddress
    )
      return;

    setIsLoadingMore(true);
    try {
      const result = await fetchTransactions(
        contactName,
        contactAddress,
        currentAddress as string,
        activeTab,
        nextCursor
      );

      setTransactions((prev) => [...prev, ...result.transactions]);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error('加载更多失败:', error);
      toast({
        title: '加载失败',
        description: '无法加载更多交易记录',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    nextCursor,
    isLoadingMore,
    hasMore,
    currentAddress,
    contactAddress,
    contactName,
    activeTab,
    toast
  ]);

  // 滚动加载更多
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;

    const sentinel = document.getElementById('transactions-sentinel');
    if (!sentinel) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !isLoadingMore) {
            loadMore();
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.25
      }
    );

    io.observe(sentinel);
    return () => io.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  // 复制地址
  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: '复制成功',
        description: '地址已复制到剪贴板',
        variant: 'success'
      });
    } catch (err) {
      console.error('复制失败:', err);
      toast({
        title: '复制失败',
        description: '无法复制地址',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <TransactionsSkeleton />;
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F4F9;]">
      {/* 顶部导航栏 */}

      {/* 交易记录导航栏 */}
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="min-w-[44px] min-h-[44px] p-2 flex items-center justify-center touch-manipulation"
          onClick={() => router.back()}
        >
          <img
            src="/contacts/arrow_left.png"
            alt="返回"
            className="h-4 object-cover"
          />
        </Button>
        <div className="text-[#303133] text-base font-semibold">交易记录</div>
        <div className="w-5" />
      </div>

      <div className="flex-1 bg-[#F5F5F5] overflow-y-auto">
        {/* 联系人信息卡片 */}
        {contactSummary && (
          <ContactSummaryCard
            contactSummary={contactSummary}
            onCopyAddress={copyAddress}
            formatAddress={formatAddress}
          />
        )}

        {/* 筛选标签 */}
        <FilterTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* 交易记录列表 */}
        <div className="mx-3 rounded-lg overflow-hidden mb-4">
          {loadingTransactions ? (
            // 列表加载中的骨架屏
            <div className="px-4 py-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="py-3 border-b border-gray-100 animate-pulse"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-[#999999]">
              <div className="text-2xl mb-2">📭</div>
              <div>暂无交易记录</div>
            </div>
          ) : (
            <>
              {transactions.map((transaction, index) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  isLast={index === transactions.length - 1 && !hasMore}
                  onCopyAddress={copyAddress}
                  formatAddress={formatAddress}
                  onClick={() => gotoTxDetail(transaction)}
                />
              ))}

              {/* 加载更多 sentinel */}
              {hasMore && <div id="transactions-sentinel" className="h-1" />}

              {/* 加载更多骨架屏 */}
              {isLoadingMore && (
                <div className="px-4 py-3 animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
