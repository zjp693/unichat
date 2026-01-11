'use client';

/**
 * 加入群聊页面 - 群信息卡片组件（一比一还原设计稿）
 */

import React from 'react';

interface JoinGroupInfoCardsProps {
  economicModel: string;
  groupRules: string;
  announcement: string;
}

export function JoinGroupInfoCards({
  economicModel,
  groupRules,
  announcement
}: JoinGroupInfoCardsProps) {
  return (
    <div className="bg-white rounded-lg mx-4 mt-4 mb-4">
      {/* 经济模型 */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="text-sm font-medium text-gray-800 mb-2">经济模型</div>
        <div className="text-sm text-gray-500 leading-relaxed whitespace-pre-wrap">
          {economicModel || '暂无内容'}
        </div>
      </div>

      {/* 群制度 */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="text-sm font-medium text-gray-800 mb-2">群制度</div>
        <div className="text-sm text-gray-500 leading-relaxed whitespace-pre-wrap">
          {groupRules || '暂无内容'}
        </div>
      </div>

      {/* 群目标 */}
      <div className="px-4 py-3">
        <div className="text-sm font-medium text-gray-800 mb-2">群目标</div>
        <div className="text-sm text-gray-500 leading-relaxed whitespace-pre-wrap">
          {announcement || '暂无内容'}
        </div>
      </div>
    </div>
  );
}
