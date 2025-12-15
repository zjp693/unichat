'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// 链列表（使用各链专属图标）
const chains = [
  { id: 1, name: 'Ethereum', icon: '/chain/Ethereum.png' },
  { id: 2, name: 'Unichain', icon: '/chain/Unichain.png' },
  { id: 3, name: 'Polygon', icon: '/chain/Polygon.png' },
  { id: 4, name: 'Arbitrum', icon: '/chain/Arbitrum.png' },
  { id: 5, name: 'OP Mainnet', icon: '/chain/OP Mainnet.png' },
  { id: 6, name: 'Base', icon: '/chain/Base.png' },
  { id: 7, name: 'BNB Chain', icon: '/chain/BNB Chain.png' },
  { id: 8, name: 'Blast', icon: '/chain/Blast.png' },
  { id: 9, name: 'Avalanche', icon: '/chain/Avalanche.png' },
  { id: 10, name: 'Celo', icon: '/chain/Celo.png' }
];

export function ChainSelectorDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedChain, setSelectedChain] = useState(chains[0]); // 默认选中 Ethereum

  const handleSelect = (chain: (typeof chains)[0]) => {
    setSelectedChain(chain);
    setIsOpen(false);
    // TODO: 后续实现真正的链切换逻辑
  };

  return (
    <div className="relative">
      {/* Trigger Button - 只显示图标+箭头 */}
      <button
        className="relative z-20 flex items-center gap-1.5 px-2 py-1.5 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors cursor-pointer"
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
            <div className="py-1 max-h-[400px] overflow-y-auto">
              {chains.map((chain) => (
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
