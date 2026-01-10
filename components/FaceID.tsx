
import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, AlertTriangle, UserX, Sun, ScanFace, Activity, Search } from 'lucide-react';

interface Candidate {
    id: string;
    username: string;
    descriptor: number[];
}

interface FaceIDProps {
  onSuccess: (result?: any) => void;
  onCancel: () => void;
  storedFaceData?: number[]; // For 1:1 Verify
  candidates?: Candidate[];  // For 1:N Identify
  mode?: 'register' | 'verify' | 'identify'; 
}

declare global {
  interface Window {
    faceapi: any;
  }
}

// 核心配置参数
const CONFIG = {
    // 强制统一输入尺寸，确保特征向量一致性
    DETECTOR_OPTS: { inputSize: 512, scoreThreshold: 0.5 },
    // 录入质量门禁
    REG_MIN_SCORE: 0.90, // 录入时要求极高置信度
    REG_MIN_BRIGHTNESS: 80, // 最低亮度 (0-255)
    REG_MIN_FACE_RATIO: 0.3, // 人脸占比 (BoxWidth / VideoWidth)
    REG_STABILITY_FRAMES: 5, // 连续合格帧数
    // 验证参数
    VERIFY_THRESHOLD: 0.6, // 欧氏距离阈值 (越小越相似，0.6是标准分界线)
};

