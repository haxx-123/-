
import React, { useEffect, useRef, useState } from 'react';
import { X, Zap, ZapOff } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    Html5Qrcode: any;
    Html5QrcodeSupportedFormats: any;
  }
}

// Simple Beep Sound (Base64) to avoid remote URL
const BEEP_AUDIO = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU..."; 

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!window.Html5Qrcode) {
        setError('扫描组件加载失败，请检查网络连接。');
        return;
    }

    const startScanner = async () => {
        try {
            const html5QrCode = new window.Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            const config = { fps: 15, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
            
            await html5QrCode.start(
                { facingMode: "environment" }, 
                config,
                (decodedText: string) => {
                    // Success callback
                    // 1. Play local beep
                    try {
                        // Creating context on the fly for simple beep or use HTMLAudioElement with base64
                        // Using a simple oscillator is cleaner and purely local code
                        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                        if (AudioContext) {
                            const ctx = new AudioContext();
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.connect(gain);
                            gain.connect(ctx.destination);
                            osc.frequency.value = 1500;
                            gain.gain.value = 0.1;
                            osc.start();
                            setTimeout(() => osc.stop(), 100);
                        }
                    } catch (e) {
                        // Ignore audio error
                    }
                    
                    // 2. Stop immediately
                    html5QrCode.stop().then(() => {
                        html5QrCode.clear();
                        // 3. Callback to parent
                        onScan(decodedText);
                    }).catch((err: any) => {
                        console.warn("Stop failed", err);
                        onScan(decodedText); // Still return result
                    });
                },
                (errorMessage: string) => {
                    // ignore scan error
                }
            );
        } catch (err) {
            console.error("Scanner Error", err);
            setError("无法启动摄像头，请确保授予权限。");
        }
    };

    setTimeout(startScanner, 100);

    return () => {
        if (scannerRef.current) {
            if (scannerRef.current.isScanning) {
                scannerRef.current.stop().catch((err: any) => console.warn(err));
            }
            scannerRef.current.clear().catch((err: any) => console.warn(err));
        }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[80] bg-black flex flex-col justify-center items-center">
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onClose} className="p-2 bg-black/30 rounded-full text-white backdrop-blur-md">
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-white font-medium tracking-wide">扫描条形码/二维码</h3>
        <div className="w-10"></div>
      </div>

      <div className="w-full max-w-md aspect-[3/4] relative bg-black overflow-hidden rounded-xl">
         <div id="reader" className="w-full h-full"></div>
         {error && (
             <div className="absolute inset-0 flex items-center justify-center bg-black text-white p-6 text-center">
                 <p className="text-red-400">{error}</p>
             </div>
         )}
         {!error && (
             <div className="absolute inset-0 pointer-events-none border-[50px] border-black/50">
                 <div className="w-full h-full border-2 border-green-500 relative">
                     <div className="absolute left-0 right-0 h-0.5 bg-red-500 top-1/2 animate-scan-laser shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                 </div>
             </div>
         )}
      </div>
      <p className="text-white/80 text-sm mt-6 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md">
          将条码/二维码放入框内，自动扫描
      </p>
      <style>{`
        @keyframes scan-laser {
            0% { top: 10%; opacity: 0; }
            20% { opacity: 1; }
            50% { top: 90%; }
            80% { opacity: 1; }
            100% { top: 10%; opacity: 0; }
        }
        .animate-scan-laser {
            animation: scan-laser 2s linear infinite;
        }
        #reader video {
            object-fit: cover;
            border-radius: 12px;
        }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;
