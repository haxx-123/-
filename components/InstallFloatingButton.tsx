
import React, { useEffect, useState } from 'react';
import { Download, X, Share, MoreVertical, ArrowUp, Smartphone, Monitor } from 'lucide-react';

export const InstallFloatingButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // 1. 检测设备类型
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 2. 检测是否已安装 (Standalone 模式)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isInStandaloneMode) {
      setIsStandalone(true);
    }

    // 3. 监听自动安装事件 (Android/Desktop)
    // 优先使用 window 上已捕获的事件（解决 React 加载时差问题）
    if (window.deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
        console.log("[React] Loaded existing PWA prompt");
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault(); // 阻止浏览器默认横幅
      setDeferredPrompt(e);
      window.deferredPrompt = e;
      console.log("[React] PWA Install Prompt captured!");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
        setDeferredPrompt(null);
        window.deferredPrompt = null;
        setShowGuide(false);
        alert("应用安装成功！");
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // 浏览器支持自动安装，直接触发原生弹窗
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        window.deferredPrompt = null;
      }
    } else {
      // 不支持自动安装（iOS 或 桌面端被拦截），显示手动指引
      setShowGuide(true);
    }
  };

  return (
    <>
      {/* 悬浮安装按钮 */}
      <button
        onClick={handleInstallClick}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-full shadow-lg hover:scale-105 transition-transform font-bold active:scale-95 border-2 border-white/20"
        style={{ boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)' }}
      >
        <Download size={20} />
        <span>安装应用</span>
      </button>

      {/* 美化版安装指引弹窗 */}
      {showGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          
          {/* 指向右上角的箭头 (Android/PC) */}
          {!isIOS && (
            <div className="absolute top-2 right-4 text-white animate-bounce flex flex-col items-end z-[101]">
                <ArrowUp className="w-12 h-12 rotate-45 mb-2 text-yellow-400 drop-shadow-lg" strokeWidth={3} />
                <span className="text-lg font-bold bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md border border-white/30">
                    第一步：点击这里
                </span>
            </div>
          )}

          {/* 指向底部的箭头 (iOS Safari) */}
          {isIOS && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white animate-bounce flex flex-col items-center z-[101]">
                <span className="text-lg font-bold bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md border border-white/30 mb-2">
                    第一步：点击底部按钮
                </span>
                <ArrowUp className="w-12 h-12 rotate-180 text-yellow-400 drop-shadow-lg" strokeWidth={3} />
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative transform transition-all scale-100 border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-6 text-white text-center relative">
                <button 
                  onClick={() => setShowGuide(false)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white p-1 bg-black/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="w-20 h-20 bg-white rounded-2xl mx-auto shadow-lg flex items-center justify-center mb-4 border-4 border-white/20">
                    <img src="/icons/icon-192.png" alt="Logo" className="w-16 h-16 rounded-xl object-contain" />
                </div>
                <h3 className="text-xl font-bold tracking-wide">安装“棱镜库存”</h3>
                <p className="text-sm text-white/90 mt-1 font-medium">添加到主屏幕，体验原生 APP 速度</p>
            </div>

            {/* Content Steps */}
            <div className="p-6 space-y-6">
                <div className="space-y-4">
                    {/* Step 1 */}
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold shadow-sm">1</div>
                        <div>
                            <p className="font-bold text-gray-800 dark:text-white">打开浏览器菜单</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                {isIOS ? (
                                    <>点击底部中间的 <Share className="w-3 h-3 inline"/> 分享按钮</>
                                ) : (
                                    <>点击右上角的 <MoreVertical className="w-3 h-3 inline"/> 菜单按钮</>
                                )}
                            </p>
                        </div>
                    </div>
                    
                    {/* Step 2 */}
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold shadow-sm">2</div>
                        <div>
                            <p className="font-bold text-gray-800 dark:text-white">添加到主屏幕</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {isIOS ? (
                                    <>向下滑动，找到并选择“添加到主屏幕”</>
                                ) : (
                                    <>选择“安装应用”或“添加到主屏幕”</>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Note */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex items-center gap-3 border border-gray-100 dark:border-gray-600">
                    {isIOS ? <Smartphone className="w-6 h-6 text-gray-400" /> : <Monitor className="w-6 h-6 text-gray-400" />}
                    <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                        安装后，您将获得全屏沉浸式体验，启动速度更快，且支持离线访问。
                    </div>
                </div>

                <button
                  onClick={() => setShowGuide(false)}
                  className="w-full py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
