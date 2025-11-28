import { useWatchContractEvent, usePublicClient } from 'wagmi';
import communityABI from '@/contract/abi/community.json';
import { Abi, Address, getAddress } from 'viem';
import type { Message } from '@/lib/chat/types';
import { decodeGroupRedPacketCid } from '@/lib/redpacket/encoding';

interface CommunityMessage {
  sender: Address;
  ts: bigint;
  kind: number;
  content: string;
  cid: string;
}

async function fetchMessage(
  publicClient: any,
  communityAddress: string,
  seq: number
): Promise<CommunityMessage | null> {
  try {
    const result = await publicClient.readContract({
      address: communityAddress as `0x${string}`,
      abi: communityABI.abi as Abi,
      functionName: 'getPlaintextMessages',
      args: [BigInt(seq), BigInt(1)]
    });

    if (result && Array.isArray(result) && result.length > 0) {
      return result[0] as CommunityMessage;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch message:', error);
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

        // Fetch full message details
        let content = '';
        let cid = '';

        if (publicClient && seq !== undefined) {
          console.log('📨 [群聊监听] 正在获取消息详情, seq:', seq);
          const msg = await fetchMessage(
            publicClient,
            communityAddress,
            Number(seq)
          );
          if (msg) {
            content = msg.content;
            cid = msg.cid;
            console.log('📨 [群聊监听] 获取到详情:', { content, cid });
          }
        }

        const isOwn = sender?.toLowerCase() === currentAddress?.toLowerCase();

        // 解析红包
        const packetId = decodeGroupRedPacketCid(cid);
        let type = 'text';
        let finalContent = content;

        if (packetId) {
          type = 'red-packet';
          finalContent = JSON.stringify({
            packetId: packetId.toString(),
            message: content,
            type: 'NORMAL',
            status: 'active',
            amount: '0',
            count: 1
          });
        }

        const newMessage: Message = {
          id: messageId,
          sender: isOwn ? 'user' : 'other',
          timestamp: new Date(Number(ts) * 1000),
          type: type as any,
          content: finalContent,
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
