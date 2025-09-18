'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, MoreHorizontal, Volume2, Smile, Plus } from 'lucide-react';
// import { ScrollArea } from '@/components/ui/scroll-area';

type Msg = {
	id: string;
	fromMe: boolean;
	time: string;
	avatar?: string;
	ciphertext: string;
	discussionCount: number;
	plaintext?: string;
};

const DEMO_MESSAGES: Msg[] = [
	{ id: 'm1', fromMe: false, time: '09:58 AM', avatar: '/me/me1.png', ciphertext: 'TE6iTYGZ7yEwY8CvYH0QkYrYRhv7TPvC/1bE+Ab3A2e1A4Ph0nZGqySimTqekwN2yAh9Q/4lA4hJumsSeGtEGAC70x7NZG+qbLnL5na37kK0rz0X9zMKPAFDeeWLwsvL9QFy9KQbhnDjruYdz7bk4+grHZybEDn9Q0LwHo=', discussionCount: 156 },
	{ id: 'm2', fromMe: true, time: '10:02 AM', avatar: '/me/me2.png', ciphertext: 'QPPmdeWEyBfjISoo3WQV8ax0GMjPVlEULfuc7sKqWDg0DyS2E0G9XWX47JRUy3YkYx+HN2vYR60UmpOUrvikEcH1tg1MSHiedc+WkGW9U3Amr5x5uBIJRQKTiVVT3JGakcPMUyHj+1sKZAVR2yWlMBDpTYDWnc5pE=', discussionCount: 156 },
	{ id: 'm3', fromMe: false, time: '10:05 AM', avatar: '/me/me1.png', ciphertext: 'VY8CvYH0QkYrYRhv7TPvC/1bE+Ab3A2e1A4Ph0nZGqySimTqeTE6iTYGZ7yEkN2yAh9Q/4lA4hJumsSeGtEGAzMKPAFDeeWLwsvL9QFy9KQbhnDjruYdz7bk4+grHZy=', discussionCount: 48 },
	{ id: 'm4', fromMe: true, time: '10:08 AM', avatar: '/me/me2.png', ciphertext: 'b0DyS2E0G9XWX47JRUy3YkYx+HN2vYR60UmpOUrvikEcH1tg1MSHiedc+WkGW9U3Amr5x5uBIJRQKTiVVT3JGakcPMUyHj+1sKZAQPPmdeWEyBfjISoo3WQV8ax0GMjPVlEULfuc7sKqW=', discussionCount: 102 },
	{ id: 'm5', fromMe: false, time: '10:12 AM', avatar: '/me/me1.png', ciphertext: 'QbhnDjruYdz7bk4+grHZybEDn9Q0LwHoTE6iTYGZ7yEwY8CvYH0QkYrYRhv7TPvC/1bE+Ab3A2e1A4Ph0nZGqySimTqe=', discussionCount: 11 },
	{ id: 'm6', fromMe: false, time: '10:12 AM', avatar: '/me/me1.png', ciphertext: 'QbhnDjruYdz7bk4+grHZybEDn9Q0LwHoTE6iTYGZ7yEwY8CvYH0QkYrYRhv7TPvC/1bE+Ab3A2e1A4Ph0nZGqySimTqe=', discussionCount: 11 },
	{ id: 'm7', fromMe: false, time: '10:12 AM', avatar: '/me/me1.png', ciphertext: 'QbhnDjruYdz7bk4+grHZybEDn9Q0LwHoTE6iTYGZ7yEwY8CvYH0QkYrYRhv7TPvC/1bE+Ab3A2e1A4Ph0nZGqySimTqe=', discussionCount: 11 },
	{ id: 'm8', fromMe: false, time: '10:12 AM', avatar: '/me/me1.png', ciphertext: 'QbhnDjruYdz7bk4+grHZybEDn9Q0LwHoTE6iTYGZ7yEwY8CvYH0QkYrYRhv7TPvC/1bE+Ab3A2e1A4Ph0nZGqySimTqe=', discussionCount: 11 },
	{ id: 'm9', fromMe: false, time: '10:12 AM', avatar: '/me/me1.png', ciphertext: 'QbhnDjruYdz7bk4+grHZybEDn9Q0LwHoTE6iTYGZ7yEwY8CvYH0QkYrYRhv7TPvC/1bE+Ab3A2e1A4Ph0nZGqySimTqe=', discussionCount: 11 },
	{ id: 'm10', fromMe: false, time: '10:12 AM', avatar: '/me/me1.png', ciphertext: 'QbhnDjruYdz7bk4+grHZybEDn9Q0LwHoTE6iTYGZ7yEwY8CvYH0QkYrYRhv7TPvC/1bE+Ab3A2e1A4Ph0nZGqySimTqe=', discussionCount: 11 },
];

