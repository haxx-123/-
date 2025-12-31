
import React, { useEffect, useState } from 'react';
import { Download, X, Share, MoreVertical, ArrowUp, PlusSquare, Smartphone } from 'lucide-react';
import { APP_LOGO_URL } from '../constants';

export const InstallFloatingButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // 1. 检测是否是 iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // 2. 检测是否已经是安装模式 (Standalone)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isInStandaloneMode) {
      setIsStandalone(true);
    }

    // 3. 监听浏览器的自动安装事件 (Android/Desktop)
    // 检查全局变量，防止 React 加载晚于事件触发
    if (window.deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
        console.log("[React] Loaded existing PWA prompt");
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault(); 
      setDeferredPrompt(e); 
      window.deferredPrompt = e; 
      console.log("[React] PWA Install Prompt captured!");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
        setDeferredPrompt(null);
        window.deferredPrompt = null;
        setShowGuide(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // 浏览器支持自动安装
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        window.deferredPrompt = null;
      }
    } else {
      // 不支持自动安装 (iOS 或 桌面端未触发)，显示手动指引
      setShowGuide(true);
    }
  };

  return (
    <>
      {/* 悬浮安装按钮 */}
      <button
        onClick={handleInstallClick}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-full shadow-lg hover:scale-105 transition-transform font-bold active:scale-95"
        style={{ boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)' }}
      >
        <Download size={20} />
        <span>安装应用</span>
      </button>

      {/* 美化版安装指引弹窗 */}
      {showGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          
          {/* 指向右上角的箭头 (仅非iOS显示) */}
          {!isIOS && (
            <div className="absolute top-2 right-2 text-white animate-bounce flex flex-col items-end pr-4 pt-2 z-[101]">
                <ArrowUp className="w-10 h-10 rotate-45 mb-2" />
                <span className="text-lg font-handwriting bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md">点击这里</span>
            </div>
          )}

          {/* 指向底部的箭头 (仅iOS显示) */}
          {isIOS && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white animate-bounce flex flex-col items-center pb-4 z-[101]">
                <span className="text-lg font-handwriting bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md mb-2">点击这里</span>
                <ArrowUp className="w-10 h-10 rotate-180" />
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative transform transition-all scale-100">
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-6 text-white text-center relative">
                <button 
                  onClick={() => setShowGuide(false)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white p-1 bg-black/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="w-20 h-20 bg-white rounded-2xl mx-auto shadow-lg flex items-center justify-center mb-3">
                    <img src={APP_LOGO_URL} alt="Logo" className="w-16 h-16 rounded-xl" />
                </div>
                <h3 className="text-xl font-bold">安装“棱镜库存”</h3>
                <p className="text-sm text-white/90 mt-1">添加到主屏幕，体验更流畅</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">1</div>
                        <div>
                            <p className="font-bold text-gray-800 dark:text-white">点击浏览器菜单</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {isIOS ? (
                                    <span>点击底部中间的 <Share className="inline w-4 h-4 mx-1 align-text-bottom"/> 分享按钮</span>
                                ) : (
                                    <span>点击右上角的 <MoreVertical className="inline w-4 h-4 mx-1 align-text-bottom"/> 菜单按钮</span>
                                )}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">2</div>
                        <div>
                            <p className="font-bold text-gray-800 dark:text-white">添加到主屏幕</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {isIOS ? (
                                    <span>向下滑动，找到并点击 <span className="font-bold text-gray-700 dark:text-gray-300">“添加到主屏幕”</span></span>
                                ) : (
                                    <span>选择 <span className="font-bold text-gray-700 dark:text-gray-300">“安装应用”</span> 或 <span className="font-bold text-gray-700 dark:text-gray-300">“添加到主屏幕”</span></span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex items-center gap-3 border border-gray-100 dark:border-gray-700">
                    <Smartphone className="w-8 h-8 text-gray-400" />
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        安装后，您将获得全屏沉浸式体验，且启动速度更快。
                    </div>
                </div>

                <button
                  onClick={() => setShowGuide(false)}
                  className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  我知道了
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
