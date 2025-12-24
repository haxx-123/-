
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
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL(file.type, quality));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

// --- Excel Column Mapping Modal with Preview (25.5) ---
const ExcelMappingModal = ({ file, jsonData, onClose, onConfirm }: { file: File; jsonData: any[]; onClose: () => void; onConfirm: (mapping: any) => void; }) => {
    const systemFields = [
        { key: 'name', label: '商品名称', required: true },
        { key: 'batchNumber', label: '批号', required: true },
        { key: 'quantityBig', label: '整数量', required: true },
        { key: 'quantitySmall', label: '散数量', required: false },
        { key: 'unitBig', label: '整单位', required: false, default: '整' },
        { key: 'unitSmall', label: '散单位', required: false, default: '散' },
        { key: 'conversionRate', label: '换算制', required: false, default: '10' },
        { key: 'expiryDate', label: '有效期', required: false },
        { key: 'sku', label: 'SKU', required: false },
        { key: 'category', label: '分类', required: false },
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
            <div className="bg-white dark:bg-gray-800 w-full max-w-5xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[95vh]">
                <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <FileSpreadsheet className="w-6 h-6 text-green-600"/> Excel 导入预览
                    </h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-gray-500"/></button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Mapping Config Column */}
                    <div className="lg:col-span-1 space-y-4">
                        <h4 className="font-bold text-gray-700 dark:text-gray-300">字段映射</h4>
                        {systemFields.map(field => (
                            <div key={field.key} className="p-3 border rounded-xl dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
                                <label className="block text-xs font-bold text-gray-500 mb-1">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                <select 
                                    value={mapping[field.key] || ''} 
                                    onChange={(e) => setMapping({...mapping, [field.key]: e.target.value})}
                                    className="w-full p-2 rounded-lg border outline-none text-sm dark:bg-gray-700 dark:border-gray-500"
                                >
                                    <option value="">-- 请选择 --</option>
                                    {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>

                    {/* Data Preview Column */}
                    <div className="lg:col-span-2 flex flex-col">
                        <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-4">数据预览 (前 5 条)</h4>
                        <div className="flex-1 overflow-auto border rounded-xl dark:border-gray-600">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 sticky top-0">
                                    <tr>
                                        {Object.keys(mapping).map(key => mapping[key] && <th key={key} className="p-2 border-b dark:border-gray-600 whitespace-nowrap">{systemFields.find(f => f.key === key)?.label}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {jsonData.slice(0, 5).map((row, i) => (
                                        <tr key={i} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                            {Object.keys(mapping).map(key => mapping[key] && (
                                                <td key={key} className="p-2 whitespace-nowrap">
                                                    {/* Basic Validation Highlight */}
                                                    {key === 'batchNumber' && !row[mapping[key]] ? <span className="text-red-500 font-bold">缺失</span> : row[mapping[key]]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-sm text-yellow-800 dark:text-yellow-200">
                            <p>请确保 <span className="font-bold">商品名称</span> 和 <span className="font-bold">批号</span> 列已正确映射且不为空。</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200">取消</button>
                    <button onClick={handleConfirm} className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg">确认导入</button>
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
  
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [manualForm, setManualForm] = useState({
      name: '', batchNumber: '', expiryDate: '', quantityBig: 0, quantitySmall: 0,
      unitBig: '整', unitSmall: '散', conversionRate: 10, notes: '', category: '未分类', sku: ''
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
              }
          };
          reader.readAsBinaryString(file);
          e.target.value = ''; 
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
              
              // STRICT VALIDATION: Batch Number is Mandatory (23)
              if (!name || !batchNum) { failCount++; continue; }

              let productId = products.find(p => p.name === name && p.storeId === currentStore.id)?.id;

              if (!productId) {
                  const prodData = {
                      id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                      store_id: currentStore.id,
                      name: name,
                      category: mapping.category ? row[mapping.category] : '未分类',
                      sku: mapping.sku ? row[mapping.sku] : `SKU-${Date.now()}`,
                      image_url: '',
                      notes: mapping.notes ? row[mapping.notes] : '',
                      unit_big: mapping.unitBig && row[mapping.unitBig] ? row[mapping.unitBig] : '整',
                      unit_small: mapping.unitSmall && row[mapping.unitSmall] ? row[mapping.unitSmall] : '散',
                      conversion_rate: mapping.conversionRate ? (Number(row[mapping.conversionRate]) || 10) : 10
                  };
                  const { data: newProd, error: pError } = await supabase.from('products').insert(prodData).select().single();
                  if (pError) { failCount++; continue; }
                  productId = newProd.id;
                  createdProductIds.push(productId);
              }

              const batchData = {
                  id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  product_id: productId,
                  batch_number: batchNum,
                  expiry_date: mapping.expiryDate ? row[mapping.expiryDate] : '2099-12-31',
                  quantity_big: Number(row[mapping.quantityBig]) || 0,
                  quantity_small: mapping.quantitySmall ? (Number(row[mapping.quantitySmall]) || 0) : 0,
                  price: 0,
                  notes: mapping.notes ? row[mapping.notes] : ''
              };

              const { error: bError } = await supabase.from('batches').insert(batchData);
              if (bError) failCount++; else successCount++;
          }

          if (successCount > 0) {
            await supabase.from('operation_logs').insert({
                id: `log_${Date.now()}`,
                action_type: LogAction.BATCH_IMPORT,
                target_id: 'BATCH_IMPORT',
                target_name: `Excel批量导入`,
                change_desc: `导入 ${successCount} 条数据`,
                operator_id: user?.id,
                operator_name: user?.username,
                role_level: user?.role,
                snapshot_data: { createdProductIds, count: successCount },
                created_at: new Date().toISOString()
            });
            await reloadData();
            alert(`导入完成！\n成功: ${successCount}\n失败: ${failCount}`);
          } else {
              alert("导入失败，没有有效数据被添加。");
          }
      } catch (err) { alert("导入错误"); }
  };

  const handleManualSubmit = async () => {
      if (currentStore.isParent) return alert('母门店无法录入');
      if (currentStore.id === 'dummy' || !currentStore.id) return alert('请选择门店');
      // STRICT VALIDATION
      if (!manualForm.name) return alert('商品名称必填');
      if (!manualForm.batchNumber) return alert('批号必填 (不可为空)');

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
                notes: manualForm.notes,
                unit_big: manualForm.unitBig,
                unit_small: manualForm.unitSmall,
                conversion_rate: manualForm.conversionRate
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
              notes: manualForm.notes
          };
          const { error: bError } = await supabase.from('batches').insert(batchData);
          if (bError) throw bError;

          await supabase.from('operation_logs').insert({
              id: `log_${Date.now()}`,
              action_type: LogAction.ENTRY_INBOUND,
              target_id: batchData.id,
              target_name: manualForm.name,
              change_desc: `手动录入: ${manualForm.name}`,
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
              unitBig: '整', unitSmall: '散', conversionRate: 10, notes: '', category: '未分类', sku: '' 
          });
          setProductImage(null);
      } catch (err) { alert('录入失败'); }
  };

  if (currentStore.isParent) return <div className="text-center p-10 font-bold">总店模式不可录入</div>;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {showMapping && excelFile && <ExcelMappingModal file={excelFile} jsonData={excelData} onClose={() => setShowMapping(false)} onConfirm={handleProcessImport} />}
      {showBarcodeScanner && <BarcodeScanner onScan={(code) => { setManualForm({...manualForm, batchNumber: code}); setShowBarcodeScanner(false); }} onClose={() => setShowBarcodeScanner(false)} />}

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
           </div>
         )}

         {activeTab === 'manual' && (
           <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex flex-col items-center gap-4">
                 <div className="w-full h-48 bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-600 relative group cursor-pointer" onClick={() => setShowCamera(true)}>
                    {productImage ? <img src={productImage} className="w-full h-full object-contain" /> : <div className="text-gray-400 flex flex-col items-center"><Camera className="w-8 h-8 mb-2"/>点击拍照</div>}
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="col-span-2"><label className="text-sm font-bold text-gray-500">名称 *</label><input className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})}/></div>
                 <div className="col-span-2"><label className="text-sm font-bold text-gray-500">批号 * (必填)</label><div className="flex gap-2"><input className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 font-mono" value={manualForm.batchNumber} onChange={e => setManualForm({...manualForm, batchNumber: e.target.value})}/><button onClick={() => setShowBarcodeScanner(true)} className="p-3 bg-gray-100 rounded-xl"><ScanLine/></button></div></div>
                 <div><label className="text-sm font-bold text-gray-500">有效期</label><input type="date" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={manualForm.expiryDate} onChange={e => setManualForm({...manualForm, expiryDate: e.target.value})}/></div>
                 <div><label className="text-sm font-bold text-gray-500">SKU</label><input className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={manualForm.sku} onChange={e => setManualForm({...manualForm, sku: e.target.value})}/></div>
                 
                 <div className="col-span-2 grid grid-cols-3 gap-4">
                     <div><label className="text-xs text-blue-500 font-bold">整数量</label><input type="number" className="w-full p-2 border rounded-lg dark:bg-gray-700" value={manualForm.quantityBig} onChange={e => setManualForm({...manualForm, quantityBig: Number(e.target.value)})}/></div>
                     <div><label className="text-xs text-gray-500">单位</label><input className="w-full p-2 border rounded-lg dark:bg-gray-700" value={manualForm.unitBig} onChange={e => setManualForm({...manualForm, unitBig: e.target.value})}/></div>
                     <div><label className="text-xs text-gray-500">换算 (1大=X小)</label><input type="number" className="w-full p-2 border rounded-lg dark:bg-gray-700" value={manualForm.conversionRate} onChange={e => setManualForm({...manualForm, conversionRate: Number(e.target.value)})}/></div>
                 </div>
                 <div className="col-span-2 grid grid-cols-3 gap-4">
                     <div><label className="text-xs text-green-500 font-bold">散数量</label><input type="number" className="w-full p-2 border rounded-lg dark:bg-gray-700" value={manualForm.quantitySmall} onChange={e => setManualForm({...manualForm, quantitySmall: Number(e.target.value)})}/></div>
                     <div><label className="text-xs text-gray-500">单位</label><input className="w-full p-2 border rounded-lg dark:bg-gray-700" value={manualForm.unitSmall} onChange={e => setManualForm({...manualForm, unitSmall: e.target.value})}/></div>
                 </div>
              </div>
              <button onClick={handleManualSubmit} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg">保存并入库</button>
           </div>
         )}
      </div>
      {showCamera && <CameraModal onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
    </div>
  );
};

export default ImportProducts;
