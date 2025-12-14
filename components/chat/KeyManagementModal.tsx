'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Copy, Key, ChevronDown } from 'lucide-react';
import { useKeyManagement } from '@/hooks/useKeyManagement';
import { type KeyPair, chatEncryption } from '@/lib/keyManagement';
import { cn } from '@/lib/utils';
import { useRegisterPublicKey } from '@/lib/DirectMessageAbi';
import { useAccount } from 'wagmi';

interface KeyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySelect: (key: KeyPair) => void;
  onBatchDecrypt?: (key: KeyPair) => void; // 添加批量解密回调
}

export const KeyManagementModal = ({
  isOpen,
  onClose,
  onKeySelect,
  onBatchDecrypt
}: KeyManagementModalProps) => {
  const { keys, loading, generateNewKeyPair, saveKeyToStorage } =
    useKeyManagement();
  const { address } = useAccount();
  const { writeContractAsync } = useRegisterPublicKey();

  // 根据是否有密钥来决定初始步骤
  const initialStep = keys.length > 0 ? 'select' : 'generate';
  const [step, setStep] = useState<'select' | 'generate' | 'import'>(
    initialStep
  );
  const [keyName, setKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<KeyPair | null>(null);
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 只在弹框首次打开时设置初始步骤和默认选择的密钥
  useEffect(() => {
    if (isOpen) {
      const currentStep = keys.length > 0 ? 'select' : 'generate';
      setStep(currentStep);

      // 如果有密钥且没有选中的密钥，默认选择第一个
      if (keys.length > 0 && !selectedKeyId) {
        setSelectedKeyId(keys[0].id);
      }

      // 每次打开弹窗时清空密码输入框
      setPrivateKeyInput('');
    } else {
      // 关闭弹窗时重置所有状态
      setPrivateKeyInput('');
      setPasswordInput('');
      setIsDropdownOpen(false);
    }
  }, [isOpen, keys, selectedKeyId]);

  // 点击外部关闭下拉列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (!isOpen) return null;

  const handleGenerateKey = async () => {
    try {
      const keyNameToUse = keyName.trim() || `密钥_${Date.now()}`;
      // 只生成密钥对，不保存到本地存储
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

      saveKeyToStorage(keyData);

      alert('密钥保存成功！公钥已上链！');

      // 仅保存密钥，不触发解密操作
      onKeySelect(keyData); // 通知父组件使用新密钥
      setGeneratedKey(null);
      setPasswordInput('');
      setPrivateKeyInput('');
      setKeyName('');
      onClose(); // 关闭模态框
    } catch (error) {
      console.error('❌ 保存密钥失败:', error);
      alert(
        `保存密钥失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const handleKeySelect = (key: KeyPair) => {
    onKeySelect(key);
    // 解密成功后清空密码输入框
    setPrivateKeyInput('');
    onClose();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 下载密钥文件（使用txt格式）
  const downloadKeyFile = (key: KeyPair, password: string) => {
    try {
      // 创建密钥数据文本内容
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

      // 创建Blob对象
      const blob = new Blob([keyDataText], { type: 'text/plain' });

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unichat-key-${key.name || key.id}.txt`;

      // 触发下载
      document.body.appendChild(a);
      a.click();

      // 清理
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
        {step === 'select' ? (
          // 密钥选择界面
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-normal text-black">
                私钥(Private Key)
              </h3>
              {/* <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button> */}
            </div>

            {/* 密钥选择界面 - 只在有密钥时显示 */}
            <div className="space-y-6">
              {/* 私钥选择框 */}
              <div ref={dropdownRef}>
                {/* 当前选中的密钥显示框 */}
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-gray-100 border-0 rounded-lg h-20 pl-4 pr-10 text-sm cursor-pointer relative"
                >
                  {/* 显示当前选中密钥的详细信息 */}
                  <div className="absolute left-4 top-3 text-xs text-gray-600 font-mono leading-tight">
                    {(() => {
                      // 获取当前应该显示的密钥：优先显示选中的，否则显示第一个
                      const currentKey = selectedKeyId
                        ? keys.find((key) => key.id === selectedKeyId)
                        : keys[0];

                      const currentIndex = selectedKeyId
                        ? keys.findIndex((key) => key.id === selectedKeyId)
                        : 0;

                      if (!currentKey) return null;

                      return (
                        <div>
                          <div className="text-orange-500 font-bold text-base mb-1">
                            {String(currentIndex + 1).padStart(3, '0')}
                          </div>
                          <div>{currentKey.publicKey.substring(0, 40)}</div>
                          <div>
                            {currentKey.publicKey.substring(40, 80)}......
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {/* 下拉箭头 */}
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <ChevronDown
                      className={`h-4 w-4 text-gray-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>

                {/* 下拉列表 - 在弹框内部显示 */}
                {isDropdownOpen && (
                  <div
                    className="mt-2 bg-white border border-gray-200 rounded-lg overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                    style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      scrollbarWidth: 'thin'
                    }}
                  >
                    {keys.map((key, index) => {
                      // 判断当前密钥是否被选中（包括默认选中第一个的情况）
                      const isSelected = selectedKeyId
                        ? key.id === selectedKeyId
                        : index === 0;

                      return (
                        <div
                          key={key.id}
                          onClick={() => {
                            setSelectedKeyId(key.id);
                            setIsDropdownOpen(false);
                            setPrivateKeyInput(''); // 重置密码输入
                          }}
                          className={`p-4 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                            isSelected
                              ? 'bg-blue-50 hover:bg-blue-100'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-xs text-gray-600 font-mono leading-tight">
                            <div className="text-orange-500 font-bold text-base mb-1">
                              {String(index + 1).padStart(3, '0')}
                            </div>
                            <div>{key.publicKey.substring(0, 40)}</div>
                            <div>{key.publicKey.substring(40, 80)}......</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 密码输入框 */}
              <div className="space-y-3">
                <div>
                  <label className="text-base font-normal text-black">
                    密码
                  </label>
                </div>
                <Input
                  type="password"
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full border border-[#e6e6e6] rounded-lg  text-sm bg-white focus:outline-none focus:ring-0 focus:border-[#3b82f6] hover:border-[#e6e6e6] focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {/* 操作按钮区域 */}
              <div className="space-y-3">
                {/* 解密和下载按钮 */}
                <div className="flex gap-3">
                  {/* 解密按钮 */}
                  <Button
                    onClick={() => {
                      // 获取当前要使用的密钥：优先使用选中的，否则使用第一个
                      const keyToUse = selectedKeyId
                        ? keys.find((key) => key.id === selectedKeyId)
                        : keys[0];

                      if (!keyToUse) {
                        alert('没有可用的私钥');
                        return;
                      }

                      if (!privateKeyInput.trim()) {
                        alert('请输入密码');
                        return;
                      }

                      // 验证密码是否正确
                      const savedKeys = JSON.parse(
                        localStorage.getItem('chat_keys') || '[]'
                      );
                      const keyWithPassword = savedKeys.find(
                        (k: any) => k.id === keyToUse.id
                      );
                      console.log(keyWithPassword, '验证密钥密码');

                      if (
                        keyWithPassword &&
                        keyWithPassword.password !== privateKeyInput
                      ) {
                        alert('密码错误，请重新输入');
                        return;
                      }

                      // 解密成功，调用回调函数
                      try {
                        // 直接使用批量解密功能
                        if (onBatchDecrypt) {
                          onBatchDecrypt(keyToUse);
                        } else {
                          // 如果没有提供批量解密回调，则使用单条解密
                          handleKeySelect(keyToUse);
                        }
                      } catch (error: any) {
                        console.error('解密过程出错:', error);
                        alert(`解密失败: ${error.message || '未知错误'}`);
                      }
                    }}
                    className="flex-1 bg-[#5637f5] hover:bg-[#5637f5] active:bg-[#5637f5] focus:bg-[#5637f5] text-white rounded-lg text-base font-normal"
                  >
                    解 密
                  </Button>

                  {/* 下载按钮 - 用于测试，测试成功后删除 */}
                  <Button
                    onClick={() => {
                      // 获取当前要使用的密钥：优先使用选中的，否则使用第一个
                      const keyToUse = selectedKeyId
                        ? keys.find((key) => key.id === selectedKeyId)
                        : keys[0];

                      if (!keyToUse) {
                        alert('没有可用的私钥');
                        return;
                      }

                      if (!privateKeyInput.trim()) {
                        alert('请输入密码以验证身份');
                        return;
                      }

                      // 验证密码是否正确
                      const savedKeys = JSON.parse(
                        localStorage.getItem('chat_keys') || '[]'
                      );
                      const keyWithPassword = savedKeys.find(
                        (k: any) => k.id === keyToUse.id
                      );

                      if (
                        keyWithPassword &&
                        keyWithPassword.password !== privateKeyInput
                      ) {
                        alert('密码错误，请重新输入');
                        return;
                      }

                      // 下载密钥文件
                      downloadKeyFile(keyToUse, privateKeyInput);
                    }}
                    className="flex-1 bg-[#4CAF50] hover:bg-[#45a049] active:bg-[#3d8b40] focus:bg-[#4CAF50] text-white rounded-lg text-base font-normal"
                  >
                    下载
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : step === 'generate' ? (
          // 生成密钥界面
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-normal text-black">生成密钥</h3>
              <Button
                variant="ghost"
                onClick={() => {
                  // 如果没有密钥，直接关闭弹框；如果有密钥，返回选择界面
                  if (keys.length === 0) {
                    onClose();
                  } else {
                    setStep('select');
                  }
                }}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* 公钥区域 */}
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

              {/* 生成密钥按钮 */}
              <Button
                onClick={handleGenerateKey}
                disabled={loading}
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

              {/* 私钥区域 */}
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

              {/* 密码输入框 */}
              <div>
                <Input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="设置密码"
                  className="w-full border border-[#e6e6e6] rounded-md h-10 text-sm bg-white focus:outline-none focus:ring-0 focus:border-green-400 hover:border-[#e6e6e6] focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {/* 确定密码输入框 */}
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

              {/* {generatedKey && (
                <Button
                  onClick={() => {
                    try {
                      const testMessage = "测试消息";
                      const encrypted = chatEncryption.encryptMessage(testMessage, generatedKey.publicKey);
                      const decrypted = chatEncryption.decryptMessage(encrypted, generatedKey.privateKey);
                      
                      if (decrypted === testMessage) {
                        alert("密钥测试成功！可以正常加密解密");
                      } else {
                        alert("密钥测试失败：解密结果不匹配");
                      }
                    } catch (error: any) {
                      console.error("密钥测试失败:", error);
                      alert(`密钥测试失败: ${error.message || error}`);
                    }
                  }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-md h-10 text-sm font-normal mb-2"
                >
                  测试密钥
                </Button>
              )} */}

              {/* 保存密码按钮 */}
              <Button
                onClick={handleSaveKey}
                disabled={isRegistering}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md h-10 text-sm font-normal"
              >
                {isRegistering ? '正在上链注册...' : '保存密码并上链公钥'}
              </Button>

              {/* 下载密钥按钮 - 只在首次生成时提供 */}
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
        ) : (
          // 导入私钥界面
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-normal text-black">导入私钥</h3>
              <Button
                variant="ghost"
                onClick={() => setStep('select')}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-normal text-gray-800 mb-2">
                  密钥名称
                </label>
                <Input
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="请输入密钥名称"
                  className="w-full border-gray-300 rounded-md h-10"
                />
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-800 mb-2">
                  私钥内容
                </label>
                <textarea
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----..."
                  className="w-full h-24 border border-gray-300 rounded-md p-3 text-sm resize-none"
                />
              </div>

              <Button
                disabled={!keyName.trim() || !privateKeyInput.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-md h-10 text-sm font-normal"
              >
                导入私钥
              </Button>

              <Button
                variant="outline"
                onClick={() => setStep('select')}
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md h-10 text-sm font-normal"
              >
                返回
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
