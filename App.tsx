import React, { useState, useEffect, createContext, useContext, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, X, LayoutDashboard, Package, Import, History, 
  ShieldCheck, Settings, Bell, Download, Copy, Crop, 
  LogOut, RefreshCw, UserCircle, Share, MoreHorizontal
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

import { ThemeMode, RoleLevel, User, Store, Product, OperationLog, LoginRecord } from './types';
import { THEMES, MOCK_USER, MOCK_STORES, MOCK_PRODUCTS, MOCK_LOGS, MOCK_USERS, MOCK_LOGIN_RECORDS } from './constants';
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

// Constants for Images
const APP_LOGO_URL = "https://i.ibb.co/vxq7QfYd/retouch-2025121423241826.png";
const SIGNATURE_URL = "https://i.ibb.co/8gLfYKCW/retouch-2025121313394035.png";

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
  // Show by default for demo purposes so users know it exists, but handle logic
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Chrome/Android Logic
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS && !isInstalled) {
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
       // Manual Fallback for browsers that don't support the prompt or haven't fired it yet
       alert("请点击浏览器菜单中的“添加到主屏幕”或“安装应用”");
    }
  };

  if (isInstalled) return null;

  return (
    <>
      {isVisible && (
        <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleInstallClick}
            className="fixed top-20 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-600/40 hover:bg-blue-700 transition-colors animate-bounce-slow"
            title="安装应用"
        >
            <Download className="w-6 h-6" />
        </motion.button>
      )}

      {showIOSModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4" onClick={() => setShowIOSModal(false)}>
           <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative animate-slide-up" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowIOSModal(false)} className="absolute top-4 right-4 text-gray-400"><X className="w-5 h-5"/></button>
              <div className="flex flex-col items-center text-center">
                 <img src={APP_LOGO_URL} alt="Icon" className="w-16 h-16 rounded-2xl mb-4 shadow-lg" />
                 <h3 className="text-lg font-bold mb-2 dark:text-white">安装到 iPhone/iPad</h3>
                 <p className="text-sm text-gray-500 mb-6">
                    1. 点击浏览器底部的 <span className="font-bold text-blue-600"><Share className="w-4 h-4 inline"/> 分享</span> 按钮 <br/>
                    2. 向下滑动并选择 <span className="font-bold text-gray-800 dark:text-gray-200">"添加到主屏幕"</span>
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
  const { toggleSidebar, currentStore, setAnnouncementsOpen, user, isMobile } = useApp();
  const { handleCopy, handleExcel } = useContext(AppContext) as any;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        </motion.button>
        {handleCopy && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleCopy} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="复制当前页面信息">
            <Copy className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </motion.button>
        )}
        {handleExcel && !user?.permissions?.hideExcelExport && (
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
         {/* Desktop View */}
         <div className="hidden md:flex items-center space-x-2">
            <ActionButtons />
         </div>

         {/* Mobile View - Collapsed Icon */}
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
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={toggleSidebar}></div>
      )}

      <div id="app-sidebar" className={sidebarClass}>
        <div className="h-16 flex items-center px-6 border-b dark:border-gray-700">
           <img src={APP_LOGO_URL} alt="Prism" className="w-8 h-8 rounded-lg mr-3 shadow-md" />
           <span className="text-xl font-bold dark:text-white">棱镜 StockWise</span>
           <button onClick={toggleSidebar} className="ml-auto lg:hidden"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4">
          <button 
            onClick={() => setStoreManagerOpen(true)}
            disabled={user?.permissions?.hideStoreEdit}
            className={`w-full py-2 px-4 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-between transition-colors ${user?.permissions?.hideStoreEdit ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            <span className="font-medium dark:text-gray-200 truncate pr-2">当前: {currentStore.name}</span>
            {!user?.permissions?.hideStoreEdit && <RefreshCw className="w-4 h-4 text-gray-500 flex-shrink-0" />}
          </button>

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
           <div 
             className="flex items-center space-x-3 cursor-pointer p-2 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors"
             onClick={() => navigate('/settings')}
           >
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
       <motion.div 
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         className="bg-white dark:bg-gray-800 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden"
       >
         {children}
       </motion.div>
    </div>
  );
}

// --- Authentication ---

const Login = () => {
  const { login } = useApp();
  const [useFaceID, setUseFaceID] = useState(false);
  
  const handleLogin = () => {
    login(MOCK_USER);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      {useFaceID && <FaceID onSuccess={handleLogin} onCancel={() => setUseFaceID(false)} />}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl">
        <div className="text-center mb-8">
           <img src={APP_LOGO_URL} alt="Logo" className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg" />
           <h1 className="text-2xl font-bold text-gray-800 dark:text-white">棱镜 StockWise</h1>
           <p className="text-gray-500 mt-2">智能库管系统</p>
        </div>
        <div className="space-y-4">
          <input type="text" className="w-full px-4 py-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="账号" />
          <input type="password" className="w-full px-4 py-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="密码" />
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleLogin} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30">登录</motion.button>
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setUseFaceID(true)} className="w-full py-3 border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 flex items-center justify-center gap-2"><UserCircle className="w-5 h-5" /> 人脸识别登录</motion.button>
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
       if (el) {
         el.style.opacity = '0';
         el.style.visibility = 'hidden';
       }
       setTimeout(onFinish, 800); // Wait for fade out
    }, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div id="splash-screen">
      <div className="flex flex-col items-center animate-fade-in-up">
         <img src={APP_LOGO_URL} alt="Logo" className="w-24 h-24 rounded-2xl shadow-xl mb-6" />
         <h1 className="text-3xl font-bold text-gray-800 tracking-wider">棱镜</h1>
         <p className="text-gray-500 mt-2 mb-10">StockWise-智能库管系统</p>
         
         <div className="mt-10">
            <img src={SIGNATURE_URL} alt="Signature" className="h-16 opacity-80" />
         </div>
      </div>
    </div>
  );
};

const PageWrapper = ({ children }: { children?: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3 }}
  >
    <Suspense fallback={<LoadingScreen />}>
      {children}
    </Suspense>
  </motion.div>
);

const MainLayout = () => {
  const { user, announcementsOpen, setAnnouncementsOpen, storeManagerOpen, setStoreManagerOpen } = useApp();
  const location = useLocation();

  if (!user) return <Login />;

  return (
    // Removed bg-gray-50 to allow body color to shine through for Prism themes
    <div className="min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300 font-sans">
      <Sidebar />
      <Navbar />
      <InstallAppFloating />
      
      {/* In-Place View Switchers (Modals acting as Apps) */}
      <ModalContainer isOpen={announcementsOpen}>
        <AnnouncementCenter onClose={() => setAnnouncementsOpen(false)} />
      </ModalContainer>
      
      <ModalContainer isOpen={storeManagerOpen}>
        <StoreManager onClose={() => setStoreManagerOpen(false)} />
      </ModalContainer>

      <main id="main-content" className="lg:pl-64 pt-16 min-h-screen transition-all">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
           {/* Re-introduced AnimatePresence for Page Transitions */}
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
  
  // Dynamic Page Actions
  const [pageActions, setPageActions] = useState<PageActions>({});

  // --- GLOBAL STATE LIFTED UP FOR PERSISTENCE ---
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [logs, setLogs] = useState<OperationLog[]>(MOCK_LOGS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [loginRecords, setLoginRecords] = useState<LoginRecord[]>(MOCK_LOGIN_RECORDS);

  // Mobile Detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prefetch critical pages on idle
  useEffect(() => {
    if (appReady && (window as any).requestIdleCallback) {
      (window as any).requestIdleCallback(() => {
        import('./pages/Inventory');
        import('./pages/OperationLogs');
      });
    }
  }, [appReady]);

  // --- STRICT THEME APPLICATION LOGIC ---
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'theme-prism-light', 'theme-prism-dark');
    
    if (theme === 'dark') {
        root.classList.add('dark');
        root.style.backgroundColor = '#000000'; // Pure Black
    } else if (theme === 'prism-light') {
        root.classList.add('theme-prism-light');
        // Note: Strict colors are applied via CSS in index.html targeting .theme-prism-light body
    } else if (theme === 'prism-dark') {
        root.classList.add('dark', 'theme-prism-dark');
    } else {
        root.style.backgroundColor = '#ffffff'; // White
    }
  }, [theme]);

  // Session Storage Logic for Announcements
  useEffect(() => {
    if (user && appReady) {
        const today = new Date().toISOString().split('T')[0];
        const key = `hasViewedPopup_${today}`;
        const hasViewed = sessionStorage.getItem(key);
        
        if (!hasViewed) {
            const hasActivePopup = true; 
            if (hasActivePopup) {
                setAnnouncementsOpen(true);
                sessionStorage.setItem(key, 'true');
            }
        }
    }
  }, [user, appReady]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  
  const login = (u: User) => {
      // Ensure we use the user from the global 'users' state if possible, so permissions are up to date
      const freshUser = users.find(existing => existing.id === u.id) || u;
      setUser(freshUser);

      // Add Login Record
      const newRecord: LoginRecord = {
          id: `login_${Date.now()}`,
          user_id: freshUser.id,
          user_name: freshUser.username,
          device_name: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop PC',
          ip_address: '192.168.1.x', // Mock IP
          login_at: new Date().toISOString()
      };
      setLoginRecords(prev => [newRecord, ...prev]);
  };
  
  const logout = () => {
      setUser(null);
      sessionStorage.clear(); // Clear all session storage on logout
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
      // Global State Persistence
      products, setProducts,
      logs, setLogs,
      users, setUsers,
      loginRecords, setLoginRecords
    }}>
      {!appReady && <SplashScreen onFinish={() => setAppReady(true)} />}
      {appReady && (
        <Router>
          <MainLayout />
        </Router>
      )}
    </AppContext.Provider>
  );
};

export default AppContent;