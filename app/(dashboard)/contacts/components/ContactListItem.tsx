'use client';

import { Contact } from '@/lib/contacts';
import { AvatarWithSkeleton } from './AvatarWithSkeleton';

interface ContactListItemProps {
  contact: Contact;
  onCopyAddress: (address: string) => void;
  onViewTransactions: (contact: Contact) => void;
  isLast?: boolean;
}

export function ContactListItem({
  contact,
  onCopyAddress,
  onViewTransactions,
  isLast
}: ContactListItemProps) {
  if (!contact) return null;

  return (
    <div
      className={`flex items-center px-4 py-3 ${!isLast ? 'border-b border-gray-100' : ''}`}
    >
      {/* 头像 */}
      <div className="relative mr-3">
        <div className="w-14 h-14 rounded-lg overflow-hidden">
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
        <div
          className={`flex items-center mb-0.5 ${contact.type === 'mutual_friends' ? 'justify-start' : 'justify-between'}`}
        >
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
          {contact.type === 'mutual_friends' && (
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
            <div className="text-xs text-gray-500   break-all mr-2">
              {contact.walletAddress}
              {/* 复制按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyAddress(contact.walletAddress);
                }}
                className="pl-1 rounded flex-shrink-0 translate-y-0.5"
              >
                <img
                  src="/contacts/copy.svg"
                  alt="复制"
                  className="w-3.5 h-3.5 object-cover"
                />
              </button>
            </div>
          </div>

          {/* 查看交易按钮 - 已移除 */}
        </div>
      </div>
    </div>
  );
}
