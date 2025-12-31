
import { RoleLevel, ThemeMode, Product, OperationLog, LogAction, Store, User, LoginRecord, Announcement } from './types';

export const THEMES: { mode: ThemeMode; name: string; bg: string; text: string }[] = [
  { mode: 'light', name: '纯白模式', bg: '#FFFFFF', text: '#000000' }, // Classic Light
  { mode: 'dark', name: '纯黑模式', bg: '#000000', text: '#FFFFFF' }, // OLED Black
  { mode: 'prism-light', name: '棱镜专属浅色', bg: '#F2F3F7', text: '#3C3836' }, // Prism Light
  { mode: 'prism-dark', name: '棱镜专属深色', bg: '#1D2021', text: '#EBDBB2' }, // Prism Deep Dark
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
