import { useCallback } from 'react';
import type { Message } from '@/lib/chat/types';
import { RedPacketConfig } from '@/components/chat/red-packet/types';
import { generateRedPacketDistribution } from '@/lib/chat/utils';
import { Address } from '@/lib/utils';

interface UseRedPacketActionsProps {
  recipientAddress: Address;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsActionsOpen: (open: boolean) => void;
  setSelectedRedPacket: (message: Message | null) => void;
  setDetailsRedPacket: (message: Message | null) => void;
  selectedRedPacket: Message | null;
  scrollToBottom: (behavior?: 'smooth' | 'auto') => void;
}

/**
 * 红包相关操作的 Hook
 * 负责处理红包发送、打开、领取等逻辑
 */
export function useRedPacketActions({
  recipientAddress,
  setMessages,
  setIsActionsOpen,
  setSelectedRedPacket,
  setDetailsRedPacket,
  selectedRedPacket,
  scrollToBottom
}: UseRedPacketActionsProps) {
  /**
   * 发送红包
   */
  const handleSendRedPacket = useCallback(
    (config: RedPacketConfig) => {
      console.log('Sending Red Packet:', config);
      setIsActionsOpen(false);

      const totalAmount = parseFloat(config.amount);
      const count = config.count;

      // Generate mock distribution
      const distribution = generateRedPacketDistribution(
        config.type,
        totalAmount,
        count
      );

      const redPacketData = {
        ...config,
        senderName: 'James', // TODO: Fetch real user name
        senderAvatar: '/me/me2.png', // TODO: Fetch real user avatar
        status: 'active', // Initial status for the red packet itself
        distribution: distribution, // Store the pool of amounts
        claimedList: [], // Track who claimed what
        remainingCount: count
      };

      const newMessage: Message = {
        id: Date.now().toString(),
        sender: 'user',
        timestamp: new Date(),
        type: 'red-packet',
        content: JSON.stringify(redPacketData),
        originalContent: null,
        recipient: recipientAddress,
        status: 'sending'
      };

      setMessages((prev) => [...prev, newMessage]);
      setTimeout(() => scrollToBottom('smooth'), 100);

      // Simulate sending completion after 1 second
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessage.id ? { ...msg, status: undefined } : msg
          )
        );
      }, 1000);
    },
    [recipientAddress, setIsActionsOpen, setMessages, scrollToBottom]
  );

  /**
   * 打开红包（查看或领取）
   */
  const handleOpenRedPacket = useCallback(
    (message: Message) => {
      try {
        const config = JSON.parse(message.content);
        // Check if already claimed by current user
        // We check both the 'claimed' status flag and the claimedList for '你'
        const isClaimed =
          config.status === 'claimed' ||
          config.claimedList?.some((item: any) => item.name === '你');

        if (isClaimed) {
          setDetailsRedPacket(message);
        } else {
          setSelectedRedPacket(message);
        }
      } catch (e) {
        console.error('Error checking red packet status', e);
        setSelectedRedPacket(message);
      }
    },
    [setDetailsRedPacket, setSelectedRedPacket]
  );

  /**
   * 领取红包
   */
  const handleClaimRedPacket = useCallback(() => {
    if (!selectedRedPacket) return;
    const message = selectedRedPacket;

    try {
      const config = JSON.parse(message.content);

      // If already claimed by current user (in a real app check userId), or if status is claimed locally
      if (config.status === 'claimed') {
        // Just close modal or show details
        setSelectedRedPacket(null);
        setDetailsRedPacket(message);
        return;
      }

      if (config.remainingCount <= 0) {
        alert('Red packet is empty!');
        setSelectedRedPacket(null);
        return;
      }

      // Claim logic
      let claimAmount = 0;
      if (config.distribution && Array.isArray(config.distribution)) {
        const index = config.distribution.length - config.remainingCount;
        if (index >= 0 && index < config.distribution.length) {
          claimAmount = config.distribution[index];
        }
      }

      // Fallback if distribution is missing or invalid
      if (!claimAmount && claimAmount !== 0) {
        const total = parseFloat(config.amount) || 0;
        const count = config.count || 1;
        if (config.type === 'NORMAL') {
          claimAmount = parseFloat((total / count).toFixed(2));
        } else {
          // Simple random fallback for LUCKY type
          claimAmount = parseFloat(
            (Math.random() * ((total / count) * 2)).toFixed(2)
          );
          if (claimAmount <= 0) claimAmount = 0.01;
        }
      }

      const newRemainingCount = config.remainingCount - 1;

      // Update config
      const newConfig = {
        ...config,
        status: 'claimed', // Mark as claimed for THIS user
        remainingCount: newRemainingCount,
        claimedList: [
          ...(config.claimedList || []),
          { name: '你', amount: claimAmount }
        ]
      };

      // Update message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id
            ? { ...msg, content: JSON.stringify(newConfig) }
            : msg
        )
      );

      console.log(`Claimed ${claimAmount}!`);

      // Add claim notification message
      const claimMessage: Message = {
        id: Date.now().toString() + '_claim',
        sender: 'system', // System message
        timestamp: new Date(),
        type: 'red-packet-claim',
        content: JSON.stringify({
          claimerName: '你',
          ownerName: message.sender === 'user' ? '自己' : '李四', // Mock owner name
          isCurrentUserClaimer: true
        }),
        originalContent: null,
        recipient: recipientAddress,
        status: undefined
      };
      setMessages((prev) => [...prev, claimMessage]);
      setTimeout(() => scrollToBottom('smooth'), 100);

      // Close modal and show details
      setSelectedRedPacket(null);

      // We need to pass the UPDATED message to details
      const updatedMessage = { ...message, content: JSON.stringify(newConfig) };
      setDetailsRedPacket(updatedMessage);
    } catch (e) {
      console.error('Failed to open red packet', e);
    }
  }, [
    selectedRedPacket,
    recipientAddress,
    setMessages,
    setSelectedRedPacket,
    setDetailsRedPacket,
    scrollToBottom
  ]);

  return {
    handleSendRedPacket,
    handleOpenRedPacket,
    handleClaimRedPacket
  };
}
