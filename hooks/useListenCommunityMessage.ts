import { useWatchContractEvent, usePublicClient } from 'wagmi';
import communityABI from '@/contract/abi/community.json';
import { Abi, Address, getAddress } from 'viem';
import type { Message } from '@/lib/chat/types';

interface CommunityMessage {
  sender: Address;
  ts: bigint;
  kind: number;
  content: string;
  cid: string;
}

async function fetchMessageContent(
  publicClient: any,
  communityAddress: string,
  seq: number
): Promise<string | null> {
  try {
    const result = await publicClient.readContract({
      address: communityAddress as `0x${string}`,
      abi: communityABI.abi as Abi,
      functionName: 'getPlaintextMessages',
      args: [BigInt(seq), BigInt(1)]
    });

    if (result && Array.isArray(result) && result.length > 0) {
      const msg = result[0] as CommunityMessage;
      return msg.content;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch message content:', error);
    return null;
  }
}

export function useListenCommunityMessage(
  communityAddress: string,
  currentAddress: string | undefined,
  onMessage: (message: Message) => void,
  enabled: boolean = true
) {
  const publicClient = usePublicClient();

  useWatchContractEvent({
    address: communityAddress ? getAddress(communityAddress) : undefined,
    abi: communityABI.abi as Abi,
    eventName: 'CommunityMessageBroadcasted',
    enabled: enabled && !!communityAddress,
    onLogs: async (logs) => {
      console.log('📨 [群聊监听] 收到事件日志:', logs.length);
      for (const log of logs) {
        console.log('📨 [群聊监听] 处理日志:', log);
        const { sender, seq, ts } = (log as any).args;
        const messageId = `${ts?.toString()}-${sender}-${seq?.toString()}`;

        // Fetch content
        let content = '';
        if (publicClient && seq !== undefined) {
          console.log('📨 [群聊监听] 正在获取消息内容, seq:', seq);
          content =
            (await fetchMessageContent(
              publicClient,
              communityAddress,
              Number(seq)
            )) || '';
          console.log('📨 [群聊监听] 获取到内容:', content);
        }

        const isOwn = sender?.toLowerCase() === currentAddress?.toLowerCase();

        const newMessage: Message = {
          id: messageId,
          sender: isOwn ? 'user' : 'other',
          timestamp: new Date(Number(ts) * 1000),
          type: 'text',
          content: content,
          recipient: communityAddress as Address,
          isEncrypted: false,
          originalContent: content,
          isGroupMessage: true,
          senderAddress: sender
        };

        onMessage(newMessage);
      }
    }
  });
}
