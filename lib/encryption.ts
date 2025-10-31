import JSEncrypt from 'jsencrypt';
import CryptoJS from 'crypto-js';

// 从环境变量读取默认私钥（用于解密使用默认公钥加密的消息）
const DEFAULT_PRIVATE_KEY_FROM_ENV =
  process.env.NEXT_PUBLIC_DEFAULT_PRIVATE_KEY;

if (!DEFAULT_PRIVATE_KEY_FROM_ENV) {
  console.warn('⚠️ 警告: NEXT_PUBLIC_DEFAULT_PRIVATE_KEY 环境变量未设置！');
  console.warn(
    '如果需要解密使用默认公钥加密的消息，请在 .env.local 文件中添加该环境变量'
  );
}

export const DEFAULT_PRIVATE_KEY = DEFAULT_PRIVATE_KEY_FROM_ENV || '';

export interface KeyPair {
  id: string;
  name: string;
  publicKey: string;
  privateKey: string;
  createdAt: string;
  password?: string; // 可选的密码字段
}

export class ChatEncryption {
  private jsEncrypt: JSEncrypt;

  constructor() {
    this.jsEncrypt = new JSEncrypt();
  }

  // 生成随机 AES 密钥
  private _generateAesKey(): string {
    return CryptoJS.lib.WordArray.random(256 / 8).toString(CryptoJS.enc.Hex);
  }

  // 使用 AES 密钥加密消息
  private _encryptWithAes(message: string, aesKey: string): string {
    return CryptoJS.AES.encrypt(message, aesKey).toString();
  }

