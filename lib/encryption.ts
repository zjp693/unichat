import JSEncrypt from "jsencrypt";

// 默认密钥对（1024位，用于没有用户密钥时的备用）
export const DEFAULT_KEY_PAIR = {
  publicKey: `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDDXOZ7YyKtP8JrVT+GnC9zQ1mK
5A7L8B3W9R4N6X2E1F5T7J8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7D8
E9F0G1H2I3J4K5L6M7N8O9P0Q1R2S3T4U5V6W7X8Y9Z0A1B2C3D4E5F6G7H8I9J0
K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2
QIDAQAB
-----END PUBLIC KEY-----`,
  privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQDDXOZ7YyKtP8JrVT+GnC9zQ1mK5A7L8B3W9R4N6X2E1F5T7J8K
9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7D8E9F0G1H2I3J4K5L6M7N8O9P0
Q1R2S3T4U5V6W7X8Y9Z0A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2
W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2QIDAQABAoGAV5m3J8K9L0M1
N2O3P4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7D8E9F0G1H2I3J4K5L6M7N8O9P0Q1R2S3
T4U5V6W7X8Y9Z0A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5
Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7
F8G9H0I1J2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C1D2E3F4G5H6I7J8K9
QJEA8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7D8E9F0G1H2I3J4K5L6M7
N8O9P0Q1R2S3T4U5V6W7X8Y9Z0A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9
T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1
Z2A3B4C5D6E7F8G9H0I1J2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C1D2E3
QJEA1N2O3P4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7D8E9F0G1H2I3J4K5L6M7N8O9P0
Q1R2S3T4U5V6W7X8Y9Z0A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2
W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4
C5D6E7F8G9H0I1J2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C1D2E3F4G5H6
QJBAJrVT+GnC9zQ1mK5A7L8B3W9R4N6X2E1F5T7J8K9L0M1N2O3P4Q5R6S7T8U9
V0W1X2Y3Z4A5B6C7D8E9F0G1H2I3J4K5L6M7N8O9P0Q1R2S3T4U5V6W7X8Y9Z0A1
B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3
H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F8G9H0I1J2K3L4M5
QJAJrVT+GnC9zQ1mK5A7L8B3W9R4N6X2E1F5T7J8K9L0M1N2O3P4Q5R6S7T8U9V0
W1X2Y3Z4A5B6C7D8E9F0G1H2I3J4K5L6M7N8O9P0Q1R2S3T4U5V6W7X8Y9Z0A1B2
C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4
I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F8G9H0I1J2K3L4M5N6
QJAJrVT+GnC9zQ1mK5A7L8B3W9R4N6X2E1F5T7J8K9L0M1N2O3P4Q5R6S7T8U9V0
W1X2Y3Z4A5B6C7D8E9F0G1H2I3J4K5L6M7N8O9P0Q1R2S3T4U5V6W7X8Y9Z0A1B2
C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4
I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F8G9H0I1J2K3L4M5N6
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