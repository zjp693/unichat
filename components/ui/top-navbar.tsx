'use client';

import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

interface TopNavbarProps {
  className?: string;
}

export function TopNavbar({ className }: TopNavbarProps) {
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [keysCount, setKeysCount] = useState(0);

  const handleClearKeys = () => {
    // 检查是否有密钥
    const chatKeys = localStorage.getItem('chat_keys');
    if (!chatKeys) {
      return;
    }

    try {
      const keys = JSON.parse(chatKeys);
      const count = Array.isArray(keys) ? keys.length : 0;

      if (count === 0) {
        return;
      }

      // 显示确认弹窗
      setKeysCount(count);
      setShowConfirm(true);
    } catch (error) {
      console.error('❌ 解析密钥失败:', error);
    }
  };

  const handleConfirmClear = () => {
    setShowConfirm(false);
    setIsClearing(true);

    // 直接删除 localStorage
    localStorage.removeItem('chat_keys');

    // 验证是否真的清除了
    const afterRemove = localStorage.getItem('chat_keys');

    if (afterRemove === null) {
    } else {
      console.error('❌ 清除失败！localStorage 中仍有数据:', afterRemove);
    }

    setIsClearing(false);
  };

  return (
    <>
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
            className="flex items-center gap-1 px-1 py-1 text-xs border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} className="text-red-500" />
            <span className="text-red-500 font-medium">
              {isClearing ? '清除中...' : '清除'}
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

      {/* 确认清除弹窗 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-xl p-6 space-y-4 shadow-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                清除所有本地密钥
              </h3>
              <p className="text-sm text-gray-600">
                确定要清除所有本地密钥吗？
              </p>
              <p className="text-sm text-gray-600 mt-1">
                当前有 {keysCount} 个密钥
              </p>
              <p className="text-xs text-red-600 mt-2">此操作不可恢复！</p>
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium"
                onClick={() => setShowConfirm(false)}
              >
                取消
              </button>
              <button
                className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium"
                onClick={handleConfirmClear}
              >
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
