'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { TransactionItem } from './components/TransactionItem';
import { TransactionsSkeleton } from './components/TransactionsSkeleton';
import { ContactSummaryCard } from './components/ContactSummaryCard';
import { FilterTabs } from './components/FilterTabs';
import { formatAddress, fetchTransactions, fetchContactSummary } from './lib/transactions-utils';

// 从外部导入接口类型
import type { TransactionRecord, ContactSummary } from './lib/transactions-utils';



export default function TransactionsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const symbol = (params.symbol as string)?.toUpperCase();
  const { toast } = useToast();
  
  // 跳转至交易详情
  const gotoTxDetail = (tx: TransactionRecord) => {
    const data = encodeURIComponent(JSON.stringify({
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
    }));
    router.push(`/token/${symbol}/tx/${tx.id}?data=${data}`);
  };
  
  // 从URL参数获取联系人信息
  const contactName = 'James';
  const contactAddress = '0x052cc4e91eaDC9a40BD66F4b6f63BE4f9c0559ab';
  
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [contactSummary, setContactSummary] = useState<ContactSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [transactionsData, summaryData] = await Promise.all([
          fetchTransactions(contactName, contactAddress),
          fetchContactSummary(contactName, contactAddress)
        ]);
        setTransactions(transactionsData);
        setContactSummary(summaryData);
      } catch (error) {
        console.error('加载数据失败:', error);
        toast({
          title: '加载失败',
          description: '无法加载交易记录，请重试',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast, contactName, contactAddress]);

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



  // 过滤交易记录
  const filteredTransactions = transactions.filter(tx => {
    if (activeTab === 'income') return tx.isPositive;
    if (activeTab === 'expense') return !tx.isPositive;
    return true;
  });

  if (loading) {
    return <TransactionsSkeleton />;
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F4F9;]">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-4 py-4">
        <Button
          variant="ghost"
          size="sm"
          className="p-2 flex items-center justify-center"
          onClick={() => router.back()}
        >
          <img src="/contacts/arrow_left.png" alt="返回" className="h-4 object-cover" />
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
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-[#999999]">
              <div className="text-2xl mb-2">📭</div>
              <div>暂无交易记录</div>
            </div>
          ) : (
            filteredTransactions.map((transaction, index) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                isLast={index === filteredTransactions.length - 1}
                onCopyAddress={copyAddress}
                formatAddress={formatAddress}
                onClick={() => gotoTxDetail(transaction)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}


