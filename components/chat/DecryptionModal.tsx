'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown } from 'lucide-react';
import { useKeyManagement } from '@/hooks/useKeyManagement';
import type { KeyPair } from '@/lib/keyManagement';

interface DecryptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySelect: (key: KeyPair) => void;
  onBatchDecrypt?: (key: KeyPair) => void;
}

export const DecryptionModal = ({
  isOpen,
  onClose,
  onKeySelect,
  onBatchDecrypt
}: DecryptionModalProps) => {
  const { keys, setSelectedKeyId } = useKeyManagement();
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [selectedKeyId, setSelectedKeyIdLocal] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && keys.length > 0 && !selectedKeyId) {
      setSelectedKeyIdLocal(keys[0].id);
    } else if (!isOpen) {
      setPrivateKeyInput('');
      setIsDropdownOpen(false);
    }
  }, [isOpen, keys, selectedKeyId]);

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
            <h3 className="text-base font-normal text-black">
              私钥(Private Key)
            </h3>
          </div>

          <div className="space-y-6">
            <div ref={dropdownRef}>
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-gray-100 border-0 rounded-lg h-20 pl-4 pr-10 text-sm cursor-pointer relative"
              >
                <div className="absolute left-4 top-3 text-xs text-gray-600 font-mono leading-tight">
                  {(() => {
                    const currentKey = selectedKeyId
                      ? keys.find((key: KeyPair) => key.id === selectedKeyId)
                      : keys[0];

                    const currentIndex = selectedKeyId
                      ? keys.findIndex(
                          (key: KeyPair) => key.id === selectedKeyId
                        )
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
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <ChevronDown
                    className={`h-4 w-4 text-gray-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              {isDropdownOpen && (
                <div
                  className="mt-2 bg-white border border-gray-200 rounded-lg overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    scrollbarWidth: 'thin'
                  }}
                >
                  {keys.map((key: KeyPair, index: number) => {
                    const isSelected = selectedKeyId
                      ? key.id === selectedKeyId
                      : index === 0;

                    return (
                      <div
                        key={key.id}
                        onClick={() => {
                          setSelectedKeyIdLocal(key.id);
                          setSelectedKeyId(key.id);
                          setIsDropdownOpen(false);
                          setPrivateKeyInput('');
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

            <div className="space-y-3">
              <div>
                <label className="text-base font-normal text-black">密码</label>
              </div>
              <Input
                type="password"
                value={privateKeyInput}
                onChange={(e) => setPrivateKeyInput(e.target.value)}
                placeholder="请输入密码"
                className="w-full border border-[#e6e6e6] rounded-lg  text-sm bg-white focus:outline-none focus:ring-0 focus:border-[#3b82f6] hover:border-[#e6e6e6] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    const keyToUse = selectedKeyId
                      ? keys.find((key: KeyPair) => key.id === selectedKeyId)
                      : keys[0];

                    if (!keyToUse) {
                      alert('没有可用的私钥');
                      return;
                    }

                    if (!privateKeyInput.trim()) {
                      alert('请输入密码');
                      return;
                    }

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

                    try {
                      if (onBatchDecrypt) {
                        onBatchDecrypt(keyToUse);
                      } else {
                        onKeySelect(keyToUse);
                      }
                      setPrivateKeyInput('');
                      onClose();
                    } catch (error: any) {
                      console.error('解密过程出错:', error);
                      alert(`解密失败: ${error.message || '未知错误'}`);
                    }
                  }}
                  className="flex-1 bg-[#5637f5] hover:bg-[#5637f5] active:bg-[#5637f5] focus:bg-[#5637f5] text-white rounded-lg text-base font-normal"
                >
                  解 密
                </Button>

                <Button
                  onClick={() => {
                    const keyToUse = selectedKeyId
                      ? keys.find((key: KeyPair) => key.id === selectedKeyId)
                      : keys[0];

                    if (!keyToUse) {
                      alert('没有可用的私钥');
                      return;
                    }

                    if (!privateKeyInput.trim()) {
                      alert('请输入密码以验证身份');
                      return;
                    }

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
      </div>
    </div>
  );
};
