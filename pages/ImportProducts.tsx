
import React, { useState, useRef } from 'react';
import { Upload, Camera, FileSpreadsheet, Edit, X, ArrowRight, Image as ImageIcon, Trash2, ScanLine, AlertTriangle } from 'lucide-react';
import CameraModal from '../components/CameraModal';
import BarcodeScanner from '../components/BarcodeScanner';
import * as XLSX from 'xlsx';
import { useApp } from '../App';
import { Product, Batch, RoleLevel, LogAction } from '../types';
import { supabase } from '../supabase';

const ColumnMappingModal = ({ file, onClose }: { file: File; onClose: () => void }) => {
  const { setLogs, user, currentStore, reloadData } = useApp();
  
  const handleImport = async () => {
      if (currentStore.isParent) {
          alert('错误：母门店（总店）无法直接导入商品库存。');
          return;
      }

      try {
          const reader = new FileReader();
          
          reader.onload = async (e) => {
              try {
                  const data = e.target?.result;
                  const workbook = XLSX.read(data, { type: 'binary' });
                  const sheetName = workbook.SheetNames[0];
                  const sheet = workbook.Sheets[sheetName];
                  const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

                  if (!jsonData || jsonData.length === 0) {
                      alert('Excel 文件为空');
                      return;
                  }

                  const createdProductIds: string[] = [];

                  for (const row of jsonData) {
                      // 1. Insert Product
                      const prodData = {
                          id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                          store_id: currentStore.id,
                          name: row['商品名称'] || row['Name'] || '未知商品',
                          category: row['分类'] || '未分类',
                          sku: row['SKU'] || row['Code'] || `SKU-${Date.now()}`,
                          image_url: '',
                          notes: row['商品备注'] || ''
                      };
                      
                      const { data: insertedProd, error: pErr } = await supabase.from('products').insert(prodData).select().single();
                      if (pErr) { console.error('Prod Insert Error', pErr); continue; }
                      
                      createdProductIds.push(insertedProd.id);

                      // 2. Insert Batch
                      const batchData = {
                          id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                          product_id: insertedProd.id,
                          batch_number: row['批号'] || row['Batch'] || `BATCH-${Date.now()}`,
                          expiry_date: row['有效期'] || '2099-12-31',
                          quantity_big: Number(row['数量 (整)']) || 0,
                          quantity_small: Number(row['数量 (散)']) || 0,
                          unit_big: row['单位 (整)'] || '整',
                          unit_small: row['单位 (散)'] || '散',
                          conversion_rate: Number(row['换算率']) || 1,
                          notes: row['备注'] || ''
                      };
                      await supabase.from('batches').insert(batchData);
                  }

                  // 3. Log
                  await supabase.from('operation_logs').insert({
                    id: `log_${Date.now()}`,
                    action_type: LogAction.BATCH_IMPORT,
                    target_id: 'BATCH_IMPORT',
                    target_name: `Excel导入 ${createdProductIds.length}条`,
                    change_desc: `文件: ${file.name}`,
                    operator_id: user?.id,
                    operator_name: user?.username,
                    role_level: user?.role,
                    snapshot_data: { productIds: createdProductIds },
                    created_at: new Date().toISOString()
                  });

                  await reloadData();
                  alert(`成功导入 ${createdProductIds.length} 条数据！`);
                  onClose();
              } catch (parseError) {
                  console.error(parseError);
                  alert('导入失败，请检查控制台。');
              }
          };
          reader.readAsBinaryString(file);
      } catch (error) {
          alert('导入流程错误');
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl p-6">
         <h3 className="font-bold text-lg mb-4">确认导入 {file.name}?</h3>
         <p className="mb-6 text-gray-500">将按标准模版字段自动映射并插入数据库。</p>
         <div className="flex justify-end gap-3">
             <button onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-100 dark:bg-gray-700">取消</button>
             <button onClick={handleImport} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold">开始导入</button>
         </div>
      </div>
    </div>
  );
};

const ImportProducts = () => {
  const { currentStore, user, reloadData } = useApp();
  const [activeTab, setActiveTab] = useState<'excel' | 'manual'>('excel');
  const [showCamera, setShowCamera] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [manualForm, setManualForm] = useState({
      name: '', batchNumber: '', expiryDate: '', quantityBig: 0, quantitySmall: 0,
      unitBig: '整', unitSmall: '散', notes: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (base64: string) => {
    setProductImage(base64);
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
          // 1. Insert Product
          const prodData = {
              id: `p_${Date.now()}`,
              store_id: currentStore.id,
              name: manualForm.name,
              category: '手动录入',
              sku: `SKU-${Date.now()}`,
              image_url: productImage || '',
              notes: ''
          };
          const { data: newProd, error: pError } = await supabase.from('products').insert(prodData).select().single();
          
          if (pError) throw pError;

          // 2. Insert Batch
          const batchData = {
              id: `b_${Date.now()}`,
              product_id: newProd.id,
              batch_number: manualForm.batchNumber,
              expiry_date: manualForm.expiryDate || '2099-12-31',
              quantity_big: manualForm.quantityBig,
              quantity_small: manualForm.quantitySmall,
              unit_big: manualForm.unitBig,
              unit_small: manualForm.unitSmall,
              conversion_rate: 1,
              notes: manualForm.notes
          };
          await supabase.from('batches').insert(batchData);

          // 3. Log
          await supabase.from('operation_logs').insert({
              id: `log_${Date.now()}`,
              action_type: LogAction.ENTRY_INBOUND,
              target_id: batchData.id,
              target_name: manualForm.name,
              change_desc: `手动录入: ${manualForm.name} x ${manualForm.quantityBig}`,
              operator_id: user?.id,
              operator_name: user?.username,
              role_level: user?.role,
              snapshot_data: { productId: newProd.id, batchId: batchData.id, deltaQty: manualForm.quantityBig, isCreation: true },
              created_at: new Date().toISOString()
          });

          await reloadData();
          alert('录入成功');
          setManualForm({ name: '', batchNumber: '', expiryDate: '', quantityBig: 0, quantitySmall: 0, unitBig: '整', unitSmall: '散', notes: '' });
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
      {showMappingModal && selectedFile && <ColumnMappingModal file={selectedFile} onClose={() => setShowMappingModal(false)} />}
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
              </div>
           </div>
         )}

         {activeTab === 'manual' && (
           <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex flex-col items-center gap-4">
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload}/>
                 <div className="w-full h-64 bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-600 relative group">
                    {productImage ? (
                      <img src={productImage} alt="Scanned" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center text-gray-400 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />点击上传
                      </div>
                    )}
                    <button onClick={() => setShowCamera(true)} className="absolute bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg"><Camera className="w-6 h-6" /></button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="col-span-2">
                   <label className="block text-sm font-medium mb-1">商品名称</label>
                   <input type="text" value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none" placeholder="商品名称"/>
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">批号</label>
                   <div className="flex gap-2">
                        <input type="text" value={manualForm.batchNumber} onChange={(e) => setManualForm({...manualForm, batchNumber: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none font-mono" placeholder="批号"/>
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
                        <input type="number" value={manualForm.quantityBig} onChange={e => setManualForm({...manualForm, quantityBig: Number(e.target.value)})} className="w-full p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 outline-none font-bold"/>
                     </div>
                     <div>
                        <label className="block text-sm font-medium mb-1 text-green-600">散数量</label>
                        <input type="number" value={manualForm.quantitySmall} onChange={e => setManualForm({...manualForm, quantitySmall: Number(e.target.value)})} className="w-full p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 outline-none font-bold"/>
                     </div>
                 </div>
              </div>
              <button onClick={handleManualSubmit} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700">保存并入库</button>
           </div>
         )}
      </div>
      {showCamera && <CameraModal onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
    </div>
  );
};

export default ImportProducts;
