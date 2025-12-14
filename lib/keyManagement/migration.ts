/**
 * 旧数据迁移工具
 * 将 localStorage['chat_keys'] 迁移到 Redux store
 */

import type { KeyPair } from './types';

const OLD_STORAGE_KEY = 'chat_keys';

/**
 * 检查是否需要迁移旧数据
 */
export function checkNeedsMigration(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const oldData = localStorage.getItem(OLD_STORAGE_KEY);
    return !!oldData;
  } catch {
    return false;
  }
}

/**
 * 获取旧的密钥数据
 */
export function getOldKeys(): KeyPair[] {
  if (typeof window === 'undefined') return [];

  try {
    const oldData = localStorage.getItem(OLD_STORAGE_KEY);
    if (!oldData) return [];

    const keys = JSON.parse(oldData) as KeyPair[];
    return Array.isArray(keys) ? keys : [];
  } catch (error) {
    console.error('读取旧密钥数据失败:', error);
    return [];
  }
}

/**
 * 清除旧的密钥数据
 */
export function clearOldKeys(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(OLD_STORAGE_KEY);
    console.log('✅ 已清除旧的密钥存储');
  } catch (error) {
    console.error('清除旧密钥数据失败:', error);
  }
}

/**
 * 执行迁移（获取旧数据并清除）
 * @returns 迁移的密钥列表
 */
export function migrateOldKeys(): KeyPair[] {
  const keys = getOldKeys();

  if (keys.length > 0) {
    clearOldKeys();
    console.log(`✅ 已迁移 ${keys.length} 个密钥`);
  }

  return keys;
}
