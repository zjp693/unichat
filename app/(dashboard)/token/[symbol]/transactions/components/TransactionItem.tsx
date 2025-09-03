'use client';

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
}

export function TransactionItem({
  transaction,
  isLast,
  onCopyAddress,
  formatAddress
}: TransactionItemProps) {
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
