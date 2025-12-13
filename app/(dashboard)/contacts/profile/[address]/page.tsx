'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Address } from 'viem';
import { useAccount } from 'wagmi';
import { PageHeader } from '@/components/ui/page-header';
import { ChainSelectorDropdown } from '@/components/chat/chain-selector-dropdown';
import { usePeerProfile } from '@/hooks/usePeerProfile';
import { IPFSImg } from '@/components/ui/ipfs-img';
import { Skeleton } from '@/components/ui/skeleton';

export default function ContactProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const address = params.address as string;
  const { isConnected } = useAccount();

  // 获取链上 Profile（带缓存）
  const { profile, isLoading, hasProfile } = usePeerProfile(address as Address);

  // 提取显示数据
  const displayName = useMemo(() => {
    if (hasProfile && (profile as any)?.name) {
      return (profile as any).name;
    }
    // 无 Profile，显示地址缩写
    return address
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : '未知用户';
  }, [hasProfile, profile, address]);

  const avatarCid = useMemo(() => {
    if (hasProfile && (profile as any)?.avatarCid) {
      return (profile as any).avatarCid;
    }
    return ''; // 空字符串，IPFSImg 会使用 fallbackSrc
  }, [hasProfile, profile]);

  // 复制地址
  const copyAddress = async () => {
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

  // 发消息
  const handleSendMessage = () => {
    router.push(`/chat/${address}?type=private`);
  };

  // 添加好友
  const handleAddFriend = () => {
    toast({
      title: '功能开发中',
      description: '添加好友功能即将上线'
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f5f5]">
      {/* 顶部导航栏 */}
      <div className="flex items-center px-4 py-3 bg-white">
        {isConnected ? <ChainSelectorDropdown /> : <appkit-button />}
      </div>

      {/* 二级导航 - 返回 */}
      <PageHeader />

      {/* 用户信息卡片 */}
      <div className="bg-white px-4 py-5">
        <div className="flex items-start gap-3">
          {/* 头像 */}
          <div className="w-14 h-14 rounded-sm overflow-hidden flex-shrink-0">
            {isLoading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <IPFSImg
                src={avatarCid}
                fallbackSrc="/me/me2.png"
                alt={displayName}
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* 名字和地址 */}
          <div className="flex-1 min-w-0 pt-0.5">
            {isLoading ? (
              <Skeleton className="h-5 w-24 mb-2" />
            ) : (
              <h2 className="text-base font-medium text-gray-900 mb-1">
                {displayName}
              </h2>
            )}
            <div className="flex items-center gap-1">
              <span className="text-xs text-[#909399] break-all font-mono leading-relaxed">
                {address}
              </span>
              <button onClick={copyAddress} className="flex-shrink-0 p-0.5">
                <img
                  src="/contacts/copy.svg"
                  alt="复制"
                  className="w-3.5 h-3.5 object-cover opacity-60"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 发消息按钮 */}
      <button
        onClick={handleSendMessage}
        className="w-full flex items-center justify-center gap-2 py-4 mt-3 bg-white text-[#8B5CF6] font-medium border-b border-gray-100"
      >
        <img
          src="/profile/message.png"
          alt="发消息"
          className="w-5 h-5 object-contain"
        />
        <span>发消息</span>
      </button>

      {/* 添加好友按钮 */}
      <button
        onClick={handleAddFriend}
        className="w-full flex items-center justify-center gap-2 py-4 bg-white text-[#8B5CF6] font-medium"
      >
        <img
          src="/profile/friend.png"
          alt="添加好友"
          className="w-5 h-5 object-contain"
        />
        <span>添加好友</span>
      </button>

      {/* 底部指示条 */}
      <div className="mt-auto pb-2 flex justify-center">
        <div className="w-32 h-1 bg-gray-800 rounded-full" />
      </div>
    </div>
  );
}
