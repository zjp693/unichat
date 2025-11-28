import { Address } from '@/lib/utils';
import { usePeerAvatar } from '@/hooks/usePeerProfile';
import { formatAddress } from '@/lib/chat/utils';

interface SenderNameProps {
  senderAddress: Address;
}

/**
 * 发送者名称组件（用于群聊消息）
 * 显示发送者的名称或格式化的地址
 */
export function SenderName({ senderAddress }: SenderNameProps) {
  const { name } = usePeerAvatar(senderAddress);
  const displayName = name || formatAddress(senderAddress);

  return <span className="text-xs text-gray-500 mb-1 px-1">{displayName}</span>;
}
