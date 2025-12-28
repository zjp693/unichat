'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, QrCode, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ============== Mock Data ==============
const MOCK_DATA = {
  groupName: 'UNICHAT社区群',
  memberCount: 3445,
  contractAddress: '0xea2a91d0acf842d15fc10e99f9e1fd6ab0a30c9a',
  rules: {
    economy: '文字文字文字文字文字文字',
    system: '文字文字文字文字文字文字',
    goal: '文字文字文字文字文字文字'
  },
  token: {
    symbol: 'USDT0',
    address: '0xea2a91d0acf842d15fc10e99f9e1fd6ab0a30c9a',
    fee: 100
  },
  inviter: {
    name: '昵称',
    address: '0xea2a91d0acf842d15fc10e99f9e1fd6ab0a30c9a',
    totalInvited: 3445
  }
};

// ============== 主页面 ==============
export default function InvitePage() {
  const { toast } = useToast();

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 可滚动内容区 */}
      <ScrollArea className="flex-1 w-full">
        <div className="flex flex-col items-center px-5 pt-6 pb-2">
          {/* ===== 1. 群头像 ===== */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 mb-4">
            {/* 占位：实际这里放群头像图片 */}
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-blue-100">
              <User className="w-8 h-8 text-slate-400" />
            </div>
          </div>

          {/* ===== 2. 群名称 + 人数 ===== */}
          <h1 className="text-base text-[#333] mb-1">
            {MOCK_DATA.groupName}（{MOCK_DATA.memberCount.toLocaleString()}）人
          </h1>

          {/* ===== 3. 群地址（可复制） ===== */}
          <div className="flex items-center gap-1.5 mb-6">
            <span className="text-xs text-[#999]">
              {MOCK_DATA.contractAddress}
            </span>
            <Copy
              className="w-3 h-3 text-[#999] cursor-pointer hover:text-[#666] transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(MOCK_DATA.contractAddress);
                toast({ title: '已复制', description: '群地址已复制到剪贴板' });
              }}
            />
          </div>

          {/* ===== 4. 二维码 ===== */}
          <div className="relative w-44 h-44 mb-3">
            {/* 占位：实际这里放真实二维码图片 */}
            <QrCode className="w-full h-full text-black" strokeWidth={1} />
            {/* 中间的小Logo */}
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
              <InfoBlock title="经济模型" content={MOCK_DATA.rules.economy} />
            </div>
            <div className="py-2 border-b border-[#eee]">
              <InfoBlock title="群制度" content={MOCK_DATA.rules.system} />
            </div>
            <div className="py-2 border-b border-[#eee]">
              <InfoBlock title="群目标" content={MOCK_DATA.rules.goal} />
            </div>
          </div>

          {/* ===== 6. 代币信息列表 ===== */}
          <div className="w-full">
            {/* 群聊使用代币 */}
            <div className="py-2 border-b border-[#eee]">
              <ListRow label="群聊使用代币">
                <TokenBadge symbol="USDT0" />
              </ListRow>
            </div>

            {/* 合约地址 */}
            <div className="py-2 border-b border-[#eee]">
              <div className="flex flex-col">
                <span className="text-sm text-[#333] mb-1">合约地址</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#999]">
                    {MOCK_DATA.token.address}
                  </span>
                  <Copy
                    className="w-3.5 h-3.5 text-[#999] cursor-pointer hover:text-[#666] transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(MOCK_DATA.token.address);
                      toast({
                        title: '已复制',
                        description: '合约地址已复制到剪贴板'
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 代币名称 */}
            <div className="py-2 border-b border-[#eee]">
              <ListRow label="代币名称">
                <TokenBadge symbol="USDT0" />
              </ListRow>
            </div>

            {/* 进群需缴纳 */}
            <div className="py-2 border-b border-[#eee]">
              <ListRow label="进群需缴纳">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-[#999]">
                    {MOCK_DATA.token.fee}
                  </span>
                  <TokenBadge symbol="USDT0" />
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
                  {/* 头像占位 */}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-[#333]">
                    {MOCK_DATA.inviter.name}
                  </span>
                  <span className="text-[10px] text-[#999]">
                    {MOCK_DATA.inviter.address}
                  </span>
                </div>
              </div>
              {/* 右侧：邀请人数 */}
              <span className="text-xs text-[#999]">
                已邀请{MOCK_DATA.inviter.totalInvited.toLocaleString()}人
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