const FaceID: React.FC<FaceIDProps> = ({ onSuccess, onCancel, storedFaceData, candidates, mode = 'verify' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 状态管理
  const [status, setStatus] = useState<'loading' | 'scanning' | 'detecting' | 'success' | 'error' | 'failed'>('loading');
  const [feedback, setFeedback] = useState<string>('初始化模型...');
  
  // 实时数据反馈
  const [debugInfo, setDebugInfo] = useState<{distance?: number, brightness?: number, score?: number, matchName?: string}>({});
  
  // 录入防抖累加器
  const stabilityCounter = useRef<number>(0);
  const bestDescriptorRef = useRef<{score: number, data: Float32Array} | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<any>(null);

  // Load Models
  useEffect(() => {
    const loadModels = async () => {
      try {
        if (!window.faceapi) {
            setFeedback("FaceAPI 库未加载");
            setStatus('error');
            return;
        }
        setFeedback("正在加载 AI 模型...");
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        
        startCamera();
      } catch (err) {
        console.error("Model Load Error", err);
        setFeedback("模型加载失败，请检查网络");
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
      // 任务三：优化摄像头配置 (720p + User Facing)
      const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
              width: { ideal: 1280 }, 
              height: { ideal: 720 },
              facingMode: 'user'
          } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStatus('scanning');
      if (mode === 'register') setFeedback('请正对屏幕，保持光线充足');
      else if (mode === 'identify') setFeedback('正在识别身份...');
      else setFeedback('正在验证身份...');
    } catch (err) {
      setStatus('error');
      setFeedback('无法访问摄像头，请检查权限');
    }
  };

  // 亮度检测辅助函数
  const checkBrightness = (ctx: CanvasRenderingContext2D, width: number, height: number): number => {
      // 采样中心区域 50x50 像素以提高性能
      const sampleSize = 50;
      const sx = (width - sampleSize) / 2;
      const sy = (height - sampleSize) / 2;
      
      try {
          const imageData = ctx.getImageData(sx, sy, sampleSize, sampleSize);
          const data = imageData.data;
          let r, g, b, avg;
          let colorSum = 0;
          
          for (let x = 0, len = data.length; x < len; x += 4) {
              r = data[x];
              g = data[x + 1];
              b = data[x + 2];
              avg = Math.floor((r + g + b) / 3);
              colorSum += avg;
          }
          return Math.floor(colorSum / (sampleSize * sampleSize));
      } catch (e) {
          return 0;
      }
  };

  const handleVideoPlay = () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const displaySize = { width: 320, height: 240 }; // 内部处理分辨率，保持流畅
      window.faceapi.matchDimensions(canvasRef.current, displaySize);

      // 任务二：强制统一模型配置 (录入和验证必须一致)
      const options = new window.faceapi.TinyFaceDetectorOptions(CONFIG.DETECTOR_OPTS);

      intervalRef.current = setInterval(async () => {
          if (!videoRef.current || !canvasRef.current) return;

          // 1. Detect Face
          const detection = await window.faceapi.detectSingleFace(videoRef.current, options)
            .withFaceLandmarks()
            .withFaceDescriptor();

          const ctx = canvasRef.current.getContext('2d');
          if (!ctx) return;

          // Clear previous draw
          ctx.clearRect(0, 0, displaySize.width, displaySize.height);

          // 2. Draw Video frame to canvas for brightness check (Hidden analysis)
          ctx.drawImage(videoRef.current, 0, 0, displaySize.width, displaySize.height);
          const currentBrightness = checkBrightness(ctx, displaySize.width, displaySize.height);
          
          // Clear again to draw landmarks cleanly
          ctx.clearRect(0, 0, displaySize.width, displaySize.height);

          if (detection) {
              const dims = window.faceapi.resizeResults(detection, displaySize);
              const box = dims.detection.box;
              const score = detection.detection.score;
              const faceRatio = box.width / displaySize.width;

              // Draw Box
              const drawBox = new window.faceapi.draw.DrawBox(box, { 
                  label: mode === 'register' ? `Q: ${(score*100).toFixed(0)}%` : (mode === 'identify' ? 'Identifying...' : 'Face'), 
                  boxColor: status === 'success' ? 'green' : 'blue' 
              });
              drawBox.draw(canvasRef.current);

              setDebugInfo(prev => ({ ...prev, brightness: currentBrightness, score: score }));

              // === 任务一：录入模式 - 严格质量控制 ===
              if (mode === 'register') {
                  // 1. 亮度检查
                  if (currentBrightness < CONFIG.REG_MIN_BRIGHTNESS) {
                      setFeedback("光线太暗，请在明亮处录入");
                      stabilityCounter.current = 0;
                      return;
                  }
                  // 2. 尺寸检查 (太远)
                  if (faceRatio < CONFIG.REG_MIN_FACE_RATIO) {
                      setFeedback("请靠近一点");
                      stabilityCounter.current = 0;
                      return;
                  }
                  // 3. 分数门禁
                  if (score < CONFIG.REG_MIN_SCORE) {
                      setFeedback("请保持头部静止，正对屏幕");
                      stabilityCounter.current = 0;
                      return;
                  }
                  // 4. 防抖与优选 (连续 N 帧合格)
                  stabilityCounter.current += 1;
                  setFeedback(`正在录入... ${stabilityCounter.current}/${CONFIG.REG_STABILITY_FRAMES}`);
                  
                  if (!bestDescriptorRef.current || score > bestDescriptorRef.current.score) {
                      bestDescriptorRef.current = { score, data: detection.descriptor };
                  }

                  if (stabilityCounter.current >= CONFIG.REG_STABILITY_FRAMES) {
                      stopCamera();
                      setStatus('success');
                      setFeedback("录入成功！");
                      const finalDescriptor = Array.from(bestDescriptorRef.current?.data || detection.descriptor) as number[];
                      onSuccess(finalDescriptor);
                  }
              } 
              // === 任务二：验证模式 (1:1) ===
              else if (mode === 'verify') {
                  if (!storedFaceData || storedFaceData.length === 0) {
                      stopCamera();
                      setStatus('error');
                      setFeedback('该账号未录入人脸数据');
                      return;
                  }
                  const storedDescriptor = new Float32Array(storedFaceData);
                  const distance = window.faceapi.euclideanDistance(detection.descriptor, storedDescriptor);
                  setDebugInfo(prev => ({ ...prev, distance }));

                  if (distance < CONFIG.VERIFY_THRESHOLD) {
                      stopCamera();
                      setStatus('success');
                      setFeedback("验证通过");
                      setTimeout(() => onSuccess(), 800);
                  } else {
                      if (distance > 0.8) setFeedback("不是同一个人");
                      else setFeedback("请调整角度或靠近一点");
                  }
              }
              // === 新增：识别模式 (1:N) ===
              else if (mode === 'identify') {
                  if (!candidates || candidates.length === 0) {
                      setStatus('error');
                      setFeedback('无可用的人脸库数据');
                      return;
                  }

                  let bestMatch = { distance: 1.0, id: '', username: '' };
                  
                  // Simple Linear Search
                  for (const candidate of candidates) {
                      const stored = new Float32Array(candidate.descriptor);
                      const dist = window.faceapi.euclideanDistance(detection.descriptor, stored);
                      if (dist < bestMatch.distance) {
                          bestMatch = { distance: dist, id: candidate.id, username: candidate.username };
                      }
                  }

                  setDebugInfo(prev => ({ ...prev, distance: bestMatch.distance, matchName: bestMatch.username }));

                  if (bestMatch.distance < CONFIG.VERIFY_THRESHOLD) {
                      stopCamera();
                      setStatus('success');
                      setFeedback(`欢迎回来，${bestMatch.username}`);
                      setTimeout(() => onSuccess(bestMatch.id), 800);
                  } else {
                      setFeedback("未匹配到用户，请靠近或调整角度");
                  }
              }
          } else {
              setFeedback(mode === 'register' ? "未检测到人脸" : "寻找人脸中...");
              stabilityCounter.current = 0;
              setDebugInfo({});
          }
      }, 500); // Check every 500ms
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-95 animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col items-center">
        <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white flex items-center gap-2">
            {mode === 'register' ? <ScanFace className="w-6 h-6 text-blue-500"/> : 
             mode === 'identify' ? <Search className="w-6 h-6 text-green-500"/> : <UserX className="w-6 h-6 text-purple-500"/>}
            {mode === 'register' ? '人脸数据录入' : mode === 'identify' ? '刷脸识别登录' : '人脸安全验证'}
        </h3>
        
        {/* Debug Info Strip */}
        <div className="w-full flex justify-between text-[10px] text-gray-400 mb-2 font-mono bg-gray-100 dark:bg-gray-900 p-1 rounded">
            <span>亮度: {debugInfo.brightness || 0} (需&gt;{CONFIG.REG_MIN_BRIGHTNESS})</span>
            {mode !== 'register' && <span>距离: {debugInfo.distance?.toFixed(2) || '-'} (需&lt;{CONFIG.VERIFY_THRESHOLD})</span>}
            {mode === 'register' && <span>质量: {((debugInfo.score || 0)*100).toFixed(0)}% (需&gt;90%)</span>}
        </div>

        <div className="relative w-full max-w-[320px] aspect-[4/3] rounded-2xl overflow-hidden border-4 border-gray-200 dark:border-gray-600 mb-4 bg-black">
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
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white flex-col gap-2">
                  <Activity className="w-8 h-8 animate-spin"/>
                  <span className="text-xs">加载 AI 模型中...</span>
              </div>
          )}

          {status === 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500 bg-opacity-20 backdrop-blur-sm">
              <CheckCircle className="w-20 h-20 text-green-500 drop-shadow-lg" />
              <p className="text-white font-bold mt-2 shadow-black drop-shadow-md">验证成功</p>
            </div>
          )}
        </div>

        {/* Feedback Text */}
        <p className={`mb-4 text-center font-bold ${status === 'error' ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
            {feedback}
        </p>

        {/* Progress Bar for Registration */}
        {mode === 'register' && status === 'scanning' && stabilityCounter.current > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-4 overflow-hidden">
                <div 
                    className="bg-green-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${(stabilityCounter.current / CONFIG.REG_STABILITY_FRAMES) * 100}%` }}
                ></div>
            </div>
        )}

        <button 
          onClick={onCancel}
          className="px-8 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
        >
          取消 / 返回
        </button>
      </div>
    </div>
  );
};

export default FaceID;
