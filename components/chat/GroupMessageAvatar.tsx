/**
 * 群聊消息头像组件
 * 根据发送者地址动态获取并显示头像
 */

import { usePeerAvatar } from '@/hooks/usePeerProfile';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Address } from 'viem';

interface GroupMessageAvatarProps {
  senderAddress: Address;
  isCurrentUser: boolean;
  onClick?: () => void;
}

// 格式化地址显示（前6位...后4位）
export const formatAddress = (addr: Address) => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

// 获取显示名称的 hook
export const useDisplayName = (senderAddress: Address) => {
  const { name } = usePeerAvatar(senderAddress);
  return name || formatAddress(senderAddress);
};

export function GroupMessageAvatar({
  senderAddress,
  isCurrentUser,
  onClick
}: GroupMessageAvatarProps) {
  const { avatarUrl, name, isLoading } = usePeerAvatar(senderAddress);

  // 格式化地址显示（前6位...后4位）
  const formatAddress = (addr: Address) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // 显示名称：优先使用 Profile 名称，否则显示格式化的地址
  const displayName = name || formatAddress(senderAddress);

  return (
    <button
      onClick={onClick}
      className="cursor-pointer w-10 h-10 rounded-md overflow-hidden flex-shrink-0"
      title={displayName}
    >
      {isLoading ? (
        <Skeleton className="w-full h-full" />
      ) : (
        <Image
          src={avatarUrl || (isCurrentUser ? '/me/me1.png' : '/me/me2.png')}
          alt={displayName}
          width={40}
          height={40}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = isCurrentUser ? '/me/me1.png' : '/me/me2.png';
          }}
        />
      )}
    </button>
  );
}
