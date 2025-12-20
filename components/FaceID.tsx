import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, AlertTriangle, UserX } from 'lucide-react';

interface FaceIDProps {
  onSuccess: () => void;
  onCancel: () => void;
  storedFaceData?: string; // Optional: If provided, performs comparison
}

const FaceID: React.FC<FaceIDProps> = ({ onSuccess, onCancel, storedFaceData }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'scanning' | 'detecting' | 'success' | 'error' | 'failed'>('scanning');
  const [similarity, setSimilarity] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // Start "Detection" process
        setTimeout(() => {
          setStatus('detecting');
          
          // Capture Frame for "Analysis"
          if (videoRef.current && canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                  canvasRef.current.width = videoRef.current.videoWidth;
                  canvasRef.current.height = videoRef.current.videoHeight;
                  ctx.drawImage(videoRef.current, 0, 0);
                  // const currentFaceData = canvasRef.current.toDataURL('image/jpeg');
              }
          }

          // Simulation of Similarity Calculation
          // In a real app, this would send `currentFaceData` and `storedFaceData` to a backend/WASM model
          let calculatedSimilarity = 0;
          
          if (storedFaceData) {
              // Simulate calculation delay
              const interval = setInterval(() => {
                  setSimilarity(prev => {
                      if (prev >= 88) { // Simulate finding a match around 88-95%
                          clearInterval(interval);
                          return prev; 
                      }
                      return prev + Math.floor(Math.random() * 15);
                  });
              }, 100);

              setTimeout(() => {
                  clearInterval(interval);
                  // Final decision
                  if (Math.random() > 0.1) { // 90% chance of success for demo purposes, assume user is real
                      setSimilarity(92); // Force > 80%
                      setStatus('success');
                      // IMMEDIATE CLOSE
                      setTimeout(onSuccess, 500); 
                  } else {
                      setSimilarity(45);
                      setStatus('failed');
                  }
              }, 2000);

          } else {
              // No stored face data to compare against -> "Registration" mode or Error
              // If this component is used for login but no face is registered:
              setStatus('error');
              setErrorMsg('该账号未录入人脸数据，请使用密码登录。');
          }

        }, 1000);

      } catch (err) {
        setStatus('error');
        setErrorMsg('无法访问摄像头，请检查权限。');
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onSuccess, storedFaceData]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="relative w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col items-center">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
            {storedFaceData ? '人脸安全验证' : '人脸录入中...'}
        </h3>
        
        <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-600 mb-6 bg-black">
          {status !== 'error' && status !== 'failed' ? (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transform scale-x-[-1] ${status === 'success' ? 'opacity-50' : ''}`}
            />
          ) : (
             <div className="w-full h-full flex items-center justify-center bg-gray-900">
               {status === 'failed' ? <UserX className="w-12 h-12 text-red-500"/> : <AlertTriangle className="w-12 h-12 text-red-500" />}
             </div>
          )}
          
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlays */}
          {status === 'scanning' && (
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-pulse opacity-50"></div>
          )}
          
          {status === 'detecting' && (
             <div className="absolute inset-0 flex flex-col items-center justify-center">
               <div className="absolute inset-0 border-4 border-green-400 rounded-full animate-ping opacity-30"></div>
               <div className="w-full h-0.5 bg-green-500 absolute top-1/2 animate-scan-laser shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
               <div className="mt-32 px-3 py-1 bg-black/60 rounded-full backdrop-blur-md">
                   <p className="text-green-400 font-bold text-sm">
                       相似度: {similarity}%
                   </p>
               </div>
             </div>
          )}

          {status === 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500 bg-opacity-20 backdrop-blur-sm">
              <CheckCircle className="w-20 h-20 text-green-500 drop-shadow-lg" />
              <p className="text-white font-bold mt-2 shadow-black drop-shadow-md">验证通过 (92%)</p>
            </div>
          )}

          {status === 'failed' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500 bg-opacity-20 backdrop-blur-sm">
              <p className="text-white font-bold mt-2">验证失败</p>
              <p className="text-white text-xs">相似度过低 ({similarity}%)</p>
            </div>
          )}
        </div>

        {errorMsg && <p className="text-red-500 mb-4 text-center">{errorMsg}</p>}
        {status === 'scanning' && <p className="text-gray-500 dark:text-gray-400 mb-4">请正对摄像头，保持光线充足...</p>}

        <button 
          onClick={onCancel}
          className="px-6 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          取消
        </button>
      </div>
      <style>{`
        @keyframes scan-laser {
            0% { top: 10%; opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { top: 90%; opacity: 0; }
        }
        .animate-scan-laser {
            animation: scan-laser 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default FaceID;