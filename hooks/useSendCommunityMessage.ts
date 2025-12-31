import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import communityABI from '@/contract/abi/community.json';
import RedPacketGroupABI from '@/contract/abi/RedPacketGroupImplementation.json';
import { Abi, parseAbi } from 'viem';

// 备用：简化的 ABI（如果完整 ABI 有问题可以回退）
const RedPacketABI = parseAbi(['function sendMainMessage(string content)']);

type GroupType = 'community' | 'redpacket';

export function useSendCommunityMessage(
  communityAddress: string,
  groupType: GroupType = 'community'
) {
  const {
    writeContractAsync,
    data: hash,
    isPending,
    error
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash
    });

  const sendMessage = async (
    content: string,
    kind: 0 | 1 = 0,
    cid: string = ''
  ) => {
    if (!content.trim()) {
      throw new Error('消息内容不能为空');
    }

    console.log('📤 [发送群聊消息]', {
      communityAddress,
      content,
      groupType,
      kind: kind === 0 ? '明文' : '密文',
      cid,
      charLength: content.length,
      byteLength: new TextEncoder().encode(content).length,
      maxBytes: 280,
      isOverLimit: new TextEncoder().encode(content).length > 280
    });

    // 🔍 调试：如果超过 280 字节，打印警告
    const byteLength = new TextEncoder().encode(content).length;
    if (byteLength > 280) {
      console.warn('⚠️ [警告] 消息超过 280 字节限制！', {
        byteLength,
        maxBytes: 280,
        overflow: byteLength - 280
      });
      throw new Error(`消息内容过长！当前 ${byteLength} 字节，最大 280 字节`);
    }

    let txHash;

    try {
      if (groupType === 'redpacket') {
        // RedPacketGroup 使用完整 ABI
        console.log('🔍 [调试] 使用完整 RedPacketGroupABI 发送消息');
        txHash = await writeContractAsync({
          address: communityAddress as `0x${string}`,
          abi: RedPacketGroupABI.abi as Abi,
          functionName: 'sendMainMessage',
          args: [content]
        });
      } else {
        // Old Community Group
        txHash = await writeContractAsync({
          address: communityAddress as `0x${string}`,
          abi: communityABI.abi as Abi,
          functionName: 'sendCommunityMessage',
          args: [
            kind, // kind: 0 = 明文, 1 = 密文
            content, // 消息内容
            cid // cid
          ]
        });
      }

      console.log('✅ [发送成功] 交易哈希:', txHash);
      return txHash;
    } catch (error: any) {
      console.error('❌ [发送失败]', error);

      // 解析错误信息
      let errorMessage = '发送失败';

      if (error?.message) {
        const msg = error.message.toLowerCase();

        if (msg.includes('user rejected') || msg.includes('user denied')) {
          errorMessage = '用户取消了交易';
        } else if (msg.includes('not a member') || msg.includes('notmember')) {
          errorMessage = '你还不是群成员，请先加入群组';
        } else if (msg.includes('muted') || msg.includes('禁言')) {
          errorMessage = '你已被禁言，无法发送消息';
        } else if (msg.includes('limit') || msg.includes('限制')) {
          errorMessage = '已达到消息发送限制';
        } else if (msg.includes('too long') || msg.includes('过长')) {
          errorMessage = '消息内容过长（最大 280 字节）';
        } else if (
          msg.includes('insufficient funds') ||
          msg.includes('余额不足')
        ) {
          errorMessage = 'Gas 费不足，请充值后重试';
        } else {
          errorMessage = error.message;
        }
      }

      throw new Error(errorMessage);
    }
  };

  return {
    sendMessage,
    isPending: isPending || isConfirming,
    isConfirmed,
    error,
    hash
  };
}
