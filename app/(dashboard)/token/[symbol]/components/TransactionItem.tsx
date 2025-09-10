'use client';

import { Check } from 'lucide-react';

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
  transactionHash: string;
  network: string;
  usdValue: string;
  networkIcon: string;
}

interface TransactionItemProps {
  transaction: TransactionItem;
  showDate: boolean;
  onClick?: () => void;
  onCopy?: (text: string) => void;
}

export function TransactionItem({
  transaction,
  showDate,
  onClick,
  onCopy
}: TransactionItemProps) {
  return (
    <div onClick={onClick} className={onClick ? 'cursor-pointer' : undefined}>
      {/* 日期分组头 */}
      {showDate && (
        <div className="mx-3 sm:mx-4 pt-2 bg-white">
          <div className="text-sm font-medium text-black">
            {transaction.date}
          </div>
        </div>
      )}

      {/* 交易项 */}
        <div className="mx-3 sm:mx-4 py-3 bg-white border-b border-gray-100">
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
                    <div className="flex justify-between items-center">
                      <div className="text-[#606266] w-10 text-sm">To</div>{' '}
                  <div className="flex items-center">
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
                        onClick={(e) => { e.stopPropagation(); onCopy?.(transaction.toAddress); }}
                      />
                  </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div  className="text-[#606266] w-10 text-sm">From</div>{' '}
                      <div className="flex items-center">
                      <span className="text-xs">{transaction.fromAddress}</span>
                      <img
                        src="/contacts/copy.svg"
                        alt="Copy address"
                        className="inline-block w-3.5 h-3.5 ml-1 cursor-pointer opacity-70 hover:opacity-100 align-[-2px]"
                        onClick={(e) => { e.stopPropagation(); onCopy?.(transaction.fromAddress); }}
                      />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="text-[#606266] w-10 text-sm">From</div>{' '}
                      <span className="text-xs">{transaction.fromAddress}</span>
                      <img
                        src="/contacts/copy.svg"
                        alt="Copy address"
                        className="inline-block w-3.5 h-3.5 ml-1 cursor-pointer opacity-70 hover:opacity-100 align-[-2px]"
                        onClick={(e) => { e.stopPropagation(); onCopy?.(transaction.fromAddress); }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-[#606266] w-10 text-sm">To</div>{' '}
                      <span className="text-xs text-[#303133]">{transaction.toAddress}</span>
                      <img
                        src="/contacts/copy.svg"
                        alt="Copy address"
                        className="inline-block w-3.5 h-3.5 ml-1 cursor-pointer opacity-70 hover:opacity-100 align-[-2px]"
                        onClick={(e) => { e.stopPropagation(); onCopy?.(transaction.toAddress); }}
                      />
                    </div>
                  </>
                )}
                <div>{transaction.timestamp}</div>
              </div>
            )}
          </div>

          {/* 右侧方向图标：转入=向上，转出=向下，位置在两个地址的中间 */}
          <div className="flex-shrink-0 flex items-center justify-center translate-y-4">
            <img
              src={transaction.isPositive ? '/contacts/linkUp.jpg' : '/contacts/linkDown.jpg'}
              alt={transaction.isPositive ? '转入' : '转出'}
              className="w-2 object-contain opacity-80"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
