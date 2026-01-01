
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, FileSpreadsheet, Edit, X, ArrowRight, Image as ImageIcon, Trash2, ScanLine, AlertTriangle, CheckCircle, AlertOctagon, Download, FileText, Check, Loader2 } from 'lucide-react';
import CameraModal from '../components/CameraModal';
import BarcodeScanner from '../components/BarcodeScanner';
import * as XLSX from 'xlsx';
import { useApp } from '../App';
import { Product, Batch, RoleLevel, LogAction } from '../types';
import { supabase, syncProductStock } from '../supabase';
import imageCompression from 'browser-image-compression';

// 6.2 Loading Button Component (Local Definition)
const LoadingButton = ({ onClick, loading, children, className, disabled }: any) => (
    <button 
        onClick={onClick} 
        disabled={loading || disabled} 
        className={`${className} ${loading || disabled ? 'opacity-70 cursor-not-allowed grayscale' : ''} flex items-center justify-center gap-2`}
    >
        {loading ? (
            <>
                <Loader2 className="w-4 h-4 animate-spin"/>
                <span>处理中...</span>
            </>
        ) : children}
    </button>
);

// --- Type Definitions for Import ---
interface ImportData {
    name: string;
    batchNumber: string;
    quantityBig: number;
    quantitySmall: number;
    unitBig: string;
    unitSmall: string;
    conversionRate: number;
    expiryDate: string | null;
    category: string;
    sku: string;
    notes: string;
    image_url?: string;
    source: 'manual' | 'excel';
}

const DEFAULT_IMPORT: ImportData = {
    name: '', batchNumber: '', quantityBig: 0, quantitySmall: 0,
    unitBig: '整', unitSmall: '散', conversionRate: 10,
    expiryDate: null, category: '未分类', sku: '', notes: '', source: 'manual'
};

const SYSTEM_FIELDS: { key: keyof ImportData; label: string; required?: boolean }[] = [
    { key: 'name', label: '商品名称', required: true },
    { key: 'batchNumber', label: '批号', required: true },
    { key: 'quantityBig', label: '整数量', required: true },
    { key: 'quantitySmall', label: '散数量' },
    { key: 'unitBig', label: '整单位名称' },
    { key: 'unitSmall', label: '散单位名称' },
    { key: 'conversionRate', label: '换算制' },
    { key: 'expiryDate', label: '有效期' },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: '分类' },
    { key: 'notes', label: '备注' },
];

// --- Helpers ---
// 17.3. 引入压缩库并设置参数
const compressImage = async (file: File): Promise<File> => {
    const options = { 
        maxSizeMB: 0.2, // 200KB
        maxWidthOrHeight: 1024, // 1024px
        useWebWorker: true 
    };
    try { 
        return await imageCompression(file, options); 
    } catch (e) { 
        console.error("Compression Error:", e); 
        return file; // Fallback to original if compression fails
    }
};

const base64ToBlob = async (base64: string): Promise<Blob> => { 
    const res = await fetch(base64); 
    return res.blob(); 
};

// --- Components ---

// 17.1.2 Consistency Modal
const ConsistencyModal = ({ conflict, onClose, onResolve }: { conflict: any, onClose: () => void, onResolve: (action: 'update' | 'keep') => void }) => {
    if (!conflict) return null;
    const { newProd, oldProd } = conflict;
    const changes = [
        { label: '分类', key: 'category', old: oldProd.category, new: newProd.category },
        { label: 'SKU', key: 'sku', old: oldProd.sku, new: newProd.sku },
        { label: '大单位', key: 'unitBig', old: oldProd.unitBig, new: newProd.unitBig },
        { label: '小单位', key: 'unitSmall', old: oldProd.unitSmall, new: newProd.unitSmall },
        { label: '换算制', key: 'conversionRate', old: oldProd.conversionRate, new: newProd.conversionRate },
    ].filter(c => c.old != c.new);

    if (newProd.image_url && newProd.image_url !== oldProd.image_url) {
        changes.push({ label: '图片', key: 'image', old: '原图', new: '新图' });
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl border-2 border-orange-500">
                <div className="flex items-center gap-3 mb-4 text-orange-600"><AlertOctagon className="w-8 h-8" /><h3 className="text-xl font-bold">检测到基础信息变更</h3></div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">商品 <span className="font-bold text-gray-900 dark:text-white">“{newProd.name}”</span> 的部分属性与库中现有数据不一致。</p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6 text-sm">
                    <div className="grid grid-cols-3 font-bold border-b dark:border-gray-600 pb-2 mb-2 text-gray-500"><span>属性</span><span>原值</span><span className="text-orange-600">新值</span></div>
                    {changes.map((c, i) => (<div key={i} className="grid grid-cols-3 py-1"><span className="text-gray-500">{c.label}</span><span className="text-gray-800 dark:text-gray-200 truncate pr-2">{c.old}</span><span className="font-bold text-orange-600 truncate">{c.new}</span></div>))}
                </div>
                <div className="flex justify-end gap-3">
                    <button onClick={() => onResolve('keep')} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold">保留原值</button>
                    <button onClick={() => onResolve('update')} className="px-4 py-2 bg-orange-600 text-white rounded-xl font-bold shadow-lg">确认更新</button>
                </div>
            </div>
        </div>
    );
};

