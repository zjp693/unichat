'use client';

/**
 * 加入群聊页面 - 头部组件（一比一还原设计稿）
 */

import React from 'react';
import Image from 'next/image';

interface JoinGroupHeaderProps {
  groupName: string;
  memberCount: number;
  groupAddress: string;
  groupAvatar?: string;
}

export function JoinGroupHeader({
  groupName,
  memberCount,
  groupAddress,
  groupAvatar
}: JoinGroupHeaderProps) {
  return (
    <div className="bg-white px-4 pb-4">
      {/* 群头像 - 3x3 网格 */}
      <div className="flex justify-center pt-20 pb-3">
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200 p-1">
          {groupAvatar ? (
            <Image
              src={groupAvatar}
              alt={groupName}
              width={80}
              height={80}
              className="w-full h-full object-cover rounded-md"
            />
          ) : (
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-br from-purple-300 to-purple-400 rounded-sm"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 群名称 + 成员数 */}
      <div className="text-center text-base font-medium text-gray-800 mb-3">
        {groupName} ({memberCount.toLocaleString()}人)
      </div>

      {/* 群地址 */}
      <div className="text-center text-xs text-gray-400 break-all leading-relaxed px-2">
        {groupAddress}
      </div>
    </div>
  );
}
