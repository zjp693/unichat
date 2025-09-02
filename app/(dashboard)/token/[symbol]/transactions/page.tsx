'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface TransactionRecord {
  id: string;
  contactName: string;
  contactAvatar: string;
  amount: string;
  usdValue: string;
  isPositive: boolean; // true for incoming, false for outgoing
  fromAddress: string;
  toAddress: string;
  timestamp: string;
  date: string;
  transactionHash: string;
  network: string;
  networkIcon: string;
}

interface ContactSummary {
  name: string;
  avatar: string;
  totalTransactions: number;
  totalBalance: string;
  walletAddress: string;
}

// 模拟数据 - 与James的交易记录
const mockTransactions: TransactionRecord[] = [
  {
    id: '1',
    contactName: 'James',
    contactAvatar: '/me/me1.png',
    amount: '-0.45 ETH',
    usdValue: '≈$2004.3',
    isPositive: false,
    fromAddress: '0x052cc4e91eaDC99a40BF66F4b6f62BE4f9c0559ab',
    toAddress: '0x052cc4e91eaDC99a40BF66F4b6f62BE4f9c0559ab',
    timestamp: '2023-08-14 09:47',
    date: '2023-08-14',
    transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
    network: 'Arbitrum',
    networkIcon: '/discover/arbitrum.png'
  },
  {
    id: '2',
    contactName: 'My add',
    contactAvatar: '/me/me2.png',
    amount: '+0.75 ETH',
    usdValue: '≈$2004.3',
    isPositive: true,
    fromAddress: '0x052cc4e91eaDC99a40BF66F4b6f62BE4f9c0559ab',
    toAddress: '0x052cc4e91eaDC99a40BF66F4b6f62BE4f9c0559ab',
    timestamp: '2023-06-12 18:12',
    date: '2023-06-12',
    transactionHash: '0x1234567890abcdef1234567890abcdef12345679',
    network: 'Arbitrum',
    networkIcon: '/discover/arbitrum.png'
  },
  {
    id: '3',
    contactName: 'James',
    contactAvatar: '/me/me1.png',
    amount: '-2.5 ETH',
    usdValue: '≈$2004.3',
    isPositive: false,
    fromAddress: '0x052cc4e91eaDC99a40BF66F4b6f62BE4f9c0559ab',
    toAddress: '0x052cc4e91eaDC99a40BF66F4b6f62BE4f9c0559ab',
    timestamp: '2023-08-10 11:05',
    date: '2023-08-10',
    transactionHash: '0x1234567890abcdef1234567890abcdef12345680',
    network: 'Arbitrum',
    networkIcon: '/discover/arbitrum.png'
  },
  {
    id: '4',
    contactName: 'My add',
    contactAvatar: '/me/me2.png',
    amount: '+1.8 ETH',
    usdValue: '≈$2004.3',
    isPositive: true,
    fromAddress: '0x052cc4e91eaDC99a40BF66F4b6f62BE4f9c0559ab',
    toAddress: '0x052cc4e91eaDC99a40BF66F4b6f62BE4f9c0559ab',
    timestamp: '2023-07-28 16:20',
    date: '2023-07-28',
    transactionHash: '0x1234567890abcdef1234567890abcdef12345681',
    network: 'Arbitrum',
    networkIcon: '/discover/arbitrum.png'
  }
];

// 创建动态的联系人摘要数据
const createContactSummary = (name: string = 'James', address: string = '0x052cc4e91eaDC99a40BF66F4b6f62BE4f9c0559ab'): ContactSummary => ({
  name,
  avatar: '/me/me1.png',
  totalTransactions: 23,
  totalBalance: '$ 340,020.0',
  walletAddress: address
});

// 模拟API函数
async function fetchTransactions(contactName?: string, contactAddress?: string): Promise<TransactionRecord[]> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // 根据联系人名称动态更新交易记录
  return mockTransactions.map(tx => ({
    ...tx,
    contactName: contactName || tx.contactName,
    fromAddress: contactAddress || tx.fromAddress,
    toAddress: contactAddress || tx.toAddress
  }));
}

async function fetchContactSummary(contactName?: string, contactAddress?: string): Promise<ContactSummary> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  return createContactSummary(contactName, contactAddress);
}

