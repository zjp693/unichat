'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { TopNavbar } from '@/components/ui/top-navbar';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import {
  ArrowLeft,
  MoreHorizontal,
  MessageCircle,
  Phone,
  UserPlus
} from 'lucide-react';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const address = params.address as string;
  const isFriend = searchParams.get('type') === 'friend';

  // Mock 数据
  const userData = {
    name: 'James',
    avatar: '/me/me2.png',
    walletAddress: address || '0x052cc4e91eaDC9a40BF66F4b6f62BE4F9c0559ab',
    friendNote: '工作伙伴',
    friendMemo: '重要联系人'
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(userData.walletAddress);
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

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* TopNavbar 组件 */}
      <TopNavbar />

      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <button onClick={handleBack} className="p-1">
          <ArrowLeft className="h-6 w-6 text-gray-900" />
        </button>
        <h1 className="text-base font-medium text-center flex-1">
          点击头像 ({isFriend ? '好友' : '非好友'})
        </h1>
        <button className="p-1">
          <MoreHorizontal className="h-6 w-6 text-gray-900" />
        </button>
      </div>

      {/* 用户信息区域 */}
      <div className="bg-white px-4 py-6">
        <div className="flex flex-col items-center">
          {/* 头像 */}
          <div className="w-20 h-20 rounded-full overflow-hidden mb-4">
            <Image
              src={userData.avatar}
              alt={userData.name}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>

          {/* 名字 */}
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            {userData.name}
          </h2>

          {/* 钱包地址 */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 break-all font-mono">
              {userData.walletAddress}
            </span>
            <button
              onClick={copyAddress}
              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
            >
              <img
                src="/contacts/copy.svg"
                alt="复制"
                className="w-3.5 h-3.5 object-cover"
              />
            </button>
          </div>
        </div>
      </div>

      {/* 朋友资料卡片（仅好友显示） */}
      {isFriend && (
        <div className="mx-4 mt-4 bg-[#f5f5f5] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                朋友资料
              </h3>
              <p className="text-xs text-gray-500">添加朋友的备注名、备忘等</p>
            </div>
            <svg
              className="w-4 h-4 text-gray-400"
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
          </div>
        </div>
      )}

      {/* 操作按钮区域 */}
      <div className="flex-1 px-4 pt-6 pb-4">
        <div className="space-y-3">
          {/* 发消息按钮 */}
          <button className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 rounded-lg text-[#8B5CF6] font-medium">
            <MessageCircle className="w-5 h-5" />
            <span>发消息</span>
          </button>

          {/* 第二个按钮 - 根据是否好友显示不同 */}
          {isFriend ? (
            <button className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 rounded-lg text-[#8B5CF6] font-medium">
              <Phone className="w-5 h-5" />
              <span>语音聊天</span>
            </button>
          ) : (
            <button className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 rounded-lg text-[#8B5CF6] font-medium">
              <UserPlus className="w-5 h-5" />
              <span>添加好友</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
