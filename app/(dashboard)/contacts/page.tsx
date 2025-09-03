'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useReadContract } from 'wagmi';
import {
  Contact,
  tradedContacts,
  mutualFriendsContacts,
  prepareCelebrityContractCall,
  prepareGetByAddressCall,
  createCelebrityContractHooks,
  type CelebrityFromContract
} from '@/lib/contacts';
import { CelebrityListSkeleton } from './components/CelebrityListSkeleton';
import { ContactListItem } from './components/ContactListItem';
import { CelebrityListItem } from './components/CelebrityListItem';



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
      {/* 顶部导航栏 */}
      <div className="flex items-center py-2 px-2 bg-white">
        {/* <div style={{ transform: 'scale(0.85)', transformOrigin: 'left center' }}>
          <appkit-network-button />
        </div> */}

        <div className="ml-2" style={{ transform: 'scale(1)', transformOrigin: 'left center' }}>
          <appkit-button />
        </div>
        <Button
          className="ml-auto flex items-center space-x-1 !px-4 !h-7 !py-1 text-sm rounded-md border-gray-200"
          variant="outline"
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




