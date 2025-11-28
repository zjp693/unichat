import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import communityABI from '@/contract/abi/community.json';
import { Abi } from 'viem';

export function useSendCommunityMessage(communityAddress: string) {
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
      kind: kind === 0 ? '明文' : '密文',
      cid,
      length: content.length
    });

    const hash = await writeContractAsync({
      address: communityAddress as `0x${string}`,
      abi: communityABI.abi as Abi,
      functionName: 'sendCommunityMessage',
      args: [
        kind, // kind: 0 = 明文, 1 = 密文
        content, // 消息内容
        cid // cid
      ]
    });
    return hash;
  };

  return {
    sendMessage,
    isPending: isPending || isConfirming,
    isConfirmed,
    error,
    hash
  };
}
