
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
      // 36.3.1 SVIP
      case RoleLevel.ROOT: // 00
        return 'role-gradient-00';
      case RoleLevel.BOSS: // 01
        return 'role-gradient-01';
      
      // 36.3.2 VIP (Solid Colors)
      case RoleLevel.FRONT_DESK: // 02
        return 'text-[#00BFFF] font-medium'; // DeepSkyBlue
      case RoleLevel.MANAGER_TEAL: // 03
        return 'text-[#20B2AA] font-medium'; // LightSeaGreen/Teal Variant
      case RoleLevel.MANAGER_OLIVE: // 04
        return 'text-[#9ACD32] font-medium'; // YellowGreen
      case RoleLevel.MANAGER_GRAY: // 05 (Actually DarkTurquoise/DarkSlateGray adjusted per spec)
        return 'text-[#00CED1] font-medium'; // DarkTurquoise (Adjusted for visibility)

      // 36.3.3 Common (Follow Global Variable)
      case RoleLevel.STAFF: // 06
      case RoleLevel.GUEST: // 09
      default:
        return 'role-text-common'; // Maps to var(--text-primary)
    }
  };

  return (
    <span className={`${getStyle(roleLevel)} ${className}`}>
      {name}
    </span>
  );
};

export default UsernameBadge;
