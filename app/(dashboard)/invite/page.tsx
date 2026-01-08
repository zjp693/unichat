'use client';

/**
 * 群邀请页面
 *
 * 显示群信息和邀请人信息，使用真实数据
 */

import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, QrCode, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGroupJoinInfo } from '@/hooks/useGroupJoinInfo';

// ============== 主页面 ==============
function InvitePageContent() {
  const { toast } = useToast();

  // 使用真实数据
  const {
    referralCode,
    groupAddress,
    isValidCode,
    isGroupError,
    groupName,
    memberCount,
    economicModel,
    groupRules,
    announcement,
    groupTokenAddress,
    tokenSymbol,
    formattedEntryFee,
    referrerAddress,
    referrerName,
    referrerAvatar,
    referrerInviteCount,
    isLoading
  } = useGroupJoinInfo();

  // ❌ 缺少邀请码
  if (!referralCode) {
    return (
      <div className="flex flex-col h-screen bg-white items-center justify-center px-6">
        <div className="text-6xl mb-4">🔗</div>
        <h2 className="text-lg font-medium text-gray-800 mb-2">缺少邀请码</h2>
        <p className="text-sm text-gray-500 text-center">
          邀请链接不完整，请确认链接包含邀请码参数
        </p>
        <div className="mt-4 text-xs text-gray-400 bg-gray-100 rounded px-3 py-2 font-mono">
          ?code=0x...
        </div>
      </div>
    );
  }

  // ❌ 缺少群地址
  if (!groupAddress) {
    return (
      <div className="flex flex-col h-screen bg-white items-center justify-center px-6">
        <div className="text-6xl mb-4">📍</div>
        <h2 className="text-lg font-medium text-gray-800 mb-2">缺少群地址</h2>
        <p className="text-sm text-gray-500 text-center">
          邀请链接不完整，请确认链接包含群地址参数
        </p>
        <div className="mt-4 text-xs text-gray-400 bg-gray-100 rounded px-3 py-2 font-mono">
          ?code=0x...&group=0x...
        </div>
      </div>
    );
  }

  // ⏳ 加载中
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-white items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-sm text-gray-500 mt-2">加载中...</p>
      </div>
    );
  }

  // ❌ 邀请码无效
  if (!isValidCode) {
    return (
      <div className="flex flex-col h-screen bg-white items-center justify-center px-6">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-lg font-medium text-gray-800 mb-2">邀请码无效</h2>
        <p className="text-sm text-gray-500 text-center">
          该邀请码不存在或已失效，请联系邀请人获取新的邀请链接
        </p>
        <div className="mt-4 text-xs text-gray-400 bg-gray-100 rounded px-3 py-2 font-mono truncate max-w-xs">
          {referralCode}
        </div>
      </div>
    );
  }

  // ❌ 群不存在（查询出错或 groupName 为空）
  if (isGroupError || !groupName) {
    return (
      <div className="flex flex-col h-screen bg-white items-center justify-center px-6">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-lg font-medium text-gray-800 mb-2">群不存在</h2>
        <p className="text-sm text-gray-500 text-center">
          该群地址无效或群已被删除
        </p>
        <div className="mt-4 text-xs text-gray-400 bg-gray-100 rounded px-3 py-2 font-mono truncate max-w-xs">
          {groupAddress}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 可滚动内容区 */}
      <ScrollArea className="flex-1 w-full">
        <div className="flex flex-col items-center px-5 pt-6 pb-2">
          {/* ===== 1. 群头像 ===== */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 mb-4">
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-blue-100">
              <User className="w-8 h-8 text-slate-400" />
            </div>
          </div>

          {/* ===== 2. 群名称 + 人数 ===== */}
          <h1 className="text-base text-[#333] mb-1">
            {groupName || '群名称'}（{memberCount.toLocaleString()}人）
          </h1>

          {/* ===== 3. 群地址（可复制） ===== */}
          <div className="flex items-center gap-1.5 mb-6">
            <span className="text-xs text-[#999]">
              {groupAddress || '0x...'}
            </span>
            <Copy
              className="w-3 h-3 text-[#999] cursor-pointer hover:text-[#666] transition-colors"
              onClick={() => {
                if (groupAddress) {
                  navigator.clipboard.writeText(groupAddress);
                  toast({
                    title: '已复制',
                    description: '群地址已复制到剪贴板'
                  });
                }
              }}
            />
          </div>

          {/* ===== 4. 二维码 ===== */}
          <div className="relative w-44 h-44 mb-3">
            <QrCode className="w-full h-full text-black" strokeWidth={1} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                <span className="text-white text-[7px] font-bold">CHAT</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#999] mb-6">扫描二维码进群</p>

          {/* ===== 分隔线 ===== */}
          <div className="w-full h-px bg-[#eee]" />

          {/* ===== 5. 信息段落：经济模型、群制度、群目标 ===== */}
          <div className="w-full">
            <div className="py-2 border-b border-[#eee]">
              <InfoBlock
                title="经济模型"
                content={economicModel || '暂无内容'}
              />
            </div>
            <div className="py-2 border-b border-[#eee]">
              <InfoBlock title="群制度" content={groupRules || '暂无内容'} />
            </div>
            <div className="py-2 border-b border-[#eee]">
              <InfoBlock title="群目标" content={announcement || '暂无内容'} />
            </div>
          </div>

          {/* ===== 6. 代币信息列表 ===== */}
          <div className="w-full">
            {/* 群聊使用代币 */}
            <div className="py-2 border-b border-[#eee]">
              <ListRow label="群聊使用代币">
                <TokenBadge symbol={tokenSymbol || 'TOKEN'} />
              </ListRow>
            </div>

            {/* 合约地址 */}
            <div className="py-2 border-b border-[#eee]">
              <div className="flex flex-col">
                <span className="text-sm text-[#333] mb-1">合约地址</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#999]">
                    {groupTokenAddress || '0x...'}
                  </span>
                  <Copy
                    className="w-3.5 h-3.5 text-[#999] cursor-pointer hover:text-[#666] transition-colors"
                    onClick={() => {
                      if (groupTokenAddress) {
                        navigator.clipboard.writeText(groupTokenAddress);
                        toast({
                          title: '已复制',
                          description: '合约地址已复制到剪贴板'
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 代币名称 */}
            <div className="py-2 border-b border-[#eee]">
              <ListRow label="代币名称">
                <TokenBadge symbol={tokenSymbol || 'TOKEN'} />
              </ListRow>
            </div>

            {/* 进群需缴纳 */}
            <div className="py-2 border-b border-[#eee]">
              <ListRow label="进群需缴纳">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-[#999]">
                    {formattedEntryFee}
                  </span>
                  <TokenBadge symbol={tokenSymbol || 'TOKEN'} />
                </div>
              </ListRow>
            </div>
          </div>

          {/* ===== 7. 邀请人 ===== */}
          <div className="w-full pt-6 border-t border-[#eee]">
            <h3 className="text-sm text-[#333] font-medium mb-3">邀请人</h3>
            <div className="flex items-center justify-between">
              {/* 左侧：头像 + 信息 */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-slate-200 overflow-hidden shrink-0">
                  {referrerAvatar ? (
                    <img
                      src={referrerAvatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-[#333]">{referrerName}</span>
                  <span className="text-[10px] text-[#999]">
                    {referrerAddress || '0x...'}
                  </span>
                </div>
              </div>
              {/* 右侧：邀请人数 */}
              <span className="text-xs text-[#999]">
                已邀请{referrerInviteCount.toLocaleString()}人
              </span>
            </div>
          </div>

          {/* ===== 8. 加入群聊按钮 ===== */}
          <div className="w-full pt-6 pb-4">
            <Button className="w-full h-12 text-base bg-[#57BD6A] hover:bg-[#4db05f] text-white rounded-full">
              加入群聊
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-screen bg-white items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      }
    >
      <InvitePageContent />
    </Suspense>
  );
}

// ============== 子组件 ==============

/** 信息块：标题 + 可输入的 textarea */
function InfoBlock({ title, content }: { title: string; content: string }) {
  const [value, setValue] = React.useState(content);

  return (
    <div>
      <h3 className="text-sm text-[#333] font-medium mb-2">{title}</h3>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full min-h-[60px] p-3 bg-[#f7f8fa] rounded-lg text-xs text-[#999] leading-relaxed resize-none border-none outline-none"
        placeholder="请输入内容..."
      />
    </div>
  );
}

/** 列表行：左侧标签，右侧内容 */
function ListRow({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#333]">{label}</span>
      {children}
    </div>
  );
}

/** 代币徽章：图标 + 文字 */
function TokenBadge({ symbol }: { symbol: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-4 h-4 rounded-full border border-[#57BD6A] flex items-center justify-center bg-white">
        <span className="text-[7px] text-[#57BD6A] font-bold">T</span>
      </div>
      <span className="text-sm text-[#999]">{symbol}</span>
    </div>
  );
}
