import React, { useEffect, useState } from 'react';
import { Download, X, Share, MoreVertical } from 'lucide-react'; // 确保安装了 lucide-react

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
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault(); // 阻止浏览器默认弹出的横幅
      setDeferredPrompt(e); // 保存事件，留给按钮点击用
      console.log("PWA Install Prompt captured!");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 如果已经在 APP 里运行，不显示按钮
  if (isStandalone) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // A. 如果浏览器支持自动安装，且事件已捕获 -> 触发原生弹窗
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // B. 如果不支持自动安装 (iOS 或 桌面端未触发事件) -> 显示手动指引
      setShowGuide(true);
    }
  };

  return (
    <>
      {/* 悬浮安装按钮 */}
      <button
        onClick={handleInstallClick}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-full shadow-lg hover:scale-105 transition-transform font-bold"
        style={{ boxShadow: '0 4px 14px rgba(192, 38, 211, 0.4)' }}
      >
        <Download size={20} />
        <span>安装应用</span>
      </button>

      {/* 手动安装指引弹窗 (Modal) */}
      {showGuide && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              安装到主屏幕
            </h3>

            {isIOS ? (
              // iOS 指引
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>iOS 设备请按照以下步骤安装：</p>
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold">1</span>
                  <span>点击底部浏览器的 <Share className="inline w-5 h-5 mx-1" /> 分享按钮</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold">2</span>
                  <span>向下滑动，选择“添加到主屏幕”</span>
                </div>
              </div>
            ) : (
              // 安卓/电脑通用指引 (当自动安装失败时)
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>如果自动安装未触发，请手动操作：</p>
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold">1</span>
                  <span>点击浏览器右上角的 <MoreVertical className="inline w-5 h-5 mx-1" /> 菜单</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold">2</span>
                  <span>选择“安装应用”或“添加到主屏幕”</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="w-full mt-6 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
};