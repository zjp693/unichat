import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import communityABI from '@/contract/abi/community.json';
import { Abi } from 'viem';

export function useSendCommunityMessage(communityAddress: string) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash
    });

  const sendMessage = async (content: string) => {
    if (!content.trim()) {
      throw new Error('消息内容不能为空');
    }

    console.log('📤 [发送群聊消息]', {
      communityAddress,
      content,
      length: content.length
    });

    await writeContract({
      address: communityAddress as `0x${string}`,
      abi: communityABI.abi as Abi,
      functionName: 'sendCommunityMessage',
      args: [
        0, // kind: 0 = 明文
        content, // 消息内容
        '' // cid: 空字符串
      ]
    });
  };

  return {
    sendMessage,
    isPending: isPending || isConfirming,
    isConfirmed,
    error,
    hash
  };
}
