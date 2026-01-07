'use client';

/**
 * 加入群聊页面 - 邀请人信息组件（一比一还原设计稿）
 */

import React from 'react';
import { IPFSImg } from '@/components/ui/ipfs-img';

interface JoinGroupReferrerProps {
  avatar?: string;
  name: string;
  address: string;
  inviteCount?: number;
}

export function JoinGroupReferrer({
  avatar,
  name,
  address,
  inviteCount
}: JoinGroupReferrerProps) {
  return (
    <div className="bg-white mx-4 mt-4 rounded-lg px-4 py-3">
      <div className="text-sm text-gray-700 mb-3">邀请人</div>

      <div className="flex items-center">
        {/* 头像 */}
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 shrink-0">
          {avatar ? (
            <IPFSImg
              src={avatar}
              alt={name}
              fallbackSrc="/me/me2.png"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white text-base font-medium">
              {name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* 信息区域 */}
        <div className="flex-1 ml-3 min-w-0">
          {/* 昵称 */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-800 truncate">
              {name}
            </span>
            {inviteCount !== undefined && (
              <span className="text-xs text-gray-400 shrink-0">
                已邀请{inviteCount.toLocaleString()}人
              </span>
            )}
          </div>

          {/* 地址 */}
          <div className="text-xs text-gray-400 break-all leading-relaxed">
            {address}
          </div>
        </div>
      </div>
    </div>
  );
}
