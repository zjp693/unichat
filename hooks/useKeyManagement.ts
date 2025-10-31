import { useState, useEffect, useCallback } from 'react';
import { KeyPair, chatEncryption } from '@/lib/encryption';

export const useKeyManagement = () => {
  const [keys, setKeys] = useState<KeyPair[]>([]);
  const [loading, setLoading] = useState(false);

  // 从本地存储加载密钥
  useEffect(() => {
    const savedKeys = localStorage.getItem('chat_keys');
    if (savedKeys) {
      try {
        setKeys(JSON.parse(savedKeys));
      } catch (error) {
        console.error('加载密钥失败:', error);
      }
    }
  }, []);

  // 保存密钥到本地存储
  const saveKeys = (newKeys: KeyPair[]) => {
    localStorage.setItem('chat_keys', JSON.stringify(newKeys));
    setKeys(newKeys);
  };

  // 生成新密钥对
  const generateKeyPair = async (name: string): Promise<KeyPair> => {
    setLoading(true);
    try {
      const { publicKey, privateKey } = chatEncryption.generateKeyPair();

      const newKey: KeyPair = {
        id: Date.now().toString(),
        name,
        publicKey,
        privateKey,
        createdAt: new Date().toISOString()
      };

      const updatedKeys = [...keys, newKey];
      saveKeys(updatedKeys);

      return newKey;
    } finally {
      setLoading(false);
    }
  };

  // 删除密钥
  const deleteKey = (keyId: string) => {
    const updatedKeys = keys.filter((key) => key.id !== keyId);
    saveKeys(updatedKeys);
  };

  // 单公钥加密消息（旧版，保留兼容性）
  const encryptMessage = useCallback(
    (message: string, publicKey: string): string => {
      return chatEncryption.encryptMessage(message, publicKey);
    },
    []
  );

  // 双公钥加密消息（端到端加密）
  const encryptMessageDual = useCallback(
    (
      message: string,
      senderPublicKey: string,
      recipientPublicKey: string
    ): string => {
      return chatEncryption.encryptMessageDual(
        message,
        senderPublicKey,
        recipientPublicKey
      );
    },
    []
  );

  // 解密消息（自动支持旧格式和新格式）
  const decryptMessage = useCallback(
    (encryptedMessage: string, privateKey: string): string => {
      if (!encryptedMessage) {
        throw new Error('加密消息不能为空');
      }
      if (!privateKey) {
        throw new Error('私钥不能为空');
      }
      return chatEncryption.decryptMessage(encryptedMessage, privateKey);
    },
    []
  );

  // 批量解密消息
  const decryptMessages = useCallback(
    (
      encryptedMessages: string[],
      privateKey: string
    ): Array<
      { success: true; decrypted: string } | { success: false; error: string }
    > => {
      return chatEncryption.decryptMessages(encryptedMessages, privateKey);
    },
    []
  );

  return {
    keys,
    loading,
    generateKeyPair,
    deleteKey,
    encryptMessage,
    encryptMessageDual, // 新增：双公钥加密
    decryptMessage,
    decryptMessages
  };
};
