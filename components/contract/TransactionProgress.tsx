'use client';

import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { CreateGroupStatus } from '@/hooks/contract/useCreateGroup';

interface TransactionProgressProps {
  status: CreateGroupStatus;
  onClose?: () => void;
}

/**
 * 交易进度展示组件
 * 显示创建群组的各个阶段状态
 */
export function TransactionProgress({
  status,
  onClose
}: TransactionProgressProps) {
  if (status.state === 'idle') return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* 准备中 */}
        {status.state === 'preparing' && (
          <StatusContent
            icon={
              <Loader2 className="w-16 h-16 text-purple-600 animate-spin" />
            }
            title="准备中..."
            description="正在准备交易参数"
          />
        )}

        {/* 等待签名 */}
        {status.state === 'waiting_signature' && (
          <StatusContent
            icon={
              <Loader2 className="w-16 h-16 text-purple-600 animate-spin" />
            }
            title="等待签名"
            description="请在钱包中确认交易"
          />
        )}

        {/* 创建中 */}
        {status.state === 'creating' && (
          <StatusContent
            icon={
              <Loader2 className="w-16 h-16 text-purple-600 animate-spin" />
            }
            title="正在创建群聊..."
            description="交易已提交，等待确认"
            txHash={status.txHash}
          />
        )}

        {/* 成功 */}
        {status.state === 'success' && (
          <StatusContent
            icon={<CheckCircle className="w-16 h-16 text-green-500" />}
            title="创建成功！"
            description={`群地址: ${formatAddress(status.groupAddress)}`}
            success
          />
        )}

        {/* 错误 */}
        {status.state === 'error' && (
          <StatusContent
            icon={<XCircle className="w-16 h-16 text-red-500" />}
            title="创建失败"
            description={status.error}
            error
            onRetry={onClose}
          />
        )}
      </div>
    </div>
  );
}

interface StatusContentProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  txHash?: `0x${string}`;
  success?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

function StatusContent({
  icon,
  title,
  description,
  txHash,
  success,
  error,
  onRetry
}: StatusContentProps) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* 图标 */}
      <div className="mb-4">{icon}</div>

      {/* 标题 */}
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>

      {/* 描述 */}
      <p className="text-gray-600 text-sm mb-4">{description}</p>

      {/* 交易哈希 */}
      {txHash && (
        <a
          href={`https://opbnb.bscscan.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-purple-600 hover:text-purple-700 text-sm mb-4"
        >
          <span>查看交易</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      )}

      {/* 重试按钮 */}
      {error && onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          重试
        </button>
      )}
    </div>
  );
}

/**
 * 格式化地址
 */
function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
