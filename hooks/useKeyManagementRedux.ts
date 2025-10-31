import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store';
import {
  loadKeys,
  generateKeyPair,
  saveKey,
  deleteKey,
  setSelectedKey,
  clearError
} from '@/lib/keyManagementSlice';
import { useCallback } from 'react';
import { KeyPair, chatEncryption } from '@/lib/encryption';

export const useKeyManagementRedux = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { keys, selectedKeyId, loading, error } = useSelector(
    (state: RootState) => state.keyManagement
  );

  // 加载密钥
  const loadKeysFromStorage = useCallback(() => {
    dispatch(loadKeys());
  }, [dispatch]);

  // 生成新密钥对
  const generateNewKeyPair = useCallback(
    (name: string) => {
      return dispatch(generateKeyPair(name));
    },
    [dispatch]
  );

  // 保存密钥
  const saveKeyToStorage = useCallback(
    (key: KeyPair) => {
      dispatch(saveKey(key));
    },
    [dispatch]
  );

  // 删除密钥
  const removeKey = useCallback(
    (keyId: string) => {
      dispatch(deleteKey(keyId));
    },
    [dispatch]
  );

  // 设置选中的密钥
  const setSelectedKeyId = useCallback(
    (keyId: string | null) => {
      dispatch(setSelectedKey(keyId));
    },
    [dispatch]
  );

  // 清除错误
  const clearErrorMessage = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // 单公钥加密消息（旧版，兼容性）
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

  // 解密消息
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

  // 获取选中的密钥
  const selectedKey =
    keys.find((key: KeyPair) => key.id === selectedKeyId) || null;

  return {
    keys,
    selectedKey,
    selectedKeyId,
    loading,
    error,
    loadKeysFromStorage,
    generateNewKeyPair,
    saveKeyToStorage,
    removeKey,
    setSelectedKeyId,
    clearErrorMessage,
    encryptMessage,
    encryptMessageDual, // 新增：双公钥加密
    decryptMessage,
    decryptMessages
  };
};
