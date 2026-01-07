
import React, { useEffect, useRef, useState } from 'react';
import { X, Zap, ZapOff, Loader2 } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
  mode?: 'modal' | 'embedded'; // Embedded for POS mode
  className?: string;
}

declare global {
  interface Window {
    Html5Qrcode: any;
    Html5QrcodeSupportedFormats: any;
  }
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose, mode = 'modal', className = '' }) => {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const playBeep = () => {
      const audio = new Audio('https://freetestdata.com/wp-content/uploads/2021/09/Free_Test_Data_1MB_MP3.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
  };

  useEffect(() => {
    if (!window.Html5Qrcode) {
        setError('组件加载失败，请检查网络');
        return;
    }

    const html5QrCode = new window.Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
        try {
            // Critical Performance Config
            const config = { 
                fps: 20, // Higher FPS for smoother scanning
                qrbox: { width: 250, height: 250 }, 
                aspectRatio: 1.0,
                // Native Android Acceleration
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                },
                // Limit formats to reduce CPU load
                formatsToSupport: [ 
                    window.Html5QrcodeSupportedFormats.QR_CODE,
                    window.Html5QrcodeSupportedFormats.EAN_13,
                    window.Html5QrcodeSupportedFormats.CODE_128,
                    window.Html5QrcodeSupportedFormats.UPC_A
                ]
            };

            // Camera Constraints for Mobile Web
            const constraints = { 
                facingMode: "environment",
                focusMode: "continuous", // Try to force continuous focus
                width: { min: 640, ideal: 1280, max: 1280 }, // 720p ideal for web processing
                height: { min: 480, ideal: 720, max: 720 }
            };
            
            await html5QrCode.start(
                constraints, 
                config,
                (decodedText: string) => {
                    // Success
                    playBeep();
                    onScan(decodedText);
                    // If modal, we stop. If embedded (POS), we keep running.
                    if (mode === 'modal') {
                        html5QrCode.stop().then(() => {
                             html5QrCode.clear();
                        }).catch((e: any) => console.warn(e));
                    }
                },
                (errorMessage: string) => {
                    // Ignore scan errors, they happen every frame
                }
            );

            setLoading(false);

            // Check for Torch capability
            try {
                const capabilities = html5QrCode.getRunningTrackCameraCapabilities();
                if (capabilities && capabilities.torchFeature().isSupported()) {
                    setHasTorch(true);
                }
            } catch(e) {
                console.log("Torch check failed", e);
            }

        } catch (err: any) {
            console.error("Scanner Start Error", err);
            setError("无法启动摄像头: " + (err.message || "权限被拒绝"));
            setLoading(false);
        }
    };

    // Small delay to ensure DOM is ready
    setTimeout(startScanner, 100);

    return () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch((e: any) => console.warn(e));
                }
                scannerRef.current.clear().catch((e: any) => console.warn(e));
            } catch (e) { console.warn(e); }
        }
    };
  }, []); // Only run once on mount

  const toggleTorch = () => {
      if (scannerRef.current && hasTorch) {
          const target = !torchOn;
          scannerRef.current.applyVideoConstraints({
              advanced: [{ torch: target }]
          }).then(() => {
              setTorchOn(target);
          }).catch((err: any) => console.error("Torch toggle failed", err));
      }
  };

  const containerClass = mode === 'modal' 
      ? "fixed inset-0 z-[200] bg-black flex flex-col justify-center items-center" 
      : `relative w-full h-full bg-black overflow-hidden ${className}`;

  return (
    <div className={containerClass}>
      {mode === 'modal' && (
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
            <button onClick={onClose} className="p-2 bg-black/30 rounded-full text-white backdrop-blur-md">
            <X className="w-6 h-6" />
            </button>
            <h3 className="text-white font-medium tracking-wide">扫描条形码</h3>
            <div className="w-10"></div>
        </div>
      )}

      <div className={`relative ${mode === 'modal' ? 'w-full max-w-md aspect-[3/4] rounded-xl' : 'w-full h-full'}`}>
         {loading && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20">
                 <Loader2 className="w-8 h-8 animate-spin mb-2" />
                 <p className="text-sm">正在启动相机...</p>
             </div>
         )}
         
         <div id="reader" className="w-full h-full bg-black"></div>
         
         {/* Overlays */}
         {error && (
             <div className="absolute inset-0 flex items-center justify-center bg-black text-white p-6 text-center z-30">
                 <p className="text-red-400">{error}</p>
                 <button onClick={onClose} className="mt-4 px-4 py-2 bg-white/20 rounded-full">关闭</button>
             </div>
         )}

         {!error && !loading && (
             <>
                 {/* Torch Button */}
                 {hasTorch && (
                     <button 
                        onClick={toggleTorch} 
                        className="absolute bottom-4 right-4 z-30 p-3 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20"
                     >
                         {torchOn ? <Zap className="w-6 h-6 text-yellow-400 fill-current"/> : <ZapOff className="w-6 h-6"/>}
                     </button>
                 )}
                 
                 {/* Laser Animation */}
                 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                     <div className="w-[70%] h-[50%] border-2 border-green-500/50 rounded-lg relative overflow-hidden">
                         <div className="absolute left-0 right-0 h-0.5 bg-red-500 top-1/2 animate-scan-laser shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                     </div>
                 </div>
             </>
         )}
      </div>

      {mode === 'modal' && (
          <p className="text-white/80 text-sm mt-6 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md">
              对准条码/二维码即可自动识别
          </p>
      )}

      <style>{`
        @keyframes scan-laser {
            0% { top: 10%; opacity: 0; }
            20% { opacity: 1; }
            50% { top: 90%; }
            80% { opacity: 1; }
            100% { top: 10%; opacity: 0; }
        }
        .animate-scan-laser {
            animation: scan-laser 1.5s linear infinite;
        }
        #reader video {
            object-fit: cover;
            width: 100% !important;
            height: 100% !important;
        }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;
