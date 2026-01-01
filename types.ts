
export type ThemeMode = 'light' | 'dark' | 'prism-light' | 'prism-dark';

// Add global window extension for PWA
declare global {
  interface Window {
    deferredPrompt: any;
    faceapi: any;
  }
}

export enum RoleLevel {
  ROOT = '00',
  BOSS = '01',
  FRONT_DESK = '02',
  MANAGER_TEAL = '03',
  MANAGER_OLIVE = '04',
  MANAGER_GRAY = '05',
  STAFF = '06',
  LEVEL_07 = '07',
  LEVEL_08 = '08',
  GUEST = '09'
}

export type LogPermissionLevel = 'A' | 'B' | 'C' | 'D';

// ... (rest of file is same)
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
  password?: string; // 新增密码字段用于登录验证
  role: RoleLevel;
  avatar?: string;
  face_descriptor?: number[]; // For face-api.js 128-float array
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
  expiryDate: string | null; // 16.2.2 Allows NULL
  totalQuantity: number;     // 16.1.1 Core Logic: Total Quantity
  conversionRate: number;    // 16.1.1 Per Batch Conversion Rate (Key: Independent per batch)
  price?: number;
  notes?: string;
  // Helpers for display, derived from totalQuantity / conversionRate
  // No longer source of truth in DB
  quantityBig?: number;
  quantitySmall?: number;
}

export interface Product {
  id: string;
  storeId: string; // 核心：数据隔离字段
  name: string;
  category: string;
  sku: string;
  batches: Batch[];
  image_url?: string | null; // 16.2.3 Allow NULL
  notes?: string;
  keywords?: string[];
  // New Fields per Section 23 & 16.1.1 (Product Level Static Attributes)
  unitBig: string;      // 大单位 (如: 箱)
  unitSmall: string;    // 小单位 (如: 瓶)
  conversionRate: number; // 默认换算制 (如: 10)
  quantityBig?: number;
  quantitySmall?: number;
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
  change_delta?: number;
  operator_id: string;
  operator_name: string;
  created_at: string;
  is_revoked: boolean;
  snapshot_data: any; 
  role_level: RoleLevel; 
}

export type AnnouncementFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'permanent';

export interface Announcement {
  id: string;
  title: string;
  content: string; // HTML supported
  author_id: string;
  author_name: string;
  author_role: RoleLevel;
  created_at: string;
  target_roles: RoleLevel[];
  target_userIds?: string[];
  read_user_ids: string[]; 
  type: 'notice' | 'suggestion';
  popup_config?: {
    enabled: boolean;
    frequency: AnnouncementFrequency;
  };
  auto_revoke_config?: {
    enabled: boolean;
    revoke_date: string; // ISO date string
  };
  allow_hide: boolean;
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
