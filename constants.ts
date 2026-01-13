
import { RoleLevel, ThemeMode, Product, OperationLog, LogAction, Store, User, LoginRecord, Announcement } from './types';

export const THEMES: { mode: ThemeMode; name: string; bg: string; text: string }[] = [
  { mode: 'light', name: '浅色', bg: '#FFFFFF', text: '#000000' }, 
  { mode: 'dark', name: '深色', bg: '#000000', text: '#FFFFFF' }, 
  { mode: 'prism-light', name: '纯白天使', bg: '#F2F3F7', text: '#3C3836' }, 
  { mode: 'prism-dark', name: '尊贵暗金', bg: '#1D2021', text: '#EBDBB2' }, 
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

// Image Constants (Localized per Section 26.1 & 26.4)
export const APP_LOGO_URL = "/logo.png";
export const PWA_ICON_URL = "/icons/icon-192.png";
export const SIGNATURE_URL = "/Signature.png";
