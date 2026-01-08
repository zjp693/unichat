import { useWatchContractEvent, usePublicClient } from 'wagmi';
import communityABI from '@/contract/abi/community.json';
import { Abi, Address, getAddress, parseAbiItem } from 'viem';
import type { Message } from '@/lib/chat/types';
import { decodeGroupRedPacketCid } from '@/lib/redpacket/encoding';

interface CommunityMessage {
  sender: Address;
  ts: bigint;
  kind: number;
  content: string;
  cid: string;
}

// RedPacketGroup 的 MainMessage 事件 ABI
const MainMessageEventAbi = [
  parseAbiItem('event MainMessage(address indexed from, string content)')
];

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
  enabled: boolean = true,
  /** 群聊类型：官方群(community) 或 红包群(redpacket) */
  groupType: 'community' | 'redpacket' = 'community'
) {
  const publicClient = usePublicClient();

  const isCommunityGroup = groupType === 'community';
  const isRedPacketGroup = groupType === 'redpacket';

  // ============ 官方群事件监听 ============
  useWatchContractEvent({
    address: communityAddress ? getAddress(communityAddress) : undefined,
    abi: communityABI.abi as Abi,
    eventName: 'CommunityMessageBroadcasted',
    enabled: enabled && !!communityAddress && isCommunityGroup,
    onLogs: async (logs) => {
      console.log('📨 [官方群监听] 收到事件日志:', logs.length);
      for (const log of logs) {
        const { sender, seq, ts } = (log as any).args;
        const messageId = `${ts?.toString()}-${sender}-${seq?.toString()}`;

        let content = '';
        let cid = '';
        let kind = 0;

        if (publicClient && seq !== undefined) {
          const msg = await fetchMessage(
            publicClient,
            communityAddress,
            Number(seq)
          );
          if (msg) {
            content = msg.content;
            cid = msg.cid;
            kind = msg.kind;
          }
        }

        const isOwn = sender?.toLowerCase() === currentAddress?.toLowerCase();

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
          isEncrypted: kind === 1,
          originalContent: content,
          isGroupMessage: true,
          senderAddress: sender
        };

        onMessage(newMessage);
      }
    }
  });

  // ============ 红包群事件监听 ============
  useWatchContractEvent({
    address: communityAddress ? getAddress(communityAddress) : undefined,
    abi: MainMessageEventAbi,
    eventName: 'MainMessage',
    enabled: enabled && !!communityAddress && isRedPacketGroup,
    onLogs: async (logs) => {
      console.log('📨 [红包群监听] 收到 MainMessage 事件:', logs.length);
      for (const log of logs) {
        const { from, content } = (log as any).args;
        const isOwn = from?.toLowerCase() === currentAddress?.toLowerCase();

        // 获取区块时间
        let timestamp = new Date();
        if (log.blockNumber && publicClient) {
          try {
            const block = await publicClient.getBlock({
              blockNumber: log.blockNumber
            });
            timestamp = new Date(Number(block.timestamp) * 1000);
          } catch (e) {
            console.warn('Failed to get block timestamp:', e);
          }
        }

        const messageId = `${log.blockNumber}-${from}-${Date.now()}`;

        // 🎁 检查是否是红包消息
        let messageType: 'text' | 'red-packet' = 'text';
        let messageContent = content || '';

        try {
          // 只要是以 "数字 |" 开头就算红包 (允许后面为空或非规范 JSON)
          const pipeMatch = messageContent.match(/^(\d+)\s*\|\s*([\s\S]*)$/);

          if (pipeMatch) {
            const extractedId = pipeMatch[1];
            const remainingPart = pipeMatch[2].trim();

            messageType = 'red-packet';

            // 构造默认红包数据，如果后面有 JSON 则合并
            let redPacketData: any = {
              packetId: extractedId,
              message: '恭喜发财，大吉大利',
              status: 'active'
            };

            if (remainingPart.startsWith('{')) {
              try {
                const parsed = JSON.parse(remainingPart);
                redPacketData = { ...redPacketData, ...parsed };
                // 确保 ID 以提取的为准
                redPacketData.packetId = extractedId;
              } catch (e) {
                // JSON 解析失败，保持默认数据
              }
            }

            messageContent = JSON.stringify(redPacketData);
            console.log('[红包群监听] 识别到红包消息并注入 ID:', extractedId);
          } else {
            // 不符合 "ID |" 格式的消息，视为普通文本
            messageType = 'text';
          }
        } catch (e) {
          console.error('[红包群监听] 判定红包出错:', e);
          messageType = 'text';
        }

        const newMessage: Message = {
          id: messageId,
          sender: isOwn ? 'user' : 'other',
          timestamp,
          type: messageType,
          content: messageContent,
          recipient: communityAddress as Address,
          isEncrypted: false,
          originalContent: content || '',
          isGroupMessage: true,
          senderAddress: from
        };

        console.log(
          '📨 [红包群监听] 推送消息:',
          newMessage.id,
          '类型:',
          messageType
        );
        onMessage(newMessage);
      }
    }
  });
}