  // 使用 AES 密钥解密消息
  private _decryptWithAes(encryptedMessage: string, aesKey: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, aesKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // 修改默认密钥位数为1024位
  generateKeyPair(keySize: number = 1024): {
    publicKey: string;
    privateKey: string;
  } {
    try {
      // 直接使用JSEncrypt生成密钥对，确保兼容性
      const jsEncrypt = new JSEncrypt({ default_key_size: keySize.toString() });
      jsEncrypt.getKey();

      const publicKey = jsEncrypt.getPublicKey();
      const privateKey = jsEncrypt.getPrivateKey();

      if (!publicKey || !privateKey) {
        throw new Error('密钥生成失败');
      }

      return { publicKey, privateKey };
    } catch (error) {
      console.error('密钥生成失败:', error);
      throw new Error('密钥生成失败');
    }
  }

  // 单公钥加密
  encryptMessage(message: string, publicKey: string): string {
    try {
      // 验证输入参数
      if (!message || typeof message !== 'string') {
        throw new Error('消息内容无效');
      }
      if (!publicKey || typeof publicKey !== 'string') {
        throw new Error('公钥无效');
      }

      const MAX_MESSAGE_LENGTH = 10000; // 限制为1万字
      let processedMessage = message;

      if (message.length > MAX_MESSAGE_LENGTH) {
        console.warn(`消息长度超过 ${MAX_MESSAGE_LENGTH} 字，将进行截断。`);
        processedMessage = message.substring(0, MAX_MESSAGE_LENGTH);
      }

      // 验证公钥格式
      if (!this.validatePublicKey(publicKey)) {
        throw new Error('公钥格式无效，无法加密');
      }

      const jsEncrypt = new JSEncrypt();
      jsEncrypt.setPublicKey(publicKey);

      // 生成 AES 密钥并加密消息
      const aesKey = this._generateAesKey();
      const aesEncryptedMessage = this._encryptWithAes(
        processedMessage,
        aesKey
      );

      // 使用 RSA 公钥加密 AES 密钥
      const rsaEncryptedAesKey = jsEncrypt.encrypt(aesKey);

      if (!rsaEncryptedAesKey) {
        throw new Error('RSA 密钥加密失败');
      }

      // 组合加密后的 AES 密钥和加密后的消息内容
      return `${rsaEncryptedAesKey}:${aesEncryptedMessage}`;
    } catch (error) {
      console.error('加密错误详情:', error);
      console.error('消息长度:', message?.length);
      console.error('公钥长度:', publicKey?.length);
      throw new Error(
        `消息加密失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 双公钥加密（端到端加密）
   * @param message 明文消息
   * @param senderPublicKey 发送者的公钥（用于发送者自己解密）
   * @param recipientPublicKey 接收者的公钥（用于接收者解密）
   * @returns 加密后的消息，格式：[给发送者的key]:[给接收者的key]:[加密消息]
   */
  encryptMessageDual(
    message: string,
    senderPublicKey: string,
    recipientPublicKey: string
  ): string {
    try {
      // 验证输入参数
      if (!message || typeof message !== 'string') {
        throw new Error('消息内容无效');
      }
      if (!senderPublicKey || typeof senderPublicKey !== 'string') {
        throw new Error('发送者公钥无效');
      }
      if (!recipientPublicKey || typeof recipientPublicKey !== 'string') {
        throw new Error('接收者公钥无效');
      }

      const MAX_MESSAGE_LENGTH = 10000; // 限制为1万字
      let processedMessage = message;

      if (message.length > MAX_MESSAGE_LENGTH) {
        console.warn(`消息长度超过 ${MAX_MESSAGE_LENGTH} 字，将进行截断。`);
        processedMessage = message.substring(0, MAX_MESSAGE_LENGTH);
      }

      console.log('🔐 开始双公钥加密:', {
        messageLength: processedMessage.length,
        senderKeyLength: senderPublicKey.length,
        recipientKeyLength: recipientPublicKey.length
      });

      // 1. 生成随机 AES 密钥
      const aesKey = this._generateAesKey();
      console.log('✅ AES 密钥已生成');

      // 2. 用 AES 密钥加密消息
      const aesEncryptedMessage = this._encryptWithAes(
        processedMessage,
        aesKey
      );
      console.log('✅ 消息已用 AES 加密');

      // 3. 用发送者公钥加密 AES 密钥
      const jsEncryptSender = new JSEncrypt();
      if (!this.validatePublicKey(senderPublicKey)) {
        throw new Error('发送者公钥格式无效');
      }
      jsEncryptSender.setPublicKey(senderPublicKey);
      const senderEncryptedAesKey = jsEncryptSender.encrypt(aesKey);

      if (!senderEncryptedAesKey) {
        throw new Error('用发送者公钥加密 AES 密钥失败');
      }
      console.log('✅ AES 密钥已用发送者公钥加密');

      // 4. 用接收者公钥加密 AES 密钥
      const jsEncryptRecipient = new JSEncrypt();
      if (!this.validatePublicKey(recipientPublicKey)) {
        throw new Error('接收者公钥格式无效');
      }
      jsEncryptRecipient.setPublicKey(recipientPublicKey);
      const recipientEncryptedAesKey = jsEncryptRecipient.encrypt(aesKey);

      if (!recipientEncryptedAesKey) {
        throw new Error('用接收者公钥加密 AES 密钥失败');
      }
      console.log('✅ AES 密钥已用接收者公钥加密');

      // 5. 组合三段：[给发送者的key]:[给接收者的key]:[加密消息]
      const result = `${senderEncryptedAesKey}:${recipientEncryptedAesKey}:${aesEncryptedMessage}`;

      console.log('✅ 双公钥加密完成:', {
        parts: result.split(':').length,
        totalLength: result.length
      });

      return result;
    } catch (error) {
      console.error('❌ 双公钥加密错误:', error);
      throw new Error(
        `双公钥加密失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 解密消息（单公钥格式）
   * @param encryptedMessage 加密消息（2段格式：[key]:[加密消息]）
   * @param privateKey 私钥
   * @returns 解密后的明文
   */
  decryptMessage(encryptedMessage: string, privateKey: string): string {
    try {
      if (!encryptedMessage) {
        throw new Error('加密消息不能为空');
      }
      if (!privateKey) {
        throw new Error('私钥不能为空');
      }

      const parts = encryptedMessage.split(':');

      // 只支持单公钥格式（2段）
      if (parts.length !== 2) {
        throw new Error(
          `消息格式不正确，应为2段（单公钥格式），当前为${parts.length}段`
        );
      }

      console.log('🔓 开始解密消息（单公钥格式）');
      const encryptedAesKey = parts[0];
      const aesEncryptedMessage = parts[1];

      const jsEncrypt = new JSEncrypt();
      jsEncrypt.setPrivateKey(privateKey);

      const aesKey = jsEncrypt.decrypt(encryptedAesKey);
      if (!aesKey) {
        throw new Error('AES 密钥解密失败，可能密钥不匹配或消息不是发给你的。');
      }

      const decrypted = this._decryptWithAes(aesEncryptedMessage, aesKey);
      console.log('✅ 消息解密成功');
      return decrypted;
    } catch (error: any) {
      console.error('❌ 解密错误:', error);
      throw new Error(`消息解密失败: ${error.message || error}`);
    }
  }

  /**
   * 批量解密消息
   * @param encryptedMessages 加密消息数组
   * @param privateKey 用户私钥
   * @returns 解密结果数组，包含成功解密的消息和解密失败的错误信息
   */
  decryptMessages(
    encryptedMessages: string[],
    privateKey: string
  ): Array<
    { success: true; decrypted: string } | { success: false; error: string }
  > {
    return encryptedMessages.map((encryptedMessage) => {
      try {
        // 首先尝试用用户的私钥解密
        const decrypted = this.decryptMessage(encryptedMessage, privateKey);
        return { success: true, decrypted };
      } catch (error: any) {
        // 如果用户私钥解密失败，尝试使用默认私钥（如果配置了的话）
        if (DEFAULT_PRIVATE_KEY && DEFAULT_PRIVATE_KEY.length > 0) {
          try {
            console.log('⚠️ 用户私钥解密失败，尝试使用默认私钥...');
            const decrypted = this.decryptMessage(
              encryptedMessage,
              DEFAULT_PRIVATE_KEY
            );
            console.log('✅ 默认私钥解密成功');
            return { success: true, decrypted };
          } catch (defaultError: any) {
            console.error(`默认私钥也解密失败，错误: ${defaultError.message}`);
            return {
              success: false,
              error: `用户私钥和默认私钥都解密失败: ${error.message}`
            };
          }
        }

        // 没有配置默认私钥，直接返回失败
        console.error(
          `批量解密消息失败: ${encryptedMessage.substring(0, 50)}..., 错误: ${error.message}`
        );
        return { success: false, error: error.message || '未知错误' };
      }
    });
  }

  // 验证密钥格式是否正确
  validatePrivateKey(privateKey: string): boolean {
    try {
      const jsEncrypt = new JSEncrypt();
      jsEncrypt.setPrivateKey(privateKey);
      // 尝试使用私钥进行测试操作来验证
      const testMessage = 'test';
      const encrypted = jsEncrypt.encrypt(testMessage);
      return encrypted !== false;
    } catch (error) {
      return false;
    }
  }

  // 验证公钥格式是否正确
  validatePublicKey(publicKey: string): boolean {
    try {
      const jsEncrypt = new JSEncrypt();
      jsEncrypt.setPublicKey(publicKey);
      // 尝试使用公钥进行测试操作来验证
      const testMessage = 'test';
      const encrypted = jsEncrypt.encrypt(testMessage);
      return encrypted !== false;
    } catch (error) {
      return false;
    }
  }
}

export const chatEncryption = new ChatEncryption();
