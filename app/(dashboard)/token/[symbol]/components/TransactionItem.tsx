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
}

export function TransactionItem({
  transaction,
  showDate,
  onClick
}: TransactionItemProps) {
  return (
    <div onClick={onClick} className={onClick ? 'cursor-pointer' : undefined}>
      {/* 日期分组头 */}
      {showDate && (
        <div className="px-5 py-3 bg-white border-b border-gray-100">
          <div className="text-sm font-medium text-black">
            {transaction.date}
          </div>
        </div>
      )}

      {/* 交易项 */}
      <div className="px-5 py-4 bg-white">
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
