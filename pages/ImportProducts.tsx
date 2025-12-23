
import React, { useState, useRef } from 'react';
import { Upload, Camera, FileSpreadsheet, Edit, X, ArrowRight, Image as ImageIcon, Trash2, ScanLine, AlertTriangle, CheckCircle } from 'lucide-react';
import CameraModal from '../components/CameraModal';
import BarcodeScanner from '../components/BarcodeScanner';
import * as XLSX from 'xlsx';
import { useApp } from '../App';
import { Product, Batch, RoleLevel, LogAction } from '../types';
import { supabase } from '../supabase';

// --- Image Compression Utility ---
const compressImage = (file: File, maxWidth: number = 1024, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL(file.type, quality));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

// --- Excel Column Mapping Modal ---
const ExcelMappingModal = ({ 
    file, 
    jsonData, 
    onClose, 
    onConfirm 
}: { 
    file: File; 
    jsonData: any[]; 
    onClose: () => void; 
    onConfirm: (mapping: any) => void; 
}) => {
    const systemFields = [
        { key: 'name', label: '商品名称', required: true },
        { key: 'batchNumber', label: '批号', required: true },
        { key: 'quantityBig', label: '数量 (整)', required: true },
        { key: 'quantitySmall', label: '数量 (散)', required: false },
        { key: 'expiryDate', label: '有效期 (YYYY-MM-DD)', required: true },
        { key: 'unitBig', label: '单位 (整)', required: false, default: '整' },
        { key: 'unitSmall', label: '单位 (散)', required: false, default: '散' },
        { key: 'sku', label: 'SKU / 编码', required: false },
        { key: 'category', label: '分类', required: false },
        { key: 'price', label: '进价', required: false },
        { key: 'notes', label: '备注', required: false },
    ];

    const excelHeaders = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
    const initialMapping: any = {};
    systemFields.forEach(field => {
        const match = excelHeaders.find(h => h.includes(field.label.split(' ')[0]) || h.toLowerCase().includes(field.key.toLowerCase()));
        if (match) initialMapping[field.key] = match;
    });

    const [mapping, setMapping] = useState<any>(initialMapping);

    const handleConfirm = () => {
        const missing = systemFields.filter(f => f.required && !mapping[f.key]);
        if (missing.length > 0) {
            alert(`请映射必填字段: ${missing.map(f => f.label).join(', ')}`);
            return;
        }
        onConfirm(mapping);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <FileSpreadsheet className="w-6 h-6 text-green-600"/> 
                        Excel 导入映射配置
                    </h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-gray-500"/></button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-800 dark:text-blue-200">
                        <p>文件名: <strong>{file.name}</strong> ({jsonData.length} 行数据)</p>
                        <p className="mt-1">请将系统字段映射到 Excel 对应的列名。系统会自动尝试匹配。</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {systemFields.map(field => (
                            <div key={field.key} className="p-4 border rounded-xl dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
                                <div className="flex justify-between mb-2">
                                    <label className="font-bold text-gray-700 dark:text-gray-300">
                                        {field.label}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                </div>
                                <select 
                                    value={mapping[field.key] || ''} 
                                    onChange={(e) => setMapping({...mapping, [field.key]: e.target.value})}
                                    className={`w-full p-2 rounded-lg border outline-none text-sm ${mapping[field.key] ? 'bg-white dark:bg-gray-600 border-blue-500' : 'bg-gray-100 dark:bg-gray-700 border-gray-300'}`}
                                >
                                    <option value="">-- 请选择列 --</option>
                                    {excelHeaders.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                                {mapping[field.key] && jsonData.length > 0 && (
                                    <div className="mt-2 text-xs text-gray-500 truncate">
                                        示例: {jsonData[0][mapping[field.key]]}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200">取消</button>
                    <button onClick={handleConfirm} className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg">开始导入</button>
                </div>
            </div>
        </div>
    );
};

const ImportProducts = () => {
  const { currentStore, user, reloadData, products } = useApp();
  const [activeTab, setActiveTab] = useState<'excel' | 'manual'>('excel');
  const [showCamera, setShowCamera] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);
  
  // Excel State
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Manual Form
  const [manualForm, setManualForm] = useState({
      name: '', batchNumber: '', expiryDate: '', quantityBig: 0, quantitySmall: 0,
      unitBig: '整', unitSmall: '散', notes: '', category: '未分类', sku: ''
  });

  const handleCapture = (base64: string) => {
    setProductImage(base64);
    setShowCamera(false); 
  };

  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setExcelFile(file);
          
          const reader = new FileReader();
          reader.onload = (evt) => {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = XLSX.utils.sheet_to_json(ws);
              if (data.length > 0) {
                  setExcelData(data);
                  setShowMapping(true);
              } else {
                  alert('Excel 文件为空');
              }
          };
          reader.readAsBinaryString(file);
          e.target.value = ''; // Reset
      }
  };

  const handleProcessImport = async (mapping: any) => {
      setShowMapping(false);
      
      let successCount = 0;
      let failCount = 0;
      const createdProductIds: string[] = [];

      try {
          for (const row of excelData) {
              const name = row[mapping.name];
              const batchNum = row[mapping.batchNumber];
              
              if (!name || !batchNum) {
                  failCount++;
                  continue;
              }

              let productId = products.find(p => p.name === name && p.storeId === currentStore.id)?.id;

              if (!productId) {
                  // Create Product
                  const prodData = {
                      id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                      store_id: currentStore.id,
                      name: name,
                      category: mapping.category ? row[mapping.category] : '未分类',
                      sku: mapping.sku ? row[mapping.sku] : `SKU-${Date.now()}`,
                      image_url: '',
                      notes: mapping.notes ? row[mapping.notes] : ''
                  };
                  
                  const { data: newProd, error: pError } = await supabase.from('products').insert(prodData).select().single();
                  if (pError) {
                      failCount++;
                      continue;
                  }
                  productId = newProd.id;
                  createdProductIds.push(productId);
              }

              // Create Batch
              const batchData = {
                  id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  product_id: productId,
                  batch_number: batchNum,
                  expiry_date: mapping.expiryDate ? row[mapping.expiryDate] : '2099-12-31',
                  quantity_big: Number(row[mapping.quantityBig]) || 0,
                  quantity_small: mapping.quantitySmall ? (Number(row[mapping.quantitySmall]) || 0) : 0,
                  unit_big: mapping.unitBig && row[mapping.unitBig] ? row[mapping.unitBig] : '整',
                  unit_small: mapping.unitSmall && row[mapping.unitSmall] ? row[mapping.unitSmall] : '散',
                  conversion_rate: 1, 
                  price: mapping.price ? (Number(row[mapping.price]) || 0) : 0,
                  notes: mapping.notes ? row[mapping.notes] : ''
              };

              const { error: bError } = await supabase.from('batches').insert(batchData);
              if (bError) {
                  failCount++;
              } else {
                  successCount++;
              }
          }

          if (successCount > 0) {
            await supabase.from('operation_logs').insert({
                id: `log_${Date.now()}`,
                action_type: LogAction.BATCH_IMPORT,
                target_id: 'BATCH_IMPORT',
                target_name: `Excel批量导入`,
                change_desc: `成功导入 ${successCount} 条数据 (失败 ${failCount})`,
                operator_id: user?.id,
                operator_name: user?.username,
                role_level: user?.role,
                snapshot_data: { createdProductIds, count: successCount },
                created_at: new Date().toISOString()
            });
            
            await reloadData();
            alert(`导入完成！\n成功: ${successCount}\n失败: ${failCount}`);
          } else {
              alert("导入失败，没有数据被添加。");
          }

      } catch (err) {
          console.error(err);
          alert("导入过程中发生严重错误");
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              // Compress the image before setting it
              const compressedBase64 = await compressImage(file, 1024, 0.7);
              setProductImage(compressedBase64);
          } catch (error) {
              console.error("Image compression failed", error);
              alert("图片处理失败，请重试");
          }
      }
  };

  const handleManualSubmit = async () => {
      if (currentStore.isParent) {
          alert('母门店无法直接录入商品');
          return;
      }
      if (currentStore.id === 'dummy' || !currentStore.id) {
          alert('请先在“门店管理”中创建并选择一个门店');
          return;
      }
      if (!manualForm.name || !manualForm.batchNumber) {
          alert('请填写名称和批号');
          return;
      }

      try {
          let productId = products.find(p => p.name === manualForm.name && p.storeId === currentStore.id)?.id;
          
          if (!productId) {
            const prodData = {
                id: `p_${Date.now()}`,
                store_id: currentStore.id,
                name: manualForm.name,
                category: manualForm.category,
                sku: manualForm.sku || `SKU-${Date.now()}`,
                image_url: productImage || '',
                notes: manualForm.notes
            };
            const { data: newProd, error: pError } = await supabase.from('products').insert(prodData).select().single();
            if (pError) throw pError;
            productId = newProd.id;
          }

          const batchData = {
              id: `b_${Date.now()}`,
              product_id: productId,
              batch_number: manualForm.batchNumber,
              expiry_date: manualForm.expiryDate || '2099-12-31',
              quantity_big: manualForm.quantityBig,
              quantity_small: manualForm.quantitySmall,
              unit_big: manualForm.unitBig,
              unit_small: manualForm.unitSmall,
              conversion_rate: 1,
              notes: manualForm.notes
          };
          const { error: bError } = await supabase.from('batches').insert(batchData);
          if (bError) throw bError;

          await supabase.from('operation_logs').insert({
              id: `log_${Date.now()}`,
              action_type: LogAction.ENTRY_INBOUND,
              target_id: batchData.id,
              target_name: manualForm.name,
              change_desc: `手动录入: ${manualForm.name} x ${manualForm.quantityBig}`,
              operator_id: user?.id,
              operator_name: user?.username,
              role_level: user?.role,
              snapshot_data: { productId, batchId: batchData.id, deltaQty: manualForm.quantityBig, isCreation: true },
              created_at: new Date().toISOString()
          });

          await reloadData();
          alert('录入成功');
          setManualForm({ 
              name: '', batchNumber: '', expiryDate: '', quantityBig: 0, quantitySmall: 0, 
              unitBig: '整', unitSmall: '散', notes: '', category: '未分类', sku: '' 
          });
          setProductImage(null);

      } catch (err) {
          console.error(err);
          alert('录入失败，请检查控制台或数据库连接');
      }
  };

  if (currentStore.isParent) {
      return <div className="text-center p-10"><h2 className="text-xl font-bold">总店模式不可录入</h2></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Mapping Modal */}
      {showMapping && excelFile && (
          <ExcelMappingModal 
            file={excelFile} 
            jsonData={excelData} 
            onClose={() => setShowMapping(false)} 
            onConfirm={handleProcessImport} 
          />
      )}

      {showBarcodeScanner && (<BarcodeScanner onScan={(code) => { setManualForm({...manualForm, batchNumber: code}); setShowBarcodeScanner(false); }} onClose={() => setShowBarcodeScanner(false)} />)}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold dark:text-white">导入商品 <span className="text-sm font-normal text-gray-500 ml-2">当前: {currentStore.name}</span></h2>
      </div>

      <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-xl w-fit">
         <button onClick={() => setActiveTab('excel')} className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'excel' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-gray-500'}`}>Excel 批量导入</button>
         <button onClick={() => setActiveTab('manual')} className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'manual' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-gray-500'}`}>手动录入</button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
         {activeTab === 'excel' && (
           <div className="space-y-6">
              <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleExcelFileSelect}/>
              <div onClick={() => excelInputRef.current?.click()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-10 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group">
                 <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-full mb-4 group-hover:scale-110 transition-transform"><FileSpreadsheet className="w-12 h-12 text-green-500" /></div>
                 <p className="text-lg font-bold text-gray-700 dark:text-gray-200">点击上传 Excel 文件</p>
                 <p className="text-sm text-gray-400 mt-2">支持 .xlsx, .xls 格式</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <div>
                      <p className="font-bold mb-1">导入说明</p>
                      <p>1. 上传后将弹出字段映射窗口，请将 Excel 列名与系统字段对应。</p>
                      <p>2. 系统将根据“商品名称”自动判断是否为现有商品新增批号。</p>
                  </div>
              </div>
           </div>
         )}

         {activeTab === 'manual' && (
           <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex flex-col items-center gap-4">
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload}/>
                 <div className="w-full h-64 bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-600 relative group">
                    {productImage ? (
                      <img src={productImage} alt="Scanned" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center text-gray-400 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />点击上传图片 (自动压缩)
                      </div>
                    )}
                    <button onClick={() => setShowCamera(true)} className="absolute bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg"><Camera className="w-6 h-6" /></button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="col-span-2">
                   <label className="block text-sm font-medium mb-1">商品名称 <span className="text-red-500">*</span></label>
                   <input type="text" value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none" placeholder="输入商品名称"/>
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">批号 <span className="text-red-500">*</span></label>
                   <div className="flex gap-2">
                        <input type="text" value={manualForm.batchNumber} onChange={(e) => setManualForm({...manualForm, batchNumber: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none font-mono" placeholder="生产批号"/>
                        <button onClick={() => setShowBarcodeScanner(true)} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl"><ScanLine className="w-5 h-5" /></button>
                   </div>
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">有效期</label>
                   <input type="date" value={manualForm.expiryDate} onChange={e => setManualForm({...manualForm, expiryDate: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none"/>
                 </div>
                 <div className="col-span-2 grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium mb-1 text-blue-600">整数量</label>
                        <input type="number" value={manualForm.quantityBig} onChange={e => setManualForm({...manualForm, quantityBig: Number(e.target.value)})} className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none font-bold text-lg"/>
                     </div>
                     <div>
                        <label className="block text-sm font-medium mb-1 text-green-600">散数量</label>
                        <input type="number" value={manualForm.quantitySmall} onChange={e => setManualForm({...manualForm, quantitySmall: Number(e.target.value)})} className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none font-bold text-lg"/>
                     </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">分类</label>
                    <input type="text" value={manualForm.category} onChange={e => setManualForm({...manualForm, category: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none"/>
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">SKU (选填)</label>
                    <input type="text" value={manualForm.sku} onChange={e => setManualForm({...manualForm, sku: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none"/>
                 </div>
                 <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">备注</label>
                    <input type="text" value={manualForm.notes} onChange={e => setManualForm({...manualForm, notes: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none"/>
                 </div>
              </div>
              <button onClick={handleManualSubmit} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" /> 保存并入库
              </button>
           </div>
         )}
      </div>
      {showCamera && <CameraModal onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
    </div>
  );
};

export default ImportProducts;
