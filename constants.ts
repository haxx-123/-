
import { RoleLevel, ThemeMode, Product, OperationLog, LogAction, Store, User, LoginRecord, Announcement } from './types';

export const THEMES: { mode: ThemeMode; name: string; bg: string; text: string }[] = [
  { mode: 'light', name: '浅色模式', bg: '#ffffff', text: '#000000' },
  { mode: 'dark', name: '深色模式', bg: '#000000', text: '#ffffff' },
  { mode: 'prism-light', name: '棱镜专属浅色', bg: '#F2F3F7', text: '#3C3836' }, // Ghost White
  { mode: 'prism-dark', name: '棱镜专属深色', bg: '#1D2021', text: '#EBDBB2' }, // Dark Grey & Oatmeal
];

// Empty initial states - Real data will be fetched from Supabase
export const MOCK_USERS: User[] = [];
export const MOCK_USER = null;
export const MOCK_STORES: Store[] = [];
export const MOCK_PRODUCTS: Product[] = [];
export const MOCK_LOGS: OperationLog[] = [];
export const MOCK_ANNOUNCEMENTS: Announcement[] = [];
export const MOCK_LOGIN_RECORDS: LoginRecord[] = [];

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('zh-CN', { hour12: false });
};

// Image Constants
export const APP_LOGO_URL = "https://i.ibb.co/vxq7QfYd/retouch-2025121423241826.png";
export const PWA_ICON_URL = "https://i.ibb.co/TBxHgV10/IMG-20251214-191059.png";
export const SIGNATURE_URL = "https://i.ibb.co/8gLfYKCW/retouch-2025121313394035.png";
