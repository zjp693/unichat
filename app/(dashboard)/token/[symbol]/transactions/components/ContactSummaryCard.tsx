'use client';

interface ContactSummary {
  name: string;
  avatar: string;
  totalTransactions: number;
  totalBalance: string;
  walletAddress: string;
}

interface ContactSummaryCardProps {
  contactSummary: ContactSummary;
  onCopyAddress: (address: string) => void;
  formatAddress: (address: string) => string;
}

export function ContactSummaryCard({
  contactSummary,
  onCopyAddress,
  formatAddress
}: ContactSummaryCardProps) {
  return (
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
            onClick={() => onCopyAddress(contactSummary.walletAddress)}
            className="ml-2 hover:bg-gray-100 rounded p-1 transition-colors"
          >
            <img src="/contacts/copy.svg" alt="复制" className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
