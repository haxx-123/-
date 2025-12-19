import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, AlertTriangle } from 'lucide-react';

interface FaceIDProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const FaceID: React.FC<FaceIDProps> = ({ onSuccess, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'scanning' | 'detecting' | 'success' | 'error'>('scanning');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // Simulate detection delay
        setTimeout(() => {
          setStatus('detecting');
          // Simulate verification success after another delay
          setTimeout(() => {
            setStatus('success');
            setTimeout(onSuccess, 1000);
          }, 1500);
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
  }, [onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="relative w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col items-center">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">人脸识别安全登录</h3>
        
        <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-600 mb-6">
          {status !== 'error' ? (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transform scale-x-[-1] ${status === 'success' ? 'opacity-50' : ''}`}
            />
          ) : (
             <div className="w-full h-full flex items-center justify-center bg-gray-900">
               <AlertTriangle className="w-12 h-12 text-red-500" />
             </div>
          )}
          
          {/* Scanning Overlay */}
          {status === 'scanning' && (
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-pulse opacity-50"></div>
          )}
          
          {status === 'detecting' && (
             <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-full h-1 bg-green-500 absolute top-1/2 animate-ping"></div>
               <p className="text-green-400 font-bold bg-black bg-opacity-50 px-2 rounded mt-20">正在验证...</p>
             </div>
          )}

          {status === 'success' && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-20">
              <CheckCircle className="w-20 h-20 text-green-500" />
            </div>
          )}
        </div>

        {errorMsg && <p className="text-red-500 mb-4">{errorMsg}</p>}
        {status === 'scanning' && <p className="text-gray-500 dark:text-gray-400 mb-4">请正对摄像头...</p>}

        <button 
          onClick={onCancel}
          className="px-6 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
};

export default FaceID;