type StoredKey = {
	id: string;
	name: string;
	publicKey: string;
	privateKeyEnc: string;
	createdAt: number;
	pinned?: boolean;
};

const LS_KEYS = 'uc_keys_v1';
const LS_KEYINDEX = 'uc_key_index_v1';

function loadKeys(): StoredKey[] {
	try {
		const raw = localStorage.getItem(LS_KEYS);
		return raw ? (JSON.parse(raw) as StoredKey[]) : [];
	} catch {
		return [];
	}
}

function saveKeys(keys: StoredKey[]) {
	localStorage.setItem(LS_KEYS, JSON.stringify(keys));
}

function setActiveKeyId(id: string) {
	localStorage.setItem(LS_KEYINDEX, id);
}

function getActiveKeyId() {
	return localStorage.getItem(LS_KEYINDEX);
}

function encryptPrivateKey(privateKey: string, pass: string) {
	return btoa(`${pass}::${privateKey}`);
}

function tryDecryptPrivateKey(enc: string, pass: string) {
	try {
		const raw = atob(enc);
		if (!raw.startsWith(`${pass}::`)) return null;
		return raw.slice(`${pass}::`.length);
	} catch {
		return null;
	}
}

function demoPlaintextFor(msgId: string) {
	if (msgId === 'm1') return '今天赶紧开会讨论密钥流程';
	if (msgId === 'm2') return '好的，我这边先起需求文档';
	return '解密成功的演示明文';
}

