'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Copy, Eye, Users, DollarSign, Crown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useReadContract } from 'wagmi';
import {
  Contact,
  tradedContacts,
  mutualFriendsContacts,
  formatCurrency,
  formatNetWorth,
  formatWalletAddress,
  prepareCelebrityContractCall,
  prepareGetByAddressCall,
  createCelebrityContractHooks,
  type CelebrityFromContract
} from '@/lib/contacts';

interface ContactItemProps {
  contact: Contact;
}

// 名人列表骨架屏组件
function CelebrityListSkeleton() {
  return (
    <div className="bg-white">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex items-center px-4 py-3 border-b border-gray-100">
          {/* 头像骨架 */}
          <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] mr-3 relative flex-shrink-0">
            {/* 认证徽章骨架 */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full"></div>
          </div>

          {/* 信息骨架 */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {/* 第一行：姓名和金额 */}
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded w-24"></div>
              <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded w-20"></div>
            </div>

            {/* 第二行：钱包地址 */}
            <div className="flex items-center">
              <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded w-40"></div>
            </div>
          </div>
        </div>
      ))}

    </div>
  );
}

// 头像加载组件（带骨架屏）
function AvatarWithSkeleton({ 
  src, 
  alt, 
  className 
}: { 
  src: string; 
  alt: string; 
  className?: string; 
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* 骨架屏 - 在图片加载时显示 */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded-lg"></div>
      )}
      
      {/* 实际图片 */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover rounded-lg transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setIsLoading(false)}
        onError={(e) => {
          setIsLoading(false);
          setHasError(true);
          // 如果IPFS图片加载失败，回退到默认头像
          const target = e.target as HTMLImageElement;
          if (!hasError) {
            target.src = '/me/default.png';
          }
        }}
      />
    </div>
  );
}

