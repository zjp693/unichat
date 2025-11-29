'use client';

import { usePeerAvatar } from '@/hooks/usePeerProfile';
import { IPFSImg } from '@/components/ui/ipfs-img';
import type { Address } from 'viem';

interface ClaimerAvatarProps {
  address: Address;
  isCurrentUser: boolean;
  className?: string;
}

/**
 * 领取者头像组件
 * 自动从缓存中获取真实头像和昵称
 * 不管是不是当前用户，都显示真实头像
 */
export function ClaimerAvatar({
  address,
  isCurrentUser,
  className = 'w-10 h-10'
}: ClaimerAvatarProps) {
  // 所有用户都查询真实头像
  const { avatarCid, name } = usePeerAvatar(address);

  // 如果有头像CID，显示IPFS头像
  if (avatarCid) {
    return (
      <div className={`${className} rounded-md overflow-hidden`}>
        <IPFSImg
          src={avatarCid}
          alt={name || 'Avatar'}
          fallbackSrc="/me/me2.png"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // 没有头像，显示首字母
  const initial = name ? name[0] : address.slice(2, 3).toUpperCase();

  return (
    <div
      className={`${className} rounded-md overflow-hidden bg-gray-300 flex items-center justify-center`}
    >
      <div className="text-gray-500 text-xs font-medium">{initial}</div>
    </div>
  );
}

/**
 * 领取者名称组件
 * 自动从缓存中获取真实昵称，fallback到地址缩写
 * 不管是不是当前用户，都显示真实昵称
 */
export function ClaimerName({
  address,
  isCurrentUser
}: {
  address: Address;
  isCurrentUser: boolean;
}) {
  // 所有用户都查询真实昵称
  const { name } = usePeerAvatar(address);

  // 显示真实昵称，fallback到地址缩写
  const displayName = name || `${address.slice(0, 6)}...${address.slice(-4)}`;

  return <span>{displayName}</span>;
}
