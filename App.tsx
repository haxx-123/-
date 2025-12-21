
import React, { useState, useEffect, createContext, useContext, Suspense, lazy, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, X, LayoutDashboard, Package, Import, History, 
  ShieldCheck, Settings, Bell, Download, Copy, Crop, 
  LogOut, RefreshCw, UserCircle, Share, MoreHorizontal
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

import { ThemeMode, RoleLevel, User, Store, Product, OperationLog, LoginRecord, Announcement } from './types';
import { THEMES, MOCK_USER, MOCK_STORES, MOCK_PRODUCTS, MOCK_LOGS, MOCK_USERS, MOCK_LOGIN_RECORDS, MOCK_ANNOUNCEMENTS, APP_LOGO_URL, PWA_ICON_URL, SIGNATURE_URL } from './constants';
import UsernameBadge from './components/UsernameBadge';
import FaceID from './components/FaceID';
import AnnouncementCenter from './components/AnnouncementCenter';
import StoreManager from './components/StoreManager';

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
  storeManagerOpen: boolean;
  setStoreManagerOpen: (b: boolean) => void;
  setPageActions: (actions: PageActions) => void;
  isMobile: boolean;
  // GLOBAL STATE FOR DATA PERSISTENCE
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
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

// --- Loading Component ---
const LoadingScreen = () => (
  <div className="flex items-center justify-center h-full w-full min-h-[50vh]">
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// --- Install App Component (Floating) ---
const InstallAppFloating = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Android/Chrome: Listen for beforeinstallprompt
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Detection
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
       // Fallback for PC Chrome/Edge if event hasn't fired yet or manually triggered
       alert("请点击浏览器地址栏右侧的“安装应用”图标，或在菜单中选择“添加到主屏幕”。");
    }
  };

  if (isInstalled || !isVisible) return null;

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
           <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative animate-slide-up" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowIOSModal(false)} className="absolute top-4 right-4 text-gray-400"><X className="w-5 h-5"/></button>
              <div className="flex flex-col items-center text-center">
                 <img src={PWA_ICON_URL} alt="PWA Icon" className="w-16 h-16 rounded-2xl mb-4 shadow-lg" />
                 <h3 className="text-lg font-bold mb-2 dark:text-white">安装到 iPhone/iPad</h3>
                 <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                    请点击浏览器底部的 <span className="font-bold text-blue-600 inline-flex items-center mx-1"><Share className="w-4 h-4"/></span> 按钮<br/>
                    然后选择 <span className="font-bold text-gray-800 dark:text-gray-200">“添加到主屏幕”</span>
                 </p>
                 <button onClick={() => setShowIOSModal(false)} className="text-blue-600 font-bold">知道了</button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

// --- Layout Components ---

