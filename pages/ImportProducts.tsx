import React, { useState, useRef } from 'react';
import { Upload, Camera, FileSpreadsheet, Edit, X, ArrowRight, Image as ImageIcon, Trash2 } from 'lucide-react';
import FaceID from '../components/FaceID'; 

// --- Column Mapping Modal ---
const ColumnMappingModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
         <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
               <FileSpreadsheet className="w-5 h-5 text-green-500" /> Excel 导入 - 列映射
            </h3>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
         </div>
         <div className="p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900">
            <p className="text-sm text-gray-500 mb-4">请确认 Excel 列与系统字段的对应关系 (红色为必填项)</p>
            <div className="grid grid-cols-1 gap-3">
               {['商品名称', '规格型号', '单位 (整)', '数量 (整)', '单位 (散)', '数量 (散)', '批号', '有效期', '备注'].map((field, idx) => (
                 <div key={field} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <span className={`${['商品名称','数量 (整)'].includes(field) ? 'text-red-500 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>{field}</span>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                    <select className="w-48 p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 text-sm">
                       <option>自动识别: 列 {String.fromCharCode(65+idx)}</option>
                       <option>Column A</option>
                       <option>Column B</option>
                       <option>Ignore</option>
                    </select>
                 </div>
               ))}
            </div>
         </div>
         <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3">
             <button onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 font-medium">取消</button>
             <button onClick={() => { alert('导入成功'); onClose(); }} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20">开始导入</button>
         </div>
      </div>
    </div>
  );
};

const ImportProducts = () => {
  const [activeTab, setActiveTab] = useState<'excel' | 'manual'>('excel');
  const [showCamera, setShowCamera] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = () => {
    // Mock capture result
    setProductImage("https://placehold.co/300x300?text=Scanned+Product");
    setShowCamera(false);
  };

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                // Compress to JPEG 0.7 quality
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const compressedBase64 = await compressImage(file);
              // In a real app, you would upload `compressedBase64` to Supabase Storage here and get a Public URL.
              // For now, we display the base64 directly to simulate the preview.
              setProductImage(compressedBase64);
          } catch (err) {
              console.error("Compression failed", err);
              alert("图片处理失败");
          }
      }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {showMappingModal && <ColumnMappingModal onClose={() => setShowMappingModal(false)} />}
      
      <h2 className="text-2xl font-bold dark:text-white">导入商品</h2>

      <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-xl w-fit">
         <button 
           onClick={() => setActiveTab('excel')}
           className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'excel' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-gray-500'}`}
         >
           Excel 批量导入
         </button>
         <button 
           onClick={() => setActiveTab('manual')}
           className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'manual' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-gray-500'}`}
         >
           手动录入 / 扫码
         </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
         {activeTab === 'excel' && (
           <div className="space-y-6">
              <div 
                onClick={() => setShowMappingModal(true)}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-10 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
              >
                 <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-full mb-4 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-12 h-12 text-green-500" />
                 </div>
                 <p className="text-lg font-bold text-gray-700 dark:text-gray-200">点击上传 Excel 文件 (.xlsx, .xls)</p>
                 <p className="text-sm text-gray-400 mt-2">支持拖拽上传，自动识别表头</p>
              </div>
           </div>
         )}

         {activeTab === 'manual' && (
           <div className="max-w-2xl mx-auto space-y-6">
              {/* Image Upload Section */}
              <div className="flex flex-col items-center gap-4">
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                 />
                 <div className="w-full h-64 bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-600 relative group">
                    {productImage ? (
                      <>
                        <img src={productImage} alt="Scanned" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button onClick={() => setProductImage(null)} className="p-2 bg-red-500 text-white rounded-full"><Trash2 className="w-6 h-6"/></button>
                            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-blue-500 text-white rounded-full"><Edit className="w-6 h-6"/></button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-gray-400 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        点击上传或拍摄商品图片
                        <p className="text-xs mt-2 text-gray-500">(自动压缩至 200KB 以内)</p>
                      </div>
                    )}
                    <button 
                      onClick={() => setShowCamera(true)}
                      className="absolute bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-105 transition-all"
                      title="打开摄像头"
                    >
                      <Camera className="w-6 h-6" />
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="col-span-2">
                   <label className="block text-sm font-medium mb-1">商品名称</label>
                   <input 
                     type="text" 
                     className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none" 
                     placeholder="例如：阿莫西林胶囊"
                     onBlur={(e) => {
                         // Mock Duplicate Check Logic
                         if(e.target.value === "阿莫西林胶囊") {
                             if(confirm('系统检测到相似商品“阿莫西林胶囊”已存在 (相似度 100%)。\n是否直接为该商品新增批号？')) {
                                 // Logic to switch to Add Batch mode would go here
                                 alert('已切换至新增批号模式 (Mock)');
                             }
                         }
                     }}
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">批号</label>
                   <input type="text" className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none" placeholder="2023..." />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">有效期</label>
                   <input type="date" className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none" />
                 </div>
                 
                 {/* Units Split */}
                 <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-600 col-span-2 grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium mb-1 text-blue-600">整数量 (大单位)</label>
                        <div className="flex gap-2">
                            <input type="number" className="w-full p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 outline-none font-bold" placeholder="0" />
                            <input type="text" className="w-16 p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 text-center" placeholder="盒" defaultValue="盒"/>
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium mb-1 text-green-600">散数量 (小单位)</label>
                        <div className="flex gap-2">
                            <input type="number" className="w-full p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 outline-none font-bold" placeholder="0" />
                            <input type="text" className="w-16 p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 text-center" placeholder="粒" defaultValue="粒"/>
                        </div>
                     </div>
                 </div>

                 <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">备注</label>
                    <textarea className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none h-20" placeholder="填写商品备注..."></textarea>
                 </div>
              </div>

              <button className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 transform transition-transform active:scale-95">
                保存并入库
              </button>
           </div>
         )}
      </div>

      {showCamera && <FaceID onSuccess={handleCapture} onCancel={() => setShowCamera(false)} />}
    </div>
  );
};

export default ImportProducts;