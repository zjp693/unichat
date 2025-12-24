'use client';

import React, { useMemo, useRef } from 'react';
import { GroupedVirtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useToast } from '@/hooks/use-toast';
import { Contact } from '@/lib/contacts';
import { ContactListItem } from './ContactListItem';
import { StaticMenuList } from './StaticMenuList';

// ----------------------------------------------------------------------
// Mock Data Generation
// ----------------------------------------------------------------------

const MOCK_NAMES = [
  'Alexander',
  'Amelia',
  'Benjamin',
  'Bella',
  'Charles',
  'Charlotte'
];

// 重复数组以增加数据量，方便测试滚动
const FULL_NAMES = [...MOCK_NAMES, ...MOCK_NAMES, ...MOCK_NAMES];

const generateMockContacts = (): Contact[] => {
  return FULL_NAMES.map((name, index) => ({
    id: `mock_${index}_${name}`,
    name: name,
    // 模拟生成标准的 42 位以太坊地址
    walletAddress: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    avatar: `/me/me${(index % 2) + 1}.png`,
    type: 'friend' as const,
    rank: index
  })).sort((a, b) => a.name.localeCompare(b.name));
};

// ----------------------------------------------------------------------
// Component Render
// ----------------------------------------------------------------------

export function ContactListWithIndex() {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { toast } = useToast();

  // 1. 数据处理
  const { groups, groupCounts, groupedData, groupStartIndices } =
    useMemo(() => {
      const rawContacts = generateMockContacts();

      // Grouping Logic
      const groupedData: { [key: string]: Contact[] } = {};
      const groupKeys: string[] = [];

      rawContacts.forEach((contact) => {
        const firstLetter = contact.name[0].toUpperCase();
        const groupKey = /^[A-Z]/.test(firstLetter) ? firstLetter : '#';

        if (!groupedData[groupKey]) {
          groupedData[groupKey] = [];
          groupKeys.push(groupKey);
        }
        groupedData[groupKey].push(contact);
      });

      // Sort group keys (A-Z, then #)
      groupKeys.sort((a, b) => {
        if (a === '#') return 1;
        if (b === '#') return -1;
        return a.localeCompare(b);
      });

      const counts: number[] = [];
      const groupStartIndices: number[] = [];
      let currentTotal = 0;

      groupKeys.forEach((key) => {
        const count = groupedData[key].length;
        counts.push(count);
        groupStartIndices.push(currentTotal);
        currentTotal += count;
      });

      return {
        groups: groupKeys,
        groupCounts: counts,
        groupedData: groupedData,
        groupStartIndices
      };
    }, []);

  // 复制钱包地址
  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: '复制成功',
        description: '钱包地址已复制到剪贴板',
        variant: 'success'
      });
    } catch (err) {
      toast({
        title: '复制失败',
        description: '无法复制地址',
        variant: 'destructive'
      });
    }
  };

  // 2. 索引点击处理
  const onIndexClick = (index: number) => {
    const itemIndex = groupStartIndices[index];

    virtuosoRef.current?.scrollToIndex({
      index: itemIndex,
      align: 'start',
      offset: 0
    });
  };

  // 3. 渲染单个联系人
  const itemContent = (index: number, groupIndex: number) => {
    const groupKey = groups[groupIndex];
    const items = groupedData[groupKey];

    // 计算组内索引：全局索引 - 该组起始索引
    const itemIndexInGroup = index - groupStartIndices[groupIndex];
    const item = items?.[itemIndexInGroup];

    if (!item) {
      return <div className="h-[60px] w-full bg-gray-50" />;
    }

    return (
      <ContactListItem
        contact={item}
        onCopyAddress={copyAddress}
        onViewTransactions={() => {}}
        isLast={itemIndexInGroup === items.length - 1} // 使用组内索引判断是否最后一个
      />
    );
  };

  // 4. 渲染分组标题 (吸顶)
  const groupContent = (index: number) => {
    return (
      <div className="px-4 py-1 text-xs font-semibold text-gray-500 bg-gray-100/95 backdrop-blur-sm">
        {groups[index]}
      </div>
    );
  };

  // 5. 渲染头部 (静态菜单)
  // 注意：Header 会随列表滚动
  const Header = () => {
    return <StaticMenuList />;
  };

  return (
    <div className="flex h-full relative">
      {/* 列表区域 */}
      <div className="flex-1 h-full">
        <GroupedVirtuoso
          ref={virtuosoRef}
          groupCounts={groupCounts}
          groupContent={groupContent}
          itemContent={itemContent}
          components={{
            Header: Header
          }}
          className="h-full scrollbar-hide"
        />
      </div>

      {/* 右侧索引条 */}
      <div className="absolute right-1 top-20 bottom-20 flex flex-col justify-center items-center z-10 w-6">
        {groups.map((group, i) => (
          <button
            key={group}
            className="text-[10px] font-medium text-gray-500 py-0.5 px-1 rounded-full w-4 h-4 flex items-center justify-center mb-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onIndexClick(i);
            }}
          >
            {group}
          </button>
        ))}
      </div>
    </div>
  );
}
