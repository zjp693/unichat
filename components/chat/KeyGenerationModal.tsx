'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { type KeyPair, chatEncryption } from '@/lib/keyManagement';
import { useKeyManagement } from '@/hooks/useKeyManagement';
import { useRegisterPublicKey } from '@/lib/DirectMessageAbi';
import { useAccount } from 'wagmi';

interface KeyGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyGenerated: (key: KeyPair) => void;
}

export const KeyGenerationModal = ({
  isOpen,
  onClose,
  onKeyGenerated
}: KeyGenerationModalProps) => {
  const [keyName, setKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<KeyPair | null>(null);
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const { saveKeyToStorage, generateNewKeyPair } = useKeyManagement();
  const { address } = useAccount();
  const { writeContractAsync } = useRegisterPublicKey();

  if (!isOpen) return null;

  const handleGenerateKey = async () => {
    try {
      const keyNameToUse = keyName.trim() || `密钥_${Date.now()}`;
      const { publicKey, privateKey } = chatEncryption.generateKeyPair();

      const newKey: KeyPair = {
        id: Date.now().toString(),
        name: keyNameToUse,
        publicKey,
        privateKey,
        createdAt: new Date().toISOString()
      };

      setGeneratedKey(newKey);
    } catch (error) {
      console.error('生成密钥失败:', error);
    }
  };

  const handleSaveKey = async () => {
    if (!generatedKey) {
      alert('请先生成密钥');
      return;
    }

    if (!passwordInput || !privateKeyInput) {
      alert('请输入密码');
      return;
    }

    if (passwordInput !== privateKeyInput) {
      alert('两次输入的密码不一致');
      return;
    }

    if (!address) {
      alert('请先连接钱包');
      return;
    }

    setIsRegistering(true);
    try {
      console.log('🔐 开始注册公钥到链上...');
      console.log('公钥:', generatedKey.publicKey);

      // 1. 先把公钥注册到链上
      const hash = await writeContractAsync({
        address: process.env
          .NEXT_PUBLIC_DIRECT_MESSAGE_CONTRACT_ADDRESS as `0x${string}`,
        abi: (await import('@/lib/DirectMessageAbi')).DirectMessageAbi,
        functionName: 'registerPublicKey',
        args: [generatedKey.publicKey]
      });

      console.log('✅ 公钥注册交易已发送:', hash);
      alert('公钥正在上链中，请等待交易确认...');

      // 2. 交易发送成功后，保存密钥到本地
      const keyData = {
        ...generatedKey,
        password: passwordInput,
        savedAt: new Date().toISOString(),
        txHash: hash
      };

      // 保存密钥到 Redux 和本地存储
      saveKeyToStorage(keyData);

      alert('密钥保存成功！公钥已上链！');
      onKeyGenerated(keyData);
      setGeneratedKey(null);
      setPasswordInput('');
      setPrivateKeyInput('');
      setKeyName('');
      onClose();
    } catch (error) {
      console.error('❌ 保存密钥失败:', error);
      alert(
        `保存密钥失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const downloadKeyFile = (key: KeyPair, password: string) => {
    try {
      const keyDataText = `-----BEGIN UNICHAT KEY INFO-----
密钥名称: ${key.name}
密钥ID: ${key.id}
创建时间: ${key.createdAt}
导出时间: ${new Date().toISOString()}

-----BEGIN PUBLIC KEY-----
${key.publicKey}
-----END PUBLIC KEY-----

-----BEGIN PRIVATE KEY-----
${key.privateKey}
-----END PRIVATE KEY-----

密码: ${password}
注意：请妥善保管此文件，不要泄露给他人。
-----END UNICHAT KEY INFO-----`;

      const blob = new Blob([keyDataText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unichat-key-${key.name || key.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载密钥文件失败:', error);
      alert('下载密钥文件失败，请重试');
    }
  };

  return (
    <div className="fixed bottom-14 w-full z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-normal text-black">生成密钥</h3>
            <Button variant="ghost" onClick={onClose} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-normal text-gray-800 mb-2">
                公钥(Public Key)
              </label>
              <div className="bg-gray-100 border border-[#e6e6e6] rounded-md p-3 h-20 overflow-auto">
                <pre className="text-xs text-gray-600 font-mono break-all whitespace-pre-wrap leading-tight">
                  {generatedKey?.publicKey || ''}
                </pre>
              </div>
            </div>

            <Button
              onClick={handleGenerateKey}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-md h-10 text-sm font-normal flex items-center justify-center gap-2"
            >
              生成密钥
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M1 4v6h6" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </Button>

            <div>
              <label className="block text-sm font-normal text-gray-800 mb-2">
                私钥(Private Key)
              </label>
              <div className="bg-white border border-[#e6e6e6] rounded-md p-3 h-20 overflow-auto">
                <pre className="text-xs text-gray-700 font-mono break-all whitespace-pre-wrap leading-tight">
                  {generatedKey?.privateKey || ''}
                </pre>
              </div>
            </div>

            <div>
              <Input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="设置密码"
                className="w-full border border-[#e6e6e6] rounded-md h-10 text-sm bg-white focus:outline-none focus:ring-0 focus:border-green-400 hover:border-[#e6e6e6] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div>
              <Input
                type="password"
                value={privateKeyInput}
                onChange={(e) => setPrivateKeyInput(e.target.value)}
                placeholder="确认密码"
                className={`w-full border rounded-md h-10 text-sm bg-white focus:outline-none focus:ring-0 hover:border-[#e6e6e6] focus-visible:ring-0 focus-visible:ring-offset-0 ${
                  privateKeyInput &&
                  passwordInput &&
                  privateKeyInput !== passwordInput
                    ? 'border-red-400 focus:border-red-400'
                    : 'border-[#e6e6e6] focus:border-green-400'
                }`}
              />
              {privateKeyInput &&
                passwordInput &&
                privateKeyInput !== passwordInput && (
                  <p className="text-red-500 text-xs mt-1">密码不一致</p>
                )}
            </div>

            <Button
              onClick={handleSaveKey}
              disabled={isRegistering}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md h-10 text-sm font-normal"
            >
              {isRegistering ? '正在上链注册...' : '保存密码并上链公钥'}
            </Button>

            {generatedKey && passwordInput && (
              <Button
                onClick={() => downloadKeyFile(generatedKey, passwordInput)}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-md h-10 text-sm font-normal"
              >
                下载密钥文件
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
