'use client';

import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

interface TopNavbarProps {
  className?: string;
}

export function TopNavbar({ className }: TopNavbarProps) {
  const [isClearing, setIsClearing] = useState(false);

  const handleClearKeys = () => {
    // 检查是否有密钥
    const chatKeys = localStorage.getItem('chat_keys');
    if (!chatKeys) {
      console.log('ℹ️ 当前没有存储的密钥');
      alert('当前没有存储的密钥');
      return;
    }

    try {
      const keys = JSON.parse(chatKeys);
      const keysCount = Array.isArray(keys) ? keys.length : 0;

      if (keysCount === 0) {
        console.log('ℹ️ 当前没有存储的密钥');
        alert('当前没有存储的密钥');
        return;
      }

      const confirmed = window.confirm(
        `确定要清除所有本地密钥吗？\n\n当前有 ${keysCount} 个密钥\n\n此操作不可恢复！`
      );

      if (confirmed) {
        setIsClearing(true);
        console.log('🗑️ 开始清除密钥...');
        console.log('清除前的值:', localStorage.getItem('chat_keys'));

        // 直接删除 localStorage
        localStorage.removeItem('chat_keys');

        // 验证是否真的清除了
        const afterRemove = localStorage.getItem('chat_keys');
        console.log('清除后的值:', afterRemove);

        if (afterRemove === null) {
          console.log(
            '✅ 已成功清除所有本地密钥！localStorage.removeItem 执行成功'
          );
          alert('✅ 已成功清除所有本地密钥！\n\n你现在可以重新生成并上链了。');
        } else {
          console.error('❌ 清除失败！localStorage 中仍有数据:', afterRemove);
          alert('⚠️ 清除失败，请重试');
        }
      } else {
        console.log('🚫 用户取消清除操作');
      }
    } catch (error) {
      console.error('❌ 清除密钥时发生错误:', error);
      alert(
        '清除密钥失败：' + (error instanceof Error ? error.message : '未知错误')
      );
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div
      className={`flex items-center justify-between py-4 px-4 bg-white border-gray-200 ${className || ''}`}
    >
      {/* 钱包连接按钮 */}
      <appkit-button />

      <div className="flex items-center gap-2">
        {/* 清除密钥按钮 */}
        <button
          onClick={handleClearKeys}
          disabled={isClearing}
          className="flex items-center gap-1 px-3 py-2 text-xs border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="清除本地密钥"
        >
          <Trash2 size={14} className="text-red-500" />
          <span className="text-red-500 font-medium">
            {isClearing ? '清除中...' : '清除密钥'}
          </span>
        </button>

        {/* 国家/地区按钮 */}
        <div className="flex items-center px-2 py-0 text-xs border h-9 border-gray-200 rounded-xl">
          <div className="inline-block align-middle mr-3 w-4 h-4 rounded-full overflow-hidden">
            <Image
              src="/top/usa.png"
              alt="USA"
              className="w-full h-full object-cover"
              width={16}
              height={16}
            />
          </div>
          <span className="font-bold">USA</span>
        </div>
      </div>
    </div>
  );
}
