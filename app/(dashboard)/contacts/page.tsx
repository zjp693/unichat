'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useReadContract, useAccount } from 'wagmi';
import { ChainSelectorDropdown } from '@/components/chat/chain-selector-dropdown';
import {
  Contact,
  prepareGetByAddressCall,
  createCelebrityContractHooks,
  type CelebrityFromContract
} from '@/lib/contacts';
import { useCelebrityPagination } from '@/lib/useCelebrityPagination';
import { CelebrityListSkeleton } from './components/CelebrityListSkeleton';
import { CelebrityListItemSkeleton } from './components/CelebrityListItemSkeleton';
import { ContactListItem } from './components/ContactListItem';
import { CelebrityListItem } from './components/CelebrityListItem';
import { ContactListWithIndex } from './components/ContactListWithIndex';

// Cursor 类型定义
interface Cursor {
  total_usd_qualified: string;
  counterparty_address: string;
}

export default function ContactsPage() {
  const [activeTab, setActiveTab] = useState<'contacts' | 'celebrities'>(
    'contacts'
  );
  const [searchTerm, setSearchTerm] = useState('');

  // 交易过的地址相关状态
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [hasMoreRecent, setHasMoreRecent] = useState(false);
  const [nextCursor, setNextCursor] = useState<Cursor | null>(null);
  const [hasLoadedRecent, setHasLoadedRecent] = useState(false);

  // 多个共同好友交易的地址相关状态
  const [mutualFriendsContacts, setMutualFriendsContacts] = useState<Contact[]>(
    []
  );
  const [isLoadingMutual, setIsLoadingMutual] = useState(false);
  const [hasLoadedMutual, setHasLoadedMutual] = useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const { address: currentAddress, isConnected } = useAccount();

  // 是否有搜索内容
  const hasSearchTerm = searchTerm.trim().length > 0;

  // 搜索时自动跳转到名人tab（任何搜索内容都跳转）
  useEffect(() => {
    if (hasSearchTerm) {
      setActiveTab('celebrities');
    }
  }, [hasSearchTerm]);

  // 分页加载名人（首次 10 条，滚动加载更多）
  const {
    celebrities: pagedCelebrities,
    rawPages,
    pageSize,
    page,
    isLoading: isLoadingCelebs,
    isLoadingMore,
    hasMore,
    error: celebError,
    loadNext,
    reset: resetCelebPagination
  } = useCelebrityPagination({
    pageSize: 10,
    activeOnly: false,
    enabled: true
  });

  // 原始合约数据合集（用于传给 CelebrityListItem 获取 CID）
  const celebrityData = rawPages.flat();

  // 搜索接口 - 用户输入任何内容后都调用此接口
  const {
    data: searchResult,
    isLoading: isLoadingSearch,
    error: searchError,
    refetch: refetchSearch
  } = useReadContract(prepareGetByAddressCall(searchTerm));

  const { processContractData, handleContractError } =
    createCelebrityContractHooks();

  // 处理合约数据 -（原始数据在分页 hook 中处理为 pagedCelebrities）

  // 处理地址搜索结果
  const searchResultCelebrities = searchResult
    ? processContractData([searchResult as CelebrityFromContract])
    : [];

  // 当搜索或切换 tab 时需要重置分页
  useEffect(() => {
    if (hasSearchTerm) {
      // 切换到名人tab 已在上层 effect 中处理
      resetCelebPagination();
    }
  }, [hasSearchTerm, resetCelebPagination]);

  // 从数据库获取交易过的地址（情况一：首页查询和分页）
  useEffect(() => {
    if (!isConnected || !currentAddress) {
      setRecentContacts([]);
      setHasLoadedRecent(false);
      setHasMoreRecent(false);
      setNextCursor(null);
      return;
    }

    // 首次加载：获取前10条
    const fetchRecentContacts = async (cursor: Cursor | null = null) => {
      if (cursor === null) {
        // 首次加载，重置状态
        setIsLoadingRecent(true);
        setRecentContacts([]);
      }

      try {
        const params = new URLSearchParams({
          userAddress: currentAddress
        });

        if (cursor) {
          params.append('cursor', JSON.stringify(cursor));
        }

        const response = await fetch(
          `/api/contacts/recent?${params.toString()}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || '获取联系人失败');
        }

        const data = await response.json();

        // 将数据库数据转换为 Contact 格式
        const contacts: Contact[] = (data.contacts || []).map((row: any) => ({
          id: `recent_${row.counterparty_address}`,
          name: `${row.counterparty_address.slice(0, 6)}...${row.counterparty_address.slice(-4)}`,
          walletAddress: row.counterparty_address,
          avatar: '/me/me1.png', // 默认头像
          type: 'traded' as const,
          transactionAmount: parseFloat(row.total_usd_qualified) || 0,
          isOnline: false
        }));

        if (cursor) {
          // 分页加载：追加数据
          setRecentContacts((prev) => [...prev, ...contacts]);
        } else {
          // 首次加载：替换数据
          setRecentContacts(contacts);
        }

        setHasMoreRecent(data.hasMore || false);
        setNextCursor(data.nextCursor || null);
        setHasLoadedRecent(true);
      } catch (error) {
        console.error('获取最近联系人失败:', error);
        setHasLoadedRecent(true);
        setHasMoreRecent(false);
        if (!cursor) {
          // 首次加载失败，显示空状态
          setRecentContacts([]);
        }
      } finally {
        setIsLoadingRecent(false);
      }
    };

    fetchRecentContacts();
  }, [currentAddress, isConnected]);

  // 加载更多（分页）
  const loadMoreRecent = async () => {
    if (!nextCursor || isLoadingRecent || !hasMoreRecent) return;

    setIsLoadingRecent(true);
    try {
      const params = new URLSearchParams({
        userAddress: currentAddress!,
        cursor: JSON.stringify(nextCursor)
      });

      const response = await fetch(`/api/contacts/recent?${params.toString()}`);

      if (!response.ok) {
        throw new Error('加载更多失败');
      }

      const data = await response.json();

      const contacts: Contact[] = (data.contacts || []).map((row: any) => ({
        id: `recent_${row.counterparty_address}`,
        name: `${row.counterparty_address.slice(0, 6)}...${row.counterparty_address.slice(-4)}`,
        walletAddress: row.counterparty_address,
        avatar: '/me/me1.png',
        type: 'traded' as const,
        transactionAmount: parseFloat(row.total_usd_qualified) || 0,
        isOnline: false
      }));

      setRecentContacts((prev) => [...prev, ...contacts]);
      setHasMoreRecent(data.hasMore || false);
      setNextCursor(data.nextCursor || null);
    } catch (error) {
      console.error('加载更多失败:', error);
      toast({
        title: '加载失败',
        description: '无法加载更多联系人',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingRecent(false);
    }
  };

  // loadMoreRecent 函数引用（用于 IntersectionObserver）
  const loadMoreRecentRef = useRef(loadMoreRecent);
  useEffect(() => {
    loadMoreRecentRef.current = loadMoreRecent;
  }, [loadMoreRecent]);

  // 从数据库获取多个共同好友交易的地址（情况二）
  useEffect(() => {
    // 只有在交易过的地址加载完成且没有更多数据时才加载
    if (!isConnected || !currentAddress || !hasLoadedRecent || hasMoreRecent) {
      return;
    }

    const fetchMutualFriendsContacts = async () => {
      setIsLoadingMutual(true);
      try {
        const response = await fetch(
          `/api/contacts/mutual-friends?userAddress=${encodeURIComponent(currentAddress)}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || '获取共同好友联系人失败');
        }

        const data = await response.json();

        // 将数据库数据转换为 Contact 格式（包括 mutual_friends_cnt < 2 的情况）
        const contacts: Contact[] = (data.contacts || []).map((row: any) => ({
          id: `mutual_${row.target}`,
          name: `${row.target.slice(0, 6)}...${row.target.slice(-4)}`,
          walletAddress: row.target,
          avatar: '/me/me2.png', // 默认头像
          type: 'mutual_friends' as const,
          mutualFriendsCount: row.mutual_friends_cnt || 0, // 如果没有值，默认为0
          isOnline: false
        }));

        setMutualFriendsContacts(contacts);
        setHasLoadedMutual(true);
      } catch (error) {
        console.error('获取共同好友联系人失败:', error);
        setMutualFriendsContacts([]);
        setHasLoadedMutual(true);
      } finally {
        setIsLoadingMutual(false);
      }
    };

    fetchMutualFriendsContacts();
  }, [currentAddress, isConnected, hasLoadedRecent, hasMoreRecent]);

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

  // 查看交易记录
  const viewTransactions = (contact: Contact) => {
    // 跳转到交易记录页面，使用ETH作为默认symbol
    router.push(
      `/token/ETH/transactions?contact=${encodeURIComponent(contact.name)}&address=${encodeURIComponent(contact.walletAddress)}`
    );
  };

  // 过滤联系人
  const filterContacts = (contacts: Contact[]) => {
    if (!searchTerm) return contacts;
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.walletAddress.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // 使用真实数据
  const filteredTradedContacts = filterContacts(recentContacts);
  const filteredMutualContacts = filterContacts(mutualFriendsContacts);

  // 根据搜索状态决定显示的数据
  const contractCelebrities = pagedCelebrities;

  const filteredCelebrities = hasSearchTerm
    ? searchResultCelebrities
    : contractCelebrities;

  // 自动下拉加载：使用 IntersectionObserver 观察 sentinel（名人列表）
  useEffect(() => {
    if (hasSearchTerm) return; // 搜索状态下不触发分页加载

    const sentinel = document.getElementById('celebrity-list-sentinel');
    if (!sentinel) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !isLoadingCelebs) {
            loadNext();
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.25
      }
    );

    io.observe(sentinel);
    return () => io.disconnect();
  }, [hasSearchTerm, hasMore, isLoadingCelebs, loadNext]);

  // 自动下拉加载：使用 IntersectionObserver 观察 sentinel（交易过的地址）
  useEffect(() => {
    if (activeTab !== 'contacts' || hasSearchTerm) return;

    const sentinel = document.getElementById('recent-contacts-sentinel');
    if (!sentinel) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMoreRecent && !isLoadingRecent) {
            loadMoreRecentRef.current();
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.25
      }
    );

    io.observe(sentinel);
    return () => io.disconnect();
  }, [activeTab, hasSearchTerm, hasMoreRecent, isLoadingRecent]);

  return (
    <div className="flex flex-col h-screen">
      {/* 顶部导航栏 */}
      <div className="flex items-center py-4 px-4 bg-white">
        <ChainSelectorDropdown />
      </div>

      {/* 标题 */}
      {/* <div className="px-4 py-2 bg-white flex-shrink-0">
        <h1 className="text-base font-medium text-center">通讯录</h1>
      </div> */}

      {/* 搜索栏  */}
      <div className="px-4 py-3 bg-white flex-shrink-0">
        <div className="relative bg-gray-100 rounded-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="请输入搜索内容"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-transparent border-none focus:outline-none text-sm"
          />
        </div>
      </div>

      {/* 切换标签 -   */}
      <div className="flex justify-between bg-white px-4 pt-2 pb-5 flex-shrink-0">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex justify-center items-center px-6 py-2 rounded-full w-6/12 text-sm font-medium transition-colors mr-2 ${
            activeTab === 'contacts'
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <div className="inline-block align-middle mr-1 w-4 h-4 rounded-full overflow-hidden">
            <Image
              src={
                activeTab === 'contacts'
                  ? '/contacts/addressBook_before.png'
                  : '/contacts/addressBook_after.png'
              }
              alt="通讯录"
              className="w-full h-full object-cover"
              width={16}
              height={16}
            />
          </div>

          <span className="text-sm">通讯录</span>
        </button>
        <button
          onClick={() => setActiveTab('celebrities')}
          className={`flex justify-center items-center px-6 py-2 w-6/12 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'celebrities'
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <div className="inline-block align-middle mr-1 w-4 h-4 rounded-full overflow-hidden">
            <Image
              src={
                activeTab === 'celebrities'
                  ? '/contacts/hot_before.png'
                  : '/contacts/hot_after.png'
              }
              alt="名人"
              className="w-full h-full object-cover"
              width={16}
              height={16}
            />
          </div>

          <span className="text-sm">名人</span>
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden bg-gray-50 pb-[70px]">
        {activeTab === 'contacts' ? (
          <ContactListWithIndex />
        ) : (
          /* 名人列表 - 根据搜索类型显示不同数据 */
          <div className="">
            {(() => {
              const showFullSkeleton = hasSearchTerm
                ? isLoadingSearch
                : isLoadingCelebs && page === 0 && !isLoadingMore;
              return showFullSkeleton;
            })() ? (
              <CelebrityListSkeleton />
            ) : hasSearchTerm && searchError ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg mx-4 mt-4">
                <p className="text-gray-600">🔍 没有搜索到内容</p>
                <p className="text-sm text-gray-500 mt-1">请尝试其他搜索词</p>
              </div>
            ) : filteredCelebrities.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg mx-4 mt-4">
                {hasSearchTerm ? (
                  <>
                    <p className="text-gray-600">🔍 没有搜索到内容</p>
                    <p className="text-sm text-gray-500 mt-1">
                      请尝试其他搜索词
                    </p>
                  </>
                ) : celebError ? (
                  <>
                    <p className="text-gray-600">📭 智能合约中暂无名人数据</p>
                    <p className="text-sm text-gray-500 mt-1">
                      请确保合约中已添加名人数据，或检查合约地址是否正确
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600">📭 暂无数据</p>
                    <p className="text-sm text-gray-500 mt-1">请稍后再试</p>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white">
                {filteredCelebrities.map((contact, index) => (
                  <CelebrityListItem
                    key={contact.id}
                    contact={contact}
                    onCopyAddress={copyAddress}
                    isLast={
                      index === filteredCelebrities.length - 1 && !hasMore
                    }
                    contractData={
                      celebrityData as CelebrityFromContract[] | undefined
                    }
                    dataIndex={index}
                  />
                ))}

                {/* sentinel for infinite scroll */}
                {/* 当正在加载更多时，只渲染若干条骨架项在列表底部（追加到列表末尾） */}
                {isLoadingMore &&
                  Array.from({ length: pageSize }).map((_, i) => (
                    <CelebrityListItemSkeleton key={`skeleton-${i}`} />
                  ))}

                {/* 当没有更多时展示提示 */}
                {!isLoadingMore && !hasMore && (
                  <div className="h-8 flex items-center justify-center text-sm text-gray-400">
                    没有更多了
                  </div>
                )}

                {/* 专门的 sentinel：放在列表最末尾，IntersectionObserver 观察此小元素以触发下一页加载 */}
                <div id="celebrity-list-sentinel" className="h-1" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
