
import React, { useState, useEffect, createContext, useContext, Suspense, lazy, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, X, LayoutDashboard, Package, Import, History, 
  ShieldCheck, Settings, Bell, Download, Copy, Crop, 
  LogOut, RefreshCw, UserCircle, Share, MoreHorizontal, FileSpreadsheet
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

import { ThemeMode, RoleLevel, User, Store, Product, OperationLog, LoginRecord, Announcement } from './types';
import { THEMES, APP_LOGO_URL, PWA_ICON_URL, SIGNATURE_URL } from './constants';
import UsernameBadge from './components/UsernameBadge';
import FaceID from './components/FaceID';
import AnnouncementCenter from './components/AnnouncementCenter';
import StoreManager from './components/StoreManager';
import { supabase } from './supabase';

// Lazy Load Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventory = lazy(() => import('./pages/Inventory'));
const OperationLogs = lazy(() => import('./pages/OperationLogs'));
const ImportProducts = lazy(() => import('./pages/ImportProducts'));
const AuditHall = lazy(() => import('./pages/AuditHall'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// --- Global Context ---
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
  activePopupAnnouncement: Announcement | null; // For direct navigation
  storeManagerOpen: boolean;
  setStoreManagerOpen: (b: boolean) => void;
  setPageActions: (actions: PageActions) => void;
  isMobile: boolean;
  // GLOBAL STATE
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

// ... (LoadingScreen, InstallAppFloating remain same) ...
const LoadingScreen = () => (
  <div className="flex items-center justify-center h-full w-full min-h-[50vh]">
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const InstallAppFloating = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      return; 
    }
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsVisible(true); 
    };
    window.addEventListener('beforeinstallprompt', handler);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
        setIsVisible(true); 
    }
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      setShowIOSModal(true);
    } else if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setInstallPrompt(null);
          setIsVisible(false);
        }
      });
    } else {
        alert("请尝试点击浏览器菜单中的“安装应用”或“添加到主屏幕”");
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleInstallClick}
          className="fixed top-20 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-600/40 hover:bg-blue-700 transition-colors animate-bounce-slow"
          title="安装应用"
      >
          <Download className="w-6 h-6" />
      </motion.button>
      {showIOSModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4" onClick={() => setShowIOSModal(false)}>
           <div className="bg-paper w-full max-w-sm rounded-2xl p-6 shadow-2xl relative animate-slide-up" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowIOSModal(false)} className="absolute top-4 right-4 text-sub"><X className="w-5 h-5"/></button>
              <div className="flex flex-col items-center text-center">
                 <img src={APP_LOGO_URL} alt="App Icon" className="w-16 h-16 rounded-2xl mb-4 shadow-lg" />
                 <h3 className="text-lg font-bold mb-2 text-main">安装到 iPhone/iPad</h3>
                 <p className="text-sm text-sub mb-6 leading-relaxed">
                    请点击浏览器底部的 <span className="font-bold text-blue-600 inline-flex items-center mx-1"><Share className="w-4 h-4"/></span> 按钮<br/>
                    然后选择 <span className="font-bold text-main">“添加到主屏幕”</span>
                 </p>
                 <button onClick={() => setShowIOSModal(false)} className="text-blue-600 font-bold">知道了</button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

