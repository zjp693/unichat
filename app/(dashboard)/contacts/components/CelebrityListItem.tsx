'use client';

import Link from 'next/link';
import { Contact, formatNetWorth } from '@/lib/contacts';
import { AvatarWithSkeleton } from './AvatarWithSkeleton';
import type { CelebrityFromContract } from '@/lib/contacts';

interface CelebrityListItemProps {
  contact: Contact;
  onCopyAddress: (address: string) => void;
  isLast?: boolean;
  contractData?: CelebrityFromContract[];
  dataIndex?: number;
}

export function CelebrityListItem({
  contact,
  onCopyAddress,
  isLast,
  contractData,
  dataIndex
}: CelebrityListItemProps) {
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
