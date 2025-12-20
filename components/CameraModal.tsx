import React, { useRef, useEffect, useState } from 'react';
import { X, Camera, RefreshCw, Check } from 'lucide-react';

interface CameraModalProps {
  onCapture: (base64Image: string) => void;
  onClose: () => void;
  title?: string;
}

const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose, title = "拍摄照片" }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('无法启动摄像头');
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        // Do not stop stream yet, allow retake
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      // 1. Stop camera immediately
      stopCamera();
      // 2. Pass data
      onCapture(capturedImage);
      // 3. Close modal (parent will unmount this, ensuring cleanup via useEffect as well)
      onClose();
    }
  };

  const handleClose = () => {
      stopCamera();
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-gray-900 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 flex justify-between items-center bg-gray-800 text-white">
          <h3 className="font-bold">{title}</h3>
          <button onClick={handleClose}><X className="w-6 h-6" /></button>
        </div>

        <div className="relative bg-black aspect-[3/4] flex items-center justify-center overflow-hidden">
          {error ? (
            <p className="text-red-500">{error}</p>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-6 bg-gray-800 flex justify-around items-center">
          {capturedImage ? (
            <>
              <button onClick={handleRetake} className="flex flex-col items-center text-white gap-1">
                <div className="p-3 rounded-full bg-gray-700 hover:bg-gray-600"><RefreshCw className="w-6 h-6"/></div>
                <span className="text-xs">重拍</span>
              </button>
              <button onClick={handleConfirm} className="flex flex-col items-center text-green-400 gap-1">
                <div className="p-4 rounded-full bg-white hover:bg-gray-100"><Check className="w-8 h-8 text-green-600"/></div>
                <span className="text-xs font-bold">使用照片</span>
              </button>
            </>
          ) : (
            <button onClick={takePhoto} className="p-1 rounded-full border-4 border-white/30">
               <div className="w-16 h-16 rounded-full bg-white hover:bg-gray-200 transition-colors"></div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraModal;