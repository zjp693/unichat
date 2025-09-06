'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

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

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { symbol, id } = params as { symbol: string; id: string };
  
  const [transaction, setTransaction] = useState<TransactionItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenThumbnail, setTokenThumbnail] = useState<string | null>(null);

  useEffect(() => {
    // 从 URL 参数中获取传递的交易数据
    const transactionData = searchParams?.get('data');
    const thumbnail = searchParams?.get('thumbnail');
    
    if (transactionData) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(transactionData));
        setTransaction(decodedData);
        setError(null);
      } catch (error) {
        console.error('解析交易数据失败:', error);
        setError('交易数据解析失败');
      }
    } else {
      // 如果没有传递数据，显示错误
      setError('未找到交易数据');
    }
    
    // 设置 token 图标
    setTokenThumbnail(thumbnail);
    setLoading(false);
  }, [searchParams]);

  const copy = (text: string) => navigator.clipboard.writeText(text);

  // 获取区块链浏览器URL
  const getBlockchainExplorerUrl = (transactionHash: string, network: string) => {
    switch (network.toLowerCase()) {
      case 'arbitrum':
        return `https://arbiscan.io/tx/${transactionHash}`;
      case 'ethereum':
        return `https://etherscan.io/tx/${transactionHash}`;
      case 'bsc':
        return `https://bscscan.com/tx/${transactionHash}`;
      case 'polygon':
        return `https://polygonscan.com/tx/${transactionHash}`;
      default:
        return `https://arbiscan.io/tx/${transactionHash}`; // 默认使用Arbitrum
    }
  };

  // 打开区块链浏览器
  const openBlockchainExplorer = () => {
    if (transaction) {
      const url = getBlockchainExplorerUrl(transaction.transactionHash, transaction.network);
      window.open(url, '_blank');
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center justify-between px-4 py-4 bg-white">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 flex items-center justify-center"
            onClick={() => router.back()}
          >
           <img src="/contacts/arrow_left.png" alt="" className="h-4 object-cover" />
          </Button>
          <div className="text-[#303133] text-base font-semibold">交易详情</div>
          <div className="w-5" />
        </div>

        {/* 中心图标与金额区域骨架屏 - 完全匹配实际布局 */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center">
          <div className="w-14 h-14 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-[42px] bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
          <div className="h-[20px] bg-gray-100 rounded w-32 animate-pulse"></div>
          <div className="mt-4 flex items-center text-base font-semibold">
            <div className="h-5 w-5 bg-gray-200 rounded-full animate-pulse mr-1"></div>
            <div className="h-5 bg-gray-100 rounded w-16 animate-pulse"></div>
          </div>
        </div>

        <div className="h-[10px] bg-gray-100" />

        {/* 明细部分骨架屏 - 完全匹配实际布局 */}
        <div className="px-6 py-3 space-y-4">
          {/* InfoRow 时间行骨架 - 匹配 InfoRow 组件结构 */}
          <div className="flex items-start justify-between">
            <div className="text-sm mr-4 whitespace-nowrap">
              <div className="h-[20px] bg-gray-200 rounded w-8 animate-pulse"></div>
            </div>
            <div className="flex-1 text-right break-all">
              <div className="h-3 bg-gray-100 rounded w-32 animate-pulse ml-auto"></div>
            </div>
          </div>
          
          {/* InfoRow 转出地址行骨架 - 匹配 InfoRow 组件结构 */}
          <div className="flex items-start justify-between">
            <div className="text-sm mr-4 whitespace-nowrap">
              <div className="h-[20px] bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
            <div className="flex-1 text-right break-all">
              <span className="align-middle">
                <div className="inline-block h-3 bg-gray-100 rounded w-48 animate-pulse"></div>
              </span>
              <div className="inline-block w-4 h-4 bg-gray-200 rounded animate-pulse ml-2 align-[-2px]"></div>
            </div>
          </div>
          
          {/* InfoRow 交易ID行骨架 - 匹配 InfoRow 组件结构 */}
          <div className="flex items-start justify-between">
            <div className="text-sm mr-4 whitespace-nowrap">
              <div className="h-[20px] bg-gray-200 rounded w-12 animate-pulse"></div>
            </div>
            <div className="flex-1 text-right break-all">
              <span className="align-middle">
                <div className="inline-block h-3 bg-gray-100 rounded w-40 animate-pulse"></div>
              </span>
              <div className="inline-block w-4 h-4 bg-gray-200 rounded animate-pulse ml-2 align-[-2px]"></div>
            </div>
          </div>
          
          {/* 网络行骨架 - 匹配实际结构 */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#606266]">
              <div className="h-[20px] bg-gray-200 rounded w-8 animate-pulse"></div>
            </div>
            <div className="text-xs flex items-center text-black">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse mr-1"></div>
              <div className="h-3 bg-gray-100 rounded w-16 animate-pulse"></div>
            </div>
          </div>
          
          {/* USD价值行骨架 - 匹配实际结构 */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#606266]">
              <div className="h-[20px] bg-gray-200 rounded w-12 animate-pulse"></div>
            </div>
            <div className="text-black text-xs">
              <div className="h-3 bg-gray-100 rounded w-20 animate-pulse"></div>
            </div>
          </div>
          
          {/* Gas费行骨架 - 匹配实际结构 */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#606266]">
              <div className="h-[20px] bg-gray-200 rounded w-10 animate-pulse"></div>
            </div>
            <div className="text-black text-xs">
              <div className="h-3 bg-gray-100 rounded w-32 animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="h-[10px] bg-gray-100" />

        {/* 区块链浏览器骨架屏 - 匹配实际结构 */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-[#606266]">
            <div className="h-[20px] bg-gray-200 rounded w-20 animate-pulse"></div>
          </div>
          <div className="text-black">
            <div className="h-3 w-3 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center justify-between px-4 py-4 bg-white">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 flex items-center justify-center"
            onClick={() => router.back()}
          >
           <img src="/contacts/arrow_left.png" alt="" className="h-4 object-cover" />
          </Button>
          <div className="text-[#303133] text-base font-semibold">交易详情</div>
          <div className="w-5" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-red-500 text-lg mb-2">⚠️</div>
          <div className="text-gray-600 text-sm mb-4">{error}</div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.back()}
          >
            返回
          </Button>
        </div>
      </div>
    );
  }

  // 没有交易数据
  if (!transaction) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center justify-between px-4 py-4 bg-white">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 flex items-center justify-center"
            onClick={() => router.back()}
          >
           <img src="/contacts/arrow_left.png" alt="" className="h-4 object-cover" />
          </Button>
          <div className="text-[#303133] text-base font-semibold">交易详情</div>
          <div className="w-5" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-gray-500 text-lg mb-2">📄</div>
          <div className="text-gray-600 text-sm mb-4">暂无交易数据</div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.back()}
          >
            返回
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-4 py-4 bg-white">
        <Button
          variant="ghost"
          size="sm"
          className="p-2 flex items-center justify-center"
          onClick={() => router.back()}
        >
         <img src="/contacts/arrow_left.png" alt="" className="h-4 object-cover" />
        </Button>
        <div className="text-[#303133] text-base font-semibold">{symbol?.toUpperCase()} 收款</div>
        <div className="w-5" />
      </div>

      {/* 中心图标与金额区域  */}
      <div className="px-6 pt-6 pb-4 flex flex-col items-center">
        {tokenThumbnail ? (
          <img 
            src={tokenThumbnail} 
            alt={symbol} 
            className="w-14 h-14 rounded object-cover mb-4" 
          />
        ) : (
          <div className="w-14 h-14 bg-gray-500 rounded flex items-center justify-center mb-4">
            <span className="text-white text-2xl font-bold">{symbol?.charAt(0)}</span>
          </div>
        )}
        <div className="text-[34px]  font-semibold text-[#012332] mb-2">{transaction.amount}</div>
        <div className="text-sm text-gray-500">≈{transaction.usdValue}</div>
        <div className="mt-4 flex items-center  text-[#0B8A64] text-base font-semibold ">
          <img src="/contacts/circleCheck.jpg" alt="交易完成" className="h-5 w-5 mr-1" /> 交易完成
        </div>
      </div>

      <div className="h-[10px] bg-gray-100" />

      {/* 明细 */}
      <div className="px-6 py-3 space-y-4">
        <InfoRow label="时间" value={transaction.timestamp} />
        <InfoRow label="转出地址" value={transaction.fromAddress} canCopy onCopy={() => copy(transaction.fromAddress)} />
        <InfoRow label="交易ID" value={transaction.transactionHash} canCopy onCopy={() => copy(transaction.transactionHash)} />
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#606266]">网络</div>
          <div className="text-xs flex items-center text-black">
            <img src={transaction.networkIcon} alt={transaction.network} className="w-4 h-4 mr-1" />
           <div>{transaction.network}</div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#606266]">USD价值</div>
          <div className="text-black text-xs">{transaction.usdValue}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#606266]">Gas费</div>
          <div className="text-black text-xs">0.0000000106 ETH ≈ &lt;$0.01</div>
        </div>
      </div>

      <div className="h-[10px] bg-gray-100" />

      {/* 区块链浏览器链接 */}
      <div 
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={openBlockchainExplorer}
      >
        <div className="text-sm text-[#606266]">区块链浏览器</div>
        <div className="text-black">
          <img src="/contacts/arrow_right.png" alt="" className="h-3 object-cover" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, canCopy, onCopy }: { label: string; value: string; canCopy?: boolean; onCopy?: () => void }) {
  return (
    <div className="flex items-start justify-between">
      <div className="text-[#606266] text-sm mr-4 whitespace-nowrap">{label}</div>
      <div className="flex-1 text-right text-black break-all">
        <span className="align-middle text-xs">{value}</span>
        {canCopy && (
          <img
            src="/contacts/copy.svg"
            alt="Copy"
            className="inline-block w-4 h-4 ml-2 cursor-pointer opacity-70 hover:opacity-100 align-[-2px]"
            onClick={onCopy}
          />
        )}
      </div>
    </div>
  );
}


