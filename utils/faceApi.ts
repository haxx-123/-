
import * as faceapi from 'face-api.js';

// Export singleton instance to ensure all components use the same loaded models
export { faceapi };

// 强制使用本地 public/models 目录
const MODEL_URL = '/models';

export const loadModels = async () => {
  try {
    console.log(`[FaceAPI] 开始加载本地模型，路径: ${MODEL_URL}`);

    // 并行加载三个核心模型
    await Promise.all([
      // 1. 人脸检测 (Tiny 版)
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      // 2. 五官轮廓 (68点标准版)
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      // 3. 人脸识别 (特征向量)
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);

    console.log("[FaceAPI] ✅ 本地模型加载成功");
    return true;
  } catch (error) {
    console.error("[FaceAPI] ❌ 模型加载失败 (致命错误)", error);
    // 直接抛出错误，让 UI 层处理提示，绝不回退到 CDN
    throw new Error(`无法加载本地 AI 模型，请检查 public/models 目录是否完整。错误信息: ${error}`);
  }
};
