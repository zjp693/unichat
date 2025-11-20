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

export function GroupMessageAvatar({
  senderAddress,
  isCurrentUser,
  onClick
}: GroupMessageAvatarProps) {
  const { avatarUrl, isLoading } = usePeerAvatar(senderAddress);

  // 调试日志
  // console.log('🖼️ [GroupMessageAvatar]', {
  //   senderAddress,
  //   avatarUrl,
  //   isLoading,
  //   isCurrentUser
  // });

  return (
    <button
      onClick={onClick}
      className="cursor-pointer w-10 h-10 rounded-md overflow-hidden flex-shrink-0"
    >
      {isLoading ? (
        <Skeleton className="w-full h-full" />
      ) : (
        <Image
          src={avatarUrl || (isCurrentUser ? '/me/me1.png' : '/me/me2.png')}
          alt={isCurrentUser ? '我的头像' : '群成员头像'}
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
