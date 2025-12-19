'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ChainSelectorDropdown } from '@/components/chat/chain-selector-dropdown';
import {
  Search,
  CirclePlus,
  ChevronRight,
  Camera,
  Play,
  BrainCircuit,
  Layers,
  BarChart3,
  Cpu,
  Briefcase,
  Gamepad2,
  Box
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DiscoverItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  subtitle?: string;
  avatar?: string;
  badgeCount?: number;
  image?: string;
  type?: string;
  href?: string;
}

const discoverItems: DiscoverItem[] = [
  {
    id: 'airdrop',
    title: 'Airdrop',
    subtitle: '空投领取',
    icon: (
      <Image src="/shop/airdrop1.png" alt="Airdrop" width={30} height={30} />
    ),
    type: 'group',
    href: '/airdrop'
  },
  {
    id: 'video',
    title: 'Video',
    subtitle: 'video',
    icon: (
      <Image src="/discover/video.png" alt="video" width={30} height={30} />
    ),
    image: '/shop/promo.png',
    badgeCount: 9
  },
  {
    id: 'unishop.ai',
    title: 'UNISHOP.AI',
    subtitle: 'back',
    icon: (
      <Image
        src="/discover/unishop.png"
        alt="unishop.ai"
        width={30}
        height={30}
      />
    ),
    type: 'group'
    // badgeCount: 1
  },
  {
    id: 'bridge',
    title: 'Arbitrum cross-chain bridge',
    icon: <Image src="/discover/arbitrum.png" alt="ai" width={30} height={30} />
  },
  {
    id: 'exchange',
    title: 'Uniswap.org exchange',
    icon: (
      <Image src="/discover/uniswap.png" alt="uniswap" width={30} height={30} />
    ),
    type: 'group'
  },
  {
    id: 'gold',
    title: 'Gold bar transaction',
    icon: <Image src="/discover/gold.png" alt="gold" width={30} height={30} />
  },
  {
    id: 'mining',
    title: 'BTC /ETH mining machine',
    icon: <Image src="/discover/btc.png" alt="btc" width={30} height={30} />,
    type: 'group'
  },
  {
    id: 'jobs',
    title: 'Job opportunities',
    icon: <Image src="/discover/job.png" alt="job" width={30} height={30} />
  },
  {
    id: 'games',
    title: 'Chain games',
    subtitle: 'GANME',
    icon: (
      <Image src="/discover/chain.png" alt="chain" width={30} height={30} />
    ),
    type: 'group',
    image: '/shop/airdrop.png'
  },
  {
    id: 'drapp',
    title: 'Drapp strict selection ecology',
    icon: <Image src="/discover/drapp.png" alt="drapp" width={30} height={30} />
  }
];

export default function DiscoverPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const handleItemClick = (item: DiscoverItem) => {
    if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部导航 */}
      <div className="flex items-center py-4 px-4 bg-white">
        <ChainSelectorDropdown />
      </div>

      {/* 搜索栏 */}
      {/* <div className="p-3 bg-gray-50 border-b border-gray-200 bg-white text-right">
        <button className="p-2  rounded-full mr-2">
          <Search size={18} />
        </button>
        <button className="p-2 rounded-full">
          <CirclePlus size={18} />
        </button>
      </div> */}

      {/* 发现列表 */}
      <div className="flex-1 overflow-y-auto">
        {discoverItems.map((item) => (
          <div
            key={item.id}
            className={`overflow-hidden bg-white ${item.type && 'mb-2'}`}
          >
            <div
              className="flex relative items-center h-[50px] px-4 cursor-pointer hover:bg-gray-50"
              onClick={() => handleItemClick(item)}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full mr-3">
                {item.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between pr-2">
                  <h3 className="font-medium text-sm mr-2 truncate">
                    {item.title}
                  </h3>
                  <div className="relative">
                    {item.subtitle && (
                      <div className="text-xs text-gray-500 flex items-center">
                        {item.subtitle}
                        {item.image && (
                          <Image
                            src={item.image}
                            alt={item.title}
                            className="object-cover ml-1"
                            width={20}
                            height={20}
                          />
                        )}
                      </div>
                    )}
                    {item.badgeCount !== undefined && (
                      <Badge
                        variant="destructive"
                        className="rounded-full p-0 absolute top-[-2px] right-[-18px] h-4 w-4 min-w-[16px] text-[10px] flex items-center justify-center"
                      >
                        {item.badgeCount > 9 ? '9+' : item.badgeCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 ml-2" />
              {/* 下边框 */}
              {!item.type && (
                <div className="border-t w-[calc(100%-3.5rem)] border-border absolute bottom-0 right-0"></div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