export default function ChatDetailPage() {
	const router = useRouter();
	const params = useParams();
	const chatId = params?.id as string;
	const TITLE_MAP: Record<string, string> = {
		'1': 'Arbitrum Vote Group',
		'2': 'BNB Chain持币群',
		'3': 'Publicleader Group',
		'4': 'Arbitrim Project Team',
		'5': 'Vitalik Musk',
		'6': 'Musk JedMcCaleb'
	};
	const chatTitle = TITLE_MAP[chatId] || '聊天';

	const [msgs, setMsgs] = useState<Msg[]>(DEMO_MESSAGES);
	const [showKeyWizard, setShowKeyWizard] = useState(false);
	const [showDecrypt, setShowDecrypt] = useState<{ open: boolean; msgId?: string }>({ open: false });

	const onClickDecrypt = (msgId: string) => {
		const hasKeys = loadKeys().length > 0;
		if (!hasKeys) {
			setShowKeyWizard(true);
		} else {
			setShowDecrypt({ open: true, msgId });
		}
	};

	const handleWizardDone = () => {
		setShowKeyWizard(false);
		setShowDecrypt({ open: true, msgId: msgs[0].id });
	};

	const handleDoDecrypt = (
		msgId: string,
		keyId: string,
		pass: string,
		setError: (s: string) => void,
		onClose: () => void
	) => {
		const keys = loadKeys();
		const k = keys.find(k => k.id === keyId);
		if (!k) {
			setError('请选择私钥');
			return;
		}
		const priv = tryDecryptPrivateKey(k.privateKeyEnc, pass);
		if (!priv) {
			setError('密码输入错误，请重新输入');
			return;
		}
		setMsgs(prev => prev.map(m => (m.id === msgId ? { ...m, plaintext: demoPlaintextFor(msgId) } : m)));
		onClose();
	};

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden">
			<div className="flex items-center justify-between px-3 py-2">
				<button className="px-3 py-1 text-[12px] rounded-full bg-[#F5F6F7] border border-gray-200">BNB Chain</button>
				<appkit-button />
				<button className="px-3 py-1 text-[12px] rounded-full bg-[#F5F6F7] border border-gray-200 flex items-center gap-1">
					<Image src="/top/usa.png" alt="usa" width={16} height={16} />
					<span>USA</span>
				</button>
			</div>

			<div className="flex items-center justify-between px-3 py-3 border-b">
				<button onClick={() => router.back()} className="p-2 -ml-2">
					<ChevronLeft className="h-5 w-5" />
				</button>
				<div className="flex-1 text-center text-base font-medium truncate px-2">{chatTitle}</div>
				<button className="p-2">
					<MoreHorizontal className="h-5 w-5" />
				</button>
			</div>

            {/* 消息区（固定高度容器，仅消息区滚动）*/}
            <div className="flex-1 min-h-0 bg-[#f4f4f4] overflow-hidden">
				<div className="h-full overflow-y-auto overscroll-contain">
					<div className="px-3 pb-28 space-y-3">
						{msgs.map(m => (
							<div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
								{!m.fromMe && (
									<div className="h-8 w-8 rounded overflow-hidden border">
										<img src={m.avatar} alt="avatar" className="h-full w-full object-cover" />
									</div>
								)}

								<div className={`max-w-[78%] rounded-[10px] p-3 relative ${m.fromMe ? 'bg-[#ffffff]' : 'bg-[#95ec69]'}`}>
									<div className="text-[12px] break-all leading-5 text-[#444]">{m.ciphertext}</div>
									{m.plaintext ? (
										<div className="mt-2 text-[13px] text-[#222] bg-white rounded border p-2">{m.plaintext}</div>
									) : (
										<div className="flex items-center gap-3 mt-2">
											<button className="text-[12px] px-1 py-[2px] rounded bg-[#fef1ef] text-[#606266] flex items-center" onClick={() => onClickDecrypt(m.id)}>
												<Image src="/chats/keyIcon.png" alt="key" width={12} height={12} className="mr-1" />
												<div>解密</div>
											</button>
											<button className="text-[12px] px-1 py-[2px] rounded bg-[#e8f7ed] text-[#606266] flex items-center" onClick={() => onClickDecrypt(m.id)}>
												<Image src="/chats/news.png" alt="key" width={12} height={12} className="mr-1" />
												<div>{m.discussionCount}</div>
											</button>
										</div>
									)}
								</div>

								{m.fromMe && (
									<div className="h-8 w-8 rounded overflow-hidden border">
										<img src={m.avatar} alt="avatar" className="h-full w-full object-cover" />
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</div>

			{/* 底部输入区（固定在底部，悬浮于全局底部导航之上）*/}
			<ChatInputBar />

			{showKeyWizard && (
				<KeyWizard onClose={() => setShowKeyWizard(false)} onDone={handleWizardDone} />
			)}

			{showDecrypt.open && showDecrypt.msgId && (
				<DecryptDialog msgId={showDecrypt.msgId} onClose={() => setShowDecrypt({ open: false })} onConfirm={handleDoDecrypt} />
			)}
		</div>
	);
}

function ChatInputBar() {
	const [voiceMode, setVoiceMode] = useState(false);
	const [value, setValue] = useState('');

	return (
		<div className="fixed left-0 right-0 bottom-[80px] z-40 border-t bg-white px-2 py-2">
			<div className="mx-auto max-w-[720px] flex items-center gap-2">
				<button className={`p-2 rounded ${voiceMode ? 'bg-gray-100' : ''}`} onClick={() => setVoiceMode(v => !v)}>
					<Volume2 className="h-5 w-5" />
				</button>

				{!voiceMode ? (
					<input value={value} onChange={(e) => setValue(e.target.value)} placeholder="今天赶紧会议很顺利" className="flex-1 text-sm bg-gray-100 rounded-full px-3 py-2 outline-none" />
				) : (
					<div className="flex-1 text-sm bg-gray-100 rounded-full px-3 py-2 text-center text-gray-600">按住说话</div>
				)}

				<button className="p-2">
					<Smile className="h-5 w-5" />
				</button>
				<button className="p-2" onClick={() => alert('打开“更多 +”面板（相册/拍摄/语音通话/AI/红包/转账/发货/投票）占位')}>
					<Plus className="h-5 w-5" />
				</button>
			</div>
		</div>
	);
}

function KeyWizard({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
	const [publicKey, setPublicKey] = useState('');
	const [privateKey, setPrivateKey] = useState('');
	const [pass1, setPass1] = useState('');
	const [pass2, setPass2] = useState('');
	const [error, setError] = useState('');

	const generateKeys = () => {
		const id = Math.random().toString(36).slice(2, 8);
		setPublicKey(`-----BEGIN PUBLIC KEY-----\nPUB-${id}\n-----END PUBLIC KEY-----`);
		setPrivateKey(`-----BEGIN RSA PRIVATE KEY-----\nPRI-${id}\n-----END RSA PRIVATE KEY-----`);
		setError('');
	};

	const save = () => {
		if (!publicKey || !privateKey) {
			setError('请先生成密钥');
			return;
		}
		if (pass1.length === 0 || pass1.length > 6) {
			setError('请输入0-6位的快捷密码');
			return;
		}
		if (pass1 !== pass2) {
			setError('二次密码不一致，需再次输入');
			return;
		}
		const keys = loadKeys();
		const newId = keys.length === 0 ? '001' : String(keys.length + 1).padStart(3, '0');
		const record: StoredKey = { id: newId, name: `编号${newId}`, publicKey, privateKeyEnc: encryptPrivateKey(privateKey, pass1), createdAt: Date.now(), pinned: keys.length === 0 };
		const next = [record, ...keys];
		saveKeys(next);
		setActiveKeyId(record.id);
		onDone();
	};

	return (
		<div className="fixed inset-0 z-50 bg-black/30 flex items-end">
			<div className="w-full bg-white rounded-t-xl p-4 space-y-3">
				<div className="text-center font-medium">生成密钥</div>
				<div className="text-xs text-gray-500">公钥（Public Key）</div>
				<textarea className="w-full h-20 text-xs border rounded p-2" placeholder="- BEGIN PUBLIC KEY -" value={publicKey} readOnly />
				<div className="text-xs text-gray-500">私钥（Private Key）</div>
				<textarea className="w-full h-20 text-xs border rounded p-2" placeholder="- BEGIN RSA PRIVATE KEY -" value={privateKey} readOnly />
				<div className="flex items-center gap-2">
					<button className="px-3 py-2 text-sm rounded border" onClick={generateKeys}>生成密钥</button>
					<button className="px-3 py-2 text-sm rounded border" onClick={() => { setPublicKey(''); setPrivateKey(''); }}>清空</button>
				</div>
				<div className="text-xs text-gray-500">输入保存密钥密码（0-6位）</div>
				<input className="w-full border rounded px-2 py-2 text-sm" type="password" maxLength={6} value={pass1} onChange={(e) => setPass1(e.target.value)} placeholder="******" />
				<input className="w-full border rounded px-2 py-2 text-sm" type="password" maxLength={6} value={pass2} onChange={(e) => setPass2(e.target.value)} placeholder="再次输入密码" />
				{error && <div className="text-xs text-red-500">{error}</div>}
				<div className="flex gap-2">
					<button className="flex-1 py-2 border rounded" onClick={onClose}>取消</button>
					<button className="flex-1 py-2 bg-black text-white rounded" onClick={save}>保存密码</button>
				</div>
			</div>
		</div>
	);
}

function DecryptDialog({ msgId, onClose, onConfirm }: { msgId: string; onClose: () => void; onConfirm: (msgId: string, keyId: string, pass: string, setError: (s: string) => void, onClose: () => void) => void; }) {
	const [keys, setKeys] = useState<StoredKey[]>([]);
	const [showList, setShowList] = useState(false);
	const [selectedKeyId, setSelectedKeyId] = useState<string>('');
	const [pass, setPass] = useState('');
	const [error, setError] = useState('');

	useEffect(() => {
		const k = loadKeys();
		setKeys(k);
		const active = getActiveKeyId() || (k[0]?.id ?? '');
		setSelectedKeyId(active);
	}, []);

	const currentKey = useMemo(() => keys.find(k => k.id === selectedKeyId), [keys, selectedKeyId]);

	const removeKey = (id: string) => {
		const next = loadKeys().filter(k => k.id !== id);
		saveKeys(next);
		setKeys(next);
		if (selectedKeyId === id) setSelectedKeyId(next[0]?.id ?? '');
	};

	return (
		<div className="fixed inset-0 z-50 bg-black/30 flex items-end">
			<div className="w-full bg-white rounded-t-xl p-4 space-y-3">
				<div className="text-center font-medium">解密密文</div>
				<div className="text-xs text-gray-500">私钥（Private Key）</div>
				<div className="flex items-center justify-between border rounded px-2 py-2">
					<div className="text-xs text-gray-700 truncate">{currentKey ? `${currentKey.name} · ${currentKey.publicKey.slice(0, 20)}...` : '暂无可用私钥'}</div>
					<button className="px-2 py-1 text-xs border rounded" onClick={() => setShowList(true)}>选择</button>
				</div>
				<div className="text-xs text-gray-500">请输入密码</div>
				<input className="w-full border rounded px-2 py-2 text-sm" type="password" maxLength={6} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="******" />
				{error && <div className="text-xs text-red-500">{error}</div>}
				<div className="flex gap-2">
					<button className="flex-1 py-2 border rounded" onClick={onClose}>取消</button>
					<button className="flex-1 py-2 bg-black text-white rounded" onClick={() => onConfirm(msgId, selectedKeyId, pass, setError, onClose)}>解密</button>
				</div>
			</div>

			{showList && (
				<div className="absolute inset-0 bg-black/40 flex items-end">
					<div className="w-full bg-white rounded-t-xl p-4">
						<div className="text-center font-medium">选择私钥</div>
						<div className="max-h-64 overflow-y-auto mt-3 space-y-2">
							{keys.map(k => (
								<div key={k.id} className={`border rounded p-3 text-xs flex items-center justify-between ${k.id === selectedKeyId ? 'border-purple-500' : ''}`}>
									<div className="flex-1">
										<div className="font-medium">编号{k.id}</div>
										<div className="text-gray-500 truncate">{k.publicKey.slice(0, 40)}...</div>
									</div>
									<div className="flex items-center gap-2">
										<button className="px-2 py-1 text-xs border rounded" onClick={() => { setSelectedKeyId(k.id); setShowList(false); setActiveKeyId(k.id); }}>选择</button>
										<button className="px-2 py-1 text-xs border rounded text-red-500" onClick={() => removeKey(k.id)}>删除</button>
									</div>
								</div>
							))}
							{keys.length === 0 && <div className="text-center text-xs text-gray-500 py-6">暂无私钥，请先生成</div>}
						</div>
						<div className="mt-3">
							<button className="w-full py-2 border rounded" onClick={() => setShowList(false)}>返回</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}


