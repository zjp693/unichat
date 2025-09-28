import JSEncrypt from "jsencrypt";

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

  // 修改默认密钥位数为1024位
  generateKeyPair(keySize: number = 1024): { publicKey: string; privateKey: string } {
    try {
      // 直接使用JSEncrypt生成密钥对，确保兼容性
      const jsEncrypt = new JSEncrypt({ default_key_size: keySize.toString() });
      jsEncrypt.getKey();
      
      const publicKey = jsEncrypt.getPublicKey();
      const privateKey = jsEncrypt.getPrivateKey();
      
      if (!publicKey || !privateKey) {
        throw new Error("密钥生成失败");
      }
      
      return { publicKey, privateKey };
    } catch (error) {
      console.error("密钥生成失败:", error);
      throw new Error("密钥生成失败");
    }
  }

  encryptMessage(message: string, publicKey: string): string {
    try {
      // 验证输入参数
      if (!message || typeof message !== 'string') {
        throw new Error("消息内容无效");
      }
      if (!publicKey || typeof publicKey !== 'string') {
        throw new Error("公钥无效");
      }

      const jsEncrypt = new JSEncrypt();
      
      // 验证公钥格式
      if (!this.validatePublicKey(publicKey)) {
        console.warn("公钥格式可能无效，尝试使用默认密钥");
        // 如果当前公钥无效，尝试使用默认公钥
        if (!this.validatePublicKey(DEFAULT_KEY_PAIR.publicKey)) {
          throw new Error("默认公钥也无效，需要重新生成密钥");
        }
        jsEncrypt.setPublicKey(DEFAULT_KEY_PAIR.publicKey);
      } else {
        jsEncrypt.setPublicKey(publicKey);
      }
      
      const encrypted = jsEncrypt.encrypt(message);
      if (!encrypted) {
        throw new Error("JSEncrypt返回null，加密操作失败");
      }
      return encrypted;
    } catch (error) {
      console.error("加密错误详情:", error);
      console.error("消息长度:", message?.length);
      console.error("公钥长度:", publicKey?.length);
      throw new Error(`消息加密失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  decryptMessage(encryptedMessage: string, privateKey: string): string {
    try {
      const jsEncrypt = new JSEncrypt();
      jsEncrypt.setPrivateKey(privateKey);
      const decrypted = jsEncrypt.decrypt(encryptedMessage);
      if (!decrypted) {
        console.error("解密返回null，可能是密钥不匹配或消息格式错误");
        throw new Error("解密失败");
      }
      return decrypted;
    } catch (error) {
      console.error("解密错误:", error);
      throw new Error("消息解密失败");
    }
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
      const testMessage = "test";
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
      const testMessage = "test";
      const encrypted = jsEncrypt.encrypt(testMessage);
      return encrypted !== false;
    } catch (error) {
      return false;
    }
  }
}

export const chatEncryption = new ChatEncryption();