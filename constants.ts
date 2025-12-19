import { RoleLevel, ThemeMode, Product, OperationLog, LogAction, Store, User } from './types';

export const THEMES: { mode: ThemeMode; name: string; bg: string; text: string }[] = [
  { mode: 'light', name: '浅色模式', bg: '#ffffff', text: '#000000' },
  { mode: 'dark', name: '深色模式', bg: '#000000', text: '#ffffff' },
  { mode: 'prism-light', name: '棱镜专属浅色', bg: '#F2F3F7', text: '#3C3836' }, // Ghost White
  { mode: 'prism-dark', name: '棱镜专属深色', bg: '#1D2021', text: '#EBDBB2' }, // Dark Grey & Oatmeal
];

export const MOCK_USERS: User[] = [
  { id: 'u_001', username: 'AdminMaster', role: RoleLevel.ROOT },
  { id: 'u_002', username: 'BossUser', role: RoleLevel.BOSS },
  { id: 'u_003', username: 'ManagerJohn', role: RoleLevel.MANAGER_TEAL },
  { id: 'u_004', username: 'StaffAlice', role: RoleLevel.STAFF },
  { id: 'u_005', username: 'StaffBob', role: RoleLevel.STAFF },
  { id: 'u_006', username: 'ViewerTom', role: RoleLevel.GUEST },
];

export const MOCK_USER = MOCK_USERS[0];

export const MOCK_STORES: Store[] = [
  { id: 'store_hq', name: '总店', isParent: true, childrenIds: ['store_1', 'store_2'], managerIds: ['u_001'], viewerIds: [] },
  { id: 'store_1', name: '一号分店', isParent: false, parentId: 'store_hq', managerIds: ['u_002', 'u_003'], viewerIds: ['u_006'] },
  { id: 'store_2', name: '二号分店', isParent: false, parentId: 'store_hq', managerIds: ['u_003'], viewerIds: [] },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p_1',
    name: '阿莫西林胶囊',
    category: '抗生素',
    sku: 'AMXL-001',
    batches: [
      { id: 'b_1', batchNumber: '20231201', expiryDate: '2025-12-31', quantityBig: 500, quantitySmall: 20, unitBig: '盒', unitSmall: '粒', conversionRate: 24, price: 15.5 },
      { id: 'b_2', batchNumber: '20231005', expiryDate: '2025-10-05', quantityBig: 100, quantitySmall: 0, unitBig: '盒', unitSmall: '粒', conversionRate: 24, price: 15.5 }
    ],
    image_url: 'https://placehold.co/100x100?text=Drug',
    notes: '处方药，需严格管理',
    keywords: ['amxl', 'amoxicillin', 'kss', '抗生素'] 
  },
  {
    id: 'p_2',
    name: '布洛芬缓释胶囊',
    category: '解热镇痛',
    sku: 'BLF-002',
    batches: [
      { id: 'b_3', batchNumber: '20240115', expiryDate: '2026-01-15', quantityBig: 300, quantitySmall: 10, unitBig: '盒', unitSmall: '粒', conversionRate: 12, price: 22.0 }
    ],
    image_url: 'https://placehold.co/100x100?text=Fen',
    notes: '',
    keywords: ['blf', 'ibuprofen', 'jrzt']
  },
  {
    id: 'p_3',
    name: '土霉素片',
    category: '抗生素',
    sku: 'TMS-003',
    batches: [
        { id: 'b_4', batchNumber: '20230801', expiryDate: '2025-08-01', quantityBig: 200, quantitySmall: 0, unitBig: '瓶', unitSmall: '片', conversionRate: 100, price: 5.0 }
    ],
    image_url: 'https://placehold.co/100x100?text=TMS',
    notes: '',
    keywords: ['tms', 'tumeisu']
  },
  {
    id: 'p_4',
    name: '驱蚊止痒膏',
    category: '外用药',
    sku: 'QWZY-004',
    batches: [
        { id: 'b_5', batchNumber: '20240501', expiryDate: '2026-05-01', quantityBig: 50, quantitySmall: 0, unitBig: '盒', unitSmall: '支', conversionRate: 1, price: 12.0 }
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
    change_desc: '入库: 阿莫西林胶囊 x 50盒',
    operator_id: 'u_001',
    operator_name: 'AdminMaster',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    is_revoked: false,
    snapshot_data: {},
    role_level: RoleLevel.ROOT
  },
  {
    id: 'log_2',
    action_type: LogAction.ENTRY_OUTBOUND,
    target_id: 'b_3',
    target_name: '布洛芬缓释胶囊',
    change_desc: '出库: 布洛芬缓释胶囊 x 2盒',
    operator_id: 'u_002',
    operator_name: 'StaffJohn',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    is_revoked: true,
    snapshot_data: {},
    role_level: RoleLevel.STAFF
  }
];

export const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN', { hour12: false });
};