const Navbar = () => {
  const { toggleSidebar, currentStore, setAnnouncementsOpen, user, isMobile, announcements } = useApp();
  const { handleCopy, handleExcel } = useContext(AppContext) as any;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Strict Permission Check for Excel
  const hideExcel = user?.permissions?.hideExcelExport;

  // REFINED RED DOT LOGIC: Check if user ID is in read_user_ids
  const unreadCount = announcements.filter(a => {
      // Logic for "My Announcements"
      if (a.hidden_by_users?.includes(user?.id || '')) return false;
      if (user?.role === RoleLevel.ROOT) return false; // Root usually sees manage view, but can also get notices
      
      // Targeting Logic
      let isTarget = false;
      if (!a.target_userIds || a.target_userIds.length === 0) isTarget = true; // Public
      else if (a.target_userIds.includes(user?.id || '')) isTarget = true;
      
      if (!isTarget) return false;

      // Read Status Logic
      return !a.read_user_ids.includes(user?.id || '');
  }).length;

  const handleScreenshot = () => {
    const mainContent = document.getElementById('main-content');
    const sidebar = document.getElementById('app-sidebar');
    const navbar = document.getElementById('app-navbar');
    
    if (mainContent && sidebar && navbar) {
      const originalHeight = mainContent.style.height;
      const originalOverflow = mainContent.style.overflow;
      mainContent.style.height = `${mainContent.scrollHeight}px`;
      mainContent.style.overflow = 'visible';
      sidebar.style.display = 'none';
      navbar.style.display = 'none';
      html2canvas(document.body, { 
          ignoreElements: (el) => el.id === 'app-sidebar' || el.id === 'app-navbar' || el.classList.contains('fixed-ui')
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = `prism-screenshot-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        mainContent.style.height = originalHeight;
        mainContent.style.overflow = originalOverflow;
        sidebar.style.display = '';
        navbar.style.display = '';
      });
    }
  };

  const ActionButtons = () => (
    <>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAnnouncementsOpen(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative" title="公告">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
        </motion.button>
        {handleCopy && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleCopy} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="复制当前页面信息">
            <Copy className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </motion.button>
        )}
        {/* Strictly enforce Excel permission */}
        {handleExcel && !hideExcel && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleExcel} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="导出Excel">
            <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </motion.button>
        )}
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleScreenshot} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="长截图">
            <Crop className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </motion.button>
    </>
  );

  return (
    <div id="app-navbar" className="h-16 fixed top-0 left-0 right-0 z-40 glass flex items-center justify-between px-4 lg:pl-64 transition-all">
      <div className="flex items-center lg:hidden">
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <Menu className="w-6 h-6 dark:text-white" />
        </button>
      </div>
      <div className="hidden lg:flex items-center text-lg font-semibold dark:text-white">
        <img src={APP_LOGO_URL} alt="Logo" className="w-6 h-6 mr-3 rounded-md" />
        棱镜-StockWise <span className="mx-2 text-gray-400">/</span> {currentStore.name}
      </div>
      <div className="flex items-center space-x-2">
         <div className="hidden md:flex items-center space-x-2"><ActionButtons /></div>
         <div className="md:hidden relative">
            <motion.button 
                whileTap={{ scale: 0.9 }} 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <MoreHorizontal className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </motion.button>
            {mobileMenuOpen && (
                <div className="absolute right-0 top-12 bg-white dark:bg-gray-800 shadow-xl rounded-xl p-2 flex flex-col gap-2 border dark:border-gray-700 min-w-[50px] items-center animate-fade-in">
                    <ActionButtons />
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const { isSidebarOpen, toggleSidebar, currentStore, setStoreManagerOpen, user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Strict Permission Check for Menu Items
  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: '仪表盘' },
    { path: '/inventory', icon: Package, label: '库存管理' },
    { path: '/import', icon: Import, label: '导入商品' },
    { path: '/logs', icon: History, label: '操作日志' },
    { path: '/audit', icon: ShieldCheck, label: '审计大厅', hidden: user?.permissions?.hideAuditHall },
    { path: '/settings', icon: Settings, label: '系统设置', hidden: user?.permissions?.hideSettings },
  ];

  const sidebarClass = `
    fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r dark:border-gray-700 transform transition-transform duration-300 ease-in-out
    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
  `;

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
          <button 
            onClick={() => setStoreManagerOpen(true)}
            // Strict Permission Check for Store Edit Button
            disabled={user?.permissions?.hideStoreEdit}
            className={`w-full py-2 px-4 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-between transition-colors ${user?.permissions?.hideStoreEdit ? 'opacity-50 cursor-not-allowed hidden' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            <span className="font-medium dark:text-gray-200 truncate pr-2">当前: {currentStore.name}</span>
            <RefreshCw className="w-4 h-4 text-gray-500 flex-shrink-0" />
          </button>
          {user?.permissions?.hideStoreEdit && (
             <div className="w-full py-2 px-4 mb-4 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-between border dark:border-gray-700">
                <span className="font-medium dark:text-gray-400 truncate text-sm">{currentStore.name}</span>
             </div>
          )}

          <nav className="space-y-1">
            {menuItems.filter(i => !i.hidden).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); if(window.innerWidth < 1024) toggleSidebar(); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
           <div className="flex items-center space-x-3 cursor-pointer p-2 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors" onClick={() => navigate('/settings')}>
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                 {user?.username[0]}
              </div>
              <div className="flex-1 overflow-hidden">
                 <UsernameBadge name={user?.username || ''} roleLevel={user?.role || RoleLevel.GUEST} className="text-sm block truncate" />
                 <span className="text-xs text-gray-500">点击设置</span>
              </div>
              <LogOut className="w-5 h-5 text-gray-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); logout(); }} />
           </div>
        </div>
      </div>
    </>
  );
};

// --- In-Place View Containers ---
const ModalContainer = ({ children, isOpen }: React.PropsWithChildren<{ isOpen: boolean }>) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-50 flex items-center justify-center p-4 backdrop-blur-sm">
       <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden">
         {children}
       </motion.div>
    </div>
  );
}

// --- Authentication (Real Login Logic) ---
const Login = () => {
  const { login, users } = useApp();
  const [inputName, setInputName] = useState('');
  const [inputPass, setInputPass] = useState('');
  const [useFaceID, setUseFaceID] = useState(false);
  const [targetFaceData, setTargetFaceData] = useState<string | undefined>(undefined);
  
  const handleLogin = () => {
    // 1. Strict Username Check
    const userExists = users.find(u => u.username === inputName);
    
    if (!userExists) {
        alert("用户名错误");
        return;
    }

    // 2. Strict Password Check
    if (userExists.password !== inputPass) {
        alert("密码错误");
        return;
    }

    login(userExists);
  };

  const handleFaceIDClick = () => {
      let targetUser = users.find(u => u.username === inputName);
      if (!targetUser && !inputName) {
          // Default to first admin for demo convenience if input empty
          targetUser = users.find(u => u.role === RoleLevel.ROOT);
      }

      if (targetUser) {
          setTargetFaceData(targetUser.avatar); 
          setUseFaceID(true);
      } else {
          alert("请输入用户名以便匹配人脸数据，或使用密码登录。");
      }
  };

  const handleFaceSuccess = () => {
      let targetUser = users.find(u => u.username === inputName);
      if (!targetUser && !inputName) targetUser = users.find(u => u.role === RoleLevel.ROOT);

      if (targetUser) {
          login(targetUser);
          setUseFaceID(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      {useFaceID && <FaceID onSuccess={handleFaceSuccess} onCancel={() => setUseFaceID(false)} storedFaceData={targetFaceData} />}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl">
        <div className="text-center mb-8">
           <img src={APP_LOGO_URL} alt="Logo" className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg" />
           <h1 className="text-2xl font-bold text-gray-800 dark:text-white">棱镜 StockWise</h1>
           <p className="text-gray-500 mt-2">智能库管系统</p>
        </div>
        <div className="space-y-4">
          <input 
            type="text" 
            value={inputName}
            onChange={e => setInputName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="用户名 (如: 管理员)" 
          />
          <input 
            type="password" 
            value={inputPass}
            onChange={e => setInputPass(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="密码" 
          />
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleLogin} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30">登录</motion.button>
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleFaceIDClick} className="w-full py-3 border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 flex items-center justify-center gap-2"><UserCircle className="w-5 h-5" /> 人脸识别登录</motion.button>
        </div>
      </div>
    </div>
  );
};

// --- Main Layout & Splash ---
const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
       const el = document.getElementById('splash-screen');
       if (el) { el.style.opacity = '0'; el.style.visibility = 'hidden'; }
       setTimeout(onFinish, 800); 
    }, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div id="splash-screen">
      <div className="flex flex-col items-center animate-fade-in-up">
         <img src={APP_LOGO_URL} alt="Logo" className="w-24 h-24 rounded-2xl shadow-xl mb-6" />
         <h1 className="text-3xl font-bold text-gray-800 tracking-wider">棱镜</h1>
         <p className="text-gray-500 mt-2 mb-10">StockWise-智能库管系统</p>
         <div className="mt-10"><img src={SIGNATURE_URL} alt="Signature" className="h-16 opacity-80" /></div>
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
  const { user, announcementsOpen, setAnnouncementsOpen, storeManagerOpen, setStoreManagerOpen } = useApp();
  const location = useLocation();
  if (!user) return <Login />;
  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300 font-sans">
      <Sidebar />
      <Navbar />
      <InstallAppFloating />
      <ModalContainer isOpen={announcementsOpen}><AnnouncementCenter onClose={() => setAnnouncementsOpen(false)} /></ModalContainer>
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
  const [currentStore, setCurrentStore] = useState<Store>(MOCK_STORES[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [storeManagerOpen, setStoreManagerOpen] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [pageActions, setPageActions] = useState<PageActions>({});

  // Real-time State
  const [products, setProductsRaw] = useState<Product[]>(MOCK_PRODUCTS);
  const [logs, setLogsRaw] = useState<OperationLog[]>(MOCK_LOGS);
  const [users, setUsersRaw] = useState<User[]>(MOCK_USERS);
  const [loginRecords, setLoginRecordsRaw] = useState<LoginRecord[]>(MOCK_LOGIN_RECORDS);
  const [stores, setStoresRaw] = useState<Store[]>(MOCK_STORES); 
  const [announcements, setAnnouncementsRaw] = useState<Announcement[]>(MOCK_ANNOUNCEMENTS);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel
  useEffect(() => {
    broadcastChannelRef.current = new BroadcastChannel('stockwise_sync');
    broadcastChannelRef.current.onmessage = (event) => {
        const { type, payload } = event.data;
        // console.log("Received broadcast:", type, payload); // Debugging
        switch(type) {
            case 'PRODUCTS': setProductsRaw(payload); break;
            case 'LOGS': setLogsRaw(payload); break;
            case 'USERS': setUsersRaw(payload); break;
            case 'STORES': setStoresRaw(payload); break;
            case 'ANNOUNCEMENTS': setAnnouncementsRaw(payload); break;
            case 'LOGIN_RECORDS': setLoginRecordsRaw(payload); break;
        }
    };
    return () => {
        broadcastChannelRef.current?.close();
    };
  }, []);

  // Broadcasting Setters (Wrappers)
  const broadcast = (type: string, payload: any) => {
      broadcastChannelRef.current?.postMessage({ type, payload });
  };

  const setProducts: React.Dispatch<React.SetStateAction<Product[]>> = (value) => {
      setProductsRaw(prev => {
          const next = typeof value === 'function' ? (value as any)(prev) : value;
          broadcast('PRODUCTS', next);
          return next;
      });
  };

  const setLogs: React.Dispatch<React.SetStateAction<OperationLog[]>> = (value) => {
      setLogsRaw(prev => {
          const next = typeof value === 'function' ? (value as any)(prev) : value;
          broadcast('LOGS', next);
          return next;
      });
  };

  const setUsers: React.Dispatch<React.SetStateAction<User[]>> = (value) => {
      setUsersRaw(prev => {
          const next = typeof value === 'function' ? (value as any)(prev) : value;
          broadcast('USERS', next);
          return next;
      });
  };

  const setStores: React.Dispatch<React.SetStateAction<Store[]>> = (value) => {
      setStoresRaw(prev => {
          const next = typeof value === 'function' ? (value as any)(prev) : value;
          broadcast('STORES', next);
          return next;
      });
  };

  const setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>> = (value) => {
      setAnnouncementsRaw(prev => {
          const next = typeof value === 'function' ? (value as any)(prev) : value;
          broadcast('ANNOUNCEMENTS', next);
          return next;
      });
  };

  const setLoginRecords: React.Dispatch<React.SetStateAction<LoginRecord[]>> = (value) => {
      setLoginRecordsRaw(prev => {
          const next = typeof value === 'function' ? (value as any)(prev) : value;
          broadcast('LOGIN_RECORDS', next);
          return next;
      });
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (appReady && (window as any).requestIdleCallback) {
      (window as any).requestIdleCallback(() => {
        import('./pages/Inventory');
        import('./pages/OperationLogs');
      });
    }
  }, [appReady]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'theme-prism-light', 'theme-prism-dark');
    if (theme === 'dark') { root.classList.add('dark'); root.style.backgroundColor = '#000000'; }
    else if (theme === 'prism-light') { root.classList.add('theme-prism-light'); }
    else if (theme === 'prism-dark') { root.classList.add('dark', 'theme-prism-dark'); }
    else { root.style.backgroundColor = '#ffffff'; }
  }, [theme]);

  // STRICT POPUP LOGIC IMPLEMENTATION
  useEffect(() => {
    if (user && appReady) {
        // 1. Check SessionStorage Priority (Highest)
        // If marker exists in session storage, we have ALREADY handled popups for this session.
        // Return immediately.
        // Note: The requirement says "Logout clears sessionStorage", so if it's there, it means same session.
        const sessionKey = `hasCheckedPopups_${user.id}`;
        if (sessionStorage.getItem(sessionKey)) {
            return;
        }

        // 2. Identify Potential Popups
        const potentialPopups = announcements.filter(a => 
            a.popup_config?.enabled && 
            (!a.target_userIds || a.target_userIds.length === 0 || a.target_userIds.includes(user.id)) &&
            (!a.target_roles || a.target_roles.length === 0 || a.target_roles.includes(user.role))
        );

        let shouldShowPopup = false;

        potentialPopups.forEach(p => {
            const freq = p.popup_config?.frequency || 'once';
            const localKey = `popup_last_viewed_${p.id}_${user.id}`;
            const lastViewed = localStorage.getItem(localKey);
            const now = new Date();

            let showThis = false;

            if (freq === 'permanent') {
                // Always show every new session
                showThis = true;
            } else if (freq === 'once') {
                // Show if never viewed
                if (!lastViewed) showThis = true;
            } else if (freq === 'daily') {
                // Show if last viewed was not today
                if (!lastViewed) showThis = true;
                else {
                    const lastDate = new Date(lastViewed);
                    if (lastDate.toDateString() !== now.toDateString()) showThis = true;
                }
            } else if (freq === 'monthly') {
                // Show if last viewed was not this month
                if (!lastViewed) showThis = true;
                else {
                    const lastDate = new Date(lastViewed);
                    if (lastDate.getMonth() !== now.getMonth() || lastDate.getFullYear() !== now.getFullYear()) showThis = true;
                }
            }

            if (showThis) {
                shouldShowPopup = true;
                // Mark this popup as processed for frequency logic (Persistent)
                localStorage.setItem(localKey, now.toISOString());
            }
        });

        // 3. Trigger and Mark Session
        if (shouldShowPopup) {
            setAnnouncementsOpen(true);
        }
        
        // Mark session as "checked" so we don't re-run frequency logic on simple refresh if strict session rules apply
        // However, standard browser refresh keeps sessionStorage.
        // The requirement says "Next time user logs in...". Logout clears session.
        // So simple refresh should NOT show again?
        // "Check sessionStorage first... if exists return".
        // So yes, mark it now.
        sessionStorage.setItem(sessionKey, 'true');
    }
  }, [user, appReady, announcements]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  
  const login = (u: User) => {
      // Always pull latest data from global users state to ensure permissions are up to date
      const freshUser = users.find(existing => existing.id === u.id) || u;
      setUser(freshUser);

      const newRecord: LoginRecord = {
          id: `login_${Date.now()}`,
          user_id: freshUser.id,
          user_name: freshUser.username,
          device_name: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop PC',
          ip_address: '192.168.1.x',
          login_at: new Date().toISOString()
      };
      setLoginRecords(prev => [newRecord, ...prev]);
  };
  
  const logout = () => { 
      setUser(null); 
      sessionStorage.clear(); // Clear session storage on logout as per requirements
  };
  
  const setTheme = (t: ThemeMode) => setThemeState(t);

  return (
    <AppContext.Provider value={{ 
      theme, setTheme, user, login, logout, 
      currentStore, setCurrentStore, 
      isSidebarOpen, toggleSidebar,
      announcementsOpen, setAnnouncementsOpen,
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
      announcements, setAnnouncements
    }}>
      {!appReady && <SplashScreen onFinish={() => setAppReady(true)} />}
      {appReady && <Router><MainLayout /></Router>}
    </AppContext.Provider>
  );
};

export default AppContent;
