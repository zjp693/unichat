'use client';

import Image from 'next/image';
import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAppKitNetwork } from '@reown/appkit/react';
import { useChainId } from 'wagmi';
import { networks } from '@/lib/web3/networks';

// 支持的链列表（只有 Arbitrum 和 opBNB）
const SUPPORTED_CHAINS = [
  { id: 42161, name: 'Arbitrum', icon: '/chain/Arbitrum.png' },
  { id: 204, name: 'opBNB', icon: '/chain/BNB Chain.png' }
];

export function ChainSelectorDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { chainId: appKitChainId, switchNetwork } = useAppKitNetwork();
  const wagmiChainId = useChainId();

  // 获取当前链 ID
  const currentChainId =
    wagmiChainId ||
    (typeof appKitChainId === 'number' ? appKitChainId : undefined);

  // 当前选中的链
  const selectedChain = useMemo(() => {
    return (
      SUPPORTED_CHAINS.find((c) => c.id === currentChainId) ||
      SUPPORTED_CHAINS[0]
    );
  }, [currentChainId]);

  const handleSelect = (chain: (typeof SUPPORTED_CHAINS)[0]) => {
    setIsOpen(false);

    // 如果已经是当前链，不需要切换
    if (chain.id === currentChainId) return;

    // 找到对应的网络对象并切换
    const network = networks.find((n) => n.id === chain.id);
    if (network) {
      switchNetwork(network);
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button - 只显示图标+箭头 */}
      <button
        className="relative z-20 flex items-center gap-1.5 px-2 py-1.5 bg-transparent border border-gray-200 rounded-lg cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <img
          src={selectedChain.icon}
          alt={selectedChain.name}
          className="w-5 h-5 rounded-full object-cover flex-shrink-0"
        />
        <ChevronDown
          size={14}
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
            <div className="py-1">
              {SUPPORTED_CHAINS.map((chain) => (
                <button
                  key={chain.id}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  onClick={() => handleSelect(chain)}
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden relative flex-shrink-0">
                    <Image
                      src={chain.icon}
                      alt={chain.name}
                      fill
                      sizes="24px"
                      className="object-cover"
                    />
                  </div>
                  <span className="flex-1 text-left text-sm text-gray-700">
                    {chain.name}
                  </span>
                  {selectedChain.id === chain.id && (
                    <Image
                      src="/chats/check.png"
                      alt="selected"
                      width={16}
                      height={16}
                      className="flex-shrink-0"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
