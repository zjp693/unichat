import JSEncrypt from "jsencrypt";

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

  generateKeyPair(keySize: number = 2048): { publicKey: string; privateKey: string } {
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
      const jsEncrypt = new JSEncrypt();
      jsEncrypt.setPublicKey(publicKey);
      const encrypted = jsEncrypt.encrypt(message);
      if (!encrypted) throw new Error("加密失败");
      return encrypted;
    } catch (error) {
      console.error("加密错误:", error);
      throw new Error("消息加密失败");
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
