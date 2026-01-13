
import React, { useEffect, useRef, useState } from 'react';
import { X, Zap, ZapOff, ScanLine, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
  continuous?: boolean; // 新增：是否连续扫描模式
  isEmbedded?: boolean; // 新增：是否嵌入模式（非全屏）
}

declare global {
  interface Window {
    Html5Qrcode: any;
    Html5QrcodeSupportedFormats: any;
  }
}

// 简短的“滴”声 Base64，避免网络请求延迟
const BEEP_AUDIO = "data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; 

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose, continuous = false, isEmbedded = false }) => {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!window.Html5Qrcode) {
        setError('扫描组件加载失败，请检查网络连接。');
        return;
    }

    const startScanner = async () => {
        try {
            // Safety check: Ensure element is mounted
            if (!document.getElementById("reader")) {
                console.warn("Scanner mount aborted: container missing");
                return;
            }

            const html5QrCode = new window.Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            // 1. 锁定核心格式，减少计算量
            const formats = [ 
                window.Html5QrcodeSupportedFormats.QR_CODE,
                window.Html5QrcodeSupportedFormats.EAN_13,
                window.Html5QrcodeSupportedFormats.CODE_128,
            ];

            // 2. 极致性能配置
            const config = { 
                fps: 20, // 提高帧率
                qrbox: { width: 250, height: 250 }, 
                aspectRatio: 1.0,
                formatsToSupport: formats,
                // CRITICAL: 启用原生条码检测 (Android/iOS System API)，性能提升 10x
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                },
                // 降低画面抖动影响
                videoConstraints: {
                    facingMode: "environment",
                    focusMode: "continuous", // 连续对焦
                    // 强制 720p，避免 4K/1080p 导致 JS 阻塞
                    width: { min: 640, ideal: 1280, max: 1280 },
                    height: { min: 480, ideal: 720, max: 720 }
                }
            };
            
            await html5QrCode.start(
                { facingMode: "environment" }, 
                config,
                (decodedText: string) => {
                    // 防抖动逻辑 (1.5秒内不重复识别相同码)
                    const now = Date.now();
                    if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 1500) {
                        return;
                    }
                    lastScanRef.current = decodedText;
                    lastScanTimeRef.current = now;

                    // 成功反馈：声音
                    try {
                        const audio = new Audio(BEEP_AUDIO);
                        audio.volume = 0.5;
                        audio.play().catch(() => {});
                    } catch(e) {}
                    
                    if (continuous) {
                        // 连续模式：只回调，不停止
                        onScan(decodedText);
                        // 视觉反馈：闪烁一下边框 (Optional UI logic handled via React state if needed)
                    } else {
                        // 单次模式：停止并回调
                        html5QrCode.stop().then(() => {
                            html5QrCode.clear();
                            onScan(decodedText);
                        }).catch((err: any) => {
                            console.warn("Stop failed", err);
                            onScan(decodedText);
                        });
                    }
                },
                (errorMessage: string) => {
                    // ignore scan error
                }
            );

            // 3. 检测闪光灯支持
            try {
                const capabilities = html5QrCode.getRunningTrackCameraCapabilities();
                if (capabilities && capabilities.torchFeature().isSupported()) {
                    setHasTorch(true);
                }
            } catch (e) {
                // Ignore torch check errors
            }

        } catch (err) {
            console.error("Scanner Error", err);
            setError("无法启动摄像头，请检查权限或换个浏览器。");
        }
    };

    // 延迟一点启动，防止 DOM 未挂载
    const timer = setTimeout(startScanner, 100);

    return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch((e: any) => console.warn(e));
                }
                scannerRef.current.clear().catch((e: any) => console.warn(e));
            } catch (e) { console.warn("Cleanup error", e); }
        }
    };
  }, [onScan, continuous]);

  const toggleTorch = () => {
      if (scannerRef.current && hasTorch) {
          const nextState = !torchOn;
          scannerRef.current.applyVideoConstraints({
              advanced: [{ torch: nextState }]
          }).then(() => {
              setTorchOn(nextState);
          }).catch((err: any) => console.error(err));
      }
  };

  return (
    <div className={isEmbedded ? "w-full h-full relative bg-black overflow-hidden group" : `fixed inset-0 z-[200] bg-black flex flex-col ${continuous ? 'justify-start' : 'justify-center items-center'}`}>
      
      {/* Top Bar */}
      <div className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 ${isEmbedded ? 'pointer-events-none' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
        {/* Left Action */}
        <div className="pointer-events-auto">
             {!isEmbedded && <button onClick={onClose} className="p-2 bg-black/40 rounded-full text-white backdrop-blur-md hover:bg-white/20 transition-colors"><X className="w-6 h-6" /></button>}
        </div>
        
        {/* Center Title */}
        {!isEmbedded && (
            <h3 className="text-white font-medium tracking-wide flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-green-400"/> {continuous ? '连续扫码模式' : '扫描条码'}
            </h3>
        )}

        {/* Right Action (Torch) */}
        <div className="w-10 flex justify-end pointer-events-auto">
            {hasTorch && (
                <button onClick={toggleTorch} className={`p-2 rounded-full transition-colors ${torchOn ? 'bg-yellow-400 text-black' : 'bg-black/40 text-white'}`}>
                    {torchOn ? <Zap className="w-6 h-6 fill-current" /> : <ZapOff className="w-6 h-6" />}
                </button>
            )}
        </div>
      </div>

      {/* Scanner Viewport */}
      <div className={isEmbedded ? "w-full h-full relative" : `w-full relative bg-black overflow-hidden ${continuous ? 'h-[40vh] border-b border-gray-800' : 'max-w-md aspect-[3/4] rounded-xl'}`}>
         <div id="reader" className="w-full h-full"></div>
         
         {error && (
             <div className="absolute inset-0 flex items-center justify-center bg-black text-white p-6 text-center z-20">
                 <div className="flex flex-col items-center gap-2">
                     <AlertCircle className="w-8 h-8 text-red-500"/>
                     <p className="text-red-400">{error}</p>
                 </div>
             </div>
         )}
         
         {!error && (
             <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                 {/* Simplified Responsive Overlay */}
                 <div className={`relative border-2 border-green-500/50 bg-transparent ${isEmbedded ? 'h-3/5 w-3/5 md:w-96 md:h-48' : 'w-64 h-64'}`}>
                    {/* Laser */}
                    <div className="absolute left-0 right-0 h-0.5 bg-red-500/80 top-1/2 animate-scan-laser shadow-[0_0_15px_rgba(239,68,68,1)]"></div>
                    {/* Corners */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-500"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-500"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-500"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-500"></div>
                 </div>
                 
                 {/* Helper Text */}
                 <div className="absolute bottom-4 text-white/70 text-xs bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                     {isEmbedded ? '将条码放入框内' : '将条码放入框内，自动识别'}
                 </div>
             </div>
         )}
      </div>

      <style>{`
        @keyframes scan-laser {
            0% { top: 10%; opacity: 0; }
            50% { opacity: 1; }
            100% { top: 90%; opacity: 0; }
        }
        .animate-scan-laser {
            animation: scan-laser 1.5s linear infinite;
        }
        #reader video {
            object-fit: cover;
        }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;
