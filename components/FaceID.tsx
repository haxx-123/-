
import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, AlertTriangle, UserX } from 'lucide-react';

interface FaceIDProps {
  onSuccess: (descriptor?: number[]) => void;
  onCancel: () => void;
  storedFaceData?: number[]; // Expecting float array descriptor, not base64 image
  mode?: 'register' | 'verify'; // Registration or Verification
}

declare global {
  interface Window {
    faceapi: any;
  }
}

const FaceID: React.FC<FaceIDProps> = ({ onSuccess, onCancel, storedFaceData, mode = 'verify' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'scanning' | 'detecting' | 'success' | 'error' | 'failed'>('loading');
  const [similarity, setSimilarity] = useState(0);
  const [errorMsg, setErrorMsg] = useState('正在加载 AI 模型...');
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<any>(null);

  // Load Models
  useEffect(() => {
    const loadModels = async () => {
      try {
        if (!window.faceapi) {
            setErrorMsg("FaceAPI 库未加载，请检查网络");
            setStatus('error');
            return;
        }
        
        // 31.2. Ensure model files are placed in public/models
        // Using local path instead of remote URL
        const MODEL_URL = '/models'; 
        
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        
        startCamera();
      } catch (err) {
        console.error("Model Load Error", err);
        setErrorMsg("模型加载失败，请确保 /public/models 目录下包含模型文件");
        setStatus('error');
      }
    };
    loadModels();

    return () => stopCamera();
  }, []);

  const stopCamera = () => {
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStatus('scanning');
    } catch (err) {
      setStatus('error');
      setErrorMsg('无法访问摄像头，请检查权限。');
    }
  };

  const handleVideoPlay = () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const displaySize = { width: videoRef.current.width || 320, height: videoRef.current.height || 240 };
      window.faceapi.matchDimensions(canvasRef.current, displaySize);

      intervalRef.current = setInterval(async () => {
          if (!videoRef.current) return;

          // Detect Face
          const detection = await window.faceapi.detectSingleFace(videoRef.current, new window.faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
              const dims = window.faceapi.resizeResults(detection, displaySize);
              const ctx = canvasRef.current?.getContext('2d');
              if (ctx) {
                  ctx.clearRect(0, 0, displaySize.width, displaySize.height);
                  // Draw Box
                  const box = dims.detection.box;
                  const drawBox = new window.faceapi.draw.DrawBox(box, { label: 'Face Detected', boxColor: status === 'success' ? 'green' : 'blue' });
                  drawBox.draw(canvasRef.current);
              }

              // Logic based on mode
              if (mode === 'register') {
                  // Quality check: Ensure high confidence
                  if (detection.detection.score > 0.8) {
                      stopCamera();
                      setStatus('success');
                      // Convert Float32Array to standard array for JSON storage
                      onSuccess(Array.from(detection.descriptor)); 
                  }
              } else if (mode === 'verify') {
                  if (!storedFaceData || storedFaceData.length === 0) {
                      stopCamera();
                      setStatus('error');
                      setErrorMsg('该账号未录入人脸数据');
                      return;
                  }

                  // Compare
                  const distance = window.faceapi.euclideanDistance(detection.descriptor, storedFaceData);
                  // Distance < 0.45 is usually a good threshold for verification
                  const calculatedSim = Math.max(0, 100 - (distance * 100)); // Rough visual percentage
                  setSimilarity(Math.round(calculatedSim));

                  if (distance < 0.45) {
                      stopCamera();
                      setStatus('success');
                      setTimeout(() => onSuccess(), 800);
                  } else {
                      // Keep scanning but show visual feedback?
                      // We don't fail immediately, we let user try to adjust
                  }
              }
          } else {
              const ctx = canvasRef.current?.getContext('2d');
              if (ctx) ctx.clearRect(0, 0, displaySize.width, displaySize.height);
          }
      }, 500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-95">
      <div className="relative w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col items-center">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
            {mode === 'register' ? '人脸数据录入' : '人脸安全验证'}
        </h3>
        
        <div className="relative w-full max-w-[320px] aspect-[4/3] rounded-2xl overflow-hidden border-4 border-gray-200 dark:border-gray-600 mb-6 bg-black">
          {status !== 'error' && status !== 'failed' && (
            <>
                <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                onPlay={handleVideoPlay}
                width={320}
                height={240}
                className={`w-full h-full object-cover transform scale-x-[-1] ${status === 'success' ? 'opacity-50' : ''}`}
                />
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full transform scale-x-[-1]" />
            </>
          )}
          
          {status === 'error' && (
             <div className="w-full h-full flex items-center justify-center bg-gray-900">
               <AlertTriangle className="w-12 h-12 text-red-500" />
             </div>
          )}

          {/* Overlays */}
          {status === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                  加载模型中...
              </div>
          )}

          {status === 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500 bg-opacity-20 backdrop-blur-sm">
              <CheckCircle className="w-20 h-20 text-green-500 drop-shadow-lg" />
              <p className="text-white font-bold mt-2 shadow-black drop-shadow-md">验证通过</p>
            </div>
          )}
        </div>

        {errorMsg && status === 'error' && <p className="text-red-500 mb-4 text-center">{errorMsg}</p>}
        {status === 'scanning' && <p className="text-gray-500 dark:text-gray-400 mb-4 text-center">请正对摄像头<br/>保持光线充足，不要遮挡面部</p>}
        
        {mode === 'verify' && status === 'scanning' && similarity > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-4">
                <div className={`bg-blue-600 h-2.5 rounded-full transition-all duration-300`} style={{ width: `${similarity}%` }}></div>
            </div>
        )}

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
