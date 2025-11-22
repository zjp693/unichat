'use client';

import React from 'react';
import Image from 'next/image';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 定义布局常量，可以从公共文件导入或在此定义
const TOP_BAR_HEIGHT = 56;
const NAV_BAR_HEIGHT = 56;
const TOTAL_HEADER_HEIGHT = TOP_BAR_HEIGHT + NAV_BAR_HEIGHT;

interface GroupChatInfoPanelProps {
  conversationId: string;
  chatType: 'group' | 'private';
  memberCount: number;
  onClose: () => void;
}

export default function GroupChatInfoPanel({
  conversationId,
  chatType,
  memberCount,
  onClose
}: GroupChatInfoPanelProps) {
  // 模拟数据
  const groupName =
    conversationId === 'g_my_first_group' ? '我的群聊' : '未知群聊';
  const members = [
    { id: 'u1', name: 'keyle', avatar: '/placeholder-user.jpg' },
    { id: 'u2', name: 'ktrt', avatar: '/placeholder-user.jpg' },
    { id: 'u3', name: 'kelno', avatar: '/placeholder-user.jpg' },
    { id: 'u4', name: 'ktty', avatar: '/placeholder-user.jpg' },
    { id: 'u5', name: '你', avatar: '/placeholder-user.jpg' }
  ];

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

  const [showAllMyGroups, setShowAllMyGroups] = React.useState(false); // 控制 "我的群聊" 列表展开/收起状态
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
            <button className="text-sm px-3 py-1 border border-gray-300 rounded-full">
              BNB Chain
            </button>
          </div>
          <button className="text-sm px-3 py-1 border border-gray-300 rounded-full">
            Connect wallet
          </button>
          <button className="text-sm px-3 py-1 border border-gray-300 rounded-full">
            🇺🇸 USA
          </button>
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
        className="absolute w-full overflow-y-auto bg-white"
        style={{
          top: `${TOTAL_HEADER_HEIGHT}px`,
          bottom: 0
        }}
      >
        <div className="p-4 space-y-4">
          {/* 群成员 */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">
              群成员 ({memberCount})
            </h2>
            <div className="grid grid-cols-5 gap-y-4 text-center">
              {members.slice(0, 9).map((member) => (
                <div key={member.id} className="flex flex-col items-center">
                  <Image
                    src={member.avatar}
                    alt={member.name}
                    width={40}
                    height={40}
                    className="rounded-md"
                  />
                  <span className="text-xs mt-1 truncate w-10">
                    {member.name}
                  </span>
                </div>
              ))}
              {memberCount > 9 && (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                    +{memberCount - 9}
                  </div>
                  <span className="text-xs mt-1">更多</span>
                </div>
              )}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-500">
                  +
                </div>
                <span className="text-xs mt-1">邀请</span>
              </div>
            </div>
            <div className="flex justify-center mt-4">
              <button className="text-blue-500 text-sm">查看所有群成员</button>
            </div>
          </div>

          {/* 群信息 */}
          <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
              <span className="text-gray-700">群名称</span>
              <span className="text-gray-500">{groupName}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
              <span className="text-gray-700">群二维码</span>
              <Image src="/qrcode.png" alt="QR Code" width={24} height={24} />
            </div>
            <div className="py-2">
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
            </div>
          </div>

          {/* 置顶公告聊天 */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700">置顶公告聊天</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" value="" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* 支付设置 */}

          <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
              <span className="text-gray-700">Group digital currency</span>
              <span className="text-gray-500">ETH &gt;</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
              <span className="text-gray-700">Payment to join the group</span>
              <span className="text-gray-500">1ETH &gt;</span>
            </div>
            <div className="flex justify-between items-center py-2 last:border-b-0">
              <span className="text-gray-700">Chat payment</span>
              <span className="text-gray-500">0.01ETH &gt;</span>
            </div>
          </div>

          {/* 退出按钮 */}
          <div className="bg-white rounded-lg p-4 shadow-sm text-center">
            <button className="text-red-500 font-semibold">Exit</button>
          </div>
        </div>
      </div>
    </div>
  );
}
