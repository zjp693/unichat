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
    <div
      className={`relative py-3 ${!isLast ? 'border-b border-[#DCDFE6]' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        {/* 左侧：交易描述和勾选图标 */}
        <div className="flex items-center flex-1 min-w-0">
          <div className="text-base font-medium text-[#303133] mr-2 truncate">
            转账给 {transaction.contactName}
          </div>
          <Check className="h-4 w-4 text-[#2AC496] flex-shrink-0" />
        </div>

        {/* 右侧：金额和方向图标 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`text-base font-medium text-[#303133]`}>
            {transaction.amount}
          </div>
          {/* <img
            src={transaction.isPositive ? '/contacts/linkUp.png' : '/contacts/linkDown.png'}
            alt={transaction.isPositive ? '转入' : '转出'}
            className="w-3 h-3 object-contain opacity-80"
          /> */}
        </div>
      </div>

      {/* 地址信息 */}
      <div className="mt-1">
        {/* 小屏幕：垂直布局 */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-sm">
              <div className="w-10 text-sm text-[#666666]">From</div>
              <div className="flex items-center">
                <span className="text-xs text-[#999999]">
                  {transaction.fromAddress}
                </span>
                <img
                  src="/contacts/copy.svg"
                  alt="复制"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyAddress(transaction.fromAddress);
                  }}
                  className="inline-block w-3.5 h-3.5
                ml-1 cursor-pointer opacity-70 hover:opacity-100 align-[-2px]"
                />
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <div className="w-10 text-sm text-[#666666]">To</div>
              <div className="flex items-center">
                <span className="text-xs text-[#999999]">
                  {transaction.toAddress}
                </span>
                <img
                  src="/contacts/copy.svg"
                  alt="复制"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyAddress(transaction.toAddress);
                  }}
                  className="inline-block w-3.5 h-3.5
                ml-1 cursor-pointer opacity-70 hover:opacity-100 align-[-2px]"
                />
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <img
              src={
                transaction.isPositive
                  ? '/contacts/linkUp.png'
                  : '/contacts/linkDown.png'
              }
              alt={transaction.isPositive ? '转入' : '转出'}
              className="w-2 object-contain opacity-80"
            />
          </div>
        </div>
      </div>

      {/* 底部：时间和USD价值 */}
      <div className="flex items-center justify-between mt-1">
        <div className="text-xs text-[#999999]">{transaction.timestamp}LLL</div>
        <div className="text-xs text-[#999999]">{transaction.usdValue}</div>
      </div>
    </div>
  );
}
