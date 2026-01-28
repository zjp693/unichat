'use client';

/**
 * 加入群组页面
 * 支持通过邀请码加入红包群
 * 支持自动链切换
 * URL: /join?code=0x...&group=0x...&chainId=42161
 */

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSwitchChain, useChainId } from 'wagmi';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGroupJoinInfo } from '@/hooks/useGroupJoinInfo';
import { useJoinGroup } from '@/hooks/useJoinGroup';
import { getNetworkById } from '@/lib/web3/networks';
import {
  JoinGroupHeader,
  JoinGroupInfoCards,
  JoinGroupTokenInfo,
  JoinGroupReferrer,
  JoinGroupButton
} from '@/components/join';

function JoinPageContent() {
  const router = useRouter();

  // ⚠️ 优先解析 URL 的目标链 ID（必须在 useGroupJoinInfo 之前）
  const targetChainIdStr = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : ''
  ).get('chainId');
  const targetChainId = targetChainIdStr ? Number(targetChainIdStr) : null;

  // 获取当前链和切换函数（使用 wagmi）
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  // 切换状态（使用 useRef 防止重新渲染时重置）
  const switchAttemptedRef = useRef(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0); // 用于触发重新检查

  // 获取群信息和邀请码信息（在链检查之后）
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

  // 🔄 重置切换状态的条件：
  // 1. targetChainId 变化（新的邀请链接）
  // 2. 当前链和目标链不匹配（手动切换了链后再次访问）
  useEffect(() => {
    const needsReset =
      targetChainId && currentChainId && targetChainId !== currentChainId;

    if (needsReset && switchAttemptedRef.current) {
      switchAttemptedRef.current = false;
      setSwitchError(null);
      setResetTrigger((prev) => prev + 1); // 触发重新检查
    }
  }, [targetChainId, currentChainId]);

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

  // 自动切换网络
  useEffect(() => {
    if (
      !targetChainId ||
      !currentChainId ||
      !switchChainAsync ||
      switchAttemptedRef.current ||
      isSwitching ||
      currentChainId === targetChainId
    ) {
      return;
    }

    switchAttemptedRef.current = true;
    setIsSwitching(true);
    setSwitchError(null);

    console.log('🔄 [自动切换网络]', {
      from: currentChainId,
      to: targetChainId,
      chainName: targetChainId === 42161 ? 'Arbitrum' : 'OpBNB'
    });

    // 使用 MetaMask 的原生 RPC 方法切换网络
    // 因为 MetaMask 不支持 wagmi 的程序化切链 API
    (async () => {
      try {
        // 直接使用 window.ethereum 调用 MetaMask API
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          const chainIdHex = `0x${targetChainId.toString(16)}`;

          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }]
          });

          console.log('✅ [切换成功]', { chainId: targetChainId });
          // 注意：切换成功后，currentChainId 会自动更新
          // 监听切换结果的 useEffect 会处理 isSwitching 的重置
        } else {
          throw new Error('未检测到钱包');
        }
      } catch (error: any) {
        console.error('❌ [切换失败]', {
          code: error.code,
          message: error.message,
          targetChain: targetChainId
        });

        // 处理错误
        if (error.code === 4902) {
          // 链未添加到 MetaMask，需要先添加
          setSwitchError('该链尚未添加到钱包，请先手动添加');
        } else if (error.code === 4001) {
          // 用户拒绝
          setSwitchError('用户取消了切换');
        } else {
          setSwitchError('切换网络失败，请手动切换');
        }

        setIsSwitching(false);
        switchAttemptedRef.current = false; // 允许重试
      }
    })();
  }, [targetChainId, currentChainId, isSwitching, resetTrigger]);

  // 监听切换结果
  useEffect(() => {
    if (isSwitching && currentChainId === targetChainId) {
      setIsSwitching(false);
    }
  }, [currentChainId, targetChainId, isSwitching]);

  // 超时处理
  useEffect(() => {
    if (!isSwitching) return;

    const timeoutId = setTimeout(() => {
      if (isSwitching) {
        setSwitchError('切换网络超时，请手动切换');
        setIsSwitching(false);
      }
    }, 15000);
    return () => clearTimeout(timeoutId);
  }, [isSwitching]);

  // 正在切换网络
  if (isSwitching) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#fafafa' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
          <div className="text-lg font-medium text-gray-800 mb-2">
            正在切换网络...
          </div>
          <div className="text-sm text-gray-500">请在钱包中确认网络切换</div>
        </div>
      </div>
    );
  }

  // 切换失败
  if (switchError) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#fafafa' }}
      >
        <div className="text-center px-4 max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <div className="text-lg font-medium text-gray-800 mb-2">
            切换网络失败
          </div>
          <div className="text-sm text-gray-500 mb-4">{switchError}</div>
          <div className="text-sm text-gray-600 bg-gray-100 rounded-lg p-4">
            <p className="mb-2">请手动在钱包中切换到：</p>
            <p className="font-bold">
              {targetChainId === 204 ? 'OpBNB' : 'Arbitrum'}
            </p>
          </div>
          <button
            onClick={() => {
              switchAttemptedRef.current = false;
              setSwitchError(null);
            }}
            className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            重新尝试
          </button>
        </div>
      </div>
    );
  }

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

  // ⚠️ 链不匹配的全局检查（优先级最高）
  // 如果链不匹配，不管其他状态如何，都应该等待切换完成
  if (targetChainId && currentChainId && targetChainId !== currentChainId) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#fafafa' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
          <div className="text-lg font-medium text-gray-800 mb-2">
            等待切换网络...
          </div>
          <div className="text-sm text-gray-500">
            正在切换到 {targetChainId === 204 ? 'OpBNB' : 'Arbitrum'} 链
          </div>
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

  // 群不存在或查询出错（仅在链匹配时检查）
  // ⚠️ 如果链不匹配，即使 isGroupError=true 也不应该显示此错误
  if (
    (isGroupError || !groupName) &&
    (!targetChainId || currentChainId === targetChainId)
  ) {
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
