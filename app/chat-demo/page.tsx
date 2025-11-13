'use client';

import { useState } from 'react';
import { ChatNavigationBar } from '@/components/chat/chat-navigation-bar';
import { useRouter } from 'next/navigation';

export default function ChatNavigationDemo() {
  const router = useRouter();
  const [copiedAddress, setCopiedAddress] = useState('');

  const handleAddressCopy = (address: string) => {
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(''), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          聊天导航栏组件演示
        </h1>

        {/* 复制提示 */}
        {copiedAddress && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
            地址已复制: {copiedAddress.slice(0, 10)}...
          </div>
        )}

        {/* 群聊模式 - 不同等级 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">群聊模式（不同等级）</h2>

          <div className="space-y-6">
            {/* LV1 - 浅蓝色 */}
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <h3 className="bg-gray-100 px-4 py-2 text-sm font-medium">
                LV1 - 浅蓝色主题
              </h3>
              <ChatNavigationBar
                mode="group"
                chatInfo={{
                  name: 'BNB 比特鱼鱼 LV1',
                  level: 1,
                  address: '0x052cc4e91eaDC9a40BF66F4b8f82BE4f3e0559ab',
                  // memberCount: 234,
                  avatar: '/placeholder-user.jpg'
                }}
                topSection={{
                  regionCode: 'USA',
                  regionFlag: '/top/usa.png'
                }}
                onBack={() => console.log('返回')}
                onMenuClick={() => console.log('菜单')}
                onAddressCopy={handleAddressCopy}
              />
            </div>

            {/* LV2 - 蓝色 */}
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <h3 className="bg-gray-100 px-4 py-2 text-sm font-medium">
                LV2 - 蓝色主题
              </h3>
              <ChatNavigationBar
                mode="group"
                chatInfo={{
                  name: 'BNB 以太飞鱼 LV2',
                  level: 2,
                  address: '0x052cc4e91eaDC9a40BF66F4b8f82BE4f3e0559ab',
                  // memberCount: 234,
                  avatar: '/placeholder-user.jpg'
                }}
                topSection={{
                  regionCode: 'USA',
                  regionFlag: '/top/usa.png'
                }}
                onBack={() => console.log('返回')}
                onMenuClick={() => console.log('菜单')}
                onAddressCopy={handleAddressCopy}
              />
            </div>

            {/* LV3 - 紫色 */}
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <h3 className="bg-gray-100 px-4 py-2 text-sm font-medium">
                LV3 - 紫色主题
              </h3>
              <ChatNavigationBar
                mode="group"
                chatInfo={{
                  name: 'BNB POW 小屋 LV3',
                  level: 3,
                  address: '0x052cc4e91eaDC9a40BF66F4b8f82BE4f3e0559ab',
                  // memberCount: 234,
                  avatar: '/placeholder-user.jpg'
                }}
                topSection={{
                  regionCode: 'USA',
                  regionFlag: '/top/usa.png'
                }}
                onBack={() => console.log('返回')}
                onMenuClick={() => console.log('菜单')}
                onAddressCopy={handleAddressCopy}
              />
            </div>

            {/* LV4 - 黄色 */}
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <h3 className="bg-gray-100 px-4 py-2 text-sm font-medium">
                LV4 - 黄色主题
              </h3>
              <ChatNavigationBar
                mode="group"
                chatInfo={{
                  name: 'BNB DEFI 中枢 LV4',
                  level: 4,
                  address: '0x052cc4e91eaDC9a40BF66F4b8f82BE4f3e0559ab',
                  // memberCount: 234,
                  avatar: '/placeholder-user.jpg'
                }}
                topSection={{
                  regionCode: 'USA',
                  regionFlag: '/top/usa.png'
                }}
                onBack={() => console.log('返回')}
                onMenuClick={() => console.log('菜单')}
                onAddressCopy={handleAddressCopy}
              />
            </div>

            {/* LV5 - 红色 */}
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <h3 className="bg-gray-100 px-4 py-2 text-sm font-medium">
                LV5 - 红色主题
              </h3>
              <ChatNavigationBar
                mode="group"
                chatInfo={{
                  name: 'BNB AI 巨鲸 LV5',
                  level: 5,
                  address: '0x052cc4e91eaDC9a40BF66F4b8f82BE4f3e0559ab',
                  // memberCount: 234,
                  avatar: '/placeholder-user.jpg'
                }}
                topSection={{
                  regionCode: 'USA',
                  regionFlag: '/top/usa.png'
                }}
                onBack={() => console.log('返回')}
                onMenuClick={() => console.log('菜单')}
                onAddressCopy={handleAddressCopy}
              />
            </div>

            {/* LV6 - 黑色 */}
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <h3 className="bg-gray-100 px-4 py-2 text-sm font-medium">
                LV6 - 黑色主题
              </h3>
              <ChatNavigationBar
                mode="group"
                chatInfo={{
                  name: 'BNB 星宇蓝鲸 LV6',
                  level: 6,
                  address: '0x052cc4e91eaDC9a40BF66F4b8f82BE4f3e0559ab',
                  // memberCount: 234,
                  avatar: '/placeholder-user.jpg'
                }}
                topSection={{
                  regionCode: 'USA',
                  regionFlag: '/top/usa.png'
                }}
                onBack={() => console.log('返回')}
                onMenuClick={() => console.log('菜单')}
                onAddressCopy={handleAddressCopy}
              />
            </div>
          </div>
        </section>

        {/* 私聊模式 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">私聊模式</h2>

          <div className="space-y-6">
            {/* 普通私聊 */}
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <h3 className="bg-gray-100 px-4 py-2 text-sm font-medium">
                普通私聊
              </h3>
              <ChatNavigationBar
                mode="private"
                chatInfo={{
                  name: '张三',
                  address: '0x052cc4e91eaDC9a40BF66F4b8f82BE4f3e0559ab',
                  avatar: '/placeholder-user.jpg'
                }}
                topSection={{
                  regionCode: 'USA',
                  regionFlag: '/top/usa.png'
                }}
                onBack={() => console.log('返回')}
                onMenuClick={() => console.log('菜单')}
                onAddressCopy={handleAddressCopy}
              />
            </div>

            {/* 长名称私聊 */}
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <h3 className="bg-gray-100 px-4 py-2 text-sm font-medium">
                长名称私聊（自动截断）
              </h3>
              <ChatNavigationBar
                mode="private"
                chatInfo={{
                  name: '长长的名字长长的名字长长的名字长长的名字',
                  address: '0x052cc4e91eaDC9a40BF66F4b8f82BE4f3e0559ab',
                  avatar: '/placeholder-user.jpg'
                }}
                topSection={{
                  chainName: 'Ethereum',
                  regionCode: 'CHN',
                  regionFlag: '/top/usa.png'
                }}
                onBack={() => console.log('返回')}
                onMenuClick={() => console.log('菜单')}
                onAddressCopy={handleAddressCopy}
              />
            </div>

            {/* 不显示钱包按钮 */}
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <h3 className="bg-gray-100 px-4 py-2 text-sm font-medium">
                隐藏钱包按钮
              </h3>
              <ChatNavigationBar
                mode="private"
                chatInfo={{
                  name: '李四',
                  address: '0x052cc4e91eaDC9a40BF66F4b8f82BE4f3e0559ab',
                  avatar: '/placeholder-user.jpg'
                }}
                topSection={{
                  chainName: 'Polygon',
                  regionCode: 'JPN',
                  regionFlag: '/top/usa.png',
                  showWalletButton: false
                }}
                onBack={() => console.log('返回')}
                onMenuClick={() => console.log('菜单')}
                onAddressCopy={handleAddressCopy}
              />
            </div>
          </div>
        </section>

        {/* 使用说明 */}
        <section className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">组件特性</h2>
          <ul className="space-y-2 text-sm">
            <li>✅ 支持群聊和私聊两种模式</li>
            <li>✅ 6 个等级对应 6 种渐变背景色</li>
            <li>✅ 完全可配置的顶部和底部内容</li>
            <li>✅ 点击地址自动复制到剪贴板</li>
            <li>✅ 响应式设计，适配移动端</li>
            <li>✅ 所有按钮支持悬停和点击效果</li>
            <li>✅ 与现有 top-navbar.tsx 样式保持一致</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
