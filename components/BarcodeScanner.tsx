import React, { useEffect, useRef, useState } from 'react';
import { X, Zap, ZapOff } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: 'environment', // Use back camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Check for flash capability
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any; // Cast to any for non-standard torch
        if (capabilities.torch) {
          setHasFlash(true);
        }

        // Simulate scanning delay and success
        const scanTimer = setTimeout(() => {
            // Mock a successful scan
            const mockBarcode = "2024" + Math.floor(Math.random() * 10000000).toString();
            // Play a beep sound
            const audio = new Audio('https://freetestdata.com/wp-content/uploads/2021/09/Free_Test_Data_1MB_MP3.mp3'); // Use a short beep in real prod
            audio.volume = 0.5;
            audio.play().catch(() => {}); // Ignore play errors
            
            onScan(mockBarcode);
        }, 2500); // 2.5 seconds to simulate scanning

        return () => clearTimeout(scanTimer);

      } catch (err) {
        console.error("Camera Error:", err);
        setError('无法访问摄像头，请检查权限或设备。');
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan]);

  const toggleFlash = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      track.applyConstraints({
        advanced: [{ torch: !flashOn } as any]
      });
      setFlashOn(!flashOn);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onClose} className="p-2 bg-black/30 rounded-full text-white backdrop-blur-md">
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-white font-medium tracking-wide">扫描条形码/二维码</h3>
        <button 
            onClick={toggleFlash} 
            disabled={!hasFlash}
            className={`p-2 rounded-full backdrop-blur-md ${flashOn ? 'bg-yellow-400 text-black' : 'bg-black/30 text-white'} ${!hasFlash && 'opacity-0'}`}
        >
          {flashOn ? <ZapOff className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
        {!error ? (
            <>
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="absolute inset-0 w-full h-full object-cover"
                />
                
                {/* Scanning Frame */}
                <div className="relative w-72 h-48 border-2 border-white/50 rounded-lg overflow-hidden box-content shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                    {/* Corners */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-green-500 rounded-tl-sm"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-green-500 rounded-tr-sm"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-green-500 rounded-bl-sm"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-green-500 rounded-br-sm"></div>
                    
                    {/* Laser Line Animation */}
                    <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-scan-laser top-1/2"></div>
                </div>
                
                <p className="absolute bottom-20 text-white/80 text-sm bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                    将条码/二维码放入框内，自动扫描
                </p>
            </>
        ) : (
            <div className="text-white text-center p-6">
                <p className="mb-4 text-red-400">{error}</p>
                <button onClick={onClose} className="px-6 py-2 bg-white text-black rounded-lg font-bold">关闭</button>
            </div>
        )}
      </div>
      
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
      `}</style>
    </div>
  );
};

export default BarcodeScanner;