export default function TransactionsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const symbol = (params.symbol as string)?.toUpperCase();
  const { toast } = useToast();
  
  // 从URL参数获取联系人信息
  const contactName = searchParams?.get('contact') || 'James';
  const contactAddress = searchParams?.get('address') || '0x052cc4e91eaDC99a40BF66F4b6f62BE4f9c0559ab';
  
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
        description: '地址已复制到剪贴板'
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

  // 格式化地址显示
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 过滤交易记录
  const filteredTransactions = transactions.filter(tx => {
    if (activeTab === 'income') return tx.isPositive;
    if (activeTab === 'expense') return !tx.isPositive;
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* 顶部导航栏 */}
        <div className="flex items-center justify-between px-4 py-4 bg-white border-b">
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

        {/* 加载骨架屏 */}
        <div className="flex-1 bg-gray-50">
          {/* 联系人信息骨架屏 */}
          <div className="bg-white mx-4 mt-4 rounded-lg p-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse mb-3"></div>
              <div className="h-5 bg-gray-200 rounded w-20 animate-pulse mb-2"></div>
              <div className="flex items-center space-x-4 mt-3">
                <div className="text-center">
                  <div className="h-6 bg-gray-200 rounded w-12 animate-pulse mb-1"></div>
                  <div className="h-4 bg-gray-100 rounded w-16 animate-pulse"></div>
                </div>
                <div className="text-center">
                  <div className="h-6 bg-gray-200 rounded w-24 animate-pulse mb-1"></div>
                  <div className="h-4 bg-gray-100 rounded w-16 animate-pulse"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-100 rounded w-64 animate-pulse mt-3"></div>
            </div>
          </div>

          {/* 交易记录骨架屏 */}
          <div className="mx-4 mt-4">
            <div className="h-6 bg-gray-200 rounded w-24 animate-pulse mb-3"></div>
            <div className="bg-white rounded-lg">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex items-center px-4 py-3 border-b border-gray-100 last:border-b-0">
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse mr-4"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-3 bg-gray-100 rounded w-48 animate-pulse"></div>
                      <div className="h-3 bg-gray-100 rounded w-16 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-4 py-4 bg-white border-b">
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

      <div className="flex-1 bg-gray-50 overflow-y-auto">
        {/* 联系人信息卡片 */}
        {contactSummary && (
          <div className="bg-white mx-4 mt-4 rounded-lg p-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full overflow-hidden mb-3">
                <img 
                  src={contactSummary.avatar} 
                  alt={contactSummary.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-lg font-semibold text-blue-600 mb-2">{contactSummary.name}</div>
              
              <div className="flex items-center space-x-6 mt-2">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">{contactSummary.totalTransactions} 笔</div>
                  <div className="text-sm text-gray-500">总交易记录</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">{contactSummary.totalBalance}</div>
                  <div className="text-sm text-gray-500">总交易金额</div>
                </div>
              </div>
              
              <div className="flex items-center mt-3 text-sm text-gray-500">
                <span className="font-mono">{formatAddress(contactSummary.walletAddress)}</span>
                <button
                  onClick={() => copyAddress(contactSummary.walletAddress)}
                  className="ml-2 hover:bg-gray-100 rounded p-1 transition-colors"
                >
                  <img src="/contacts/copy.svg" alt="复制" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 筛选标签 */}
        <div className="mx-4 mt-4 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-900 font-medium text-sm">最近交易记录</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setActiveTab('income')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTab === 'income'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                收入
              </button>
              <button
                onClick={() => setActiveTab('expense')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTab === 'expense'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                支出
              </button>
            </div>
          </div>
        </div>

        {/* 交易记录列表 */}
        <div className="bg-white mx-4 rounded-lg overflow-hidden mb-4">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
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
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// 交易记录项组件
function TransactionItem({
  transaction,
  isLast,
  onCopyAddress,
  formatAddress
}: {
  transaction: TransactionRecord;
  isLast: boolean;
  onCopyAddress: (address: string) => void;
  formatAddress: (address: string) => string;
}) {
  return (
    <div className={`px-4 py-3 ${!isLast ? 'border-b border-gray-100' : ''}`}>
      <div className="flex items-start">
        <div className="text-sm text-gray-600 mr-4 min-w-[80px] mt-1">
          转账给 {transaction.contactName}
          {transaction.isPositive && (
            <div className="inline-block ml-2 w-3 h-3 bg-green-500 rounded-full relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          {/* 第一行：From地址和金额 */}
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-gray-600">
              From <span className="font-mono text-xs">{formatAddress(transaction.fromAddress)}</span>
              <button
                onClick={() => onCopyAddress(transaction.fromAddress)}
                className="ml-1 hover:bg-gray-100 rounded p-0.5 transition-colors"
              >
                <img src="/contacts/copy.svg" alt="复制" className="w-3 h-3" />
              </button>
            </div>
            <div className={`text-lg font-semibold ${
              transaction.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {transaction.amount}
            </div>
          </div>
          
          {/* 第二行：To地址和USD价值 */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              To <span className="font-mono text-xs">{formatAddress(transaction.toAddress)}</span>
              <button
                onClick={() => onCopyAddress(transaction.toAddress)}
                className="ml-1 hover:bg-gray-100 rounded p-0.5 transition-colors"
              >
                <img src="/contacts/copy.svg" alt="复制" className="w-3 h-3" />
              </button>
            </div>
            <div className="text-sm text-gray-500">{transaction.usdValue}</div>
          </div>
          
          {/* 第三行：时间戳 */}
          <div className="flex items-center justify-between mt-1">
            <div className="text-xs text-gray-500">{transaction.timestamp}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
