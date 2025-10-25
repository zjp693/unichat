'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch'; // 导入 Switch 组件

interface PrivateChatSettingsPanelProps {
  isOpen: boolean; // 控制面板的显示与隐藏
  onClose: () => void; // 关闭面板的回调函数
  conversationId: string; // 当前私聊的 ID，用于显示联系人信息或执行特定操作
}

const PrivateChatSettingsPanel: React.FC<PrivateChatSettingsPanelProps> = ({
  isOpen,
  onClose,
  conversationId
  // topOffset, // 移除此行
}) => {
  // 定义布局常量，从 page.tsx 复制过来
  const TOP_BAR_HEIGHT = 56;
  const NAV_BAR_HEIGHT = 56; // 新增：聊天导航栏高度

  const [isDoNotDisturbEnabled, setIsDoNotDisturbEnabled] = useState(false);
  const [isPinChatEnabled, setIsPinChatEnabled] = useState(false);

  // 消息免打扰切换处理
  const handleToggleDoNotDisturb = (checked: boolean) => {
    setIsDoNotDisturbEnabled(checked);
    console.log(`消息免打扰: ${checked ? '开启' : '关闭'}`);
    // TODO: 调用后端 API 更新消息免打扰设置
  };

  // 置顶聊天切换处理
  const handleTogglePinChat = (checked: boolean) => {
    setIsPinChatEnabled(checked);
    console.log(`置顶聊天: ${checked ? '开启' : '关闭'}`);
    // TODO: 调用后端 API 更新置顶聊天设置
  };

  // 查找聊天记录处理
  const handleSearchChatHistory = () => {
    console.log('导航到查找聊天记录');
    // TODO: 导航到聊天记录搜索页面 (例如使用 router.push('/chat/search'))
    onClose(); // 关闭面板
  };

  // 清空聊天记录处理
  const handleClearChatHistory = () => {
    if (window.confirm('确定要清空所有聊天记录吗？此操作不可逆。')) {
      console.log('清空聊天记录');
      // TODO: 调用后端 API 清空聊天记录
      onClose(); // 关闭面板
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        showCloseButton={false} // 明确设置为 false，隐藏右上角的关闭按钮
        className={cn(
          'p-0 gap-0 fixed inset-y-0 right-0 w-full sm:max-w-md bg-gray-100 flex flex-col transition-all duration-300 ease-in-out', // 添加 p-0 和 gap-0 覆盖默认填充和间距
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ top: 0, height: `100vh` }} // 调整为从最顶部开始，占据整个视口高度
      >
        {/* 顶部钱包栏 */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b bg-white"
          style={{ height: `${TOP_BAR_HEIGHT}px` }}
        >
          <div className="flex items-center gap-2">
            <appkit-button />
          </div>
          <Button
            variant="outline"
            className="rounded-full flex items-center gap-2"
          >
            <Image
              src="/top/usa.png"
              alt="USA Flag"
              width={20}
              height={20}
              className="rounded-full"
            />
            USA
          </Button>
        </div>

        {/* 面板自身的头部导航栏 */}
        <SheetHeader
          className="relative flex items-center justify-center px-3 bg-white border-b"
          style={{ height: `${NAV_BAR_HEIGHT}px` }}
        >
          <Button
            variant="ghost"
            onClick={onClose}
            className="absolute left-4 h-10 w-10 p-0"
          >
            <Image
              src="/chats/arrow_left.png"
              alt="返回"
              width={10}
              height={10}
              className="text-black"
            />
          </Button>
          <SheetTitle className="text-center text-lg font-medium text-black">
            聊天信息
          </SheetTitle>
        </SheetHeader>

        {/* 联系人信息区域 (从头像开始设计) */}
        <div className="bg-white  mb-2 py-2 px-2">
          <div className="flex flex-wrap  items-start gap-4">
            {[...Array(10)].map((_, index) => (
              <div
                key={index}
                className="flex flex-col w-12 justify-center items-center"
              >
                <div className="mb-1 relative w-10 h-10 rounded-full overflow-hidden">
                  <Image
                    src="/placeholder-user.jpg"
                    alt="联系人头像"
                    width={1}
                    height={1}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="text-center text-xs font-medium mb-2 truncate w-full">
                  A-ZH{index}
                </div>
              </div>
            ))}
          </div>
          {/* 移除顶部的 Plus 按钮，因为它在循环的每个联系人下方不需要 */}
          {/* <Button variant="ghost" className="h-10 w-10 p-0 rounded-full bg-gray-200 hover:bg-gray-300">
            <Plus className="h-5 w-5 text-gray-700" />
          </Button> */}
        </div>

        {/* 功能选项列表 */}
        <div className="flex-1 overflow-y-auto bg-gray-100">
          <div className="space-y-px mb-2">
            {/* 查找聊天记录 */}
            <div
              className="flex items-center justify-between bg-white px-6 py-4 hover:bg-gray-50 cursor-pointer"
              onClick={handleSearchChatHistory}
            >
              <span className="text-base">查找聊天记录</span>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>

            {/* 消息免打扰 */}
            <div className="flex items-center justify-between bg-white px-6 py-4">
              <span className="text-base">消息免打扰</span>
              <Switch
                checked={isDoNotDisturbEnabled}
                onCheckedChange={handleToggleDoNotDisturb}
                checkedColorClass="bg-[#5436f1]" // 选中
                uncheckedColorClass="bg-gray-200" // 未选中
              />
            </div>

            {/* 置顶聊天 */}
            <div className="flex items-center justify-between px-6 py-4 bg-white">
              <span className="text-base">置顶聊天</span>
              <Switch
                checked={isPinChatEnabled}
                onCheckedChange={handleTogglePinChat}
                checkedColorClass="bg-[#5436f1]" // 选中
                uncheckedColorClass="bg-gray-200" // 未选中
              />
            </div>
          </div>

          <div className="space-y-px bg-white mt-2">
            {/* 清空聊天记录 */}
            <div
              className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer"
              onClick={handleClearChatHistory}
            >
              <span className="text-base">清空聊天记录</span>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PrivateChatSettingsPanel;
