import React, { useState, useRef } from 'react';
import { Upload, Camera, FileSpreadsheet, Edit, X, ArrowRight, Image as ImageIcon, Trash2, ScanLine, AlertTriangle } from 'lucide-react';
import CameraModal from '../components/CameraModal';
import BarcodeScanner from '../components/BarcodeScanner';
import * as XLSX from 'xlsx';
import { useApp } from '../App';
import { Product, Batch, RoleLevel, LogAction } from '../types';

// --- Column Mapping Modal ---
const ColumnMappingModal = ({ file, onClose }: { file: File; onClose: () => void }) => {
  const { setProducts, setLogs, user, currentStore } = useApp();
  
  const handleImport = async () => {
      if (currentStore.isParent) {
          alert('错误：母门店（总店）无法直接导入商品库存。\n请切换至具体的子门店进行操作。');
          return;
      }

      try {
          const reader = new FileReader();
          
          reader.onload = (e) => {
              try {
                  const data = e.target?.result;
                  const workbook = XLSX.read(data, { type: 'binary' });
                  const sheetName = workbook.SheetNames[0];
                  const sheet = workbook.Sheets[sheetName];
                  const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

                  if (!jsonData || jsonData.length === 0) {
                      alert('Excel 文件为空或格式错误');
                      return;
                  }

                  const newProducts: Product[] = jsonData.map((row, idx) => {
                      const name = row['商品名称'] || row['Name'] || `未知商品_${idx}`;
                      const sku = row['SKU'] || row['Code'] || `SKU-${Date.now()}-${idx}`;
                      
                      const batch: Batch = {
                          id: `b_imp_${Date.now()}_${idx}`,
                          batchNumber: row['批号'] || row['Batch'] || `BATCH-${new Date().getFullYear()}`,
                          expiryDate: row['有效期'] || '2099-12-31',
                          quantityBig: Number(row['数量 (整)']) || Number(row['整数量']) || 0,
                          quantitySmall: Number(row['数量 (散)']) || Number(row['散数量']) || 0,
                          unitBig: row['单位 (整)'] || row['整单位'] || '整',
                          unitSmall: row['单位 (散)'] || row['散单位'] || '散',
                          conversionRate: Number(row['换算率']) || 1,
                          price: 0,
                          notes: row['备注'] || row['Notes'] || ''
                      };

                      return {
                          id: `p_imp_${Date.now()}_${idx}`,
                          storeId: currentStore.id,
                          name: name,
                          category: row['分类'] || '未分类',
                          sku: sku,
                          batches: [batch],
                          image_url: 'https://placehold.co/100x100?text=Imported',
                          notes: row['商品备注'] || '' 
                      };
                  });

                  setProducts(prev => [...prev, ...newProducts]);
                  
                  // Log with Full Snapshot for Rollback
                  setLogs(prev => [{
                    id: `log_imp_${Date.now()}`,
                    action_type: LogAction.BATCH_IMPORT,
                    target_id: 'BATCH_IMPORT',
                    target_name: `批量导入 ${newProducts.length} 个商品`,
                    change_desc: `Excel 批量导入: ${file.name} 到 ${currentStore.name}`,
                    operator_id: user?.id || 'unknown',
                    operator_name: user?.username || 'Unknown',
                    created_at: new Date().toISOString(),
                    is_revoked: false,
                    // Save list of created IDs for rollback
                    snapshot_data: { 
                        productIds: newProducts.map(p => p.id),
                        importCount: newProducts.length 
                    },
                    role_level: user?.role || RoleLevel.STAFF
                  }, ...prev]);

                  alert(`成功导入 ${newProducts.length} 条商品数据到 ${currentStore.name}！`);
                  onClose();
              } catch (parseError) {
                  console.error("Excel Parsing Error:", parseError);
                  alert('解析 Excel 内容失败，请检查文件格式。');
              }
          };

          reader.onerror = () => {
              alert('读取文件失败，请重试。');
          };

          reader.readAsBinaryString(file);

      } catch (error) {
          console.error("Import Error", error);
          alert('导入流程发生未知错误。');
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
         {/* ... (UI unchanged) ... */}
         <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
               <FileSpreadsheet className="w-5 h-5 text-green-500" /> Excel 导入 - 列映射
            </h3>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
         </div>
         <div className="p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900">
            {/* ... Content ... */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-lg">
                正在处理文件: <strong>{file.name}</strong>
            </div>
            <div className="flex justify-center p-10"><p className="text-gray-500">列映射配置 (模拟)...</p></div>
         </div>
         <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3">
             <button onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 font-medium">取消</button>
             <button onClick={handleImport} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700">开始导入</button>
         </div>
      </div>
    </div>
  );
};

const ImportProducts = () => {
  const { currentStore, setProducts, setLogs, user } = useApp();
  const [activeTab, setActiveTab] = useState<'excel' | 'manual'>('excel');
  const [showCamera, setShowCamera] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [manualForm, setManualForm] = useState({
      name: '',
      batchNumber: '',
      expiryDate: '',
      quantityBig: 0,
      quantitySmall: 0,
      unitBig: '整',
      unitSmall: '散',
      notes: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (base64: string) => {
    setProductImage(base64);
    // CameraModal handles its own closing, but we ensure state update here
    setShowCamera(false); 
  };

  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setSelectedFile(e.target.files[0]);
          setShowMappingModal(true);
          e.target.value = '';
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (e) => setProductImage(e.target?.result as string);
      }
  };

  const handleManualSubmit = () => {
      if (currentStore.isParent) {
          alert('错误：母门店（总店）无法直接录入商品。\n请切换至具体的子门店进行操作。');
          return;
      }

      if (!manualForm.name || !manualForm.batchNumber) {
          alert('请填写商品名称和批号');
          return;
      }

      const newBatch: Batch = {
          id: `b_man_${Date.now()}`,
          batchNumber: manualForm.batchNumber,
          expiryDate: manualForm.expiryDate || '2099-12-31',
          quantityBig: manualForm.quantityBig,
          quantitySmall: manualForm.quantitySmall,
          unitBig: manualForm.unitBig,
          unitSmall: manualForm.unitSmall,
          conversionRate: 1,
          price: 0,
          notes: manualForm.notes
      };

      const newProduct: Product = {
          id: `p_man_${Date.now()}`,
          storeId: currentStore.id,
          name: manualForm.name,
          category: '手动录入',
          sku: `SKU-${Date.now()}`,
          batches: [newBatch],
          image_url: productImage || 'https://placehold.co/100x100?text=Manual',
          notes: ''
      };

      setProducts(prev => [...prev, newProduct]);

      setLogs(prev => [{
        id: `log_man_${Date.now()}`,
        action_type: LogAction.ENTRY_INBOUND, // Treated as Inbound for manual single entry
        target_id: newBatch.id,
        target_name: manualForm.name,
        change_desc: `手动录入: ${manualForm.name} × ${manualForm.quantityBig}${manualForm.unitBig}`,
        operator_id: user?.id || 'unknown',
        operator_name: user?.username || 'Unknown',
        created_at: new Date().toISOString(),
        is_revoked: false,
        snapshot_data: { 
            productId: newProduct.id, 
            batchId: newBatch.id,
            deltaQty: manualForm.quantityBig, // Useful if treated as stock add
            unitType: 'big',
            // Crucial: Mark as 'creation' so rollback knows to delete, not just subtract
            isCreation: true 
        },
        role_level: user?.role || RoleLevel.STAFF
      }, ...prev]);

      alert('录入成功');
      setManualForm({
          name: '',
          batchNumber: '',
          expiryDate: '',
          quantityBig: 0,
          quantitySmall: 0,
          unitBig: '整',
          unitSmall: '散',
          notes: ''
      });
      setProductImage(null);
  };

  if (currentStore.isParent) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 animate-fade-in">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-6 rounded-full mb-6">
                  <AlertTriangle className="w-16 h-16 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">当前为母门店（总店）模式</h2>
              <p className="text-gray-500 max-w-md">
                  为了保证库存数据的准确性，系统禁止在总店视图下直接进行入库操作。
                  <br/><br/>
                  请点击左侧侧边栏顶部的 <strong>"当前: {currentStore.name}"</strong> 按钮，切换到具体的子门店进行商品导入。
              </p>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {showMappingModal && selectedFile && <ColumnMappingModal file={selectedFile} onClose={() => setShowMappingModal(false)} />}
      
      {showBarcodeScanner && (
          <BarcodeScanner 
            onScan={(code) => { setManualForm({...manualForm, batchNumber: code}); setShowBarcodeScanner(false); }} 
            onClose={() => setShowBarcodeScanner(false)} 
          />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold dark:text-white">导入商品 <span className="text-sm font-normal text-gray-500 ml-2">当前门店: {currentStore.name}</span></h2>
      </div>

      <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-xl w-fit">
         <button onClick={() => setActiveTab('excel')} className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'excel' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-gray-500'}`}>Excel 批量导入</button>
         <button onClick={() => setActiveTab('manual')} className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'manual' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-gray-500'}`}>手动录入 / 扫码</button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
         {activeTab === 'excel' && (
           <div className="space-y-6">
              <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleExcelFileSelect}/>
              <div onClick={() => excelInputRef.current?.click()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-10 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group">
                 <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-full mb-4 group-hover:scale-110 transition-transform"><FileSpreadsheet className="w-12 h-12 text-green-500" /></div>
                 <p className="text-lg font-bold text-gray-700 dark:text-gray-200">点击上传 Excel 文件 (.xlsx, .xls)</p>
                 <p className="text-sm text-gray-400 mt-2">支持拖拽上传，自动识别表头</p>
              </div>
           </div>
         )}

         {activeTab === 'manual' && (
           <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex flex-col items-center gap-4">
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload}/>
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
                      </div>
                    )}
                    <button onClick={() => setShowCamera(true)} className="absolute bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-105 transition-all"><Camera className="w-6 h-6" /></button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="col-span-2">
                   <label className="block text-sm font-medium mb-1">商品名称</label>
                   <input type="text" value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none" placeholder="例如：阿莫西林胶囊"/>
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">批号 (可扫码)</label>
                   <div className="flex gap-2">
                        <input type="text" value={manualForm.batchNumber} onChange={(e) => setManualForm({...manualForm, batchNumber: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none font-mono" placeholder="输入或扫码"/>
                        <button onClick={() => setShowBarcodeScanner(true)} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"><ScanLine className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
                   </div>
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">有效期</label>
                   <input type="date" value={manualForm.expiryDate} onChange={e => setManualForm({...manualForm, expiryDate: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none"/>
                 </div>
                 
                 <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-600 col-span-2 grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium mb-1 text-blue-600">整数量 / 单位</label>
                        <div className="flex gap-2">
                            <input type="number" value={manualForm.quantityBig} onChange={e => setManualForm({...manualForm, quantityBig: Number(e.target.value)})} className="w-full p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 outline-none font-bold" placeholder="0"/>
                            <input type="text" className="w-20 p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 text-center" value={manualForm.unitBig} onChange={e => setManualForm({...manualForm, unitBig: e.target.value})} placeholder="单位"/>
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium mb-1 text-green-600">散数量 / 单位</label>
                        <div className="flex gap-2">
                            <input type="number" value={manualForm.quantitySmall} onChange={e => setManualForm({...manualForm, quantitySmall: Number(e.target.value)})} className="w-full p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 outline-none font-bold" placeholder="0"/>
                            <input type="text" className="w-20 p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 text-center" value={manualForm.unitSmall} onChange={e => setManualForm({...manualForm, unitSmall: e.target.value})} placeholder="单位"/>
                        </div>
                     </div>
                 </div>

                 <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">备注 (仅限批号)</label>
                    <textarea value={manualForm.notes} onChange={e => setManualForm({...manualForm, notes: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none h-20" placeholder="填写批号备注..."></textarea>
                 </div>
              </div>

              <button onClick={handleManualSubmit} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 transform transition-transform active:scale-95">保存并入库</button>
           </div>
         )}
      </div>

      {showCamera && <CameraModal onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
    </div>
  );
};

export default ImportProducts;