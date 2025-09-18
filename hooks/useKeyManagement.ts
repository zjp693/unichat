import { useState, useEffect } from "react";
import { KeyPair, chatEncryption } from "@/lib/encryption";

export const useKeyManagement = () => {
  const [keys, setKeys] = useState<KeyPair[]>([]);
  const [loading, setLoading] = useState(false);

  // 从本地存储加载密钥
  useEffect(() => {
    const savedKeys = localStorage.getItem("chat_keys");
    if (savedKeys) {
      try {
        setKeys(JSON.parse(savedKeys));
      } catch (error) {
        console.error("加载密钥失败:", error);
      }
    }
  }, []);

  // 保存密钥到本地存储
  const saveKeys = (newKeys: KeyPair[]) => {
    localStorage.setItem("chat_keys", JSON.stringify(newKeys));
    setKeys(newKeys);
  };

  // 生成新密钥对
  const generateKeyPair = async (name: string): Promise<KeyPair> => {
    setLoading(true);
    try {
      const { publicKey, privateKey } = chatEncryption.generateKeyPair(2048);
      
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
    const updatedKeys = keys.filter(key => key.id !== keyId);
    saveKeys(updatedKeys);
  };

  // 加密消息
  const encryptMessage = (message: string, publicKey: string): string => {
    return chatEncryption.encryptMessage(message, publicKey);
  };

  // 解密消息
  const decryptMessage = (encryptedMessage: string, privateKey: string): string => {
    return chatEncryption.decryptMessage(encryptedMessage, privateKey);
  };

  return {
    keys,
    loading,
    generateKeyPair,
    deleteKey,
    encryptMessage,
    decryptMessage
  };
};
