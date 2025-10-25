import JSEncrypt from 'jsencrypt';
import CryptoJS from 'crypto-js';

// 默认密钥对（1024位，用于没有用户密钥时的备用）
// 注意：这是一个有效的RSA密钥对，长期有效
export const DEFAULT_KEY_PAIR = {
  publicKey: `-----BEGIN PUBLIC KEY-----
MIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgFL9fMTLywWj1rot5I8ZEjNM+Goi
USmiGgL/Jk52dCLOGV6YNI968dyw5z0aw3lBbEWaNNUWCSS39RUymcKGfgP4vR6C
tO16yePx2IavEW8thT2za+G4+m1VTRrM1FguOZl8FPtWQ3kEjJHQyq639qO0Y4j8
jCDmdGDYotSuGKd7AgMBAAE=
-----END PUBLIC KEY-----`,
  privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIICWgIBAAKBgFL9fMTLywWj1rot5I8ZEjNM+GoiUSmiGgL/Jk52dCLOGV6YNI96
8dyw5z0aw3lBbEWaNNUWCSS39RUymcKGfgP4vR6CtO16yePx2IavEW8thT2za+G4
+m1VTRrM1FguOZl8FPtWQ3kEjJHQyq639qO0Y4j8jCDmdGDYotSuGKd7AgMBAAEC
gYAmffYp3RAsbIKC1hhlms5LRw8NQx97/PitnSRqThytrAQuUNBIIFEf+Fk4iTpS
+lo6qjyI/PB+vGgLTe3tQK4fp3gvy7cYd6TQFYxmK1tMtzHkOBZPSqS6FiH0wDTk
gaKU0QlTvvJKAA7PNKV7GqbnIsjPhUZO6VflY+hfzLXvEQJBAKJIWdvcTNJsxeM1
4VQOausLvJYwODEXl3f9ZqFq1sit7qZ+mtXjVoCP4OplSEtv9AOWvDZ8Ewt+cdQE
wSaLNQMCQQCC6qWkqE0fihnaAubp3B2HkjGexiYD2yYESZcpyipz/y2WWKV5catt
XhRXfN+9c7Jc7Un5AhSlcxxA7bdRTQ4pAkBjh+JtAUGwsXvxLcOkbS9QN6OTrcFZ
ArIoqqc+iytua5b6UJ4gXs1YDmaQ/EuJ0QElDlcjR5fardOciMn6HNkHAkAa1vh2
tXp6SNnb9FRbBaGYNcSuhHkuuTMmFeBD1Qq3FU3HUQ07xK4ckfkhppxIPvwGSS+t
OVv6P4s/VH0M0fthAkBeGZp9fs2tlrAkMrEeVgw7fM7zqu+1t7lvbSDYLyYofKzs
F0bJywwupkdpTMlldreixwVwUpKfagOully4ZqdW
-----END RSA PRIVATE KEY-----`
};

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

      const jsEncrypt = new JSEncrypt();

      // 验证公钥格式
      if (!this.validatePublicKey(publicKey)) {
        console.warn('公钥格式可能无效，尝试使用默认密钥');
        // 如果当前公钥无效，尝试使用默认公钥
        if (!this.validatePublicKey(DEFAULT_KEY_PAIR.publicKey)) {
          throw new Error('默认公钥也无效，需要重新生成密钥');
        }
        jsEncrypt.setPublicKey(DEFAULT_KEY_PAIR.publicKey);
      } else {
        jsEncrypt.setPublicKey(publicKey);
      }

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

  decryptMessage(encryptedMessage: string, privateKey: string): string {
    try {
      if (!encryptedMessage) {
        throw new Error('加密消息不能为空');
      }
      if (!privateKey) {
        throw new Error('私钥不能为空');
      }

      const parts = encryptedMessage.split(':');
      if (parts.length !== 2) {
        throw new Error('加密消息格式不正确');
      }

      const rsaEncryptedAesKey = parts[0];
      const aesEncryptedMessage = parts[1];

      const jsEncrypt = new JSEncrypt();
      jsEncrypt.setPrivateKey(privateKey);

      // 尝试解密 AES 密钥
      let aesKey = jsEncrypt.decrypt(rsaEncryptedAesKey);

      // 如果使用提供的私钥解密 AES 密钥失败，尝试使用默认私钥解密
      if (!aesKey) {
        console.warn('使用提供的私钥解密 AES 密钥失败，尝试使用默认私钥解密');
        const defaultJsEncrypt = new JSEncrypt();
        defaultJsEncrypt.setPrivateKey(DEFAULT_KEY_PAIR.privateKey);
        aesKey = defaultJsEncrypt.decrypt(rsaEncryptedAesKey);
      }

      if (!aesKey) {
        throw new Error('AES 密钥解密失败，可能是密钥不匹配');
      }

      // 使用解密后的 AES 密钥解密消息内容
      const decrypted = this._decryptWithAes(aesEncryptedMessage, aesKey);

      return decrypted;
    } catch (error: any) {
      console.error('解密错误:', error);
      throw new Error(`消息解密失败: ${error.message || error}`);
    }
  }

  /**
   * 批量解密消息
   * @param encryptedMessages 加密消息数组
   * @param privateKey 私钥
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
        const decrypted = this.decryptMessage(encryptedMessage, privateKey);
        return { success: true, decrypted };
      } catch (error: any) {
        console.error(
          `批量解密消息失败: ${encryptedMessage}, 错误: ${error.message}`
        );
        return { success: false, error: error.message || '未知错误' };
      }
    });
  }

  // 获取默认密钥对
  getDefaultKeyPair(): KeyPair {
    return {
      id: 'default',
      name: '默认密钥',
      publicKey: DEFAULT_KEY_PAIR.publicKey,
      privateKey: DEFAULT_KEY_PAIR.privateKey,
      createdAt: new Date().toISOString()
    };
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
