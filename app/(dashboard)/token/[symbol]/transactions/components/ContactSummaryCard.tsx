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
    <div className="bg-white mx-4 mt-4 rounded-lg p-6">
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 rounded-full overflow-hidden mb-4">
          <img 
            src={contactSummary.avatar} 
            alt={contactSummary.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-lg font-semibold text-[#1890FF] underline mb-4">{contactSummary.name}</div>
        
        <div className="w-full flex justify-between  items-center mb-4 ">
          <div className="text-center w-[48%] p-1 rounded-md bg-[#edf2fe]">
            <div className="text-sm text-[#594FD1] mb-1">总交易记录</div>
            <div className="text-base font-bold text-[#303133]">{contactSummary.totalTransactions} 笔</div>
          </div>
          <div className="text-center w-[48%] p-1 rounded-md bg-[#edf2fe]">
            <div className="text-sm text-[#594FD1] mb-1">总交易金额</div>
            <div className="text-base font-bold text-[#303133]">{contactSummary.totalBalance}</div>
          </div>
        </div>
        
        <div className="flex items-center text-sm text-[#999999]">
          <span className="font-mono text-xs">{contactSummary.walletAddress}</span>
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
