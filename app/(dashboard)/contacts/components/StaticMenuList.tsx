import React from 'react';
import { UserPlus, MessageSquare, Users, ArrowUp, Video } from 'lucide-react';
import { StaticMenuItem } from './StaticMenuItem';

export const StaticMenuList: React.FC = () => {
  const menuItems = [
    {
      id: 'new-friends',
      label: '新的朋友',
      icon: <UserPlus className="w-5 h-5 text-white" />,
      bg: 'bg-orange-400'
    },
    {
      id: 'chat-only',
      label: '仅聊天非好友',
      icon: <MessageSquare className="w-5 h-5 text-white" />,
      bg: 'bg-orange-400'
    },
    {
      id: 'group-chat',
      label: '群聊',
      icon: <Users className="w-5 h-5 text-white" />,
      bg: 'bg-green-500' // 微信群聊通常是绿色，或者参考设计图蓝色
    },
    {
      id: 'pinned',
      label: '置顶好友',
      icon: <ArrowUp className="w-5 h-5 text-white" />,
      bg: 'bg-blue-500'
    },
    {
      id: 'follow-video',
      label: '关注Video',
      icon: <Video className="w-5 h-5 text-white" />,
      bg: 'bg-red-500'
    }
  ];

  // 修正设计图颜色：群聊如果是蓝色则用 blue-500
  // 这里根据用户提供的图：群聊是蓝色，置顶好友是蓝色（稍深），关注Video是红色。
  // new-friends: orange
  // chat-only: orange
  // group-chat: blue
  // pinned: blue
  // follow-video: red

  const renderImage = (src: string, bgColor: string) => (
    <div
      className={`${bgColor} w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden`}
    >
      <img src={src} alt="icon" className="w-6 h-6 object-contain" />
    </div>
  );

  return (
    <div className="flex flex-col bg-white mb-2">
      <StaticMenuItem
        label="新的朋友"
        icon={renderImage('/contacts/newFriend.png', 'bg-[#FA9D3B]')}
      />
      <StaticMenuItem
        label="仅聊天非好友"
        icon={renderImage('/contacts/chitchat.png', 'bg-[#FA9D3B]')}
      />
      <StaticMenuItem
        label="群聊"
        icon={renderImage('/contacts/groupChat.png', 'bg-[#4C84F5]')}
      />
      <StaticMenuItem
        label="置顶好友"
        icon={renderImage('/contacts/stick.png', 'bg-[#4C84F5]')}
      />
      <StaticMenuItem
        label="关注Video"
        icon={renderImage('/contacts/video.png', 'bg-[#EB4D3D]')}
      />
    </div>
  );
};
