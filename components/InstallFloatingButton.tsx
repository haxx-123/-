
import React, { useEffect, useState } from 'react';
import { X, Share, ArrowUp, MoreVertical, Check } from 'lucide-react';
import { APP_LOGO_URL } from '../constants';

type InstallEnv = 'hidden' | 'wechat' | 'native' | 'ios' | 'android-manual';

export const InstallFloatingButton: React.FC = () => {
  const [installEnv, setInstallEnv] = useState<InstallEnv>('hidden');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalledSuccess, setIsInstalledSuccess] = useState(false);

  useEffect(() => {
    // 28.2.1 场景 A: 已安装/App 模式 (The Guard Clause)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone || 
                         window.location.search.includes('source=pwa');
    
    if (isStandalone) {
        setInstallEnv('hidden');
        return;
    }

    const ua = navigator.userAgent;

    // 28.2.2 场景 B: 微信/钉钉/企业微信
    if (/MicroMessenger|DingTalk/i.test(ua)) {
        setInstallEnv('wechat');
        return;
    }

    // 28.2.4 场景 D: iOS & iPadOS
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
    if (isIOS) {
        setInstallEnv('ios');
        return;
    }

    // 28.2.3 场景 C: 支持自动安装的环境 (监听事件)
    const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        // 如果之前被判为 android-manual 或 hidden，这里升级为 native
        setInstallEnv('native');
        console.log("Captured beforeinstallprompt event");
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 28.2.5 场景 E: 非标准安卓/移动端 (Fallback)
    // 28.2.6 场景 F: PC 桌面端 (Hidden by default unless native event fires)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth < 768;
    
    // 初始化判定 (会被 beforeinstallprompt 覆盖)
    if (isMobile) {
        setInstallEnv((prev) => prev === 'native' ? 'native' : 'android-manual');
    } else {
        setInstallEnv((prev) => prev === 'native' ? 'native' : 'hidden');
    }

    // 28.3 安装成功后的清理
    const handleAppInstalled = () => {
        setInstallEnv('hidden');
        setIsInstalledSuccess(true);
        setShowGuide(false);
        setTimeout(() => setIsInstalledSuccess(false), 3000);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleClick = () => {
      if (installEnv === 'native' && deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult: any) => {
              if (choiceResult.outcome === 'accepted') {
                  setDeferredPrompt(null);
              }
          });
      } else {
          setShowGuide(true);
      }
  };

  if (installEnv === 'hidden' && !isInstalledSuccess) return null;

  return (
    <>
        {/* 28.1 UI 组件外观与层级 */}
        {/* 父容器: fixed, z-40, pointer-events-none (不遮挡) */}
        <div className="fixed top-4 right-4 z-40 pointer-events-none flex flex-col items-end gap-2">
            
            {/* 安装成功提示 */}
            {isInstalledSuccess && (
                <div className="bg-green-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce pointer-events-auto">
                    <Check size={16} /> 安装成功
                </div>
            )}

            {/* 按钮本体: pointer-events: auto */}
            {!isInstalledSuccess && installEnv !== 'hidden' && (
                <button 
                    onClick={handleClick}
                    className="pointer-events-auto bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 hover:scale-105 transition-transform w-12 h-12 md:w-14 md:h-14 flex items-center justify-center overflow-hidden"
                    title="安装应用"
                >
                    <img src={APP_LOGO_URL} alt="Install" className="w-full h-full object-cover rounded-xl" />
                </button>
            )}
        </div>

        {/* 28.2 引导交互逻辑 (Modals) */}
        {showGuide && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowGuide(false)}>
                
                {/* 28.2.2 场景 B: 微信/钉钉遮罩 */}
                {installEnv === 'wechat' && (
                    <div className="absolute top-4 right-4 text-white flex flex-col items-end animate-bounce">
                        <ArrowUp className="w-12 h-12 rotate-45 mb-2 text-yellow-400" />
                        <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-xl border border-white/30 text-sm font-bold">
                            请点击右上角 •••<br/>选择“在浏览器打开”
                        </div>
                    </div>
                )}

                {/* 28.2.4 场景 D: iOS 引导 */}
                {installEnv === 'ios' && (
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowGuide(false)} className="absolute top-4 right-4 text-gray-400 p-1 bg-gray-100 rounded-full"><X size={16}/></button>
                        <div className="flex flex-col items-center text-center">
                            <img src={APP_LOGO_URL} className="w-16 h-16 rounded-2xl shadow-md mb-4" />
                            <h3 className="text-lg font-bold mb-2 dark:text-white">安装“棱镜”到主屏幕</h3>
                            <p className="text-xs text-gray-500 mb-4">获得全屏沉浸式体验，启动速度更快</p>
                            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-left">
                                <div className="flex items-center gap-3">
                                    <span className="min-w-[24px] h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">1</span>
                                    <span>点击底部中间的 <Share className="inline w-4 h-4 text-blue-500"/> 分享按钮</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="min-w-[24px] h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">2</span>
                                    <span>向下滑动选择“添加到主屏幕”</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce text-white pointer-events-none">
                            <span className="text-sm font-bold mb-1 shadow-black drop-shadow-md">第一步：点击这里</span>
                            <ArrowUp className="w-8 h-8 rotate-180 drop-shadow-md" />
                        </div>
                    </div>
                )}

                {/* 28.2.5 场景 E: 通用安卓/其他 引导 */}
                {installEnv === 'android-manual' && (
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowGuide(false)} className="absolute top-4 right-4 text-gray-400 p-1 bg-gray-100 rounded-full"><X size={16}/></button>
                        <div className="flex flex-col items-center text-center">
                            <img src={APP_LOGO_URL} className="w-16 h-16 rounded-2xl shadow-md mb-4" />
                            <h3 className="text-lg font-bold mb-2 dark:text-white">安装应用</h3>
                            <p className="text-xs text-gray-500 mb-4">请手动添加应用到桌面</p>
                            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-left">
                                <div className="flex items-center gap-3">
                                    <span className="min-w-[24px] h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-xs">1</span>
                                    <span>点击浏览器菜单 <MoreVertical className="inline w-4 h-4"/></span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="min-w-[24px] h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-xs">2</span>
                                    <span>选择“安装应用”或“添加到主屏幕”</span>
                                </div>
                            </div>
                            <button onClick={() => setShowGuide(false)} className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">我知道了</button>
                        </div>
                        <div className="absolute -top-16 right-0 flex flex-col items-end animate-bounce text-white pointer-events-none">
                            <ArrowUp className="w-8 h-8 rotate-45 mb-1 drop-shadow-md" />
                            <span className="text-sm font-bold shadow-black drop-shadow-md">点击菜单</span>
                        </div>
                    </div>
                )}
            </div>
        )}
    </>
  );
};
