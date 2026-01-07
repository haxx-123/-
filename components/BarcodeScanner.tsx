
import React, { useEffect, useRef, useState } from 'react';
import { X, Zap, ZapOff, CheckCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
  continuous?: boolean; // If true, doesn't close after scan
  embedded?: boolean;   // If true, adapts to parent container instead of full screen fixed
}

declare global {
  interface Window {
    Html5Qrcode: any;
    Html5QrcodeSupportedFormats: any;
  }
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose, continuous = false, embedded = false }) => {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [showFlash, setShowFlash] = useState(false);
  const lastScanTime = useRef<number>(0);

  useEffect(() => {
    if (!window.Html5Qrcode) {
        setError('扫描组件加载失败，请检查网络连接。');
        return;
    }

    const startScanner = async () => {
        try {
            // 1. Initialize with Native Acceleration if supported (Critical for Android performance)
            // @ts-ignore
            const html5QrCode = new window.Html5Qrcode("reader", { 
                experimentalFeatures: { useBarCodeDetectorIfSupported: true },
                verbose: false
            });
            scannerRef.current = html5QrCode;

            // 2. Optimized Config
            const config = { 
                fps: 20, // 20-30 FPS is sweet spot
                qrbox: { width: 280, height: 180 }, // Rectangular box for barcodes
                aspectRatio: 1.0,
                // 3. Strict Formats (Reduce CPU load)
                formatsToSupport: [ 
                    window.Html5QrcodeSupportedFormats.EAN_13,
                    window.Html5QrcodeSupportedFormats.CODE_128,
                    window.Html5QrcodeSupportedFormats.QR_CODE
                ],
                // 4. Video Constraints (720p is best balance)
                videoConstraints: {
                    width: { min: 640, ideal: 1280, max: 1280 },
                    height: { min: 480, ideal: 720, max: 720 },
                    // @ts-ignore - non-standard but widely supported
                    focusMode: "continuous" 
                }
            };
            
            // 5. Camera ID or Config
            const cameraConfig = { facingMode: "environment" };

            await html5QrCode.start(
                cameraConfig, 
                config,
                (decodedText: string) => {
                    const now = Date.now();
                    // Prevent duplicate scans within 1.5 seconds
                    if (decodedText === lastScanned && now - lastScanTime.current < 1500) {
                        return;
                    }
                    
                    lastScanTime.current = now;
                    setLastScanned(decodedText);

                    // Success Feedback
                    // A. Sound
                    const audio = new Audio('https://freetestdata.com/wp-content/uploads/2021/09/Free_Test_Data_1MB_MP3.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(() => {}); // Catch error if user interaction policy blocks it
                    
                    // B. Visual Flash
                    setShowFlash(true);
                    setTimeout(() => setShowFlash(false), 300);

                    // C. Callback
                    onScan(decodedText);

                    if (!continuous) {
                        html5QrCode.stop().then(() => {
                            try { html5QrCode.clear(); } catch(e) {}
                            onClose(); 
                        });
                    }
                },
                (errorMessage: string) => {
                    // ignore scan error to avoid log spam
                }
            );

            // Check for Torch capability after start
            setTimeout(() => {
                try {
                   // Access the running track to check capabilities
                   // Note: Internal API access pattern for html5-qrcode
                   const videoElement = document.querySelector('#reader video') as HTMLVideoElement;
                   if (videoElement && videoElement.srcObject) {
                       const stream = videoElement.srcObject as MediaStream;
                       const track = stream.getVideoTracks()[0];
                       const capabilities = track.getCapabilities() as any;
                       if (capabilities.torch) {
                           setHasTorch(true);
                       }
                   }
                } catch (e) { console.warn("Torch check warning", e); }
            }, 1000);

        } catch (err) {
            console.error("Scanner Error", err);
            setError("无法启动摄像头，请确保授予权限或使用 HTTPS。");
        }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(startScanner, 100);

    return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch((err: any) => console.warn(err));
                }
                scannerRef.current.clear().catch((err: any) => console.warn("Scanner clear error:", err));
            } catch (e) {
                console.warn("Scanner cleanup warning", e);
            }
        }
    };
  }, []);

  const toggleTorch = async () => {
      try {
          const videoElement = document.querySelector('#reader video') as HTMLVideoElement;
          if (videoElement && videoElement.srcObject) {
              const stream = videoElement.srcObject as MediaStream;
              const track = stream.getVideoTracks()[0];
              await track.applyConstraints({
                  advanced: [{ torch: !torchOn } as any]
              });
              setTorchOn(!torchOn);
          }
      } catch (err) {
          console.error("Torch toggle failed", err);
      }
  };

  // Styles based on mode
  const containerClass = embedded 
    ? "w-full h-full relative bg-black overflow-hidden" 
    : "fixed inset-0 z-[200] bg-black flex flex-col justify-center items-center";

  const videoContainerClass = embedded
    ? "w-full h-full"
    : "w-full max-w-md aspect-[3/4] relative bg-black overflow-hidden rounded-xl";

  return (
    <div className={containerClass}>
      {/* Header (Only for full screen mode) */}
      {!embedded && (
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
            <button onClick={onClose} className="p-2 bg-black/30 rounded-full text-white backdrop-blur-md">
            <X className="w-6 h-6" />
            </button>
            <h3 className="text-white font-medium tracking-wide">扫描条形码/二维码</h3>
            <div className="w-10"></div>
        </div>
      )}

      <div className={videoContainerClass}>
         <div id="reader" className="w-full h-full bg-black"></div>
         
         {/* Success Flash Overlay */}
         <div className={`absolute inset-0 border-[6px] border-green-500 transition-opacity duration-300 pointer-events-none z-20 ${showFlash ? 'opacity-100' : 'opacity-0'}`}></div>

         {error && (
             <div className="absolute inset-0 flex items-center justify-center bg-black text-white p-6 text-center z-30">
                 <p className="text-red-400">{error}</p>
             </div>
         )}
         
         {!error && (
             <>
                {/* Custom Scan UI Layer */}
                <div className="absolute inset-0 pointer-events-none z-10">
                    {/* Dark Mask */}
                    <div className="absolute inset-0 bg-black/40">
                        {/* Cutout for Rectangular Barcode Scanner */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[20%] bg-transparent border-2 border-green-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] rounded-lg">
                            {/* Scanning Line */}
                            <div className="absolute left-2 right-2 h-0.5 bg-red-500 top-1/2 animate-scan-laser shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                            {/* Corners */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-500 -mt-1 -ml-1"></div>
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-500 -mt-1 -mr-1"></div>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-500 -mb-1 -ml-1"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-500 -mb-1 -mr-1"></div>
                        </div>
                    </div>
                </div>

                {/* Torch Button */}
                {hasTorch && (
                    <button 
                        onClick={toggleTorch} 
                        className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 p-3 rounded-full transition-all ${torchOn ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-white/20 text-white backdrop-blur-md hover:bg-white/30'}`}
                    >
                        {torchOn ? <ZapOff className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                    </button>
                )}
             </>
         )}
      </div>
      
      {!embedded && (
        <p className="text-white/80 text-sm mt-6 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md">
            将条码放入框内，自动连续扫描
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
        /* Ensure video fills container without weird gaps */
        #reader video {
            object-fit: cover !important;
            width: 100% !important;
            height: 100% !important;
            border-radius: 0 !important;
        }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;