// 17.4 Excel Mapping & Preview
const ExcelConfigurator = ({ file, data, onClose, onConfirm }: { file: File, data: any[], onClose: () => void, onConfirm: (mapping: any) => void }) => {
    const excelHeaders = data.length > 0 ? Object.keys(data[0]) : [];
    const [mapping, setMapping] = useState<Record<string, string>>({});

    // 17.4.4 Smart Parsing (Auto-Match)
    useEffect(() => {
        const saved = localStorage.getItem('excel_mapping_config');
        if (saved) {
            setMapping(JSON.parse(saved));
        } else {
            const newMapping: any = {};
            const keywords: any = {
                'name': ['品名', '名称', '商品', 'Name'],
                'batchNumber': ['批号', 'Batch'],
                'quantityBig': ['数量', '整', 'Qty'],
                'expiryDate': ['有效期', '过期', 'Exp'],
                'unitBig': ['单位', 'Unit']
            };
            SYSTEM_FIELDS.forEach(field => {
                const match = excelHeaders.find(h => keywords[field.key]?.some((k: string) => h.includes(k)) || h === field.label);
                if (match) newMapping[field.key] = match;
            });
            setMapping(newMapping);
        }
    }, [excelHeaders]);

    const handleConfirm = () => {
        const missing = SYSTEM_FIELDS.filter(f => f.required && !mapping[f.key]);
        if (missing.length > 0) return alert(`请映射必填字段: ${missing.map(f => f.label).join(', ')}`);
        // 17.4.5.3 Memory
        localStorage.setItem('excel_mapping_config', JSON.stringify(mapping));
        onConfirm(mapping);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
               <h3 className="font-bold flex items-center gap-2"><FileSpreadsheet className="text-green-600"/> Excel 映射配置</h3>
               <button onClick={onClose}><X className="text-gray-400"/></button>
            </div>
            
            {/* 17.4.2 Top: Mappings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SYSTEM_FIELDS.map(field => (
                    <div key={field.key} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                        <label className="text-xs font-bold text-gray-500 mb-1 block">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <select 
                            value={mapping[field.key] || ''} 
                            onChange={e => setMapping({...mapping, [field.key]: e.target.value})}
                            className="w-full p-2 text-sm border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none"
                        >
                            <option value="">-- 选择列 --</option>
                            {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                ))}
            </div>

            {/* 17.4.2 Bottom: Scrollable Preview */}
            <div className="border rounded-xl overflow-hidden dark:border-gray-700">
                <div className="bg-gray-100 dark:bg-gray-900 p-2 text-xs font-bold text-gray-500">
                    Excel 原文预览 (前5行) - <span className="font-normal">请确保上方映射配置正确</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 sticky top-0">
                            <tr>
                                {excelHeaders.map(header => {
                                    // Find if this header is mapped to any system field
                                    const mappedKey = Object.keys(mapping).find(key => mapping[key] === header);
                                    const mappedLabel = mappedKey ? SYSTEM_FIELDS.find(f => f.key === mappedKey)?.label : null;
                                    
                                    return (
                                        <th key={header} className="p-2 whitespace-nowrap border-b dark:border-gray-700 border-r dark:border-gray-700 last:border-r-0 min-w-[100px]">
                                            <div className="font-bold text-gray-700 dark:text-gray-200">{header}</div>
                                            {mappedLabel && <div className="text-xs text-blue-500 font-normal mt-0.5">→ {mappedLabel}</div>}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {data.slice(0, 5).map((row, i) => (
                                <tr key={i} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    {excelHeaders.map((header, idx) => (
                                        <td key={idx} className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300 border-r dark:border-gray-700 last:border-r-0">
                                            {row[header] !== undefined && row[header] !== null ? String(row[header]) : ''}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <button onClick={handleConfirm} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">开始导入</button>
        </div>
    );
};

const ImportProducts = () => {
  const { currentStore, user, reloadData, products } = useApp();
  const [activeTab, setActiveTab] = useState<'excel' | 'manual'>('excel');
  
  // Manual State
  const [manualForm, setManualForm] = useState<ImportData>(DEFAULT_IMPORT);
  const [showCamera, setShowCamera] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // 6.2 Lock
  
  // Image handling
  const [previewImage, setPreviewImage] = useState<string | null>(null); // For display
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // For upload
  
  const [manualSuggestions, setManualSuggestions] = useState<Product[]>([]);

  // Excel State
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [showExcelConfig, setShowExcelConfig] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Flow Control
  const [conflictData, setConflictData] = useState<any>(null);
  const [pendingTask, setPendingTask] = useState<ImportData | null>(null);

  // 17.3 Image Upload Logic (Reusable)
  const processAndUploadImage = async (file: File): Promise<string> => {
      // 1. Compress
      const compressed = await compressImage(file);
      // 2. Upload
      const fileName = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`;
      const { data, error } = await supabase.storage.from('images').upload(fileName, compressed, {
          contentType: 'image/jpeg',
          upsert: false
      });
      if (error) {
          console.error("Upload failed:", error);
          throw error; // Explicitly throw error as requested
      }
      // 3. Get Public URL
      const { data: publicData } = supabase.storage.from('images').getPublicUrl(fileName);
      return publicData.publicUrl;
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setSelectedFile(file);
          setPreviewImage(URL.createObjectURL(file));
      }
  };

  const handleCameraCapture = (base64: string) => {
      setPreviewImage(base64);
      // Convert base64 to file for unified upload logic
      base64ToBlob(base64).then(blob => {
          setSelectedFile(new File([blob], "camera_capture.jpg", { type: "image/jpeg" }));
      });
      setShowCamera(false);
  };

  // 17.1 Logic Flow Implementation
  const executeImportLogic = async (data: ImportData, resolveMode: 'update' | 'keep' | null) => {
      // Data Cleaning & Type Enforcement
      const safeData = {
          ...data,
          unitBig: data.unitBig || '整',
          unitSmall: data.unitSmall || '散',
          conversionRate: Number(data.conversionRate) || 10,
          quantityBig: Number(data.quantityBig) || 0,
          quantitySmall: Number(data.quantitySmall) || 0,
          expiryDate: data.expiryDate || null,
          category: data.category || '未分类',
          sku: data.sku || ''
      };

      // Step 1: Identity Check
      let product = products.find(p => p.name === safeData.name && p.storeId === currentStore.id);
      let productId = product?.id;
      let isNewProduct = false;

      if (product) {
          // Step 2: Consistency Check (Manual only alert)
          if (data.source === 'manual' && !resolveMode) {
              const isConsistent = 
                  (safeData.category === '未分类' || product.category === safeData.category) && 
                  (!safeData.sku || product.sku === safeData.sku) && 
                  (product.unitBig === safeData.unitBig) && 
                  (product.unitSmall === safeData.unitSmall) && 
                  (product.conversionRate == safeData.conversionRate);
              
              if (!isConsistent) {
                  return { status: 'conflict', conflict: { newProd: safeData, oldProd: product } };
              }
          }

          if (resolveMode === 'update') {
               await supabase.from('products').update({ 
                   category: safeData.category !== '未分类' ? safeData.category : product.category, 
                   sku: safeData.sku || product.sku, 
                   unit_big: safeData.unitBig, 
                   unit_small: safeData.unitSmall, 
                   conversion_rate: safeData.conversionRate, 
                   image_url: safeData.image_url || product.image_url 
               }).eq('id', productId);
               // Optimistic update for next logic steps
               product = { ...product, ...safeData } as Product;
          }
      } else {
          // New Product
          isNewProduct = true;
          // Calculate initial totals to avoid 0 default
          // Initial insertion directly sets quantity_big and quantity_small
          const { data: newProd, error } = await supabase.from('products').insert({ 
              id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, 
              store_id: currentStore.id, 
              name: safeData.name, 
              category: safeData.category, 
              sku: safeData.sku, 
              image_url: safeData.image_url || null, 
              notes: safeData.notes, 
              unit_big: safeData.unitBig, 
              unit_small: safeData.unitSmall, 
              conversion_rate: safeData.conversionRate,
              quantity_big: safeData.quantityBig, // Write initial values explicitly
              quantity_small: safeData.quantitySmall
          }).select().single();
          
          if (error) return { status: 'error', message: 'Create Product Failed: ' + error.message };
          productId = newProd.id;
      }

      // Step 3: Batch Check
      const { data: existingBatches } = await supabase.from('batches').select('*').eq('product_id', productId).eq('batch_number', safeData.batchNumber);
      const existingBatch = existingBatches?.[0];
      
      // Calculate Total Quantity correctly: (Big * Rate) + Small
      const importTotal = (safeData.quantityBig * safeData.conversionRate) + safeData.quantitySmall;

      if (existingBatch) {
          // Replenish
          if (safeData.expiryDate && existingBatch.expiry_date && safeData.expiryDate !== existingBatch.expiry_date) {
              return { status: 'error', message: `Expiry Conflict! Existing: ${existingBatch.expiry_date}` };
          }
          // Merge quantities
          const newTotal = (Number(existingBatch.total_quantity) || 0) + importTotal;
          const { error } = await supabase.from('batches').update({ total_quantity: newTotal }).eq('id', existingBatch.id);
          if (error) return { status: 'error', message: 'Batch Update Failed' };
      } else {
          // New Batch
          const { error } = await supabase.from('batches').insert({ 
              id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, 
              product_id: productId, 
              batch_number: safeData.batchNumber, 
              expiry_date: safeData.expiryDate, 
              total_quantity: importTotal,
              conversion_rate: safeData.conversionRate,
              notes: safeData.notes 
          });
          if (error) return { status: 'error', message: 'Batch Insert Failed' };
      }

      // Final Sync Step: Update product totals if it was an existing product (replenishment)
      // New products already got values inserted, but syncing guarantees correctness if batch total slightly differed (rare)
      if (!isNewProduct && productId) {
          await syncProductStock(productId);
      }

      return { status: 'success', productId: isNewProduct ? productId : null };
  };

  // --- Manual Import Handlers ---
  const handleManualSubmit = async (resolveMode: 'update' | 'keep' | null = null) => {
      if (!manualForm.name || !manualForm.batchNumber) return alert('名称和批号必填');
      
      setIsSubmitting(true); // Lock start
      try {
          let imageUrl = '';
          if (selectedFile) {
              imageUrl = await processAndUploadImage(selectedFile);
          }

          const res = await executeImportLogic({ ...manualForm, image_url: imageUrl || undefined }, resolveMode);
          
          if (res.status === 'conflict') {
              setConflictData(res.conflict);
              setPendingTask({ ...manualForm, image_url: imageUrl || undefined });
          } else if (res.status === 'error') {
              alert(`失败: ${res.message}`);
          } else {
              await supabase.from('operation_logs').insert({ id: `log_${Date.now()}`, action_type: LogAction.ENTRY_INBOUND, target_id: res.productId || 'manual', target_name: manualForm.name, change_desc: `[手动入库]: ${manualForm.name} × ${manualForm.quantityBig}${manualForm.unitBig}${manualForm.quantitySmall}${manualForm.unitSmall}`, operator_id: user?.id, operator_name: user?.username, role_level: user?.role, snapshot_data: {}, created_at: new Date().toISOString() });
              alert('入库成功');
              setManualForm(DEFAULT_IMPORT);
              setPreviewImage(null);
              setSelectedFile(null);
              await reloadData();
          }
      } catch (err: any) {
          alert('Error: ' + err.message);
      } finally {
          setIsSubmitting(false); // Lock release
      }
  };

  // --- Excel Import Handlers ---
  const handleExcelFile = (file: File) => {
      if (file) {
          setExcelFile(file);
          const reader = new FileReader();
          reader.onload = (evt) => {
              const wb = XLSX.read(evt.target?.result, { type: 'binary' });
              const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
              setExcelData(data);
              setShowExcelConfig(true);
          };
          reader.readAsBinaryString(file);
      }
  };

  // 17.4.1 Drag and Drop Support
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      if (files && files[0]) {
          const file = files[0];
          if (file.type.includes("sheet") || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
              handleExcelFile(file);
          } else {
              alert("请上传 Excel 文件 (.xlsx, .xls)");
          }
      }
  };

  const processExcelImport = async (mapping: any) => {
      setShowExcelConfig(false);
      let success = 0;
      const errors: any[] = [];

      for (const row of excelData) {
          const name = String(row[mapping.name] || '').trim();
          const batch = String(row[mapping.batchNumber] || '').trim();
          
          if (!name || !batch) {
              errors.push({ ...row, _reason: 'Missing Name/Batch' });
              continue;
          }

          const importData: ImportData = {
              name, 
              batchNumber: batch,
              quantityBig: Number(row[mapping.quantityBig]) || 0,
              quantitySmall: Number(row[mapping.quantitySmall]) || 0,
              unitBig: row[mapping.unitBig] || '整',
              unitSmall: row[mapping.unitSmall] || '散',
              conversionRate: Number(row[mapping.conversionRate]) || 10,
              expiryDate: row[mapping.expiryDate], // Assume text/date valid for now
              sku: row[mapping.sku] || '',
              category: row[mapping.category] || '',
              notes: row[mapping.notes] || '',
              source: 'excel'
          };

          const res = await executeImportLogic(importData, 'keep');
          if (res.status === 'success') success++;
          else errors.push({ ...row, _reason: res.message });
      }

      if (errors.length > 0) {
          const ws = XLSX.utils.json_to_sheet(errors);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Errors");
          XLSX.writeFile(wb, `import_errors_${Date.now()}.xlsx`);
      }

      if (success > 0) {
          await supabase.from('operation_logs').insert({ id: `log_${Date.now()}`, action_type: LogAction.BATCH_IMPORT, target_id: 'batch', target_name: 'Excel Import', change_desc: `[批量导入]: 成功 ${success} 条`, operator_id: user?.id, operator_name: user?.username, role_level: user?.role, snapshot_data: { count: success }, created_at: new Date().toISOString() });
          await reloadData();
      }
      
      alert(`导入完成\n成功: ${success}\n失败: ${errors.length}\n${errors.length > 0 ? "已下载失败报告" : ""}`);
  };

  if (currentStore.isParent) return <div className="text-center p-10 font-bold text-gray-500">总店模式不可录入，请切换至子门店</div>;

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      {/* Modals */}
      {showCamera && <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
      {showBarcodeScanner && <BarcodeScanner onScan={(code) => { setManualForm({...manualForm, batchNumber: code}); setShowBarcodeScanner(false); }} onClose={() => setShowBarcodeScanner(false)} />}
      {conflictData && <ConsistencyModal conflict={conflictData} onClose={() => { setConflictData(null); setPendingTask(null); }} onResolve={(act) => { setConflictData(null); if (pendingTask) handleManualSubmit(act); }} />}
      {showExcelConfig && excelFile && <ExcelConfigurator file={excelFile} data={excelData} onClose={() => setShowExcelConfig(false)} onConfirm={processExcelImport} />}

      <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold dark:text-white">商品入库</h2>
          <span className="text-sm bg-blue-100 text-blue-600 px-3 py-1 rounded-full">{currentStore.name}</span>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-xl w-fit">
          <button onClick={() => setActiveTab('excel')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'excel' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-500'}`}>Excel 批量导入</button>
          <button onClick={() => setActiveTab('manual')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'manual' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-500'}`}>手动录入</button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          {activeTab === 'excel' ? (
              <div className="text-center py-10 space-y-4">
                  <input type="file" ref={excelInputRef} hidden accept=".xlsx, .xls" onChange={(e) => e.target.files && handleExcelFile(e.target.files[0])} />
                  <div 
                    onClick={() => excelInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-10 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                  >
                      <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                          <FileSpreadsheet className="w-10 h-10 text-green-500" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200">点击上传 或 拖拽文件到此处</h3>
                      <p className="text-sm text-gray-400 mt-2">支持 .xlsx, .xls 格式</p>
                  </div>
                  <div className="flex justify-center gap-4 text-sm text-blue-500">
                      <button className="hover:underline flex items-center gap-1"><Download className="w-4 h-4"/> 下载标准模板</button>
                  </div>
              </div>
          ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                  {/* Image Upload 17.3 Implementation */}
                  <div className="flex justify-center flex-col items-center gap-2">
                      <input type="file" ref={imageInputRef} hidden accept="image/*" onChange={handleImageFileSelect} />
                      <div 
                        className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 relative group"
                        onClick={() => imageInputRef.current?.click()}
                      >
                          {previewImage ? <img src={previewImage} className="w-full h-full object-cover"/> : <Camera className="w-8 h-8 text-gray-400"/>}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs">点击上传</div>
                      </div>
                      <button onClick={() => setShowCamera(true)} className="text-sm text-blue-600 flex items-center gap-1"><ScanLine className="w-4 h-4"/> 或使用摄像头</button>
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-1 md:col-span-2 relative">
                          <label className="text-sm font-bold text-gray-500 mb-1 block">商品名称 <span className="text-red-500">*</span></label>
                          <input 
                            value={manualForm.name}
                            onChange={e => {
                                const val = e.target.value;
                                setManualForm({...manualForm, name: val});
                                // 17.5.2.2 Typeahead Logic
                                if (val) {
                                    const matches = products.filter(p => p.storeId === currentStore.id && p.name.includes(val));
                                    setManualSuggestions(matches);
                                } else setManualSuggestions([]);
                            }}
                            onBlur={() => setTimeout(() => setManualSuggestions([]), 200)}
                            className="w-full p-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="输入商品名称..."
                          />
                          {/* Suggestions Dropdown */}
                          {manualSuggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 shadow-xl border dark:border-gray-600 rounded-xl mt-1 z-20 max-h-40 overflow-y-auto">
                                  {manualSuggestions.map(p => (
                                      <div key={p.id} 
                                           onClick={() => setManualForm(prev => ({...prev, name: p.name, unitBig: p.unitBig, unitSmall: p.unitSmall, conversionRate: p.conversionRate, category: p.category, sku: p.sku}))}
                                           className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b dark:border-gray-700 last:border-0"
                                      >
                                          <div className="font-bold text-sm">{p.name}</div>
                                          <div className="text-xs text-gray-400">SKU: {p.sku} | {p.unitBig}/{p.unitSmall}</div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      <div className="col-span-1 md:col-span-2">
                          <label className="text-sm font-bold text-gray-500 mb-1 block">批号 <span className="text-red-500">*</span></label>
                          <div className="flex gap-2">
                              <input 
                                value={manualForm.batchNumber}
                                onChange={e => setManualForm({...manualForm, batchNumber: e.target.value})}
                                className="flex-1 p-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none font-mono"
                              />
                              <button onClick={() => setShowBarcodeScanner(true)} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-blue-50"><ScanLine/></button>
                          </div>
                      </div>

                      <div className="col-span-1 md:col-span-1">
                          <label className="text-sm font-bold text-gray-500 mb-1 block">有效期</label>
                          <input type="date" value={manualForm.expiryDate || ''} onChange={e => setManualForm({...manualForm, expiryDate: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none"/>
                      </div>
                      <div className="col-span-1 md:col-span-1">
                          <label className="text-sm font-bold text-gray-500 mb-1 block">SKU</label>
                          <input value={manualForm.sku} onChange={e => setManualForm({...manualForm, sku: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none"/>
                      </div>
                      
                      <div className="col-span-1 md:col-span-2 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900">
                          <h4 className="text-xs font-bold text-blue-600 mb-3">库存数量 & 单位</h4>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="text-xs text-gray-500">整数量 ({manualForm.unitBig})</label>
                                  <input type="number" value={manualForm.quantityBig} onChange={e => setManualForm({...manualForm, quantityBig: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">散数量 ({manualForm.unitSmall})</label>
                                  <input type="number" value={manualForm.quantitySmall} onChange={e => setManualForm({...manualForm, quantitySmall: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">大单位名称</label>
                                  <input value={manualForm.unitBig} onChange={e => setManualForm({...manualForm, unitBig: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">小单位名称</label>
                                  <input value={manualForm.unitSmall} onChange={e => setManualForm({...manualForm, unitSmall: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                              </div>
                              <div className="col-span-2">
                                  <label className="text-xs text-gray-500">换算制 (1{manualForm.unitBig} = ?{manualForm.unitSmall})</label>
                                  <input type="number" value={manualForm.conversionRate} onChange={e => setManualForm({...manualForm, conversionRate: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                              </div>
                          </div>
                      </div>

                      <div className="col-span-1 md:col-span-1">
                          <label className="text-sm font-bold text-gray-500 mb-1 block">分类</label>
                          <input value={manualForm.category} onChange={e => setManualForm({...manualForm, category: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none"/>
                      </div>
                      <div className="col-span-1 md:col-span-1">
                          <label className="text-sm font-bold text-gray-500 mb-1 block">备注</label>
                          <input value={manualForm.notes} onChange={e => setManualForm({...manualForm, notes: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none"/>
                      </div>
                  </div>

                  <LoadingButton onClick={() => handleManualSubmit()} loading={isSubmitting} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5"/> 确认入库
                  </LoadingButton>
              </div>
          )}
      </div>
    </div>
  );
};

export default ImportProducts;
