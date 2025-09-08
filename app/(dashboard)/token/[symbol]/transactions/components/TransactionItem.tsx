'use client';
import { Check } from 'lucide-react';
interface TransactionRecord {
  id: string;
  contactName: string;
  contactAvatar: string;
  amount: string;
  usdValue: string;
  isPositive: boolean;
  fromAddress: string;
  toAddress: string;
  timestamp: string;
  date: string;
  transactionHash: string;
  network: string;
  networkIcon: string;
}

interface TransactionItemProps {
  transaction: TransactionRecord;
  isLast: boolean;
  onCopyAddress: (address: string) => void;
  formatAddress: (address: string) => string;
  onClick?: () => void;
}

export function TransactionItem({
  transaction,
  isLast,
  onCopyAddress,
  formatAddress,
  onClick
}: TransactionItemProps) {
  return (
    <div className={`relative py-3 ${!isLast ? 'border-b border-[#DCDFE6]' : ''}`} onClick={onClick}>
      <div className="flex items-start justify-between">
        {/* 左侧：交易描述和勾选图标 */}
        <div className="flex items-center">
          <div className="text-base font-medium text-[#303133] mr-2">
            转账给 {transaction.contactName}
          </div>
          <Check className="h-4 w-4 text-[#2AC496]" />
        </div>
        
        {/* 右侧：金额 */}
        <div className={`text-base font-medium text-[#303133]`}>
          {transaction.amount}
        </div>
      </div>
      {/* 右侧方向图标：转入=向上，转出=向下 */}
      <div className="ml-3 flex-shrink-0 absolute right-2 top-1/2 -translate-y-1/2">
        <img
          src={transaction.isPositive ? '/contacts/linkUp.jpg' : '/contacts/linkDown.jpg'}
          alt={transaction.isPositive ? '转入' : '转出'}
          className="w-2 object-contain opacity-80"
        />
      </div>
      
      {/* 地址信息 */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center text-sm text-[#666666]">
          <span className="mr-2 w-8">From</span>
          <span className="font-mono text-xs text-[#999999]">{transaction.fromAddress}</span>
          <button
            onClick={() => onCopyAddress(transaction.fromAddress)}
            className="ml-2 hover:bg-gray-100 rounded p-0.5 transition-colors"
          >
            <img src="/contacts/copy.svg" alt="复制" className="w-3 h-3" />
          </button>
        </div>
        
        <div className="flex items-center text-sm text-[#666666]">
          <span className="mr-2 w-8">To</span>
          <span className="font-mono text-xs text-[#999999]">{transaction.toAddress}</span>
          <button
            onClick={() => onCopyAddress(transaction.toAddress)}
            className="ml-2 hover:bg-gray-100 rounded p-0.5 transition-colors"
          >
            <img src="/contacts/copy.svg" alt="复制" className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      {/* 底部：时间和USD价值 */}
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-[#999999]">{transaction.timestamp}</div>
        <div className="text-xs text-[#999999]">{transaction.usdValue}</div>
      </div>
    </div>
  );
}
