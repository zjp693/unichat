'use client';

/**
 * 加入群聊页面
 *
 * 通过邀请链接进入的页面，显示群信息并提供加入功能
 * URL: /join?code=0x...&group=0x...
 */

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGroupJoinInfo } from '@/hooks/useGroupJoinInfo';
import { useJoinGroup } from '@/hooks/useJoinGroup';
import {
  JoinGroupHeader,
  JoinGroupInfoCards,
  JoinGroupTokenInfo,
  JoinGroupReferrer,
  JoinGroupButton
} from '@/components/join';

function JoinPageContent() {
  const router = useRouter();

  // 获取群信息和邀请码信息
  const {
    referralCode,
    groupAddress,
    isValidCode,
    referrerAddress,
    groupName,
    memberCount,
    economicModel,
    groupRules,
    announcement,
    groupTokenAddress,
    tokenSymbol,
    entryFeeAmount,
    formattedEntryFee,
    referrerName,
    referrerAvatar,
    referrerInviteCount,
    isLoading,
    isGroupError,
    isMember
  } = useGroupJoinInfo();

  // 加入群聊逻辑
  const { executeJoin, isJoining, step } = useJoinGroup();

  // 处理加入群聊
  const handleJoinGroup = async () => {
    if (
      !groupAddress ||
      !groupTokenAddress ||
      !entryFeeAmount ||
      !referralCode
    ) {
      return;
    }

    await executeJoin(
      groupAddress,
      groupTokenAddress,
      entryFeeAmount,
      referralCode
    );
  };

  // 处理进入群聊（已是成员）
  const handleEnterGroup = () => {
    if (groupAddress) {
      router.push(
        `/chat/${groupAddress}?type=group&groupType=redpacket&from=join`
      );
    }
  };

  // 检查必要参数
  if (!referralCode) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#fafafa' }}
      >
        <div className="text-center px-4">
          <div className="text-lg font-medium text-gray-800 mb-2">
            ❌ 缺少邀请码
          </div>
          <div className="text-sm text-gray-500 mb-4">
            邀请链接不完整，请确认链接是否包含邀请码参数
          </div>
          <div className="text-xs text-gray-400 bg-gray-100 rounded px-3 py-2 inline-block font-mono">
            ?code=0x...
          </div>
        </div>
      </div>
    );
  }

  if (!groupAddress) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#fafafa' }}
      >
        <div className="text-center px-4">
          <div className="text-lg font-medium text-gray-800 mb-2">
            ❌ 缺少群地址
          </div>
          <div className="text-sm text-gray-500 mb-4">
            邀请链接不完整，请确认链接是否包含群地址参数
          </div>
          <div className="text-xs text-gray-400 bg-gray-100 rounded px-3 py-2 inline-block font-mono">
            &group=0x...
          </div>
        </div>
      </div>
    );
  }

  // 加载中状态
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#fafafa' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-3" />
          <div className="text-sm text-gray-500">加载群信息中...</div>
        </div>
      </div>
    );
  }

  // 邀请码无效
  if (!isValidCode) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#fafafa' }}
      >
        <div className="text-center px-4">
          <div className="text-lg font-medium text-gray-800 mb-2">
            ⚠️ 邀请码无效
          </div>
          <div className="text-sm text-gray-500 mb-3">
            该邀请码不存在或已失效
          </div>
          <div className="text-xs text-gray-400 bg-gray-100 rounded px-3 py-2 inline-block font-mono break-all max-w-md">
            {referralCode}
          </div>
        </div>
      </div>
    );
  }

  // 群不存在或查询出错
  if (isGroupError || !groupName) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#fafafa' }}
      >
        <div className="text-center px-4">
          <div className="text-lg font-medium text-gray-800 mb-2">
            🚫 群不存在
          </div>
          <div className="text-sm text-gray-500 mb-3">
            该群地址无效或已被解散
          </div>
          <div className="text-xs text-gray-400 bg-gray-100 rounded px-3 py-2 inline-block font-mono break-all max-w-md">
            {groupAddress}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: '#fafafa' }}
    >
      {/* 使用可滚动组件包裹除按钮外的内容 */}
      <ScrollArea className="flex-1 w-full">
        <div className="pb-32">
          {' '}
          {/* pb-32 为底部的固定按钮留出空间 */}
          {/* 群头部信息 */}
          <JoinGroupHeader
            groupName={groupName}
            memberCount={memberCount}
            groupAddress={groupAddress}
          />
          {/* 群信息卡片 */}
          <JoinGroupInfoCards
            economicModel={economicModel}
            groupRules={groupRules}
            announcement={announcement}
          />
          {/* 代币信息 */}
          <JoinGroupTokenInfo
            tokenAddress={groupTokenAddress || ''}
            tokenSymbol={tokenSymbol}
            entryFee={formattedEntryFee}
          />
          {/* 邀请人信息 */}
          <JoinGroupReferrer
            avatar={referrerAvatar}
            name={referrerName}
            address={referrerAddress || ''}
            inviteCount={referrerInviteCount}
          />
        </div>
      </ScrollArea>

      {/* 底部加入按钮 - 保持固定 */}
      <JoinGroupButton
        isJoining={isJoining}
        step={step}
        isMember={isMember}
        onClick={isMember ? handleEnterGroup : handleJoinGroup}
      />
    </div>
  );
}

// 加载状态
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <JoinPageContent />
    </Suspense>
  );
}
