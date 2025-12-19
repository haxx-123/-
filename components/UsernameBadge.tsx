import React from 'react';
import { RoleLevel } from '../types';

interface UsernameBadgeProps {
  name: string;
  roleLevel: RoleLevel;
  className?: string;
}

const UsernameBadge: React.FC<UsernameBadgeProps> = ({ name, roleLevel, className = '' }) => {
  const getStyle = (role: RoleLevel) => {
    switch (role) {
      case RoleLevel.ROOT: // 00 - Hype Purple/Pink/Cyan
        return 'role-gradient-00 font-bold';
      case RoleLevel.BOSS: // 01 - Gold
        return 'role-gradient-01 font-bold';
      case RoleLevel.FRONT_DESK: // 02 - DeepSkyBlue
        return 'text-[#00BFFF] font-medium';
      case RoleLevel.MANAGER_TEAL: // 03
        return 'text-teal-600 dark:text-teal-400';
      case RoleLevel.MANAGER_OLIVE: // 04
        return 'text-lime-700 dark:text-lime-500';
      case RoleLevel.MANAGER_GRAY: // 05
        return 'text-slate-600 dark:text-slate-400';
      case RoleLevel.STAFF: // 06-09
      case RoleLevel.GUEST:
      default:
        return 'text-black dark:text-white';
    }
  };

  return (
    <span className={`${getStyle(roleLevel)} ${className}`}>
      {name}
    </span>
  );
};

export default UsernameBadge;