
// ... imports ...
// (Retain existing imports)
import React, { useState, useEffect, createContext, useContext, Suspense, lazy, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, X, LayoutDashboard, Package, Import, History, 
  ShieldCheck, Settings, Bell, Copy, Crop, 
  LogOut, RefreshCw, UserCircle, MoreHorizontal, FileSpreadsheet, PanelLeft, Loader2, AlertCircle
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import UAParser from 'ua-parser-js';

import { ThemeMode, RoleLevel, User, Store, Product, OperationLog, LoginRecord, Announcement } from './types';
import { APP_LOGO_URL, SIGNATURE_URL } from './constants';
import UsernameBadge from './components/UsernameBadge';
import FaceID from './components/FaceID';
import AnnouncementCenter from './components/AnnouncementCenter';
import StoreManager from './components/StoreManager';
import { InstallFloatingButton } from './components/InstallFloatingButton'; 
import { supabase } from './supabase';
import { useRealtime } from './hooks/useRealtime';
import { loadModels } from './utils/faceApi';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventory = lazy(() => import('./pages/Inventory'));
const OperationLogs = lazy(() => import('./pages/OperationLogs'));
const ImportProducts = lazy(() => import('./pages/ImportProducts'));
const AuditHall = lazy(() => import('./pages/AuditHall'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// ... (Retain existing interfaces and AppContext) ...
interface PageActions {
  handleCopy?: () => void;
  handleExcel?: () => void;
}

interface AppContextType {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  user: User | null;
  login: (u: User) => Promise<void>;
  logout: () => Promise<void>;
  currentStore: Store;
  setCurrentStore: (s: Store) => void;
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  announcementsOpen: boolean;
  setAnnouncementsOpen: (b: boolean) => void;
  activePopupAnnouncement: Announcement | null;
  setActivePopupAnnouncement: (a: Announcement | null) => void; 
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
  isSidebarCollapsed: boolean;
  toggleSidebarCollapse: () => void;
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
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[100] animate-bounce-slow w-[90%] max-w-sm">
            <button onClick={handleReload} className="bg-blue-600 text-white w-full py-3 rounded-full shadow-2xl flex items-center justify-center gap-2 font-bold hover:bg-blue-700 transition-colors border-2 border-white/20 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" /> 发现新版本，请刷新以更新
            </button>
        </div>
    );
};

const isAnnouncementActive = (a: Announcement, userId?: string) => {
    if (userId && a.hidden_by_users?.includes(userId)) return false;
    if (a.auto_revoke_config?.enabled && a.auto_revoke_config.revoke_date) {
        if (new Date(a.auto_revoke_config.revoke_date) < new Date()) return false;
    }
    return true;
};

// ... (Retain Navbar, Sidebar, ModalContainer, Login, SplashScreen, PageWrapper, MainLayout components exactly as is) ...
// (To save space, I will paste the surrounding code but ensure MainLayout and others are intact)

const Navbar = () => {
  const { toggleSidebar, currentStore, setAnnouncementsOpen, user, announcements, handleCopy, handleExcel, isSidebarCollapsed } = useApp();
  const location = useLocation();
  
  const unreadCount = announcements.filter(a => {
      if (!isAnnouncementActive(a, user?.id)) return false;
      let isTarget = false;
      if (!a.target_userIds || a.target_userIds.length === 0) isTarget = true; 
      else if (a.target_userIds.includes(user?.id || '')) isTarget = true; 
      else if (user?.role && a.author_role && user.role < a.author_role) isTarget = true; 
      if (!isTarget) return false;
      return !a.read_user_ids.includes(user?.id || '');
  }).length;

  const hasRedDot = unreadCount > 0;

  const handleScreenshot = async () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      const originalHeight = mainContent.style.height;
      const originalOverflow = mainContent.style.overflow;
      mainContent.style.height = `${mainContent.scrollHeight}px`;
      mainContent.style.overflow = 'visible';
      const hiddenElements = document.querySelectorAll('#app-sidebar, #app-navbar, .fixed-ui');
      hiddenElements.forEach((el: any) => el.style.display = 'none');
      try {
          const canvas = await html2canvas(document.body, { useCORS: true, allowTaint: true, height: mainContent.scrollHeight, windowHeight: mainContent.scrollHeight, y: 0, ignoreElements: (el) => el.classList.contains('fixed-ui') });
          const link = document.createElement('a');
          link.download = `prism-screenshot-${Date.now()}.png`;
          link.href = canvas.toDataURL();
          link.click();
      } catch (err) { console.error("Screenshot failed:", err); alert("截图生成失败"); } 
      finally { mainContent.style.height = originalHeight; mainContent.style.overflow = originalOverflow; hiddenElements.forEach((el: any) => el.style.display = ''); }
    }
  };

  const allowedPages = ['/inventory', '/logs'];
  const showCopy = allowedPages.includes(location.pathname);
  const showExcel = allowedPages.includes(location.pathname) && !user?.permissions?.hideExcelExport;
  const handleExcelClick = () => { if (handleExcel) handleExcel(); else alert(`请切换到库存或日志页面，才能生效`); };
  const handleCopyClick = () => { if (handleCopy) handleCopy(); else alert(`请切换到库存或日志页面，才能生效`); };

  const ActionButtons = () => (
    <>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAnnouncementsOpen(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative" title="公告"><Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />{hasRedDot && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}</motion.button>
        {showCopy && <motion.button whileTap={{ scale: 0.9 }} onClick={handleCopyClick} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="复制"><Copy className="w-5 h-5 text-gray-600 dark:text-gray-300" /></motion.button>}
        {showExcel && (<motion.button whileTap={{ scale: 0.9 }} onClick={handleExcelClick} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="导出 Excel"><FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" /></motion.button>)}
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleScreenshot} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="长截图"><Crop className="w-5 h-5 text-gray-600 dark:text-gray-300" /></motion.button>
    </>
  );

  return (
    <div id="app-navbar" className={`h-16 fixed top-0 left-0 right-0 z-40 glass flex items-center justify-between px-4 transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
      <div className="flex items-center lg:hidden"><button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Menu className="w-6 h-6 dark:text-white" /></button></div>
      <div className="hidden lg:flex items-center text-lg font-semibold dark:text-white"><img src={APP_LOGO_URL} alt="Logo" className="w-6 h-6 mr-3 rounded-md" />棱镜-StockWise <span className="mx-2 text-gray-400">/</span> {currentStore.name}</div>
      <div className="flex items-center space-x-1"><ActionButtons /></div>
    </div>
  );
};

const Sidebar = () => {
  const { isSidebarOpen, toggleSidebar, currentStore, setStoreManagerOpen, user, logout, stores, isSidebarCollapsed, toggleSidebarCollapse } = useApp();
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
  
  const sidebarClass = `fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 border-r dark:border-gray-700 transform transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} w-64 ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`;
  const isParent = currentStore.isParent;
  const parentStore = !isParent && currentStore.parentId ? stores.find(s => s.id === currentStore.parentId) : null;
  let storeColorClass = "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200";
  if (isParent) { storeColorClass = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"; } 
  else if (parentStore) { storeColorClass = "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"; } 
  else { storeColorClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"; }

  return (
    <>
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={toggleSidebar}></div>}
      <div id="app-sidebar" className={sidebarClass}>
        <div className={`h-16 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'px-6'} border-b dark:border-gray-700 transition-all`}>
           <img src={APP_LOGO_URL} alt="Prism" className={`w-8 h-8 rounded-lg shadow-md transition-all ${isSidebarCollapsed ? 'hidden' : 'mr-3'}`} />
           <AnimatePresence>
             {!isSidebarCollapsed && (
               <motion.span 
                 key="logo-text"
                 initial={{ opacity: 0, x: -10 }} 
                 animate={{ opacity: 1, x: 0 }} 
                 exit={{ opacity: 0, x: -10 }}
                 className="text-xl font-bold dark:text-white truncate whitespace-nowrap"
               >
                 棱镜
               </motion.span>
             )}
           </AnimatePresence>
           <button onClick={toggleSidebarCollapse} className={`hidden lg:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-all ${isSidebarCollapsed ? '' : 'ml-auto'}`} title={isSidebarCollapsed ? "展开" : "收起"}><PanelLeft className={`w-5 h-5 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} /></button>
           <button onClick={toggleSidebar} className="ml-auto lg:hidden"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 flex flex-col h-[calc(100%-4rem)]">
          <button onClick={() => setStoreManagerOpen(true)} disabled={user?.permissions?.hideStoreEdit} className={`w-full py-2.5 mb-4 rounded-xl flex items-center transition-colors ${storeColorClass} ${user?.permissions?.hideStoreEdit ? 'opacity-80 cursor-default' : 'hover:opacity-90'} ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
            {isSidebarCollapsed ? (
                <span className="font-bold text-xl">{currentStore.name.charAt(0)}</span>
            ) : (
                <>
                    <motion.span initial={{opacity:0}} animate={{opacity:1}} className="font-bold truncate pr-2 whitespace-nowrap overflow-hidden">
                        {currentStore.name}{currentStore.isParent ? '(母)' : '(子)'}
                    </motion.span>
                    {!user?.permissions?.hideStoreEdit && <RefreshCw className="w-4 h-4 opacity-70 flex-shrink-0" />}
                </>
            )}
          </button>
          <nav className="space-y-1 flex-1">
            {menuItems.filter(i => !i.hidden).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button key={item.path} onClick={() => { navigate(item.path); if(window.innerWidth < 1024) toggleSidebar(); }} className={`w-full flex items-center rounded-xl transition-all whitespace-nowrap ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'} ${isSidebarCollapsed ? 'justify-center py-3 px-0' : 'space-x-3 px-4 py-3'}`} title={isSidebarCollapsed ? item.label : ''}>
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <AnimatePresence>
                        {!isSidebarCollapsed && (
                            <motion.span 
                                key={`label-${item.path}`}
                                initial={{ opacity: 0, x: -5 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                exit={{ opacity: 0, x: -5 }}
                                transition={{ duration: 0.2 }}
                                className="whitespace-nowrap overflow-hidden"
                            >
                                {item.label}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
              );
            })}
          </nav>
          <div className={`mt-auto pt-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 -mx-4 px-4 pb-4 mb-[-1rem]`}>
             <div className={`flex items-center cursor-pointer p-2 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors ${isSidebarCollapsed ? 'justify-center' : 'space-x-3'}`} onClick={() => navigate('/settings')}>
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0">{user?.username[0]}</div>
                <AnimatePresence>
                    {!isSidebarCollapsed && (
                        <motion.div key="user-info" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex-1 overflow-hidden whitespace-nowrap">
                            <UsernameBadge name={user?.username || ''} roleLevel={user?.role || RoleLevel.GUEST} className="text-sm block truncate" />
                            <span className="text-xs text-gray-500">点击设置</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                {!isSidebarCollapsed && <LogOut className="w-5 h-5 text-gray-400 hover:text-red-500 flex-shrink-0" onClick={(e) => { e.stopPropagation(); logout(); }} />}
             </div>
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
  const [faceMode, setFaceMode] = useState<'verify' | 'identify'>('verify');
  const [targetFaceData, setTargetFaceData] = useState<number[] | undefined>(undefined);
  const [faceCandidates, setFaceCandidates] = useState<any[]>([]);
  
  // 任务二：预加载模型状态
  const [modelState, setModelState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
      const initModels = async () => {
          try {
              // 使用封装好的 strict local loading
              await loadModels();
              setModelState('ready');
          } catch (e) {
              console.error("Model pre-load failed", e);
              setModelState('error');
          }
      };
      initModels();
  }, []);
  
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
    if (userExists.password !== inputPass) { alert("密码错误"); return; }
    login(userExists);
  };

  const handleFaceIDClick = () => {
      if (inputName) {
          let targetUser = users.find(u => u.username === inputName);
          if (!targetUser && inputName === '管理员') { alert("初始管理员请先使用密码登录，并在设置中录入人脸。"); return; }
          if (targetUser) { 
              if (targetUser.face_descriptor && targetUser.face_descriptor.length > 0) {
                  setTargetFaceData(targetUser.face_descriptor); setFaceMode('verify'); setUseFaceID(true); 
              } else { alert("该用户尚未录入人脸数据，请先使用密码登录并设置。"); }
          } else { alert("用户不存在，无法验证。若需刷脸登录，请清空用户名。"); }
      } else {
          const validCandidates = users.filter(u => u.face_descriptor && u.face_descriptor.length > 0).map(u => ({ id: u.id, username: u.username, descriptor: u.face_descriptor! }));
          if (validCandidates.length === 0) { alert("系统中暂无可用的人脸数据，请先使用密码登录并录入。"); return; }
          setFaceCandidates(validCandidates); setFaceMode('identify'); setUseFaceID(true);
      }
  };

  const handleFaceSuccess = (result?: any) => {
      if (faceMode === 'verify') {
          let targetUser = users.find(u => u.username === inputName);
          if (targetUser) { login(targetUser); }
      } else if (faceMode === 'identify') {
          const identifiedUser = users.find(u => u.id === result);
          if (identifiedUser) { login(identifiedUser); }
          else { alert("识别成功但未找到对应本地用户数据"); }
      }
      setUseFaceID(false);
  };

  const getFaceButtonContent = () => {
      if (modelState === 'loading') {
          return (
              <span className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin"/> 正在初始化 AI 引擎...
              </span>
          );
      }
      if (modelState === 'error') {
          return (
              <span className="flex items-center gap-2 text-red-500 font-bold">
                  <AlertCircle className="w-4 h-4"/> AI 模型丢失，请刷新重试
              </span>
          );
      }
      // Ready state
      return (
          <>
            <UserCircle className="w-5 h-5" /> 
            {inputName ? '人脸验证登录' : '刷脸识别登录'}
          </>
      );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      {useFaceID && <FaceID onSuccess={handleFaceSuccess} onCancel={() => setUseFaceID(false)} storedFaceData={targetFaceData} candidates={faceCandidates} mode={faceMode} />}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl">
        <div className="text-center mb-8">
           <img src={APP_LOGO_URL} alt="Logo" className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg" />
           <h1 className="text-2xl font-bold text-gray-800 dark:text-white">棱镜 StockWise</h1>
           <p className="text-gray-500 mt-2">智能库管系统</p>
        </div>
        <div className="space-y-4">
          <input type="text" value={inputName} onChange={e => setInputName(e.target.value)} className="w-full px-4 py-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="用户名 (选填，空则刷脸识别)" />
          <input type="password" value={inputPass} onChange={e => setInputPass(e.target.value)} className="w-full px-4 py-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="密码" />
          
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleLogin} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30">登录</motion.button>
          
          <motion.button 
            whileTap={{ scale: modelState === 'ready' ? 0.98 : 1 }} 
            onClick={handleFaceIDClick} 
            disabled={modelState !== 'ready'}
            className={`w-full py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${modelState !== 'ready' ? 'opacity-70 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
             {getFaceButtonContent()}
          </motion.button>
        </div>
      </div>
      <InstallFloatingButton mode="static" />
    </div>
  );
};

// ... (SplashScreen, PageWrapper, MainLayout remain same) ...
const SplashScreen = ({ isReady }: { isReady: boolean }) => {
  const [visible, setVisible] = useState(true);
  useEffect(() => { if (isReady) { const el = document.getElementById('splash-screen'); if (el) { el.style.opacity = '0'; el.style.visibility = 'hidden'; } const timer = setTimeout(() => setVisible(false), 800); return () => clearTimeout(timer); } }, [isReady]);
  if (!visible) return null;
  return (<div id="splash-screen"><div className="flex flex-col items-center animate-fade-in-up mt-[-10vh]"><img src={APP_LOGO_URL} alt="Logo" className="w-24 h-24 rounded-2xl shadow-xl mb-6" /><h1 className="text-3xl font-bold text-gray-800 tracking-wider">棱镜</h1><p className="text-gray-500 mt-2">StockWise-智能库管系统</p></div><div className="absolute bottom-12 left-0 right-0 flex justify-center"><img src={SIGNATURE_URL} alt="Signature" className="h-16 opacity-80" /></div></div>);
};

const PageWrapper = ({ children }: { children?: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
    <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
  </motion.div>
);

const MainLayout = () => {
  const { user, announcementsOpen, setAnnouncementsOpen, storeManagerOpen, setStoreManagerOpen, activePopupAnnouncement, setActivePopupAnnouncement, isSidebarCollapsed } = useApp();
  const location = useLocation();
  if (!user) return <Login />;
  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300 font-sans">
      <Sidebar />
      <Navbar />
      <SWUpdateToast />
      <ModalContainer isOpen={announcementsOpen}><AnnouncementCenter onClose={() => { setAnnouncementsOpen(false); if (activePopupAnnouncement) setActivePopupAnnouncement(null); }} initialPopup={activePopupAnnouncement} /></ModalContainer>
      <ModalContainer isOpen={storeManagerOpen}><StoreManager onClose={() => setStoreManagerOpen(false)} /></ModalContainer>
      <main id="main-content" className={`pt-16 min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
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
  const [theme, setThemeState] = useState<ThemeMode>(() => (localStorage.getItem('prism_theme') as ThemeMode) || 'light');
  const [user, setUser] = useState<User | null>(null);
  const [currentStore, setCurrentStore] = useState<Store>({ id: 'dummy', name: '加载中...', isParent: false });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [activePopupAnnouncement, setActivePopupAnnouncement] = useState<Announcement | null>(null);
  const [storeManagerOpen, setStoreManagerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => { return localStorage.getItem('sidebar_collapsed') === 'true'; });
  const [appReady, setAppReady] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [pageActions, setPageActions] = useState<PageActions>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loginRecords, setLoginRecords] = useState<LoginRecord[]>([]);
  const [stores, setStores] = useState<Store[]>([]); 
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // ... (Realtime hooks kept as is) ...
  useRealtime('operation_logs', (payload) => {
      const { eventType, new: newRow } = payload;
      if (eventType === 'INSERT') {
          const mappedLog = { ...newRow, id: String(newRow.id), target_id: String(newRow.target_id) };
          setLogs(prev => [mappedLog, ...prev]);
      } else if (eventType === 'UPDATE') { setLogs(prev => prev.map(l => l.id === String(newRow.id) ? { ...newRow, id: String(newRow.id) } : l)); }
  });
  // Realtime for Login Records
  useRealtime('login_records', (payload) => {
      const { eventType, new: newRow } = payload;
      if (eventType === 'INSERT') {
          const mappedRecord = { ...newRow, id: String(newRow.id), user_id: String(newRow.user_id) };
          setLoginRecords(prev => [mappedRecord, ...prev]);
      } else if (eventType === 'UPDATE') {
          const mappedRecord = { ...newRow, id: String(newRow.id), user_id: String(newRow.user_id) };
          setLoginRecords(prev => prev.map(r => r.id === mappedRecord.id ? mappedRecord : r));
      }
  });

  useRealtime('announcements', (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      if (eventType === 'INSERT') { setAnnouncements(prev => [{ ...newRow, id: String(newRow.id), target_userIds: newRow.target_user_ids?.map(String) }, ...prev]); } 
      else if (eventType === 'UPDATE') { setAnnouncements(prev => prev.map(a => a.id === String(newRow.id) ? { ...newRow, id: String(newRow.id), target_userIds: newRow.target_user_ids?.map(String) } : a)); } 
      else if (eventType === 'DELETE') { setAnnouncements(prev => prev.filter(a => a.id !== String(oldRow.id))); }
  });
  useRealtime('users', (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
          const mappedUser = { ...newRow, id: String(newRow.id), storeId: newRow.store_id ? String(newRow.store_id) : undefined };
          setUsers(prev => { const exists = prev.some(u => u.id === mappedUser.id); if (exists) return prev.map(u => u.id === mappedUser.id ? mappedUser : u); return [...prev, mappedUser]; });
          if (user && mappedUser.id === user.id) { const mergedUser = { ...user, ...mappedUser }; setUser(mergedUser); localStorage.setItem('prism_user', JSON.stringify(mergedUser)); }
      } else if (eventType === 'DELETE') {
          setUsers(prev => prev.filter(u => u.id !== String(oldRow.id)));
          if (user && user.id === String(oldRow.id)) { alert("您的账号已被删除"); logout(); }
      }
  });
  useRealtime('products', (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      if (eventType === 'DELETE') { setProducts(prev => prev.filter(p => p.id !== String(oldRow.id))); return; }
      if (eventType === 'UPDATE') { setProducts(prev => prev.map(p => { if (p.id === String(newRow.id)) { return { ...p, ...newRow, id: String(newRow.id), storeId: String(newRow.store_id), quantityBig: newRow.quantity_big, quantitySmall: newRow.quantity_small, unitBig: newRow.unit_big, unitSmall: newRow.unit_small, conversionRate: newRow.conversion_rate, batches: p.batches }; } return p; })); } 
      else if (eventType === 'INSERT') { const mapped = { ...newRow, id: String(newRow.id), storeId: String(newRow.store_id), quantityBig: newRow.quantity_big, quantitySmall: newRow.quantity_small, unitBig: newRow.unit_big, unitSmall: newRow.unit_small, conversionRate: newRow.conversion_rate, batches: [] }; setProducts(prev => [...prev, mapped]); }
  });
  useRealtime('batches', (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      const mapBatch = (r: any) => ({ id: String(r.id), batchNumber: r.batch_number, expiryDate: r.expiry_date, totalQuantity: Number(r.total_quantity), conversionRate: r.conversion_rate, price: r.price, notes: r.notes });
      setProducts(prev => prev.map(p => {
          const pId = newRow?.product_id || oldRow?.product_id;
          if (String(p.id) !== String(pId)) return p;
          let newBatches = [...p.batches];
          if (eventType === 'INSERT') { newBatches.push(mapBatch(newRow)); } 
          else if (eventType === 'UPDATE') { newBatches = newBatches.map(b => b.id === String(newRow.id) ? mapBatch(newRow) : b); } 
          else if (eventType === 'DELETE') { newBatches = newBatches.filter(b => b.id !== String(oldRow.id)); }
          return { ...p, batches: newBatches };
      }));
  });

  useEffect(() => {
    if (!user) return;
    const sessionCheck = async () => {
        const sessionId = sessionStorage.getItem('prism_session_id');
        if (!sessionId) return; 
        await supabase.from('login_records').update({ last_active_at: new Date().toISOString() }).eq('session_id', sessionId);
        const { data } = await supabase.from('login_records').select('is_active').eq('session_id', sessionId).maybeSingle(); 
        if (data && data.is_active === false) { alert("您已在其他设备登录，或被强制下线。"); logout(); }
    };
    const interval = setInterval(sessionCheck, 60000);
    sessionCheck(); 
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
      const storedUser = localStorage.getItem('prism_user');
      if (storedUser) { try { const parsedUser = JSON.parse(storedUser); setUser(parsedUser); } catch (e) { localStorage.removeItem('prism_user'); } }
  }, []);

  const reloadData = async () => {
    try {
        const [sData, uData, pData, lData, aData, lrData] = await Promise.all([
            supabase.from('stores').select('*'),
            supabase.from('users').select('*'),
            supabase.from('products').select('*, batches(*)'),
            supabase.from('operation_logs').select('*').order('created_at', { ascending: false }),
            supabase.from('announcements').select('*').order('created_at', { ascending: false }),
            supabase.from('login_records').select('*').order('login_at', { ascending: false })
        ]);
        if (sData.data) {
            const mappedStores = sData.data.map((s: any) => ({ id: String(s.id), name: s.name, isParent: s.is_parent, childrenIds: s.children_ids?.map(String), parentId: s.parent_id ? String(s.parent_id) : undefined, managerIds: s.manager_ids?.map(String), viewerIds: s.viewer_ids?.map(String) }));
            setStores(mappedStores);
            if (currentStore.id === 'dummy' && mappedStores.length > 0) { const lastStoreId = localStorage.getItem('prism_last_store'); const targetStore = mappedStores.find(s => s.id === lastStoreId) || mappedStores[0]; setCurrentStore(targetStore); }
        }
        if (uData.data) { setUsers(uData.data.map((u: any) => ({ ...u, id: String(u.id), storeId: u.store_id ? String(u.store_id) : undefined }))); }
        if (pData.data) {
            const mappedProducts: Product[] = pData.data.map((p: any) => {
                const safeBatches = (p.batches || []).map((b: any) => ({ id: String(b.id), batchNumber: b.batch_number, expiryDate: b.expiry_date, totalQuantity: Number(b.total_quantity) || 0, conversionRate: b.conversion_rate || p.conversion_rate || 10, price: b.price, notes: b.notes }));
                const totalQtyFromBatches = safeBatches.reduce((acc: number, b: any) => acc + b.totalQuantity, 0);
                const rate = p.conversion_rate || 10; const safeRate = rate === 0 ? 10 : rate;
                return { id: String(p.id), storeId: String(p.store_id), name: p.name, category: p.category, sku: p.sku, image_url: p.image_url, notes: p.notes, keywords: p.keywords, unitBig: p.unit_big || '整', unitSmall: p.unit_small || '散', conversionRate: rate, quantityBig: p.quantity_big ?? Math.floor(totalQtyFromBatches / safeRate), quantitySmall: p.quantity_small ?? (totalQtyFromBatches % safeRate), batches: safeBatches };
            });
            setProducts(mappedProducts);
        }
        if (lData.data) setLogs(lData.data.map((l:any) => ({...l, id: String(l.id), target_id: String(l.target_id)})));
        if (aData.data) setAnnouncements(aData.data.map((a: any) => ({ ...a, id: String(a.id), target_userIds: a.target_user_ids?.map(String) })));
        if (lrData.data) setLoginRecords(lrData.data.map((r:any) => ({...r, id: String(r.id), user_id: String(r.user_id)})));
    } catch (e) { console.error("Critical Data Load Error", e); } 
    finally { setAppReady(true); }
  };

  useEffect(() => { reloadData(); }, []);
  useEffect(() => { if (currentStore.id !== 'dummy') localStorage.setItem('prism_last_store', currentStore.id); }, [currentStore]);
  useEffect(() => { const handleResize = () => setIsMobile(window.innerWidth < 768); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []);
  useEffect(() => { const root = window.document.documentElement; root.classList.remove('dark', 'theme-prism-light', 'theme-prism-dark'); root.style.removeProperty('background-color'); if (theme === 'dark') root.classList.add('dark'); else if (theme === 'prism-light') root.classList.add('theme-prism-light'); else if (theme === 'prism-dark') root.classList.add('dark', 'theme-prism-dark'); }, [theme]);

  // (Popup check kept as is)
  useEffect(() => { if (user && appReady && announcements.length > 0) { const today = new Date().toDateString(); const sessionKey = `hasCheckedPopups_${user.id}_${today}`; if (sessionStorage.getItem(sessionKey)) return; const potentialPopups = announcements.filter(a => a.popup_config?.enabled && isAnnouncementActive(a, user.id) && (!a.target_userIds || a.target_userIds.length === 0 || a.target_userIds.includes(user.id)) && (!a.target_roles || a.target_roles.length === 0 || a.target_roles.includes(user.role))); let targetPopup: Announcement | null = null; const now = new Date(); for (const p of potentialPopups) { const freq = p.popup_config?.frequency || 'once'; const localKey = `popup_last_viewed_${p.id}_${user.id}`; const lastViewedStr = localStorage.getItem(localKey); let showThis = false; if (freq === 'permanent') { showThis = true; } else if (freq === 'once') { const isRead = p.read_user_ids?.includes(user.id); showThis = !isRead && !lastViewedStr; } else if (freq === 'daily') { if (!lastViewedStr) showThis = true; else showThis = new Date(lastViewedStr).toDateString() !== now.toDateString(); } else if (freq === 'weekly') { if (!lastViewedStr) showThis = true; else { const diff = now.getTime() - new Date(lastViewedStr).getTime(); showThis = diff > 7 * 24 * 60 * 60 * 1000; } } else if (freq === 'monthly') { if (!lastViewedStr) showThis = true; else showThis = new Date(lastViewedStr).getMonth() !== now.getMonth(); } if (showThis) { targetPopup = p; localStorage.setItem(localKey, now.toISOString()); break; } } if (targetPopup) { setActivePopupAnnouncement(targetPopup); setAnnouncementsOpen(true); } sessionStorage.setItem(sessionKey, 'true'); } }, [user, appReady, announcements]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleSidebarCollapse = () => { setIsSidebarCollapsed(prev => { const next = !prev; localStorage.setItem('sidebar_collapsed', String(next)); return next; }); };
  
  // Revised fetch IP info with multiple fallbacks and timeout
  const fetchIpInfo = async () => {
      const timeoutFetch = (url: string) => {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 2000); // 2s timeout
          return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
      };

      // 1. Try ip.sb (GeoIP JSON - Fast & Global)
      try {
          const res = await timeoutFetch('https://api.ip.sb/geoip');
          if (res.ok) {
              const data = await res.json();
              if (data.ip) return { 
                  ip: data.ip, 
                  location: [data.city, data.country].filter(Boolean).join(', ') || 'Unknown Location' 
              };
          }
      } catch (e) { console.warn("ip.sb failed", e); }

      // 2. Try ipapi.co (JSON)
      try {
          const res1 = await timeoutFetch('https://ipapi.co/json/');
          if (res1.ok) {
              const data = await res1.json();
              if (data.ip) return { 
                  ip: data.ip, 
                  location: [data.city, data.region].filter(Boolean).join(', ') || 'Unknown Location' 
              };
          }
      } catch (e) { console.warn("ipapi.co failed", e); }

      // 3. Try seeip.org (JSON)
      try {
          const res2 = await timeoutFetch('https://api.seeip.org/geoip');
          if (res2.ok) {
              const data = await res2.json();
              return { 
                  ip: data.ip, 
                  location: [data.city, data.region].filter(Boolean).join(', ') || 'Unknown Location' 
              };
          }
      } catch (e) { console.warn("seeip failed", e); }

      // 4. Fallback: Just IP
      try {
          const res3 = await timeoutFetch('https://ipv4.icanhazip.com');
          if (res3.ok) {
              const text = await res3.text();
              return { ip: text.trim(), location: 'IP Only Location' };
          }
      } catch (e) { console.warn("icanhazip failed", e); }

      return { ip: 'Unknown IP', location: 'Unknown Location' };
  };

  const login = async (u: User) => {
      const freshUser = users.find(existing => existing.id === u.id) || u;
      setUser(freshUser);
      localStorage.setItem('prism_user', JSON.stringify(freshUser));
      
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('prism_session_id', sessionId);

      // 1. Parse User Agent (Strict Enhanced Logic)
      const parser = new (UAParser as any)(navigator.userAgent);
      const result = parser.getResult();
      const vendor = result.device.vendor || '';
      const model = result.device.model || '';
      const os = result.os.name || '';
      
      // Core logic: If vendor or model exists, use them. Otherwise fallback to OS name.
      let finalDeviceName = '';
      if (vendor || model) {
          finalDeviceName = `${vendor} ${model}`.trim();
      } else {
          finalDeviceName = `${os} Device`;
      }
      
      // Append Browser
      finalDeviceName = `${finalDeviceName} / ${result.browser.name}`;
      
      const readableDeviceName = finalDeviceName;

      // 2. Fetch Geo/IP Info with robust fallback
      const { ip, location } = await fetchIpInfo();

      // 4. Insert Record
      const { error: insertError } = await supabase.from('login_records').insert({ 
          id: `login_${Date.now()}`, 
          user_id: freshUser.id, 
          user_name: freshUser.username, 
          device_name: readableDeviceName, 
          ip_address: ip, 
          location: location, 
          raw_user_agent: navigator.userAgent,
          session_id: sessionId,
          is_active: true, // Ensure active
          login_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
      });

      if (insertError) {
          console.error("Login Record Insert Error:", insertError);
          // Show alert only if it's a real permission issue, not a transient network glitch
          if (insertError.code === '42501' || insertError.message.includes('permission')) {
             alert(`系统警告: 登录日志写入失败 (权限不足)。请联系管理员检查数据库权限。`);
          }
      }
      
      await reloadData();
  };
  
  const logout = async () => { 
      const sessionId = sessionStorage.getItem('prism_session_id');
      if (user) { 
          const today = new Date().toDateString(); 
          sessionStorage.removeItem(`hasCheckedPopups_${user.id}_${today}`);
          if (sessionId) {
              await supabase.from('login_records').update({ is_active: false }).eq('session_id', sessionId);
          }
      }
      sessionStorage.removeItem('prism_session_id');
      sessionStorage.clear(); 
      setUser(null); 
      localStorage.removeItem('prism_user');
  };
  const setTheme = (t: ThemeMode) => {
      setThemeState(t);
      localStorage.setItem('prism_theme', t);
  };

  return (
    <AppContext.Provider value={{ 
      theme, setTheme, user, login, logout, currentStore, setCurrentStore, isSidebarOpen, toggleSidebar, announcementsOpen, setAnnouncementsOpen, activePopupAnnouncement, setActivePopupAnnouncement, storeManagerOpen, setStoreManagerOpen, setPageActions, handleCopy: pageActions.handleCopy, handleExcel: pageActions.handleExcel, isMobile, products, setProducts, logs, setLogs, users, setUsers, loginRecords, setLoginRecords, stores, setStores, announcements, setAnnouncements, reloadData, isSidebarCollapsed, toggleSidebarCollapse
    }}>
      <SplashScreen isReady={appReady} />
      <div style={{ opacity: appReady ? 1 : 0 }} className="transition-opacity duration-500">
          <Router><MainLayout /></Router>
      </div>
    </AppContext.Provider>
  );
};

export default AppContent;
