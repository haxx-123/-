
import React, { useState, useEffect } from 'react';
import { Download, Share, X, MoreVertical, Smartphone, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 定义全局事件类型
declare global {
  interface Window {
    deferredPrompt: any;
  }
}

const InstallFloatingButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  // UI 控制
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showGenericModal, setShowGenericModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. 环境检测
    const ua = navigator.userAgent;
    const _isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const _isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    setIsIOS(_isIOS);
    setIsStandalone(_isStandalone);

    // 如果已经是 PWA 模式，直接不显示
    if (_isStandalone) {
        setIsVisible(false);
        return;
    }

    // 2. 监听安装事件 (Android / Chrome Desktop)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPrompt = e; // Sync global
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // 处理 React 加载晚于事件触发的情况 (从 index.html 捕获的全局变量读取)
    if (window.deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
        setIsVisible(true);
    }

    // 监听安装成功
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      window.deferredPrompt = null;
      setIsVisible(false);
      setShowIOSModal(false);
      setShowGenericModal(false);
    });

    // iOS 或其他移动端，即使没抓到事件，也显示按钮提供指引
    const isMobile = /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) || _isIOS;
    if (isMobile && !_isStandalone) {
        setIsVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    // 场景 A: 捕获到了原生事件 (Android Chrome / Desktop Chrome)
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      return;
    }

    // 场景 B: iOS
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // 场景 C: 其他浏览器 (需要手动菜单安装)
    setShowGenericModal(true);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* 悬浮按钮 */}
      <motion.div 
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-24 right-5 z-40"
      >
        <button
          onClick={handleInstallClick}
          className="relative group flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full shadow-lg shadow-blue-500/40 hover:scale-110 transition-transform duration-300"
        >
            {/* 呼吸动画光环 */}
            <span className="absolute w-full h-full rounded-full bg-blue-500 opacity-20 animate-ping"></span>
            
            {isIOS ? <Share className="w-6 h-6 ml-[-2px] mt-[-2px]" /> : <Download className="w-6 h-6" />}
        </button>
        <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow border dark:border-gray-700">
            安装APP
        </span>
      </motion.div>

      {/* iOS 指引模态框 */}
      <AnimatePresence>
        {showIOSModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowIOSModal(false)}
          >
            <motion.div 
              initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-12 h-1.5 bg-gray-300 rounded-full sm:hidden"></div>
              <button onClick={() => setShowIOSModal(false)} className="absolute top-4 right-4 text-gray-400"><X className="w-5 h-5"/></button>
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                    <Share className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold dark:text-white">安装到 iPhone/iPad</h3>
                <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-left w-full pl-4 space-y-3">
                    <p className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold text-xs">1</span>
                        点击底部/顶部的 <Share className="w-4 h-4 mx-1 text-blue-500 inline"/> 分享按钮
                    </p>
                    <p className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold text-xs">2</span>
                        向下滑动，选择 <span className="font-bold">"添加到主屏幕"</span>
                    </p>
                    <p className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold text-xs">3</span>
                        点击右上角 <span className="font-bold text-blue-600">"添加"</span>
                    </p>
                </div>
                <button onClick={() => setShowIOSModal(false)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold mt-4">
                    知道了
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 通用/安卓 指引模态框 */}
      <AnimatePresence>
        {showGenericModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowGenericModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setShowGenericModal(false)} className="absolute top-4 right-4 text-gray-400"><X className="w-5 h-5"/></button>
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center">
                    <MoreVertical className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold dark:text-white">安装应用</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    浏览器未自动弹出安装请求。请手动操作：
                </p>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl w-full text-left text-sm space-y-2">
                    <div className="flex items-start gap-2">
                        <Monitor className="w-4 h-4 mt-0.5 text-gray-500"/>
                        <span><span className="font-bold">电脑端：</span>点击地址栏右侧的 <Download className="w-3 h-3 inline"/> 或设置菜单中的 "安装应用"。</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <Smartphone className="w-4 h-4 mt-0.5 text-gray-500"/>
                        <span><span className="font-bold">手机端：</span>点击浏览器菜单 <MoreVertical className="w-3 h-3 inline"/>，选择 "安装应用" 或 "添加到主屏幕"。</span>
                    </div>
                </div>
                <button onClick={() => setShowGenericModal(false)} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold mt-2">
                    明白了
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallFloatingButton;
