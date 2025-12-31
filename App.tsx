
import React, { useState, useEffect, createContext, useContext, Suspense, lazy, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, X, LayoutDashboard, Package, Import, History, 
  ShieldCheck, Settings, Bell, Download, Copy, Crop, 
  LogOut, RefreshCw, UserCircle, Share, MoreHorizontal, FileSpreadsheet,
  MoreVertical, Laptop, Smartphone, ExternalLink, ArrowUp, AlertCircle
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

import { ThemeMode, RoleLevel, User, Store, Product, OperationLog, LoginRecord, Announcement } from './types';
import { THEMES, APP_LOGO_URL, SIGNATURE_URL } from './constants';
import UsernameBadge from './components/UsernameBadge';
import FaceID from './components/FaceID';
import AnnouncementCenter from './components/AnnouncementCenter';
import StoreManager from './components/StoreManager';
import { InstallFloatingButton } from './components/InstallFloatingButton'; 
import { supabase } from './supabase';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventory = lazy(() => import('./pages/Inventory'));
const OperationLogs = lazy(() => import('./pages/OperationLogs'));
const ImportProducts = lazy(() => import('./pages/ImportProducts'));
const AuditHall = lazy(() => import('./pages/AuditHall'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

interface PageActions {
  handleCopy?: () => void;
  handleExcel?: () => void;
}

interface AppContextType {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
  currentStore: Store;
  setCurrentStore: (s: Store) => void;
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  announcementsOpen: boolean;
  setAnnouncementsOpen: (b: boolean) => void;
  activePopupAnnouncement: Announcement | null;
  storeManagerOpen: boolean;
  setStoreManagerOpen: (b: boolean) => void;
  setPageActions: (actions: PageActions) => void;
  handleCopy?: () => void;
  handleExcel?: () => void;
  isMobile: boolean;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  logs: OperationLog[];
  setLogs: React.Dispatch<React.SetStateAction<OperationLog[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  loginRecords: LoginRecord[];
  setLoginRecords: React.Dispatch<React.SetStateAction<LoginRecord[]>>;
  stores: Store[]; 
  setStores: React.Dispatch<React.SetStateAction<Store[]>>;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  reloadData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

const LoadingScreen = () => (
  <div className="flex items-center justify-center h-full w-full min-h-[50vh]">
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const SWUpdateToast = () => {
    const [show, setShow] = useState(false);
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => setShow(true));
        }
    }, []);
    const handleReload = () => window.location.reload();
    if (!show) return null;
    return (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[100] animate-bounce-slow w-max">
            <button onClick={handleReload} className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold hover:bg-blue-700 transition-colors border-2 border-white/20">
                <RefreshCw className="w-5 h-5 animate-spin" /> 发现新版本，请刷新以更新
            </button>
        </div>
    );
};

const Navbar = () => {
  const { toggleSidebar, currentStore, setAnnouncementsOpen, user, announcements, handleCopy, handleExcel } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  const unreadCount = announcements.filter(a => {
      if (a.hidden_by_users?.includes(user?.id || '')) return false;
      let isTarget = false;
      if (!a.target_userIds || a.target_userIds.length === 0) isTarget = true;
      else if (a.target_userIds.includes(user?.id || '')) isTarget = true;
      if (!isTarget) return false;
      return !a.read_user_ids.includes(user?.id || '');
  }).length;

  const hasRedDot = unreadCount > 0;

  const handleScreenshot = async () => {
    const mainContent = document.getElementById('main-content');
    const sidebar = document.getElementById('app-sidebar');
    const navbar = document.getElementById('app-navbar');
    
    if (mainContent) {
      const originalScrollTop = mainContent.scrollTop;
      mainContent.scrollTop = mainContent.scrollHeight;
      await new Promise(resolve => setTimeout(resolve, 300));
      mainContent.scrollTop = originalScrollTop;

      const originalHeight = mainContent.style.height;
      const originalOverflow = mainContent.style.overflow;
      mainContent.style.height = `${mainContent.scrollHeight}px`;
      mainContent.style.overflow = 'visible';
      
      if (sidebar) sidebar.style.display = 'none';
      if (navbar) navbar.style.display = 'none';

      try {
          const canvas = await html2canvas(document.body, { 
              useCORS: true,
              allowTaint: true,
              height: mainContent.scrollHeight,
              windowHeight: mainContent.scrollHeight,
              y: 0,
              ignoreElements: (el) => {
                  const id = el.id;
                  return id === 'app-sidebar' || id === 'app-navbar' || el.classList.contains('fixed-ui');
              }
          });
          const link = document.createElement('a');
          link.download = `prism-screenshot-${Date.now()}.png`;
          link.href = canvas.toDataURL();
          link.click();
      } catch (err) {
          console.error("Screenshot failed:", err);
          alert("截图生成失败");
      } finally {
          mainContent.style.height = originalHeight;
          mainContent.style.overflow = originalOverflow;
          if (sidebar) sidebar.style.display = '';
          if (navbar) navbar.style.display = '';
      }
    }
  };

  const allowedPages = ['/inventory', '/logs', '/audit'];
  const showCopy = allowedPages.includes(location.pathname);
  const showExcel = allowedPages.includes(location.pathname) && !user?.permissions?.hideExcelExport;

  const handleExcelClick = () => { if (handleExcel) handleExcel(); else alert(`请切换到库存、日志或审计页面，才能生效`); };
  const handleCopyClick = () => { if (handleCopy) handleCopy(); else alert(`请切换到库存、日志或审计页面，才能生效`); };

  const ActionButtons = () => (
    <>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAnnouncementsOpen(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative" title="公告">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            {hasRedDot && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
        </motion.button>
        {showCopy && <motion.button whileTap={{ scale: 0.9 }} onClick={handleCopyClick} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="复制"><Copy className="w-5 h-5 text-gray-600 dark:text-gray-300" /></motion.button>}
        {showExcel && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleExcelClick} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="导出 Excel">
                <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
            </motion.button>
        )}
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleScreenshot} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="长截图"><Crop className="w-5 h-5 text-gray-600 dark:text-gray-300" /></motion.button>
    </>
  );

  return (
    <div id="app-navbar" className="h-16 fixed top-0 left-0 right-0 z-40 glass flex items-center justify-between px-4 lg:pl-64 transition-all">
      <div className="flex items-center lg:hidden">
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Menu className="w-6 h-6 dark:text-white" /></button>
      </div>
      <div className="hidden lg:flex items-center text-lg font-semibold dark:text-white">
        <img src={APP_LOGO_URL} alt="Logo" className="w-6 h-6 mr-3 rounded-md" />
        棱镜-StockWise <span className="mx-2 text-gray-400">/</span> {currentStore.name}
      </div>
      <div className="flex items-center space-x-2">
         <div className="hidden md:flex items-center space-x-2"><ActionButtons /></div>
         <div className="md:hidden relative">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <MoreHorizontal className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                {hasRedDot && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
            </motion.button>
            {mobileMenuOpen && <div className="absolute right-0 top-12 bg-white dark:bg-gray-800 shadow-xl rounded-xl p-2 flex flex-col gap-2 border dark:border-gray-700 min-w-[50px] items-center animate-fade-in"><ActionButtons /></div>}
         </div>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const { isSidebarOpen, toggleSidebar, currentStore, setStoreManagerOpen, user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: '仪表盘' },
    { path: '/inventory', icon: Package, label: '库存管理' },
    { path: '/import', icon: Import, label: '导入商品' },
    { path: '/logs', icon: History, label: '操作日志' },
    { path: '/audit', icon: ShieldCheck, label: '审计大厅', hidden: user?.permissions?.hideAuditHall },
    { path: '/settings', icon: Settings, label: '系统设置', hidden: user?.permissions?.hideSettings },
  ];
  const sidebarClass = `fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`;

  return (
    <>
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={toggleSidebar}></div>}
      <div id="app-sidebar" className={sidebarClass}>
        <div className="h-16 flex items-center px-6 border-b dark:border-gray-700">
           <img src={APP_LOGO_URL} alt="Prism" className="w-8 h-8 rounded-lg mr-3 shadow-md" />
           <span className="text-xl font-bold dark:text-white">棱镜 StockWise</span>
           <button onClick={toggleSidebar} className="ml-auto lg:hidden"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">
          <button onClick={() => setStoreManagerOpen(true)} disabled={user?.permissions?.hideStoreEdit} className={`w-full py-2 px-4 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-between transition-colors ${user?.permissions?.hideStoreEdit ? 'opacity-50 cursor-not-allowed hidden' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            <span className="font-medium dark:text-gray-200 truncate pr-2">当前为{currentStore.name}门店{currentStore.isParent ? '(母)' : '(子)'}</span>
            <RefreshCw className="w-4 h-4 text-gray-500 flex-shrink-0" />
          </button>
          {user?.permissions?.hideStoreEdit && <div className="w-full py-2 px-4 mb-4 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-between border dark:border-gray-700"><span className="font-medium dark:text-gray-400 truncate text-sm">当前为{currentStore.name}门店{currentStore.isParent ? '(母)' : '(子)'}</span></div>}
          <nav className="space-y-1">
            {menuItems.filter(i => !i.hidden).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button key={item.path} onClick={() => { navigate(item.path); if(window.innerWidth < 1024) toggleSidebar(); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  <item.icon className="w-5 h-5" /><span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
           <div className="flex items-center space-x-3 cursor-pointer p-2 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors" onClick={() => navigate('/settings')}>
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">{user?.username[0]}</div>
              <div className="flex-1 overflow-hidden"><UsernameBadge name={user?.username || ''} roleLevel={user?.role || RoleLevel.GUEST} className="text-sm block truncate" /><span className="text-xs text-gray-500">点击设置</span></div>
              <LogOut className="w-5 h-5 text-gray-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); logout(); }} />
           </div>
        </div>
      </div>
    </>
  );
};

const ModalContainer = ({ children, isOpen }: React.PropsWithChildren<{ isOpen: boolean }>) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-50 flex items-center justify-center p-4 backdrop-blur-sm">
       <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden">{children}</motion.div>
    </div>
  );
}

const Login = () => {
  const { login, users } = useApp();
  const [inputName, setInputName] = useState('');
  const [inputPass, setInputPass] = useState('');
  const [useFaceID, setUseFaceID] = useState(false);
  const [targetFaceData, setTargetFaceData] = useState<number[] | undefined>(undefined);
  
  const handleLogin = () => {
    const userExists = users.find(u => u.username === inputName);
    
    if (!userExists) {
        if (inputName === '管理员' && inputPass === 'ss631204') {
            const rootUser: User = { id: 'u_root_fallback', username: '管理员', role: RoleLevel.ROOT, password: 'ss631204', permissions: { logPermission: 'A' } };
            login(rootUser);
            return;
        }
        alert("用户名错误");
        return;
    }

    if (userExists.password !== inputPass) { 
        alert("密码错误"); 
        return; 
    }

    login(userExists);
  };

  const handleFaceIDClick = () => {
      let targetUser = users.find(u => u.username === inputName);
      if (!targetUser && inputName === '管理员') {
          alert("初始管理员请先使用密码登录，并在设置中录入人脸。");
          return;
      }

      if (targetUser) { 
          if (targetUser.face_descriptor && targetUser.face_descriptor.length > 0) {
              setTargetFaceData(targetUser.face_descriptor); 
              setUseFaceID(true); 
          } else {
              alert("该用户尚未录入人脸数据，请先使用密码登录并设置。");
          }
      } else { 
          alert("请输入用户名以便匹配人脸数据，或使用密码登录。"); 
      }
  };

  const handleFaceSuccess = () => {
      let targetUser = users.find(u => u.username === inputName);
      if (targetUser) { login(targetUser); setUseFaceID(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <InstallFloatingButton />
      {useFaceID && <FaceID onSuccess={handleFaceSuccess} onCancel={() => setUseFaceID(false)} storedFaceData={targetFaceData} mode="verify" />}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl">
        <div className="text-center mb-8">
           <img src={APP_LOGO_URL} alt="Logo" className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg" />
           <h1 className="text-2xl font-bold text-gray-800 dark:text-white">棱镜 StockWise</h1>
           <p className="text-gray-500 mt-2">智能库管系统</p>
        </div>
        <div className="space-y-4">
          <input type="text" value={inputName} onChange={e => setInputName(e.target.value)} className="w-full px-4 py-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="用户名 (如: 管理员)" />
          <input type="password" value={inputPass} onChange={e => setInputPass(e.target.value)} className="w-full px-4 py-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="密码" />
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleLogin} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30">登录</motion.button>
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleFaceIDClick} className="w-full py-3 border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 flex items-center justify-center gap-2"><UserCircle className="w-5 h-5" /> 人脸识别登录</motion.button>
        </div>
      </div>
    </div>
  );
};

// 27. Splash Screen Component (Redesigned per 27.1)
const SplashScreen = ({ isReady }: { isReady: boolean }) => {
  const [visible, setVisible] = useState(true);

  // 27.2.4 Fade Out Logic
  useEffect(() => {
    if (isReady) {
      // Transition out
      const el = document.getElementById('splash-screen');
      if (el) {
          el.style.opacity = '0';
          el.style.visibility = 'hidden';
      }
      // Unmount after animation
      const timer = setTimeout(() => setVisible(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  if (!visible) return null;

  return (
    <div id="splash-screen">
      {/* 27.1.1 Center Visuals */}
      <div className="flex flex-col items-center animate-fade-in-up">
         <img src={APP_LOGO_URL} alt="Logo" className="w-24 h-24 rounded-2xl shadow-xl mb-6" />
         <h1 className="text-3xl font-bold text-gray-800 tracking-wider">棱镜</h1>
         <p className="text-gray-500 mt-2">StockWise-智能库管系统</p>
      </div>
      
      {/* 27.1.2 Bottom Signature */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center">
         <img src={SIGNATURE_URL} alt="Signature" className="h-16 opacity-80" />
      </div>
    </div>
  );
};

const PageWrapper = ({ children }: { children?: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
    <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
  </motion.div>
);

const MainLayout = () => {
  const { user, announcementsOpen, setAnnouncementsOpen, storeManagerOpen, setStoreManagerOpen, activePopupAnnouncement } = useApp();
  const location = useLocation();
  if (!user) return <Login />;
  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300 font-sans">
      <Sidebar />
      <Navbar />
      <InstallFloatingButton />
      <SWUpdateToast />
      <ModalContainer isOpen={announcementsOpen}><AnnouncementCenter onClose={() => setAnnouncementsOpen(false)} initialPopup={activePopupAnnouncement} /></ModalContainer>
      <ModalContainer isOpen={storeManagerOpen}><StoreManager onClose={() => setStoreManagerOpen(false)} /></ModalContainer>
      <main id="main-content" className="lg:pl-64 pt-16 min-h-screen transition-all">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
           <AnimatePresence mode="wait">
             <Routes location={location} key={location.pathname}>
               <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
               <Route path="/inventory" element={<PageWrapper><Inventory /></PageWrapper>} />
               <Route path="/logs" element={<PageWrapper><OperationLogs /></PageWrapper>} />
               <Route path="/import" element={<PageWrapper><ImportProducts /></PageWrapper>} />
               <Route path="/audit" element={<PageWrapper><AuditHall /></PageWrapper>} />
               <Route path="/settings" element={<PageWrapper><SettingsPage /></PageWrapper>} />
               <Route path="*" element={<div className="p-10 text-center">页面建设中...</div>} />
             </Routes>
           </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

const AppContent = () => {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [user, setUser] = useState<User | null>(null);
  const [currentStore, setCurrentStore] = useState<Store>({ id: 'dummy', name: '加载中...', isParent: false });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [activePopupAnnouncement, setActivePopupAnnouncement] = useState<Announcement | null>(null);
  const [storeManagerOpen, setStoreManagerOpen] = useState(false);
  
  // 27.2.1 Initial State: Not Ready
  const [appReady, setAppReady] = useState(false);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [pageActions, setPageActions] = useState<PageActions>({});

  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loginRecords, setLoginRecords] = useState<LoginRecord[]>([]);
  const [stores, setStores] = useState<Store[]>([]); 
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
      const storedUser = localStorage.getItem('prism_user');
      if (storedUser) {
          try {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
          } catch (e) {
              localStorage.removeItem('prism_user');
          }
      }
  }, []);

  // 27.2.2 Parallel Execution Logic
  const reloadData = async () => {
    try {
        // Parallel Fetching
        const [sData, uData, pData, lData, aData, lrData] = await Promise.all([
            supabase.from('stores').select('*'),
            supabase.from('users').select('*'),
            supabase.from('products').select('*, batches(*)'),
            supabase.from('operation_logs').select('*').order('created_at', { ascending: false }),
            supabase.from('announcements').select('*').order('created_at', { ascending: false }),
            supabase.from('login_records').select('*').order('login_at', { ascending: false })
        ]);

        if (sData.data) {
            const mappedStores = sData.data.map((s: any) => ({
                id: String(s.id), name: s.name, isParent: s.is_parent, childrenIds: s.children_ids?.map(String),
                parentId: s.parent_id ? String(s.parent_id) : undefined, managerIds: s.manager_ids?.map(String), viewerIds: s.viewer_ids?.map(String)
            }));
            setStores(mappedStores);
            if (currentStore.id === 'dummy' && mappedStores.length > 0) {
                const lastStoreId = localStorage.getItem('prism_last_store');
                const targetStore = mappedStores.find(s => s.id === lastStoreId) || mappedStores[0];
                setCurrentStore(targetStore);
            }
        }

        if (uData.data) {
            const mappedUsers = uData.data.map((u: any) => ({ ...u, id: String(u.id), storeId: u.store_id ? String(u.store_id) : undefined }));
            setUsers(mappedUsers);
        }

        if (pData.data) {
            const mappedProducts: Product[] = pData.data.map((p: any) => {
                const safeBatches = (p.batches || []).map((b: any) => ({
                    id: String(b.id), batchNumber: b.batch_number, expiryDate: b.expiry_date,
                    totalQuantity: Number(b.total_quantity) || 0, conversionRate: b.conversion_rate || p.conversion_rate || 10,
                    price: b.price, notes: b.notes
                }));
                const totalQtyFromBatches = safeBatches.reduce((acc: number, b: any) => acc + b.totalQuantity, 0);
                const rate = p.conversion_rate || 10; const safeRate = rate === 0 ? 10 : rate;
                return {
                    id: String(p.id), storeId: String(p.store_id), name: p.name, category: p.category, sku: p.sku, image_url: p.image_url, notes: p.notes, keywords: p.keywords,
                    unitBig: p.unit_big || '整', unitSmall: p.unit_small || '散', conversionRate: rate,
                    quantityBig: p.quantity_big ?? Math.floor(totalQtyFromBatches / safeRate), quantitySmall: p.quantity_small ?? (totalQtyFromBatches % safeRate), batches: safeBatches
                };
            });
            setProducts(mappedProducts);
        }

        if (lData.data) setLogs(lData.data.map((l:any) => ({...l, id: String(l.id), target_id: String(l.target_id)})));
        if (aData.data) setAnnouncements(aData.data.map((a: any) => ({ ...a, id: String(a.id), target_userIds: a.target_user_ids?.map(String) })));
        if (lrData.data) setLoginRecords(lrData.data.map((r:any) => ({...r, id: String(r.id), user_id: String(r.user_id)})));

    } catch (e) { 
        console.error("Critical Data Load Error", e); 
        // 27.2.3 Even on error, we must set ready to allow usage (with empty data or retry UI)
    } finally {
        // 27.2.3 Ready State Logic
        setAppReady(true);
    }
  };

  useEffect(() => { reloadData(); }, []);
  useEffect(() => { if (currentStore.id !== 'dummy') localStorage.setItem('prism_last_store', currentStore.id); }, [currentStore]);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'theme-prism-light', 'theme-prism-dark');
    root.style.removeProperty('background-color');

    if (theme === 'dark') { root.classList.add('dark'); }
    else if (theme === 'prism-light') { root.classList.add('theme-prism-light'); }
    else if (theme === 'prism-dark') { root.classList.add('dark', 'theme-prism-dark'); }
  }, [theme]);

  // Popup logic... (Unchanged)
  useEffect(() => {
    if (user && appReady && announcements.length > 0) {
        const today = new Date().toDateString();
        const sessionKey = `hasCheckedPopups_${user.id}_${today}`;
        if (sessionStorage.getItem(sessionKey)) return;
        const potentialPopups = announcements.filter(a => 
            a.popup_config?.enabled && 
            (!a.target_userIds || a.target_userIds.length === 0 || a.target_userIds.includes(user.id)) &&
            (!a.target_roles || a.target_roles.length === 0 || a.target_roles.includes(user.role))
        );
        let targetPopup: Announcement | null = null;
        const now = new Date();
        for (const p of potentialPopups) {
            const freq = p.popup_config?.frequency || 'once';
            const localKey = `popup_last_viewed_${p.id}_${user.id}`;
            const lastViewedStr = localStorage.getItem(localKey);
            let showThis = false;
            if (!lastViewedStr) { showThis = true; } else {
                const lastViewed = new Date(lastViewedStr);
                if (freq === 'permanent') showThis = true;
                else if (freq === 'daily') showThis = lastViewed.toDateString() !== now.toDateString();
                else if (freq === 'weekly') { const diff = now.getTime() - lastViewed.getTime(); showThis = diff > 7 * 24 * 60 * 60 * 1000; }
                else if (freq === 'monthly') showThis = lastViewed.getMonth() !== now.getMonth();
            }
            if (showThis) { targetPopup = p; localStorage.setItem(localKey, now.toISOString()); break; }
        }
        if (targetPopup) { setActivePopupAnnouncement(targetPopup); setAnnouncementsOpen(true); }
        sessionStorage.setItem(sessionKey, 'true');
    }
  }, [user, appReady, announcements]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  
  const login = (u: User) => {
      const freshUser = users.find(existing => existing.id === u.id) || u;
      setUser(freshUser);
      localStorage.setItem('prism_user', JSON.stringify(freshUser));
      supabase.from('login_records').insert({ id: `login_${Date.now()}`, user_id: freshUser.id, user_name: freshUser.username, device_name: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop PC', ip_address: '192.168.1.x', login_at: new Date().toISOString() }).then(() => reloadData());
  };
  
  const logout = () => { 
      if (user) { const today = new Date().toDateString(); sessionStorage.removeItem(`hasCheckedPopups_${user.id}_${today}`); }
      sessionStorage.clear(); setUser(null); localStorage.removeItem('prism_user');
  };
  const setTheme = (t: ThemeMode) => setThemeState(t);

  return (
    <AppContext.Provider value={{ 
      theme, setTheme, user, login, logout, currentStore, setCurrentStore, isSidebarOpen, toggleSidebar, announcementsOpen, setAnnouncementsOpen, activePopupAnnouncement, storeManagerOpen, setStoreManagerOpen, setPageActions, handleCopy: pageActions.handleCopy, handleExcel: pageActions.handleExcel, isMobile, products, setProducts, logs, setLogs, users, setUsers, loginRecords, setLoginRecords, stores, setStores, announcements, setAnnouncements, reloadData
    }}>
      {/* 27. Splash Screen with Logic */}
      <SplashScreen isReady={appReady} />
      {/* App content is rendered but hidden/under splash until ready, or effectively mounted */}
      {appReady && <Router><MainLayout /></Router>}
    </AppContext.Provider>
  );
};

export default AppContent;
