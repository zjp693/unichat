'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useCommunityMembers } from '@/hooks/useCommunityMembers';
import { usePeerAvatar } from '@/hooks/usePeerProfile';
import { IPFSImg } from '@/components/ui/ipfs-img';
import { ChainSelectorDropdown } from '@/components/chat/chain-selector-dropdown';
import type { Address } from 'viem';

// 定义布局常量，可以从公共文件导入或在此定义
const TOP_BAR_HEIGHT = 56;
const NAV_BAR_HEIGHT = 56;
const TOTAL_HEADER_HEIGHT = TOP_BAR_HEIGHT + NAV_BAR_HEIGHT;

// 单个成员项组件 - 显示头像和昵称
function MemberItem({ address }: { address: Address }) {
  const { avatarCid, name, isLoading } = usePeerAvatar(address);

  // 显示名称：优先使用昵称，否则显示地址缩写
  const displayName = name || `${address.slice(0, 4)}...${address.slice(-3)}`;

  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-200">
        {isLoading ? (
          <div className="w-full h-full animate-pulse bg-gray-300" />
        ) : avatarCid ? (
          <IPFSImg
            src={avatarCid}
            alt={displayName}
            fallbackSrc="/me/me2.png"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white text-sm font-medium">
            {displayName[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <span className="text-xs mt-1 truncate w-12 text-center text-gray-700">
        {displayName}
      </span>
    </div>
  );
}

interface GroupChatInfoPanelProps {
  conversationId: string;
  chatType: 'group' | 'private';
  memberCount: number;
  groupName?: string;
  onClose: () => void;
}

export default function GroupChatInfoPanel({
  conversationId,
  chatType,
  memberCount,
  groupName: initialGroupName,
  onClose
}: GroupChatInfoPanelProps) {
  // 获取群成员地址列表（最多获取100个）
  const { members: memberAddresses, isLoading: isMembersLoading } =
    useCommunityMembers(conversationId, 0, 100);

  // 控制成员列表展开/收起状态
  const [showAllMembers, setShowAllMembers] = useState(false);

  // 置顶公告聊天开关状态
  const [isPinAnnouncementEnabled, setIsPinAnnouncementEnabled] =
    useState(false);

  // 默认显示14个成员（加邀请按钮共15格，即5列x3行），展开后显示全部
  const displayedMembers = showAllMembers
    ? memberAddresses
    : memberAddresses.slice(0, 14);

  // 群名称
  const groupName = initialGroupName || '未知群聊';

  // 新增：模拟 "我的群聊" 数据
  const myGroupsData = [
    {
      id: 'g1',
      name: '闲聊吹水群',
      avatars: [
        '/placeholder-user.jpg',
        '/placeholder-user.jpg',
        '/placeholder-user.jpg'
      ]
    },
    {
      id: 'g2',
      name: '张总XX业务群',
      avatars: ['/placeholder-user.jpg', '/placeholder-user.jpg']
    },
    { id: 'g3', name: '刘总XX业务群', avatars: ['/placeholder-user.jpg'] },
    {
      id: 'g4',
      name: '何光XX业务群',
      avatars: [
        '/placeholder-user.jpg',
        '/placeholder-user.jpg',
        '/placeholder-user.jpg',
        '/placeholder-user.jpg'
      ]
    },
    { id: 'g5', name: '项目讨论群', avatars: ['/placeholder-user.jpg'] },
    {
      id: 'g6',
      name: '家人群',
      avatars: ['/placeholder-user.jpg', '/placeholder-user.jpg']
    }
  ];

  const [showAllMyGroups, setShowAllMyGroups] = useState(false); // 控制 "我的群聊" 列表展开/收起状态
  const displayedMyGroups = showAllMyGroups ? myGroupsData : []; // 修正：收起时一个也不展示

  return (
    <div className="bg-gray-100 w-full h-full relative z-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white shadow-sm">
        {/* 顶部钱包栏 - 简化，如果需要可以抽象为通用组件 */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ height: `${TOP_BAR_HEIGHT}px` }}
        >
          <div className="flex items-center gap-2">
            <ChainSelectorDropdown />
          </div>
        </div>

        {/* 页面标题栏 */}
        <div
          className="flex items-center justify-between px-4"
          style={{ height: `${NAV_BAR_HEIGHT}px` }}
        >
          <Button variant="ghost" onClick={onClose}>
            {' '}
            {/* 修改返回按钮，调用 onClose */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
          <h1 className="text-base font-medium text-black">聊天信息</h1>
          <Button variant="ghost" className="opacity-0 cursor-default">
            <MoreHorizontal className="h-6 w-6 text-black" />
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div
        className="absolute w-full overflow-y-auto bg-[#ededed]"
        style={{
          top: `${TOTAL_HEADER_HEIGHT}px`,
          bottom: 0
        }}
      >
        <div className="space-y-3">
          {/* 群成员 */}
          <div className="bg-white p-4">
            <h2 className="text-lg font-semibold mb-3">
              群成员 ({memberAddresses.length || memberCount})
            </h2>

            {isMembersLoading ? (
              // 加载中的骨架屏
              <div className="grid grid-cols-5 gap-4 text-center">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-md bg-gray-200 animate-pulse" />
                    <div className="w-10 h-3 mt-1 bg-gray-200 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : memberAddresses.length === 0 ? (
              // 没有成员
              <div className="text-center text-gray-400 py-4">暂无成员</div>
            ) : (
              // 成员列表
              <div className="grid grid-cols-5 gap-4 text-center">
                {displayedMembers.map((address) => (
                  <MemberItem key={address} address={address as Address} />
                ))}

                {/* 邀请按钮 */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-md  flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                    <span className="text-xl">+</span>
                  </div>
                </div>
              </div>
            )}

            {/* 更多群成员按钮 */}
            {memberAddresses.length > 14 && (
              <div className="flex justify-center mt-4">
                <button
                  className="text-blue-500 text-sm flex items-center gap-1"
                  onClick={() => setShowAllMembers(!showAllMembers)}
                >
                  {showAllMembers ? (
                    <>
                      收起 <span className="text-xs">▲</span>
                    </>
                  ) : (
                    <>
                      更多群成员 <span className="text-xs">▼</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 群信息 */}
          <div className="bg-white px-4 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
              <span className="text-gray-700">群名称</span>
              <span className="text-gray-500">{groupName}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
              <span className="text-gray-700">群二维码</span>
              <Image
                src="/chats/qrcode.png"
                alt="QR Code"
                width={24}
                height={24}
              />
            </div>

            {/* 群合约 */}
            <div className="py-2">
              <div className="text-gray-700 mb-1">群合约</div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 break-all">
                  {conversationId}
                </span>
                <button className="ml-2 p-1 rounded">
                  <Image
                    src="/contacts/copy.svg"
                    alt="Copy"
                    width={16}
                    height={16}
                  />
                </button>
              </div>
            </div>

            {/* 我的群聊 */}
            {/* <div className="py-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">
                  我的群聊 ({myGroupsData.length})
                </span>
                <button
                  className="text-blue-500"
                  onClick={() => setShowAllMyGroups(!showAllMyGroups)}
                >
                  {showAllMyGroups ? '收起' : '展开所有群聊'}
                </button>
              </div>
              <div className="space-y-3">
                {displayedMyGroups.map((group) => (
                  <div key={group.id} className="flex items-center space-x-3">
                    <div className="relative flex -space-x-2">
                      {group.avatars.map((avatar, index) => (
                        <Image
                          key={index}
                          src={avatar}
                          alt="Group Avatar"
                          width={24}
                          height={24}
                          className="rounded-full border border-white"
                        />
                      ))}
                    </div>
                    <span className="text-gray-700">{group.name}</span>
                  </div>
                ))}
              </div>
            </div> */}
          </div>

          {/* 代币发行信息 */}
          <div className="bg-white p-4 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-700">代币发行名称</span>
              <div className="flex items-center gap-1 text-gray-500">
                <span>选择币种</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 6L15 12L9 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-700">代币发行数量</span>
              <input
                type="text"
                placeholder="请填写数量"
                className="text-right bg-transparent border-0 p-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0 w-32"
              />
            </div>

            <div className="py-2">
              <div className="text-gray-700 mb-2">代币发行合约地址</div>
              <input
                type="text"
                placeholder="请输入..."
                className="w-full px-3 py-2 bg-gray-50 rounded-lg border-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          {/* 经济模型 */}
          <div className="bg-white p-4">
            <div className="text-gray-700 mb-2">经济模型</div>
            <textarea
              placeholder="请输入..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 rounded-lg border-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0 resize-none"
            />
          </div>

          {/* 群制度 */}
          <div className="bg-white p-4">
            <div className="text-gray-700 mb-2">群制度</div>
            <textarea
              placeholder="请输入..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 rounded-lg border-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0 resize-none"
            />
          </div>

          {/* 群公告 */}
          <div className="bg-white p-4">
            <div className="text-gray-700 mb-2">群公告</div>
            <textarea
              placeholder="请输入..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 rounded-lg border-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0 resize-none"
            />
          </div>

          {/* 邀请新人排行榜 */}
          <div className="bg-white p-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700">邀请新人排行榜</span>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="text-green-500"
              >
                <rect
                  x="4"
                  y="14"
                  width="4"
                  height="6"
                  fill="currentColor"
                  rx="1"
                />
                <rect
                  x="10"
                  y="8"
                  width="4"
                  height="12"
                  fill="currentColor"
                  rx="1"
                />
                <rect
                  x="16"
                  y="4"
                  width="4"
                  height="16"
                  fill="currentColor"
                  rx="1"
                />
              </svg>
            </div>
          </div>

          {/* 置顶公告聊天 */}
          <div className="bg-white p-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700">置顶公告聊天</span>
              <Switch
                checked={isPinAnnouncementEnabled}
                onCheckedChange={setIsPinAnnouncementEnabled}
                uncheckedColorClass="bg-gray-200"
                checkedColorClass="bg-blue-500"
              />
            </div>
          </div>

          {/* 群代币信息分组 */}
          <div className="bg-white p-4 space-y-3">
            {/* 群代币合约地址 */}
            <div className="pb-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-700">群代币合约地址</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">
                    A
                  </div>
                  <span className="text-sm text-gray-700">Arbitum</span>
                </div>
              </div>
              <input
                type="text"
                placeholder="请输入..."
                className="w-full px-3 py-2 bg-gray-50 rounded-lg border-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0"
              />
            </div>

            {/* 代币名称 */}
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-700">代币名称</span>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <circle cx="12" cy="12" r="10" fill="currentColor" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">USDT0</span>
              </div>
            </div>

            {/* 进群费用 */}
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-700">进群费用</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-700">100</span>
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <circle cx="12" cy="12" r="10" fill="currentColor" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">USDT0</span>
              </div>
            </div>

            {/* 群聊建群分配比例 */}
            <div className="pt-2">
              <div className="flex justify-between items-center py-2 mb-4">
                <span className="text-gray-700">群聊建群分配比例</span>
                <span className="text-sm text-gray-700">100%/100%</span>
              </div>

              <div className="space-y-3 pl-4 bg-[#fbfbfb] py-3 px-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    群主可获得群收益
                  </span>
                  <span className="text-sm text-gray-700">9%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    邀请人可获得群收益
                  </span>
                  <span className="text-sm text-gray-700">31%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    群成员可获得群收益
                  </span>
                  <span className="text-sm text-gray-700">60%</span>
                </div>
              </div>
            </div>
            {/* 修改并保存按钮 */}
            <div className="px-4 pb-8 pt-4">
              <button className="w-full h-12 bg-green-500 text-white rounded-full text-base font-medium shadow-lg">
                修改并保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
