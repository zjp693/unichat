import React from 'react';
import { ChevronRight } from 'lucide-react';

interface StaticMenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  showBorder?: boolean;
}

export const StaticMenuItem: React.FC<StaticMenuItemProps> = ({
  icon,
  label,
  onClick,
  showBorder = true
}) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center bg-white px-4 py-3 transition-colors cursor-pointer"
    >
      <div className="flex-shrink-0 mr-4">
        {/* 图标容器，外部控制样式 */}
        {icon}
      </div>
      <div
        className={`flex-1 flex items-center justify-between py-3.5 border-gray-100 ${showBorder ? 'border-b' : ''}`}
      >
        <span className="text-sm text-gray-900 font-medium">{label}</span>
      </div>
    </div>
  );
};