export default function ContactsPage() {
  const [activeTab, setActiveTab] = useState<'contacts' | 'celebrities'>(
    'contacts'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  // 是否有搜索内容
  const hasSearchTerm = searchTerm.trim().length > 0;

  // 搜索时自动跳转到名人tab（任何搜索内容都跳转）
  useEffect(() => {
    if (hasSearchTerm) {
      setActiveTab('celebrities');
    }
  }, [hasSearchTerm]);

  // 真实的智能合约调用 - 获取名人列表（无搜索时显示）
  const { 
    data: celebrityData, 
    isLoading: isLoadingCelebs, 
    error: celebError,
    refetch: refetchCelebs
  } = useReadContract(prepareCelebrityContractCall({ 
    page: 0, 
    pageSize: 50,  // 获取更多名人数据
    activeOnly: false  // 不限制活跃状态，显示所有名人
  }));

  // 搜索接口 - 用户输入任何内容后都调用此接口
  const { 
    data: searchResult, 
    isLoading: isLoadingSearch, 
    error: searchError,
    refetch: refetchSearch
  } = useReadContract(prepareGetByAddressCall(searchTerm));

  const { processContractData, handleContractError } = createCelebrityContractHooks();

  // 处理合约数据
  const contractCelebrities = processContractData(celebrityData as CelebrityFromContract[] | undefined);
  
  // 处理地址搜索结果
  const searchResultCelebrities = searchResult 
    ? processContractData([searchResult as CelebrityFromContract])
    : [];

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
    router.push(`/token/ETH/transactions?contact=${encodeURIComponent(contact.name)}&address=${encodeURIComponent(contact.walletAddress)}`);
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

  const filteredTradedContacts = filterContacts(tradedContacts);
  const filteredMutualContacts = filterContacts(mutualFriendsContacts);
  
  // 根据搜索状态决定显示的数据
  const filteredCelebrities = hasSearchTerm
    ? searchResultCelebrities  // 有搜索内容：显示合约搜索结果
    : contractCelebrities;     // 无搜索内容：显示分页数据

  return (
    <div className="flex flex-col h-full">
      {/* 顶部导航栏 - 精确还原图片布局 */}
      <div className="flex justify-between items-center py-2 px-2 bg-white">
        <Button
          variant="outline"
          className="!px-4 !h-7 !py-1 text-sm rounded-md border-gray-200"
        >
          BNB Chain
        </Button>

        <Button
          variant="outline"
          className="!px-4 !h-7 !py-1 text-sm rounded-md border-gray-200"
        >
          Commect wallet
        </Button>
        <Button
          variant="outline"
          className="flex items-center space-x-1 !px-4 !h-7 !py-1 text-sm rounded-md border-gray-200"
        >
          <div className="inline-block align-middle mr-1 w-4 h-4 rounded-full overflow-hidden">
            <Image
              src="/top/usa.png"
              alt="usa"
              className="w-full h-full object-cover"
              width={16}
              height={16}
            />
          </div>
          <span className="text-xs">USA</span>
        </Button>
      </div>

      {/* 标题 */}
      <div className="px-4 py-2 bg-white">
        <h1 className="text-base font-medium text-center">通讯录</h1>
      </div>

      {/* 搜索栏  */}
      <div className="px-4 py-3 bg-white">
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
      <div className="flex justify-between bg-white px-4 pt-2 pb-5">
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
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {activeTab === 'contacts' ? (
          <div className="">
            {/* 交易过的地址 - 分组标题 */}
            {filteredTradedContacts.length > 0 && (
              <div className="">
                <h3 className="text-xs px-4 py-3 font-medium text-gray-600 bg-[#ececec]">
                  交易过的地址
                </h3>
                <div className="bg-white  px-1">
                  {filteredTradedContacts.map((contact, index) => (
                    <ContactListItem
                      key={contact.id}
                      contact={contact}
                      onCopyAddress={copyAddress}
                      onViewTransactions={viewTransactions}
                      isLast={index === filteredTradedContacts.length - 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 共同好友的联系人 - 分组标题 */}
            {filteredMutualContacts.length > 0 && (
              <div className="">
                <h3 className="text-xs px-4 py-3  font-medium text-gray-600  bg-[#ececec]">
                  多个共同好友交易的地址
                </h3>
                <div className="bg-white rounded-lg">
                  {filteredMutualContacts.map((contact, index) => (
                    <ContactListItem
                      key={contact.id}
                      contact={contact}
                      onCopyAddress={copyAddress}
                      onViewTransactions={viewTransactions}
                      isLast={index === filteredMutualContacts.length - 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 名人列表 - 根据搜索类型显示不同数据 */
          <div className="">
            {(hasSearchTerm ? isLoadingSearch : isLoadingCelebs) ? (
              <CelebrityListSkeleton />
            ) : (hasSearchTerm && searchError) ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg mx-4 mt-4">
                <p className="text-gray-600">🔍 没有搜索到内容</p>
                <p className="text-sm text-gray-500 mt-1">
                  请尝试其他搜索词
                </p>
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
                    <p className="text-sm text-gray-500 mt-1">
                      请稍后再试
                    </p>
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
                    isLast={index === filteredCelebrities.length - 1}
                    contractData={celebrityData as CelebrityFromContract[] | undefined}
                    dataIndex={index}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 联系人项目组件
function ContactListItem({
  contact,
  onCopyAddress,
  onViewTransactions,
  isLast
}: {
  contact: Contact;
  onCopyAddress: (address: string) => void;
  onViewTransactions: (contact: Contact) => void;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center px-4 py-3 ${!isLast ? 'border-b border-gray-100' : ''}`}
    >
      {/* 头像 */}
      <div className="relative mr-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden">
          <AvatarWithSkeleton
            src={contact.avatar}
            alt={contact.name}
            className="w-full h-full"
          />
        </div>
        {/* 在线状态 */}
        {/* {contact.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
        )} */}
      </div>

      {/* 联系人信息 */}
      <div className="flex-1 min-w-0">
        {/* 第一行：姓名和金额 */}
        <div className={`flex items-center mb-0.5 ${contact.type === 'mutual_friends' ? 'justify-start' : 'justify-between'}`}>
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {contact.name}
          </h4>

          {/* 交易金额 - 精确还原图片中的$符号和金额格式 */}
          {contact.type === 'traded' && contact.transactionAmount && (
            <span className="text-sm font-semibold text-gray-900">
              $
              {contact.transactionAmount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          )}

          {/* 共同好友数 */}
          {contact.type === 'mutual_friends' && contact.mutualFriendsCount && (
            <span className="text-xs  text-gray-600 bg-zinc-100 rounded-lg ml-2  py-1.5 px-3 flex items-center">
              <img
                src="/contacts/friend.png"
                alt="friend"
                className="w-3 h-3 mr-1"
              />
              共同好友:{contact.mutualFriendsCount}个
            </span>
          )}
        </div>

        {/* 第二行：钱包地址和操作按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1 mr-3 w-[100%]">
            <div className="text-sm text-gray-500 font-mono break-all mr-2">
              {contact.walletAddress}
              {/* 复制按钮 */}
              <button
                onClick={() => onCopyAddress(contact.walletAddress)}
                className="pl-1 hover:bg-gray-100 rounded flex-shrink-0 translate-y-0.5"
              >
                <img
                  src="/contacts/copy.svg"
                  alt="复制"
                  className="w-3.5 h-3.5 object-cover"
                />
              </button>
            </div>
          </div>

          {/* 查看交易按钮 */}
          <button
            onClick={() => onViewTransactions(contact)}
            className="text-xs text-gray-600 hover:text-gray-800 flex items-center flex-shrink-0"
          >
            <span>查看交易</span>
            <svg
              className="w-3 h-3 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// 名人项目组件
function CelebrityListItem({
  contact,
  onCopyAddress,
  isLast,
  contractData,
  dataIndex
}: {
  contact: Contact;
  onCopyAddress: (address: string) => void;
  isLast?: boolean;
  contractData?: CelebrityFromContract[];
  dataIndex?: number;
}) {
  // 获取合约原始数据以获取CID
  const originalData = contractData && typeof dataIndex === 'number' ? contractData[dataIndex] : null;
  
  // 构建头像URL：使用IPFS CID
  const avatarUrl = originalData?.cid 
    ? `https://aqua-biological-spider-837.mypinata.cloud/ipfs/${originalData.cid}`
    : contact.avatar; // 如果没有CID，使用默认头像
  // 构建带参数的跳转URL - 添加钱包地址参数
  const detailUrl = `/celebrity/${contact.id}?name=${encodeURIComponent(contact.name)}&avatar=${encodeURIComponent(avatarUrl)}&address=${encodeURIComponent(contact.walletAddress)}`;
  
  return (
    <Link href={detailUrl}>
      <div
        className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 ${!isLast ? 'border-b border-gray-100' : ''}`}
      >
      {/* 头像 */}
      <div className="w-12 h-12 rounded-lg mr-3 relative flex-shrink-0">
        <AvatarWithSkeleton
          src={avatarUrl}
          alt={contact.name}
          className="w-full h-full"
        />
        {/* 认证徽章 */}
        <div className="absolute -bottom-1 -right-1">
          <img
            src="/contacts/badge.png"
            alt="认证徽章"
            className="w-4 h-4"
          />
        </div>
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* 第一行：姓名和金额 */}
        <div className="flex items-center justify-between mb-0.5">
          <h4 className="text-sm font-medium text-blue-600 truncate">
            {contact.name}
          </h4>

          {/* 净资产 */}
          {contact.netWorth && (
            <div 
              className="text-sm font-medium text-[#909399] px-2 py-1"
              style={{
                background: 'linear-gradient(270deg, #FFEFD6 0%, #FFFFFF 100%)',
                borderRadius: '4px 0px 4px 4px'
              }}
            >
              {formatNetWorth(contact.netWorth)}
            </div>
          )}
        </div>

        {/* 第二行：观察标签和钱包地址 */}
        <div className="flex items-end">
          {/* <div className="relative mr-2">
            <span 
              className="text-xs text-gray-500 px-2 py-1 inline-block"
              style={{
                backgroundImage: 'url(/contacts/observe.png)',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                width: '42px',
                textAlign: 'center'
              }}
            >
              观察
            </span>
            {contact.hasNotification && (
              <div className="absolute -top-0 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            )}
          </div> */}
          <div className="text-sm text-gray-500 font-mono">
            {contact.walletAddress}
          </div>
        </div>
      </div>
    </div>
    </Link>
  );
}


