'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Key, CheckCircle2, ShieldCheck } from 'lucide-react';

interface KeyGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
}

export function KeyGenerationModal({
  isOpen,
  onClose,
  onGenerate,
  isGenerating
}: KeyGenerationModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isGenerating && onClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-4">
            <Key className="h-6 w-6 text-blue-600" />
          </div>
          <DialogTitle className="text-center text-xl">
            生成加密密钥
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            为了保护您的聊天隐私，我们需要为您生成一对加密密钥。
            <br />
            此过程仅需进行一次。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">端到端加密</p>
                <p className="text-gray-500 mt-1">
                  您的私聊消息将使用此密钥进行加密，只有您和接收方可以解密。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">去中心化存储</p>
                <p className="text-gray-500 mt-1">
                  公钥将公开上链，私钥将安全地加密存储在您的设备或云端。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center pb-2">
          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full h-11 text-base"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在生成密钥与签名...
              </>
            ) : (
              '立即生成'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
