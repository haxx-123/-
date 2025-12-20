import { RoleLevel, ThemeMode, Product, OperationLog, LogAction, Store, User, LoginRecord, Announcement } from './types';

export const THEMES: { mode: ThemeMode; name: string; bg: string; text: string }[] = [
  { mode: 'light', name: '浅色模式', bg: '#ffffff', text: '#000000' },
  { mode: 'dark', name: '深色模式', bg: '#000000', text: '#ffffff' },
  { mode: 'prism-light', name: '棱镜专属浅色', bg: '#F2F3F7', text: '#3C3836' }, // Ghost White
  { mode: 'prism-dark', name: '棱镜专属深色', bg: '#1D2021', text: '#EBDBB2' }, // Dark Grey & Oatmeal
];

// 重置用户列表，仅保留管理员
export const MOCK_USERS: User[] = [
  { 
    id: 'u_001', 
    username: '管理员', 
    password: 'ss631204', 
    role: RoleLevel.ROOT,
    permissions: {
        logPermission: 'A', 
    } 
  }
];

export const MOCK_USER = MOCK_USERS[0];

export const MOCK_STORES: Store[] = [
  { id: 'store_hq', name: '总店', isParent: true, childrenIds: ['store_1', 'store_2'], managerIds: ['u_001'], viewerIds: [] },
  { id: 'store_1', name: '一号分店', isParent: false, parentId: 'store_hq', managerIds: ['u_001'], viewerIds: [] },
  { id: 'store_2', name: '二号分店', isParent: false, parentId: 'store_hq', managerIds: ['u_001'], viewerIds: [] },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p_1',
    storeId: 'store_1', 
    name: '阿莫西林胶囊',
    category: '抗生素',
    sku: 'AMXL-001',
    batches: [
      { id: 'b_1', batchNumber: '20231201', expiryDate: '2025-12-31', quantityBig: 500, quantitySmall: 20, unitBig: '整', unitSmall: '散', conversionRate: 24, price: 15.5, notes: '第一批进货' },
      { id: 'b_2', batchNumber: '20231005', expiryDate: '2025-10-05', quantityBig: 100, quantitySmall: 0, unitBig: '整', unitSmall: '散', conversionRate: 24, price: 15.5, notes: '促销批次' }
    ],
    image_url: 'https://placehold.co/100x100?text=Drug',
    notes: '处方药，需严格管理',
    keywords: ['amxl', 'amoxicillin', 'kss', '抗生素'] 
  },
  {
    id: 'p_2',
    storeId: 'store_1', 
    name: '布洛芬缓释胶囊',
    category: '解热镇痛',
    sku: 'BLF-002',
    batches: [
      { id: 'b_3', batchNumber: '20240115', expiryDate: '2026-01-15', quantityBig: 300, quantitySmall: 10, unitBig: '整', unitSmall: '散', conversionRate: 12, price: 22.0, notes: '' }
    ],
    image_url: 'https://placehold.co/100x100?text=Fen',
    notes: '',
    keywords: ['blf', 'ibuprofen', 'jrzt']
  },
  {
    id: 'p_3',
    storeId: 'store_2', 
    name: '土霉素片',
    category: '抗生素',
    sku: 'TMS-003',
    batches: [
        { id: 'b_4', batchNumber: '20230801', expiryDate: '2025-08-01', quantityBig: 200, quantitySmall: 0, unitBig: '整', unitSmall: '散', conversionRate: 100, price: 5.0, notes: '临期注意' }
    ],
    image_url: 'https://placehold.co/100x100?text=TMS',
    notes: '',
    keywords: ['tms', 'tumeisu']
  },
  {
    id: 'p_4',
    storeId: 'store_2', 
    name: '驱蚊止痒膏',
    category: '外用药',
    sku: 'QWZY-004',
    batches: [
        { id: 'b_5', batchNumber: '20240501', expiryDate: '2026-05-01', quantityBig: 50, quantitySmall: 0, unitBig: '整', unitSmall: '散', conversionRate: 1, price: 12.0, notes: '夏日特供' }
    ],
    image_url: 'https://placehold.co/100x100?text=QW',
    notes: '',
    keywords: ['qw', 'quwen', 'quchong']
  }
];

export const MOCK_LOGS: OperationLog[] = [
  {
    id: 'log_1',
    action_type: LogAction.ENTRY_INBOUND,
    target_id: 'b_1',
    target_name: '阿莫西林胶囊',
    change_desc: '入库: 阿莫西林胶囊 x 50整',
    operator_id: 'u_001',
    operator_name: '管理员',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    is_revoked: false,
    snapshot_data: {},
    role_level: RoleLevel.ROOT
  }
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
    { id: 'a1', title: '系统维护通知', content: '系统将于今晚进行维护。', author_id: 'u_001', author_name: '管理员', author_role: RoleLevel.ROOT, created_at: new Date().toISOString(), target_roles: [], is_read: false, type: 'notice' },
    { id: 'a2', title: '盘点提醒', content: '请各门店本周五前完成盘点。', author_id: 'u_001', author_name: '管理员', author_role: RoleLevel.ROOT, created_at: new Date().toISOString(), target_roles: [], target_userIds: ['u_002', 'u_003'], is_read: true, type: 'notice' },
];

export const MOCK_LOGIN_RECORDS: LoginRecord[] = [];

export const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN', { hour12: false });
};