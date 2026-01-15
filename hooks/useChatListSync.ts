import { useEffect, useRef } from 'react';
import { Address } from 'viem';
import { useListenMessageSent } from '@/lib/DirectMessageAbi';

/**
 * 聊天列表消息同步 Hook
 *
 * 功能：
 * 1. 监听合约的 MessageSent 事件
 * 2. 当收到发给当前用户的新消息时，触发回调刷新列表
 * 3. 支持过滤特定的发送者或接收者
 */
export function useChatListSync(
  currentUser: Address | undefined,
  onNewMessage: (from: Address, to: Address) => void,
  enabled: boolean = true
) {
  const onNewMessageRef = useRef(onNewMessage);

  // 保持回调函数引用最新
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  // 监听所有发给当前用户的消息
  useListenMessageSent(
    (logs) => {
      if (!currentUser) return;

      // 处理每个事件日志
      logs.forEach((log) => {
        const from = log.args.from as Address;
        const to = log.args.to as Address;

        // 只处理发给当前用户的消息（接收方是当前用户）
        if (to && from && to.toLowerCase() === currentUser.toLowerCase()) {
          // 触发回调，通知父组件有新消息
          onNewMessageRef.current(from, to);
        }
      });
    },
    enabled && !!currentUser,
    {
      to: currentUser // 只监听发给当前用户的消息
    }
  );
}
