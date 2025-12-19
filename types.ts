export type ThemeMode = 'light' | 'dark' | 'prism-light' | 'prism-dark';

export enum RoleLevel {
  ROOT = '00',
  BOSS = '01',
  FRONT_DESK = '02',
  MANAGER_TEAL = '03',
  MANAGER_OLIVE = '04',
  MANAGER_GRAY = '05',
  STAFF = '06',
  GUEST = '09'
}

export type LogPermissionLevel = 'A' | 'B' | 'C' | 'D';

export interface UserPermissions {
  // Feature Hiding (Entrance Control)
  hideAuditHall?: boolean;      // 隐藏审计大厅
  hideStoreEdit?: boolean;      // 隐藏门店修改按钮
  hideNewStore?: boolean;       // 隐藏新建门店页面
  hideExcelExport?: boolean;    // 隐藏Excel导出
  hideSettings?: boolean;       // 隐藏权限设置页面
  
  // Visibility Scope (List Visibility)
  allowPeerLevel?: boolean;     // 允许查看同级
  onlyLowerLevel?: boolean;     // 仅低级用户
  hideSelf?: boolean;           // 隐藏自己
  
  // Logic Permissions (Matrix)
  logPermission?: LogPermissionLevel; // A, B, C, D
}

export interface User {
  id: string;
  username: string;
  role: RoleLevel;
  avatar?: string;
  storeId?: string; 
  permissions?: UserPermissions;
}

export interface Store {
  id: string;
  name: string;
  isParent: boolean;
  childrenIds?: string[];
  parentId?: string;
  location?: string;
  managerIds?: string[];
  viewerIds?: string[];
}

export interface Batch {
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantityBig: number; 
  quantitySmall: number; 
  unitBig: string;
  unitSmall: string;
  conversionRate: number; 
  price?: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  batches: Batch[];
  image_url?: string;
  notes?: string;
  keywords?: string[]; 
}

export enum LogAction {
  ENTRY_INBOUND = 'ENTRY_INBOUND',
  ENTRY_OUTBOUND = 'ENTRY_OUTBOUND',
  ENTRY_ADJUST = 'ENTRY_ADJUST',
  PRODUCT_DELETE = 'PRODUCT_DELETE',
  BATCH_IMPORT = 'BATCH_IMPORT'
}

export interface OperationLog {
  id: string;
  action_type: LogAction;
  target_id: string;
  target_name: string;
  change_desc: string;
  operator_id: string;
  operator_name: string;
  created_at: string;
  is_revoked: boolean;
  snapshot_data: any; 
  role_level: RoleLevel; 
}

export type AnnouncementFrequency = 'once' | 'daily' | 'monthly' | 'permanent';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  author_role: RoleLevel;
  created_at: string;
  target_roles: RoleLevel[];
  target_userIds?: string[];
  is_read: boolean;
  type: 'notice' | 'suggestion';
  popup_config?: {
    enabled: boolean;
    frequency: AnnouncementFrequency;
  };
  hidden_by_users?: string[];
}

export interface AuditRecord {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  operator_id: string;
  operator_name: string;
  created_at: string;
  ip_address: string;
  device_info: string;
}

export interface LoginRecord {
  id: string;
  user_id: string;
  user_name: string;
  device_name: string;
  ip_address: string;
  login_at: string;
}