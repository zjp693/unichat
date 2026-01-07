import { LucideIcon } from 'lucide-react';

export interface LeaderboardUser {
  rank: number;
  id: string;
  name: string;
  avatar: string; // URL
  address: string;
  inviteCount: number;
  level: string; // e.g. "核心领导人", "中将", "千夫长"
  levelColor: string; // e.g. "text-orange-500", "text-blue-500"
  levelBg?: string; // pill background
}

export const LEVEL_ICONS: Record<string, string> = {
  核心领导人: '/invite/leader.png',
  中将: '/invite/LtGen.png',
  少将: '/invite/mjGen.png',
  千夫长: '/invite/tLder.png',
  团长: '/invite/tLder.png',
  百夫长: '/invite/centurion.png',
  班长: '/invite/SL.png'
};

export function getLevelIcon(level: string): string {
  return LEVEL_ICONS[level] || '/invite/SL.png';
}

export const MOCK_LEADERBOARD_DATA: LeaderboardUser[] = [
  {
    rank: 1,
    id: 'u1',
    name: '桃子太',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    address: '0x123...456',
    inviteCount: 50000,
    level: '核心领导人',
    levelColor: 'text-amber-600'
  },
  {
    rank: 2,
    id: 'u2',
    name: '君小君',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
    address: '0xabc...def',
    inviteCount: 10000,
    level: '中将',
    levelColor: 'text-blue-500'
  },
  {
    rank: 3,
    id: 'u3',
    name: '蒋晓晓',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella',
    address: '0x789...012',
    inviteCount: 5000,
    level: '少将',
    levelColor: 'text-orange-400'
  },
  {
    rank: 4,
    id: 'u4',
    name: '归来',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 1000,
    level: '千夫长',
    levelColor: 'text-pink-500',
    levelBg: 'bg-pink-100'
  },
  {
    rank: 5,
    id: 'u5',
    name: 'ssss俄方',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 500,
    level: '团长',
    levelColor: 'text-purple-500',
    levelBg: 'bg-purple-100'
  },
  {
    rank: 6,
    id: 'u6',
    name: '寻梦人',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 100,
    level: '百夫长',
    levelColor: 'text-cyan-500',
    levelBg: 'bg-cyan-100'
  },
  {
    rank: 7,
    id: 'u7',
    name: '卡里扣哦',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 100,
    level: '百夫长',
    levelColor: 'text-cyan-500',
    levelBg: 'bg-cyan-100'
  },
  {
    rank: 8,
    id: 'u8',
    name: '大阿福',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 100,
    level: '百夫长',
    levelColor: 'text-cyan-500',
    levelBg: 'bg-cyan-100'
  },
  {
    rank: 9,
    id: 'u9',
    name: '归来',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tom',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 79,
    level: '班长',
    levelColor: 'text-red-400',
    levelBg: 'bg-orange-100'
  },
  {
    rank: 10,
    id: 'u10',
    name: '归来',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jerry',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 69,
    level: '班长',
    levelColor: 'text-red-400',
    levelBg: 'bg-orange-100'
  },
  {
    rank: 11,
    id: 'u11',
    name: 'User11',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User11',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 50,
    level: '班长',
    levelColor: 'text-red-400',
    levelBg: 'bg-orange-100'
  },
  {
    rank: 12,
    id: 'u12',
    name: 'User12',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User12',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 45,
    level: '班长',
    levelColor: 'text-red-400',
    levelBg: 'bg-orange-100'
  },
  {
    rank: 13,
    id: 'u13',
    name: 'User13',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User13',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 40,
    level: '班长',
    levelColor: 'text-red-400',
    levelBg: 'bg-orange-100'
  },
  {
    rank: 14,
    id: 'u14',
    name: 'User14',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User14',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 35,
    level: '班长',
    levelColor: 'text-red-400',
    levelBg: 'bg-orange-100'
  },
  {
    rank: 15,
    id: 'u15',
    name: 'User15',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User15',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 30,
    level: '班长',
    levelColor: 'text-red-400',
    levelBg: 'bg-orange-100'
  },
  {
    rank: 16,
    id: 'u16',
    name: 'User16',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User16',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 25,
    level: '班长',
    levelColor: 'text-red-400',
    levelBg: 'bg-orange-100'
  },
  {
    rank: 17,
    id: 'u17',
    name: 'User17',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User17',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 20,
    level: '班长',
    levelColor: 'text-red-400',
    levelBg: 'bg-orange-100'
  },
  {
    rank: 18,
    id: 'u18',
    name: 'User18',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User18',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 15,
    level: '班长',
    levelColor: 'text-red-400',
    levelBg: 'bg-orange-100'
  },
  {
    rank: 19,
    id: 'u19',
    name: 'User19',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User19',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 10,
    level: '班长',
    levelColor: 'text-red-400',
    levelBg: 'bg-orange-100'
  },
  {
    rank: 20,
    id: 'u20',
    name: 'User20',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User20',
    address: '0xe11F28e59264833C117a4DAD01CCd70F98d2e5F4',
    inviteCount: 5,
    level: '班长',
    levelColor: 'text-red-400',
    levelBg: 'bg-orange-100'
  }
];