const Navbar = () => {
  const { toggleSidebar, currentStore, setAnnouncementsOpen, user, announcements } = useApp();
  const { handleCopy, handleExcel } = useContext(AppContext) as any;
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

  const showExcel = ['/inventory', '/logs', '/audit', '/settings'].includes(location.pathname) && !user?.permissions?.hideExcelExport;
  const showCopy = ['/inventory', '/logs', '/audit', '/settings'].includes(location.pathname);

  const handleCopyClick = () => {
      if (handleCopy) {
          handleCopy();
      } else {
          alert("切换 XX 页面，才能生效");
      }
  };

  const handleExcelClick = () => {
      if (handleExcel) {
          handleExcel();
      } else {
          alert(`切换 XX 页面，才能生效`);
      }
  };

  const ActionButtons = () => (
    <>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAnnouncementsOpen(true)} className="p-2 rounded-full hover:bg-black/10 relative text-main" title="公告">
            <Bell className="w-5 h-5" />
            {hasRedDot && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
        </motion.button>
        {showCopy && <motion.button whileTap={{ scale: 0.9 }} onClick={handleCopyClick} className="p-2 rounded-full hover:bg-black/10 text-main" title="复制"><Copy className="w-5 h-5" /></motion.button>}
        {showExcel && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleExcelClick} className="p-2 rounded-full hover:bg-black/10 text-green-600" title="导出 Excel">
                <FileSpreadsheet className="w-5 h-5" />
            </motion.button>
        )}
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleScreenshot} className="p-2 rounded-full hover:bg-black/10 text-main" title="长截图"><Crop className="w-5 h-5" /></motion.button>
    </>
  );

  return (
    <div id="app-navbar" className="h-16 fixed top-0 left-0 right-0 z-40 bg-paper flex items-center justify-between px-4 lg:pl-64 transition-all border-b border-borderbase">
      <div className="flex items-center lg:hidden">
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-black/5 text-main"><Menu className="w-6 h-6" /></button>
      </div>
      <div className="hidden lg:flex items-center text-lg font-semibold text-main">
        <img src={APP_LOGO_URL} alt="Logo" className="w-6 h-6 mr-3 rounded-md" />
        棱镜-StockWise <span className="mx-2 text-sub">/</span> {currentStore.name}
      </div>
      <div className="flex items-center space-x-2">
         <div className="hidden md:flex items-center space-x-2"><ActionButtons /></div>
         <div className="md:hidden relative">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="relative p-2 rounded-full hover:bg-black/5 text-main">
                <MoreHorizontal className="w-6 h-6" />
                {hasRedDot && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
            </motion.button>
            {mobileMenuOpen && <div className="absolute right-0 top-12 bg-paper shadow-xl rounded-xl p-2 flex flex-col gap-2 border border-borderbase min-w-[50px] items-center animate-fade-in"><ActionButtons /></div>}
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
  
  // Z-Index Update: Sidebar must be higher than Navbar (z-40) and Main (z-0)
  const sidebarClass = `fixed inset-y-0 left-0 z-50 w-64 bg-paper border-r border-borderbase transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`;

  const storeDisplayText = `当前为${currentStore.name}${currentStore.isParent ? '(母)' : '(子)'}`;

  return (
    <>
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={toggleSidebar}></div>}
      <div id="app-sidebar" className={sidebarClass}>
        <div className="h-16 flex items-center px-6 border-b border-borderbase">
           <img src={APP_LOGO_URL} alt="Prism" className="w-8 h-8 rounded-lg mr-3 shadow-md" />
           <span className="text-xl font-bold text-main">棱镜 StockWise</span>
           <button onClick={toggleSidebar} className="ml-auto lg:hidden text-sub"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">
          <button onClick={() => setStoreManagerOpen(true)} disabled={user?.permissions?.hideStoreEdit} className={`w-full py-2 px-4 mb-4 bg-primary rounded-xl flex items-center justify-between transition-colors border border-borderbase ${user?.permissions?.hideStoreEdit ? 'opacity-50 cursor-not-allowed hidden' : 'hover:opacity-80'}`}>
            <span className="font-medium text-main truncate pr-2 text-sm">{storeDisplayText}</span>
            <RefreshCw className="w-4 h-4 text-sub flex-shrink-0" />
          </button>
          {user?.permissions?.hideStoreEdit && <div className="w-full py-2 px-4 mb-4 bg-primary rounded-xl flex items-center justify-between border border-borderbase"><span className="font-medium text-sub truncate text-sm">{storeDisplayText}</span></div>}
          <nav className="space-y-1">
            {menuItems.filter(i => !i.hidden).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button key={item.path} onClick={() => { navigate(item.path); if(window.innerWidth < 1024) toggleSidebar(); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-accent/10 text-accent font-medium shadow-sm' : 'text-sub hover:bg-black/5'}`}>
                  <item.icon className="w-5 h-5" /><span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-borderbase bg-primary">
           <div className="flex items-center space-x-3 cursor-pointer p-2 rounded-xl hover:bg-paper transition-colors" onClick={() => navigate('/settings')}>
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold">{user?.username[0]}</div>
              <div className="flex-1 overflow-hidden"><UsernameBadge name={user?.username || ''} roleLevel={user?.role || RoleLevel.GUEST} className="text-sm block truncate" /><span className="text-xs text-sub">点击设置</span></div>
              <LogOut className="w-5 h-5 text-sub hover:text-red-500" onClick={(e) => { e.stopPropagation(); logout(); }} />
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
       <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-paper w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden">{children}</motion.div>
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
    <div className="min-h-screen flex items-center justify-center bg-primary px-4">
      {useFaceID && <FaceID onSuccess={handleFaceSuccess} onCancel={() => setUseFaceID(false)} storedFaceData={targetFaceData} mode="verify" />}
      <div className="w-full max-w-md bg-paper p-8 rounded-3xl shadow-xl border border-borderbase">
        <div className="text-center mb-8">
           <img src={APP_LOGO_URL} alt="Logo" className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg" />
           <h1 className="text-2xl font-bold text-main">棱镜 StockWise</h1>
           <p className="text-sub mt-2">智能库管系统</p>
        </div>
        <div className="space-y-4">
          <input type="text" value={inputName} onChange={e => setInputName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-borderbase focus:ring-2 focus:ring-accent outline-none" placeholder="用户名 (如: 管理员)" />
          <input type="password" value={inputPass} onChange={e => setInputPass(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-borderbase focus:ring-2 focus:ring-accent outline-none" placeholder="密码" />
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleLogin} className="w-full py-3 bg-accent hover:opacity-90 text-white rounded-xl font-bold shadow-lg">登录</motion.button>
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleFaceIDClick} className="w-full py-3 border-2 border-borderbase text-main rounded-xl font-bold hover:bg-black/5 flex items-center justify-center gap-2"><UserCircle className="w-5 h-5" /> 人脸识别登录</motion.button>
        </div>
      </div>
    </div>
  );
};

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div id="splash-screen" className="fixed inset-0 z-[100] flex flex-col items-center justify-center transition-colors duration-500">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <img src={APP_LOGO_URL} alt="Logo" className="w-24 h-24 rounded-3xl shadow-2xl mb-6" />
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            棱镜 StockWise
        </h1>
        <p className="mt-2 text-sm tracking-widest uppercase opacity-60">Intelligent Inventory</p>
      </motion.div>
      <div className="absolute bottom-10">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    </div>
  );
};

const MainLayout = () => {
  const { user, isSidebarOpen, announcementsOpen, setAnnouncementsOpen, activePopupAnnouncement, storeManagerOpen, setStoreManagerOpen } = useApp();

  if (!user) return <Login />;

  return (
    <div className="flex h-screen overflow-hidden bg-primary text-main font-sans transition-colors duration-300">
       <div className="fixed inset-0 z-[-1] pointer-events-none bg-gradient-to-br from-accent/5 to-transparent"></div>
       
       <Sidebar />
       
       <div className="flex-1 flex flex-col h-full lg:pl-64 transition-all duration-300">
          <Navbar />
          
          {/* Increased top padding to pt-32 (8rem = 128px) to safely clear fixed headers in all pages */}
          <main id="main-content" className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6 pt-32 scroll-smooth z-0">
             <Suspense fallback={<LoadingScreen />}>
               <Routes>
                 <Route path="/" element={<Dashboard />} />
                 <Route path="/inventory" element={<Inventory />} />
                 <Route path="/import" element={<ImportProducts />} />
                 <Route path="/logs" element={<OperationLogs />} />
                 <Route path="/audit" element={<AuditHall />} />
                 <Route path="/settings" element={<SettingsPage />} />
               </Routes>
             </Suspense>
             <div className="mt-auto py-6 text-center text-sub text-sm">
                <img src={SIGNATURE_URL} className="h-6 mx-auto opacity-50 grayscale hover:grayscale-0 transition-all" alt="Signature" />
                <p className="mt-2 opacity-60">© 2024 Prism StockWise. All rights reserved.</p>
             </div>
          </main>
       </div>

       <InstallAppFloating />
       
       <AnimatePresence>
          {announcementsOpen && (
              <ModalContainer isOpen={announcementsOpen}>
                  <AnnouncementCenter onClose={() => setAnnouncementsOpen(false)} initialPopup={activePopupAnnouncement} />
              </ModalContainer>
          )}
          {storeManagerOpen && (
              <ModalContainer isOpen={storeManagerOpen}>
                  <StoreManager onClose={() => setStoreManagerOpen(false)} />
              </ModalContainer>
          )}
       </AnimatePresence>
    </div>
  );
};

const AppContent = () => {
  // Initialize theme from localStorage or default to prism-light
  const [theme, setThemeState] = useState<ThemeMode>(() => {
      return (localStorage.getItem('prism_theme') as ThemeMode) || 'prism-light';
  });
  
  const [user, setUser] = useState<User | null>(null);
  const [currentStore, setCurrentStore] = useState<Store>({ id: 'dummy', name: '加载中...', isParent: false });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [activePopupAnnouncement, setActivePopupAnnouncement] = useState<Announcement | null>(null);
  const [storeManagerOpen, setStoreManagerOpen] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [pageActions, setPageActions] = useState<PageActions>({});

  // ... (Data Loading states same as before) ...
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loginRecords, setLoginRecords] = useState<LoginRecord[]>([]);
  const [stores, setStores] = useState<Store[]>([]); 
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // 1.4 Theme Application Logic
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('prism_theme', theme);
  }, [theme]);

  // ... (useEffect hooks for user, reloadData, resize, popup remain same) ...
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

  const reloadData = async () => {
    const { data: sData } = await supabase.from('stores').select('*');
    if (sData) {
        const mappedStores = sData.map((s: any) => ({
            id: s.id, name: s.name, isParent: s.is_parent, childrenIds: s.children_ids,
            parentId: s.parent_id, managerIds: s.manager_ids, viewerIds: s.viewer_ids
        }));
        setStores(mappedStores);
        
        if (currentStore.id === 'dummy' && mappedStores.length > 0) {
            const lastStoreId = localStorage.getItem('prism_last_store');
            const targetStore = mappedStores.find(s => s.id === lastStoreId) || mappedStores[0];
            setCurrentStore(targetStore);
        }
    }

    const { data: uData } = await supabase.from('users').select('*');
    if (uData) {
        const mappedUsers = uData.map((u: any) => ({
            ...u,
            storeId: u.store_id
        }));
        setUsers(mappedUsers);
    }

    const { data: pData } = await supabase.from('products').select('*, batches(*)');
    if (pData) {
        const mappedProducts: Product[] = pData.map((p: any) => ({
            id: p.id,
            storeId: p.store_id,
            name: p.name,
            category: p.category,
            sku: p.sku,
            image_url: p.image_url,
            notes: p.notes,
            keywords: p.keywords,
            unitBig: p.unit_big || '整',
            unitSmall: p.unit_small || '散',
            conversionRate: p.conversion_rate || 10,
            batches: (p.batches || []).map((b: any) => ({
                id: b.id,
                batchNumber: b.batch_number,
                expiryDate: b.expiry_date,
                quantityBig: b.quantity_big,
                quantitySmall: b.quantity_small,
                price: b.price,
                notes: b.notes
            }))
        }));
        setProducts(mappedProducts);
    }

    const { data: lData } = await supabase.from('operation_logs').select('*').order('created_at', { ascending: false });
    if (lData) setLogs(lData);

    const { data: aData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (aData) {
        const mappedAnnouncements = aData.map((a: any) => ({
            ...a,
            target_userIds: a.target_user_ids
        }));
        setAnnouncements(mappedAnnouncements);
    }

    const { data: lrData } = await supabase.from('login_records').select('*').order('login_at', { ascending: false });
    if (lrData) setLoginRecords(lrData);
  };

  useEffect(() => {
      reloadData();
  }, []);

  useEffect(() => {
      if (currentStore.id !== 'dummy') {
          localStorage.setItem('prism_last_store', currentStore.id);
      }
  }, [currentStore]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user && appReady && announcements.length > 0) {
        const sessionKey = `hasCheckedPopups_${user.id}`;
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
            
            if (!lastViewedStr) {
                showThis = true;
            } else {
                const lastViewed = new Date(lastViewedStr);
                if (freq === 'permanent') showThis = true;
                else if (freq === 'daily') showThis = lastViewed.toDateString() !== now.toDateString();
                else if (freq === 'weekly') {
                    const diff = now.getTime() - lastViewed.getTime();
                    showThis = diff > 7 * 24 * 60 * 60 * 1000;
                }
                else if (freq === 'monthly') showThis = lastViewed.getMonth() !== now.getMonth();
            }

            if (showThis) { 
                targetPopup = p;
                localStorage.setItem(localKey, now.toISOString()); 
                break; 
            }
        }

        if (targetPopup) { 
            setActivePopupAnnouncement(targetPopup);
            setAnnouncementsOpen(true);
        }
        
        sessionStorage.setItem(sessionKey, 'true');
    }
  }, [user, appReady, announcements]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  
  const login = (u: User) => {
      const freshUser = users.find(existing => existing.id === u.id) || u;
      setUser(freshUser);
      localStorage.setItem('prism_user', JSON.stringify(freshUser));
      
      supabase.from('login_records').insert({
          id: `login_${Date.now()}`,
          user_id: freshUser.id,
          user_name: freshUser.username,
          device_name: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop PC',
          ip_address: '192.168.1.x',
          login_at: new Date().toISOString()
      }).then(() => reloadData());
  };
  
  const logout = () => { 
      if (user) {
          sessionStorage.removeItem(`hasCheckedPopups_${user.id}`);
      }
      sessionStorage.clear(); 
      setUser(null); 
      localStorage.removeItem('prism_user');
  };
  const setTheme = (t: ThemeMode) => setThemeState(t);

  return (
    <AppContext.Provider value={{ 
      theme, setTheme, user, login, logout, 
      currentStore, setCurrentStore, 
      isSidebarOpen, toggleSidebar,
      announcementsOpen, setAnnouncementsOpen,
      activePopupAnnouncement,
      storeManagerOpen, setStoreManagerOpen,
      setPageActions,
      handleCopy: pageActions.handleCopy,
      handleExcel: pageActions.handleExcel,
      isMobile,
      products, setProducts,
      logs, setLogs,
      users, setUsers,
      loginRecords, setLoginRecords,
      stores, setStores,
      announcements, setAnnouncements,
      reloadData
    }}>
      {!appReady && <SplashScreen onFinish={() => setAppReady(true)} />}
      {appReady && <Router><MainLayout /></Router>}
    </AppContext.Provider>
  );
};

export default AppContent;
