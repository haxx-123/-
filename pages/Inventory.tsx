
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ChevronDown, ChevronRight, Plus, Package, FileText, Edit2, X, Save, ArrowRightLeft, Info, ScanLine, Filter, MapPin, Trash2, Image as ImageIcon, ChevronLeft, CheckSquare, Square, Box, Loader2, Calculator, AlertTriangle, Calendar, Camera, Zap, ShoppingCart, MinusCircle, PlusCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Product, Batch, RoleLevel, LogAction } from '../types';
import { useApp } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import BarcodeScanner from '../components/BarcodeScanner';
import { supabase, supabaseStorage, syncProductStock } from '../supabase';
import { getDirectImageUrl } from '../utils/common';
import * as XLSX from 'xlsx';
import imageCompression from 'browser-image-compression';

// 6.2 交互锁与 Loading 状态组件
const LoadingButton = ({ onClick, loading, children, className, disabled }: any) => (
    <button 
        onClick={onClick} 
        disabled={loading || disabled} 
        className={`${className} ${loading || disabled ? 'opacity-70 cursor-not-allowed grayscale' : ''} flex items-center justify-center gap-2 transition-all active:scale-95`}
    >
        {loading ? (
            <>
                <Loader2 className="w-4 h-4 animate-spin"/>
                <span>处理中...</span>
            </>
        ) : children}
    </button>
);

// 13. 分页功能组件 (Updated)
const Pagination = ({ current, total, pageSize, onChange }: { current: number, total: number, pageSize: number, onChange: (p: number) => void }) => {
    const totalPages = Math.ceil(total / pageSize);
    const [inputVal, setInputVal] = useState(current.toString());

    useEffect(() => setInputVal(current.toString()), [current]);

    const handleBlur = () => {
        let val = parseInt(inputVal);
        if (isNaN(val)) val = 1;
        if (val < 1) val = 1;
        if (val > totalPages) val = totalPages;
        onChange(val);
        setInputVal(val.toString());
    };

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-2 mt-4 select-none">
            <button 
                onClick={() => onChange(Math.max(1, current - 1))} 
                disabled={current === 1} 
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-600 dark:text-gray-400 transition-colors"
            >
                <ChevronLeft className="w-5 h-5"/>
            </button>
            
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <input 
                    className="w-8 text-center bg-transparent outline-none font-bold text-gray-700 dark:text-gray-200 text-sm" 
                    value={inputVal} 
                    onChange={(e) => setInputVal(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                />
                <span className="text-gray-400">/</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">{totalPages}</span>
            </div>

            <button 
                onClick={() => onChange(Math.min(totalPages, current + 1))} 
                disabled={current === totalPages} 
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-600 dark:text-gray-400 transition-colors"
            >
                <ChevronRight className="w-5 h-5"/>
            </button>
        </div>
    );
};

// 16.2.3 Image Lightbox
const ImageLightbox = ({ src, onClose }: { src: string, onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in" onClick={onClose}>
        <img src={getDirectImageUrl(src)} className="max-w-full max-h-full rounded-lg shadow-2xl" alt="Product Full" />
        <button className="absolute top-4 right-4 text-white p-2 bg-gray-800 rounded-full"><X className="w-6 h-6"/></button>
    </div>
);

// --- Interface for POS List ---
interface PosItem {
    tempId: string; // Unique ID for list rendering
    product: Product;
    qtyBig: number;
    qtySmall: number;
}

// --- Modals & Components ---

const PosOverlay = ({ 
    items, 
    onClose, 
    onScan, 
    onUpdateQty, 
    onRemove, 
    onSubmit, 
    loading 
}: { 
    items: PosItem[], 
    onClose: () => void, 
    onScan: (code: string) => void, 
    onUpdateQty: (id: string, field: 'qtyBig' | 'qtySmall', val: number) => void,
    onRemove: (id: string) => void,
    onSubmit: () => void,
    loading: boolean
}) => {
    // New Design: Centered Modal with fixed height percentages (30% Scanner / 55% List / 15% Footer)
    return (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            {/* Modal Container: Enlarged max-width for better desktop experience */}
            <div className="bg-white dark:bg-gray-800 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-scale-up border dark:border-gray-700">
                
                {/* 1. Top 30%: Scanner */}
                <div className="h-[30%] bg-black relative shrink-0">
                    <BarcodeScanner 
                        onScan={onScan} 
                        onClose={() => {}} // No-op, close handled by modal X
                        continuous={true}
                        isEmbedded={true}
                    />
                    {/* Visual cue for scanner area */}
                    <div className="absolute top-2 left-2 text-[10px] text-white/70 bg-black/30 px-2 py-0.5 rounded backdrop-blur-sm flex items-center gap-1 pointer-events-none">
                        <Zap className="w-3 h-3 text-yellow-400 fill-current"/> 扫码区域
                    </div>
                </div>

                {/* 2. Middle 55%: List */}
                <div className="h-[55%] flex flex-col bg-white dark:bg-gray-800 relative">
                    {/* List Header */}
                    <div className="p-3 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10 shrink-0">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-orange-500"/> 
                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200">待出库清单 ({items.length})</span>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500"><X className="w-5 h-5"/></button>
                    </div>
                    
                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {/* Empty State */}
                        {items.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                <ScanLine className="w-12 h-12 mb-2 stroke-1"/>
                                <p className="text-xs">上方扫码或手动添加</p>
                            </div>
                        )}
                        {/* Items */}
                        {items.map(item => (
                            <div key={item.tempId} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 flex items-center gap-2 border border-gray-100 dark:border-gray-700">
                                <button onClick={() => onRemove(item.tempId)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm truncate text-gray-800 dark:text-gray-200">{item.product.name}</div>
                                    <div className="text-xs text-gray-500 font-mono truncate">{item.product.sku}</div>
                                </div>
                                {/* Qty Inputs */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <div className="flex flex-col items-center w-12">
                                        <input type="number" min="0" className="w-full text-center p-0.5 border rounded text-sm font-bold bg-white dark:bg-gray-600 dark:border-gray-500 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" value={item.qtyBig} onChange={(e) => onUpdateQty(item.tempId, 'qtyBig', parseInt(e.target.value)||0)} onFocus={(e) => e.target.select()}/>
                                        <span className="text-[10px] text-gray-400">{item.product.unitBig}</span>
                                    </div>
                                    <div className="flex flex-col items-center w-12">
                                        <input type="number" min="0" className="w-full text-center p-0.5 border rounded text-sm font-bold bg-white dark:bg-gray-600 dark:border-gray-500 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" value={item.qtySmall} onChange={(e) => onUpdateQty(item.tempId, 'qtySmall', parseInt(e.target.value)||0)} onFocus={(e) => e.target.select()}/>
                                        <span className="text-[10px] text-gray-400">{item.product.unitSmall}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Bottom 15%: Footer */}
                <div className="h-[15%] p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 flex flex-col justify-center gap-2 shrink-0">
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                        <span>自动扣减批次 (FIFO)</span>
                        <span>共 {items.length} 项</span>
                    </div>
                    <LoadingButton 
                        loading={loading} 
                        disabled={items.length === 0}
                        onClick={onSubmit} 
                        className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 text-sm hover:scale-[1.02] transition-transform"
                    >
                        <CheckCircle className="w-4 h-4"/> 确认出库
                    </LoadingButton>
                </div>

            </div>
        </div>
    );
};

// ... (Other Modals: AddBatch, Billing, ProductEdit, Stocktaking kept as is) ...

const AddBatchModal = ({ product, onClose, onConfirm }: any) => {
    const [form, setForm] = useState({
        batchNumber: '',
        expiryDate: '',
        quantityBig: 0,
        quantitySmall: 0,
        conversionRate: product.conversionRate || 10
    });
    const [loading, setLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const batchInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async () => {
        if (loading) return;
        if (!form.batchNumber) return alert("批号为必填项");
        
        setLoading(true);
        const rate = Number(form.conversionRate) || 10;
        const big = Number(form.quantityBig) || 0;
        const small = Number(form.quantitySmall) || 0;
        const total = (big * rate) + small;
        
        await onConfirm({
            ...form,
            conversionRate: rate,
            totalQuantity: total,
            expiryDate: form.expiryDate || null
        });
        setLoading(false);
    };

    const handleScan = (code: string) => {
        setShowScanner(false);
        if (code === product.sku) {
            setTimeout(() => batchInputRef.current?.focus(), 100);
        } else {
            if (code !== product.sku) {
                if(!window.confirm(`警告: 扫描的条码 (${code}) 与当前商品 SKU (${product.sku}) 不匹配。\n\n是否仍将其填入“批号”栏？`)) {
                    return;
                }
            }
            setForm(prev => ({ ...prev, batchNumber: code }));
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Plus className="w-5 h-5 text-blue-500"/> 新增批号</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
                </div>
                <div className="space-y-4 text-sm">
                    <div>
                        <label className="block text-xs font-bold mb-1" style={{color: 'var(--text-secondary)'}}>批号 <span className="text-red-500">*</span></label>
                        <div className="flex gap-2">
                            <input ref={batchInputRef} className="w-full p-2 border rounded font-mono" value={form.batchNumber} onChange={e => setForm({...form, batchNumber: e.target.value})} placeholder="扫描或输入" />
                            <button onClick={() => setShowScanner(true)} className="p-2 bg-gray-100 rounded hover:bg-gray-200"><ScanLine className="w-4 h-4 text-gray-600"/></button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs mb-1" style={{color: 'var(--text-secondary)'}}>有效期 (选填)</label>
                        <input type="date" className="w-full p-2 border rounded" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs mb-1" style={{color: 'var(--text-secondary)'}}>整 ({product.unitBig || '整'})</label>
                            <input type="number" className="w-full p-2 border rounded" value={form.quantityBig} onChange={e => setForm({...form, quantityBig: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-xs mb-1" style={{color: 'var(--text-secondary)'}}>散 ({product.unitSmall || '散'})</label>
                            <input type="number" className="w-full p-2 border rounded" value={form.quantitySmall} onChange={e => setForm({...form, quantitySmall: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div>
                         <label className="block text-xs mb-1" style={{color: 'var(--text-secondary)'}}>换算制 (默认 {product.conversionRate})</label>
                         <input type="number" className="w-full p-2 border rounded" value={form.conversionRate} onChange={e => setForm({...form, conversionRate: Number(e.target.value)})} />
                    </div>
                </div>
                <LoadingButton onClick={handleSubmit} loading={loading} className="w-full py-3 mt-6 bg-blue-600 text-white rounded-xl font-bold">
                    确认添加
                </LoadingButton>
            </div>
        </div>
    );
};

const BillingModal = ({ batch, product, onClose, onConfirm }: any) => {
  const [type, setType] = useState<'in' | 'out'>('out');
  const [bigQty, setBigQty] = useState<number | ''>(''); 
  const [smallQty, setSmallQty] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  const rate = Number(batch.conversionRate) || 10;
  const safeRate = rate === 0 ? 10 : rate;
  const totalQty = Number(batch.totalQuantity) || 0;
  
  const currentBig = Math.floor(totalQty / safeRate);
  const currentSmall = totalQty % safeRate;
  const uBig = product.unitBig || '整';
  const uSmall = product.unitSmall || '散';

  const handleConfirm = async () => {
      if (loading) return;
      const b = Math.abs(parseInt(String(bigQty)) || 0);
      const s = Math.abs(parseInt(String(smallQty)) || 0);
      
      if (b === 0 && s === 0) return alert("请输入有效数量");
      
      const totalDelta = (b * safeRate) + s;

      if (type === 'out' && totalQty < totalDelta) {
          return alert(`库存不足！当前仅剩 ${currentBig}${uBig}${currentSmall}${uSmall}`);
      }
      
      setLoading(true);
      await onConfirm(type, totalDelta, { big: b, small: s });
      setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">常规开单</h3>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-4 text-sm">
            <div className="font-bold text-gray-800 dark:text-gray-200">{product.name}</div>
            <div className="flex justify-between mt-1 text-gray-500">
                <span>批号: <span className="font-mono">{batch.batchNumber}</span></span>
                <span>换算: 1{uBig}={safeRate}{uSmall}</span>
            </div>
            <div className="mt-2 text-center font-bold text-lg text-blue-600">
                当前: {currentBig}<span className="text-xs text-gray-400 mx-1">{uBig}</span>
                {currentSmall}<span className="text-xs text-gray-400 mx-1">{uSmall}</span>
            </div>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-4">
            <button onClick={() => setType('out')} className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${type==='out'?'bg-white dark:bg-gray-600 text-red-600 shadow-sm':'text-gray-500'}`}>出库</button>
            <button onClick={() => setType('in')} className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${type==='in'?'bg-white dark:bg-gray-600 text-green-600 shadow-sm':'text-gray-500'}`}>入库</button>
        </div>

        <div className="flex gap-2 items-end">
           <div className="flex-1">
               <label className="block text-xs font-bold text-gray-500 mb-1 text-center">{uBig}</label>
               <input type="number" min="0" value={bigQty} onChange={(e) => setBigQty(e.target.value === '' ? '' : Math.abs(parseInt(e.target.value)))} className="w-full p-3 border rounded-xl outline-none text-lg font-bold text-center" placeholder="0" />
           </div>
           <div className="flex-1">
               <label className="block text-xs font-bold text-gray-500 mb-1 text-center">{uSmall}</label>
               <input type="number" min="0" value={smallQty} onChange={(e) => setSmallQty(e.target.value === '' ? '' : Math.abs(parseInt(e.target.value)))} className="w-full p-3 border rounded-xl outline-none text-lg font-bold text-center" placeholder="0" />
           </div>
        </div>
        
        <LoadingButton onClick={handleConfirm} loading={loading} className={`w-full py-3 mt-6 text-white rounded-xl font-bold shadow-lg ${type === 'out' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
            确认{type === 'out' ? '出库' : '入库'}
        </LoadingButton>
      </div>
    </div>
  );
};

const ProductEditModal = ({ product, onClose, onSave }: any) => {
    const { user } = useApp(); // Need user info for logging
    const [form, setForm] = useState({...product});
    const [loading, setLoading] = useState(false);
    // Use getDirectImageUrl for initial display
    const [previewImage, setPreviewImage] = useState<string | null>(getDirectImageUrl(product.image_url) || null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file); // Store file for deferred upload
            setPreviewImage(URL.createObjectURL(file)); // Show local preview
        }
    };

    const handleSaveClick = async () => {
        setLoading(true);
        try {
            let finalImageUrl = form.image_url;
            let oldImageUrl = product.image_url; // Original image URL before edit

            // 1. Upload new image if selected (Deferred Upload Strategy)
            if (selectedFile) {
                const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true };
                const compressedFile = await imageCompression(selectedFile, options);
                const fileName = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`;
                
                // IMPORTANT: Explicitly convert to Blob to avoid 'Failed to fetch' error with Supabase JS v2
                const fileBody = new File([compressedFile], fileName, { type: 'image/jpeg' });

                // Upload via direct storage client
                const { error: uploadError } = await supabaseStorage.storage.from('images').upload(fileName, fileBody, {
                    contentType: 'image/jpeg',
                    upsert: false
                });
                
                if (uploadError) throw uploadError;
                
                // Get new public URL
                const { data: publicData } = supabaseStorage.storage.from('images').getPublicUrl(fileName);
                finalImageUrl = publicData.publicUrl;
            }

            // 2. Diff Logic for Logging
            const changes = [];
            const oldP = product;
            const newP = { ...form, image_url: finalImageUrl };

            if (oldP.name !== newP.name) changes.push(`名称: ${oldP.name}→${newP.name}`);
            if (oldP.sku !== newP.sku) changes.push(`SKU: ${oldP.sku}→${newP.sku}`);
            if (oldP.category !== newP.category) changes.push(`分类: ${oldP.category}→${newP.category}`);
            if (oldP.unitBig !== newP.unitBig) changes.push(`大单位: ${oldP.unitBig}→${newP.unitBig}`);
            if (oldP.unitSmall !== newP.unitSmall) changes.push(`小单位: ${oldP.unitSmall}→${newP.unitSmall}`);
            if (Number(oldP.conversionRate) !== Number(newP.conversionRate)) changes.push(`换算: ${oldP.conversionRate}→${newP.conversionRate}`);
            if (selectedFile) changes.push(`更新了商品图片`);
            if (oldP.notes !== newP.notes) changes.push(`更新了备注`);

            // Only update and log if there are changes
            if (changes.length > 0) {
                // 3. Update product with new image URL
                await onSave(newP);

                // 4. Log as ENTRY_ADJUST (User requested type mapping)
                const changeDesc = `[档案修改]: ${changes.join(' | ')}`;
                await supabase.from('operation_logs').insert({
                    id: `log_${Date.now()}`,
                    action_type: LogAction.ENTRY_ADJUST,
                    target_id: product.id,
                    target_name: product.name,
                    change_desc: changeDesc,
                    operator_id: user?.id,
                    operator_name: user?.username,
                    role_level: user?.role,
                    snapshot_data: { 
                        type: 'product_edit', 
                        originalProduct: product, 
                        newData: newP,
                        changes: changes 
                    },
                    created_at: new Date().toISOString()
                });
            }

            // 5. Cleanup old image (Only if new one uploaded successfully and different)
            if (selectedFile && oldImageUrl && oldImageUrl !== finalImageUrl) {
                const oldName = oldImageUrl.split('/').pop();
                // Safety check: ensure it looks like a generated filename and is from our storage
                if (oldName && (oldImageUrl.includes('supabase.co') || oldImageUrl.includes('stockwise.art'))) {
                    // Fire and forget cleanup to speed up UI
                    supabaseStorage.storage.from('images').remove([oldName]).then(({ error }) => {
                        if (error) console.warn("Old image cleanup warning:", error);
                    });
                }
            }
            
        } catch (err: any) {
            console.error("Save failed:", err);
            alert("保存失败: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Edit2 className="w-5 h-5 text-blue-500"/> 编辑商品档案</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
                </div>
                
                <div className="space-y-4">
                    <div className="flex flex-col items-center gap-2">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-24 h-24 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 relative group"
                        >
                            {previewImage ? (
                                <img src={previewImage} className="w-full h-full object-cover" alt="Product" />
                            ) : (
                                <ImageIcon className="w-8 h-8 text-gray-400" />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                                更换图片
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageChange} />
                        <button onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 font-bold">上传商品图</button>
                    </div>

                    <div><label className="text-xs font-bold block mb-1" style={{color:'var(--text-secondary)'}}>商品名称</label><input className="w-full border p-2 rounded" value={form.name} onChange={e=>setForm({...form, name: e.target.value})}/></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold block mb-1" style={{color:'var(--text-secondary)'}}>分类</label><input className="w-full border p-2 rounded" value={form.category} onChange={e=>setForm({...form, category: e.target.value})}/></div>
                        <div><label className="text-xs font-bold block mb-1" style={{color:'var(--text-secondary)'}}>SKU</label><input className="w-full border p-2 rounded" value={form.sku} onChange={e=>setForm({...form, sku: e.target.value})}/></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                        <div><label className="text-xs block mb-1" style={{color:'var(--text-secondary)'}}>大单位</label><input className="w-full border p-1 rounded" value={form.unitBig} onChange={e=>setForm({...form, unitBig: e.target.value})}/></div>
                        <div><label className="text-xs block mb-1" style={{color:'var(--text-secondary)'}}>小单位</label><input className="w-full border p-1 rounded" value={form.unitSmall} onChange={e=>setForm({...form, unitSmall: e.target.value})}/></div>
                        <div><label className="text-xs block mb-1" style={{color:'var(--text-secondary)'}}>默认换算</label><input type="number" className="w-full border p-1 rounded" value={form.conversionRate} onChange={e=>setForm({...form, conversionRate: Number(e.target.value)})}/></div>
                    </div>
                    <div><label className="text-xs font-bold block mb-1" style={{color:'var(--text-secondary)'}}>备注</label><textarea className="w-full border p-2 rounded" value={form.notes || ''} onChange={e=>setForm({...form, notes: e.target.value})}/></div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded text-sm font-bold">取消</button>
                    <LoadingButton onClick={handleSaveClick} loading={loading} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold shadow-lg">保存档案</LoadingButton>
                </div>
            </div>
        </div>
    );
};

const StocktakingModal = ({ batch, product, onClose, onSave }: any) => {
    const rate = Number(batch.conversionRate) || 10;
    const safeRate = rate === 0 ? 10 : rate;
    const totalQty = Number(batch.totalQuantity) || 0;
    const initialBig = Math.floor(totalQty / safeRate);
    const initialSmall = totalQty % safeRate;

    const [form, setForm] = useState({ 
        expiryDate: batch.expiryDate || '',
        actualBig: initialBig, 
        actualSmall: initialSmall, 
        conversionRate: rate,
        reason: '',
        notes: batch.notes || '',
        batchNumber: batch.batchNumber
    });
    const [loading, setLoading] = useState(false);

    const calculatedTotal = (Number(form.actualBig) * Number(form.conversionRate)) + Number(form.actualSmall);
    const deltaTotal = calculatedTotal - totalQty;
    const hasChange = deltaTotal !== 0 || form.expiryDate !== (batch.expiryDate || '') || form.conversionRate !== batch.conversionRate || form.batchNumber !== batch.batchNumber;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Calculator className="w-5 h-5 text-purple-500"/> 库存盘点 & 批次修正</h3>
                <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-gray-500 text-xs">批号</label><input className="w-full border-b font-mono font-bold bg-transparent outline-none" value={form.batchNumber} onChange={e => setForm({...form, batchNumber: e.target.value})} /></div>
                        <div><label className="text-gray-500 text-xs">有效期</label><input type="date" className="w-full border-b border-gray-300 dark:border-gray-600 bg-transparent outline-none" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})}/></div>
                    </div>
                    <div><label className="text-gray-500 text-xs">换算制</label><input type="number" value={form.conversionRate} onChange={e => setForm({...form, conversionRate: Number(e.target.value)})} className="w-full p-2 border rounded font-bold"/></div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-600">
                        <label className="block text-xs font-bold text-gray-500 mb-2 text-center">库存实盘数据</label>
                        <div className="flex gap-2 items-center">
                            <div className="flex-1 text-center"><input type="number" value={form.actualBig} onChange={e => setForm({...form, actualBig: Number(e.target.value)})} className="w-full p-2 text-center border rounded font-bold text-xl text-blue-600"/><span className="text-xs text-gray-400">{product.unitBig || '整'}</span></div>
                            <span className="text-gray-400 font-bold">+</span>
                            <div className="flex-1 text-center"><input type="number" value={form.actualSmall} onChange={e => setForm({...form, actualSmall: Number(e.target.value)})} className="w-full p-2 text-center border rounded font-bold text-xl text-green-600"/><span className="text-xs text-gray-400">{product.unitSmall || '散'}</span></div>
                        </div>
                    </div>
                    {hasChange && (
                        <div className="animate-fade-in"><label className="block text-xs font-bold text-red-500 mb-1">调整原因 (必填)*</label><input type="text" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full p-2 border border-red-200 rounded-lg focus:border-red-500 outline-none" placeholder="例如：盘点盈亏、换算调整..."/></div>
                    )}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded text-sm font-bold">取消</button>
                    <LoadingButton 
                        onClick={async () => { 
                            if(hasChange && !form.reason) return alert("库存发生变动或属性修改，请填写调整原因");
                            setLoading(true); await onSave({...form, totalQuantity: calculatedTotal}); setLoading(false); 
                        }} 
                        loading={loading} 
                        className="px-4 py-2 bg-purple-600 text-white rounded text-sm font-bold shadow-lg"
                    >
                        确认修正
                    </LoadingButton>
                </div>
            </div>
        </div>
    );
};

const Inventory = () => {
  const { user, currentStore, products, setProducts, stores, reloadData, setPageActions } = useApp();
  const navigate = useNavigate();
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  // Modal States
  const [billingModal, setBillingModal] = useState<any>({ open: false });
  const [productEditModal, setProductEditModal] = useState<any>({ open: false });
  const [stocktakingModal, setStocktakingModal] = useState<any>({ open: false });
  const [addBatchModal, setAddBatchModal] = useState<any>({ open: false });
  const [showScanner, setShowScanner] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  
  // --- POS Mode States ---
  const [showPosMode, setShowPosMode] = useState(false);
  const [posList, setPosList] = useState<PosItem[]>([]);
  const [posLoading, setPosLoading] = useState(false);

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // ... (Calculations logic same as before) ...
  const isolatedProducts = useMemo(() => {
      return products.filter(p => {
          if (currentStore.isParent) return (currentStore.childrenIds || []).includes(p.storeId);
          else return p.storeId === currentStore.id;
      });
  }, [products, currentStore]);

  const filteredProducts = useMemo(() => {
    return isolatedProducts.filter(p => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = p.name.includes(searchTerm) || p.sku.toLowerCase().includes(searchLower) || p.batches.some(b => b.batchNumber.toLowerCase().includes(searchLower));
        const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });
  }, [isolatedProducts, searchTerm, categoryFilter]);

  const paginatedProducts = useMemo(() => {
      const start = (currentPage - 1) * pageSize;
      return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const getProductAggregates = (p: Product) => {
      if (p.quantityBig !== undefined && (p.quantityBig > 0 || p.quantitySmall! > 0)) {
          return { big: p.quantityBig, small: p.quantitySmall || 0 };
      }
      const totalQ = p.batches.reduce((sum, b) => sum + (Number(b.totalQuantity) || 0), 0);
      const effectiveRate = Number(p.conversionRate) || 10;
      const safeRate = effectiveRate === 0 ? 10 : effectiveRate;
      const big = Math.floor(totalQ / safeRate);
      const small = totalQ % safeRate;
      return { big, small };
  };

  useEffect(() => {
    setPageActions({
      handleCopy: () => {
        const text = filteredProducts.map(p => {
             const { big, small } = getProductAggregates(p);
             return `商品: ${p.name}\n规格: 1${p.unitBig}=${p.conversionRate}${p.unitSmall}\n库存: ${big}${p.unitBig} ${small}${p.unitSmall}\n----------------`;
        }).join('\n');
        navigator.clipboard.writeText(text).then(() => alert('库存信息已复制'));
      },
      handleExcel: () => {
        const ws = XLSX.utils.json_to_sheet(filteredProducts.map(p => {
            const { big, small } = getProductAggregates(p);
            return {
                '商品名称': p.name,
                'SKU': p.sku,
                '分类': p.category,
                '整数量': big,
                '整单位': p.unitBig,
                '散数量': small,
                '散单位': p.unitSmall,
                '换算率': p.conversionRate,
                '备注': p.notes
            };
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory");
        XLSX.writeFile(wb, `inventory_${currentStore.name}_${Date.now()}.xlsx`);
      }
    });
    return () => setPageActions({});
  }, [filteredProducts, setPageActions, currentStore]);

  // --- POS Mode Logic ---
  const handlePosScan = (code: string) => {
      // 1. Search in current products (by SKU)
      const matchedProduct = isolatedProducts.find(p => p.sku === code);
      if (!matchedProduct) {
          // Toast or simple alert logic needed, using alert for now to not break scan flow too much
          // In real app, use a non-blocking toast
          // alert(`未找到商品: ${code}`); 
          // Don't block, just ignore or maybe play error sound if possible
          return;
      }

      setPosList(prev => {
          // Check if already in list
          const existingIdx = prev.findIndex(item => item.product.id === matchedProduct.id);
          if (existingIdx >= 0) {
              const newList = [...prev];
              newList[existingIdx] = {
                  ...newList[existingIdx],
                  qtySmall: newList[existingIdx].qtySmall + 1 // Increment small unit by default
              };
              return newList;
          } else {
              // Add new
              return [{
                  tempId: Date.now().toString() + Math.random(),
                  product: matchedProduct,
                  qtyBig: 0,
                  qtySmall: 1
              }, ...prev];
          }
      });
  };

  const handlePosSubmit = async () => {
      setPosLoading(true);
      
      try {
          // 1. Pre-calculate total deltas and validate stock
          const processQueue = [];

          for (const item of posList) {
              const { product, qtyBig, qtySmall } = item;
              const rate = Number(product.conversionRate) || 10;
              const safeRate = rate === 0 ? 10 : rate;
              const deltaRequired = (qtyBig * safeRate) + qtySmall;
              
              if (deltaRequired <= 0) continue;

              // Find available batches (FIFO: Earliest Expiry First)
              const sortedBatches = [...product.batches]
                  .filter(b => b.totalQuantity > 0)
                  .sort((a, b) => {
                      if (a.expiryDate && b.expiryDate) return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
                      if (a.expiryDate) return -1; // With expiry comes first
                      if (b.expiryDate) return 1;
                      return 0;
                  });

              let remainingToDeduct = deltaRequired;
              const deductionPlan: { batchId: string, amount: number, current: number }[] = [];
              const totalAvailable = sortedBatches.reduce((acc, b) => acc + b.totalQuantity, 0);

              if (totalAvailable < deltaRequired) {
                  throw new Error(`商品 "${product.name}" 库存不足！\n需出库: ${deltaRequired}\n当前库存: ${totalAvailable}`);
              }

              for (const batch of sortedBatches) {
                  if (remainingToDeduct <= 0) break;
                  
                  const deduct = Math.min(batch.totalQuantity, remainingToDeduct);
                  deductionPlan.push({ 
                      batchId: batch.id, 
                      amount: deduct,
                      current: batch.totalQuantity 
                  });
                  remainingToDeduct -= deduct;
              }

              processQueue.push({ product, plan: deductionPlan, totalDelta: deltaRequired });
          }

          // 2. Execute Updates
          // Sequential execution to ensure integrity (Supabase doesn't support complex transactions easily via REST)
          for (const task of processQueue) {
              for (const step of task.plan) {
                  const newQty = step.current - step.amount;
                  
                  // Update DB
                  await supabase.from('batches').update({ total_quantity: newQty }).eq('id', step.batchId);
                  
                  // Log
                  const logDesc = `[快速出库]: ${task.product.name} (自动扣减)`;
                  await supabase.from('operation_logs').insert({
                      id: `log_${Date.now()}_${Math.random()}`,
                      action_type: LogAction.ENTRY_OUTBOUND,
                      target_id: step.batchId,
                      target_name: task.product.name,
                      change_desc: logDesc,
                      change_delta: step.amount,
                      operator_id: user?.id,
                      operator_name: user?.username,
                      role_level: user?.role,
                      snapshot_data: { 
                          type: 'stock_change', 
                          old_stock: step.current, 
                          new_stock: newQty, 
                          delta: step.amount, 
                          operation: 'out', 
                          productId: task.product.id 
                      },
                      created_at: new Date().toISOString()
                  });
              }
              // Sync product totals
              await syncProductStock(task.product.id);
          }

          await reloadData();
          setPosList([]);
          setShowPosMode(false);
          alert("出库成功！");

      } catch (err: any) {
          alert(err.message);
      } finally {
          setPosLoading(false);
      }
  };


  // --- Standard Logic ---
  const handleBillingConfirm = async (type: 'in' | 'out', deltaTotal: number, detail: { big: number, small: number }) => {
      const { batch, product } = billingModal;
      await handleBillingLogic(type, deltaTotal, detail, batch, product, false);
  };

  const handleBillingLogic = async (type: 'in' | 'out', deltaTotal: number, detail: { big: number, small: number }, batch: any, product: any, isQuick: boolean) => {
      if (!batch || !product) return;
      const currentTotal = Number(batch.totalQuantity) || 0;
      const newTotal = type === 'in' ? currentTotal + deltaTotal : currentTotal - deltaTotal;
      
      setProducts(prev => prev.map(p => {
          if (p.id !== product.id) return p;
          return { ...p, batches: p.batches.map(b => b.id === batch.id ? { ...b, totalQuantity: newTotal } : b) };
      }));
      setBillingModal({ open: false });
      
      try {
          // Task 2: Ensure correct snapshot data for billing logs
          // We capture currentTotal as old_stock BEFORE update
          const { error } = await supabase.from('batches').update({ total_quantity: newTotal }).eq('id', batch.id);
          if (error) throw error;
          const logDesc = `[${type === 'in' ? '入库' : (isQuick ? '快速出库' : '出库')}]: ${product.name} × ${detail.big}${product.unitBig}${detail.small}${product.unitSmall}`;
          await supabase.from('operation_logs').insert({
              id: `log_${Date.now()}`, action_type: type === 'in' ? LogAction.ENTRY_INBOUND : LogAction.ENTRY_OUTBOUND,
              target_id: batch.id, target_name: product.name, change_desc: logDesc, change_delta: deltaTotal,
              operator_id: user?.id, operator_name: user?.username, role_level: user?.role,
              snapshot_data: { type: 'stock_change', old_stock: currentTotal, new_stock: newTotal, delta: deltaTotal, operation: type, productId: product.id },
              created_at: new Date().toISOString()
          });
          await syncProductStock(product.id);
          await reloadData();
      } catch (err: any) { console.error(err); alert(`操作失败: ${err.message}`); reloadData(); }
  };

  const handleProductEditSave = async (data: any) => {
      const { product } = productEditModal;
      try {
          await supabase.from('products').update({ name: data.name, sku: data.sku, category: data.category, unit_big: data.unitBig, unit_small: data.unitSmall, conversion_rate: data.conversionRate, image_url: data.image_url, notes: data.notes }).eq('id', product.id);
          await syncProductStock(product.id); await reloadData(); setProductEditModal({ open: false });
      } catch (err: any) { alert('保存失败: ' + err.message); }
  };

  const handleStocktakingSave = async (data: any) => {
      const { batch, product } = stocktakingModal;
      try {
          // Task 2: Ensure full batch object is saved in snapshot for ADJUST rollback
          await supabase.from('batches').update({ batch_number: data.batchNumber, total_quantity: data.totalQuantity, conversion_rate: data.conversionRate, expiry_date: data.expiryDate || null, notes: data.notes }).eq('id', batch.id);
          await supabase.from('operation_logs').insert({ 
              id: `log_${Date.now()}`, 
              action_type: LogAction.ENTRY_ADJUST, 
              target_id: batch.id, 
              target_name: product.name, 
              change_desc: `[库存调整]: ${product.name}`, 
              operator_id: user?.id, 
              operator_name: user?.username, 
              role_level: user?.role, 
              snapshot_data: { type: 'batch', originalData: batch, newData: data }, 
              created_at: new Date().toISOString() 
            });
          await syncProductStock(product.id); await reloadData(); setStocktakingModal({ open: false });
      } catch (err: any) { alert('操作失败: ' + err.message); }
  };

  const handleAddBatch = async (data: any) => {
      const { product } = addBatchModal;
      try {
          await supabase.from('batches').insert({ id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, product_id: product.id, batch_number: data.batchNumber, expiry_date: data.expiryDate || null, total_quantity: data.totalQuantity, conversion_rate: data.conversionRate, notes: '新增批号' });
          await syncProductStock(product.id); await reloadData(); setAddBatchModal({ open: false });
      } catch (err: any) { alert('操作失败: ' + err.message); }
  };

  const toggleSelectProduct = (id: string) => { const newSet = new Set(selectedProducts); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedProducts(newSet); };
  
  // Task 2: Update Product Deletion Logic to fetch data before delete and record full snapshot
  const handleBatchDelete = async () => { 
      if (selectedProducts.size === 0) return; 
      if (!window.confirm(`确定删除?`)) return; 

      try {
          // 1. Fetch products to be deleted
          const { data: productsToDelete, error: fetchError } = await supabase
              .from('products')
              .select('*')
              .in('id', Array.from(selectedProducts));
          
          if (fetchError || !productsToDelete || productsToDelete.length === 0) {
              alert("获取商品信息失败或商品已不存在");
              return;
          }

          // 2. Delete products (Cascading delete on batches usually handled by DB, but we delete products)
          const { error: deleteError } = await supabase.from('products').delete().in('id', Array.from(selectedProducts));
          
          if (deleteError) {
              throw deleteError;
          }

          // 3. Log each deletion with full snapshot
          const logEntries = productsToDelete.map(p => ({
              id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              action_type: LogAction.PRODUCT_DELETE,
              target_id: p.id,
              target_name: p.name,
              change_desc: `[商品删除]: ${p.name}`,
              operator_id: user?.id,
              operator_name: user?.username,
              role_level: user?.role,
              snapshot_data: { originalProduct: p }, // Full object for restore
              created_at: new Date().toISOString()
          }));

          const { error: logError } = await supabase.from('operation_logs').insert(logEntries);
          if (logError) console.error("Failed to log deletion", logError);

          await reloadData(); 
          setIsDeleteMode(false); 
          setSelectedProducts(new Set()); 
      } catch (err: any) {
          alert(`删除失败: ${err.message}`);
      }
  };

  const toggleSelectAll = () => { if (selectedProducts.size === paginatedProducts.length) setSelectedProducts(new Set()); else setSelectedProducts(new Set(paginatedProducts.map(p => p.id))); };
  const toggleExpand = (id: string) => { const next = new Set(expandedProducts); if (next.has(id)) next.delete(id); else next.add(id); setExpandedProducts(next); };

  const isParentView = currentStore.isParent;
  const canOperate = !isParentView && user?.role !== RoleLevel.GUEST && !currentStore.viewerIds?.includes(user?.id || '');

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      {/* POS Overlay Mode */}
      {showPosMode && (
          <PosOverlay 
            items={posList}
            onClose={() => setShowPosMode(false)}
            onScan={handlePosScan}
            onUpdateQty={(id, field, val) => setPosList(prev => prev.map(i => i.tempId === id ? {...i, [field]: val} : i))}
            onRemove={(id) => setPosList(prev => prev.filter(i => i.tempId !== id))}
            onSubmit={handlePosSubmit}
            loading={posLoading}
          />
      )}

      {billingModal.open && <BillingModal {...billingModal} onClose={() => setBillingModal({ open: false })} onConfirm={handleBillingConfirm} />}
      {productEditModal.open && <ProductEditModal {...productEditModal} onClose={() => setProductEditModal({ open: false })} onSave={handleProductEditSave} />}
      {stocktakingModal.open && <StocktakingModal {...stocktakingModal} onClose={() => setStocktakingModal({ open: false })} onSave={handleStocktakingSave} />}
      {addBatchModal.open && <AddBatchModal {...addBatchModal} onClose={() => setAddBatchModal({ open: false })} onConfirm={handleAddBatch} />}
      {showScanner && <BarcodeScanner onScan={(val) => { setSearchTerm(val); setShowScanner(false); }} onClose={() => setShowScanner(false)} />}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">库存管理 {isDeleteMode && <span className="text-sm bg-red-100 text-red-600 px-2 rounded font-normal">批量删除模式</span>}</h2>
        {canOperate && (
            <div className="flex items-center gap-2">
                {isDeleteMode ? (
                    <>
                        <button onClick={() => setIsDeleteMode(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-bold">取消</button>
                        <button onClick={handleBatchDelete} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg">确认删除 ({selectedProducts.size})</button>
                        <div className="flex items-center gap-2 ml-2 cursor-pointer" onClick={toggleSelectAll}>
                            {selectedProducts.size > 0 && selectedProducts.size === paginatedProducts.length ? <CheckSquare className="w-5 h-5 text-blue-500"/> : <Square className="w-5 h-5 text-gray-400"/>}
                            <span className="text-sm">全选本页</span>
                        </div>
                    </>
                ) : (
                    <button onClick={() => setIsDeleteMode(true)} className="flex items-center gap-2 text-gray-500 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4"/> 删除</button>
                )}
            </div>
        )}
        <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="text" placeholder="搜索商品/SKU/批号..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-10 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                <button onClick={() => setShowScanner(true)} className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 bg-gray-100 dark:bg-gray-700 rounded hover:text-blue-500"><ScanLine className="w-4 h-4"/></button>
             </div>
             {!isParentView && (
                <>
                    {/* New POS Mode Button */}
                    <button onClick={() => setShowPosMode(true)} className="px-4 py-2 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-xl font-bold flex items-center gap-2 hover:bg-yellow-200 transition-colors shadow-lg shadow-yellow-600/20 whitespace-nowrap">
                        <Zap className="w-4 h-4"/> 快速出库
                    </button>
                    <button onClick={() => navigate('/import')} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 whitespace-nowrap"><Plus className="w-4 h-4"/> 导入新商品</button>
                </>
             )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
         {paginatedProducts.length === 0 ? (
             <div className="p-10 text-center flex flex-col items-center justify-center">
                 <Package className="w-16 h-16 text-gray-200 mb-4"/>
                 <h3 className="text-lg font-bold text-gray-500">暂无库存数据</h3>
                 <p className="text-gray-400 text-sm mt-1">当前门店下没有匹配的商品，请检查搜索条件或切换门店。</p>
             </div>
         ) : (
             <>
             <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                     <thead className="bg-gray-50 dark:bg-gray-900/50 text-sm" style={{ color: 'var(--text-secondary)' }}>
                         <tr>
                             {isDeleteMode && <th className="p-4 w-10"></th>}
                             <th className="p-4 w-12"></th>
                             <th className="p-4">商品名称 / SKU</th>
                             <th className="p-4">分类</th>
                             <th className="p-4 text-center">当前总库存</th>
                             <th className="p-4 text-right">操作</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                         {paginatedProducts.map(product => {
                             const { big, small } = getProductAggregates(product);
                             const isExpanded = expandedProducts.has(product.id);
                             const isSelected = selectedProducts.has(product.id);
                             return (
                                 <React.Fragment key={product.id}>
                                     <tr className={`group transition-colors ${isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                         {isDeleteMode && (
                                             <td className="p-4 text-center"><div onClick={() => toggleSelectProduct(product.id)} className="cursor-pointer">{isSelected ? <CheckSquare className="w-5 h-5 text-blue-500"/> : <Square className="w-5 h-5 text-gray-300"/>}</div></td>
                                         )}
                                         <td className="p-4 cursor-pointer text-center" onClick={() => toggleExpand(product.id)}>
                                             {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-500"/> : <ChevronRight className="w-4 h-4 text-gray-400"/>}
                                         </td>
                                         <td className="p-4">
                                             <div className="flex items-center gap-3">
                                                 <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border dark:border-gray-600 cursor-pointer shadow-sm hover:shadow-md transition-shadow" onClick={() => product.image_url && setLightboxSrc(getDirectImageUrl(product.image_url)!)}>
                                                     {product.image_url ? <img src={getDirectImageUrl(product.image_url)} className="w-full h-full object-cover" alt={product.name}/> : <Package className="w-6 h-6 text-gray-400"/>}
                                                 </div>
                                                 <div>
                                                     <div className="font-bold text-gray-800 dark:text-gray-200">{product.name}</div>
                                                     <div className="text-xs text-gray-400 font-mono">{product.sku}</div>
                                                 </div>
                                             </div>
                                         </td>
                                         <td className="p-4 text-sm"><span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">{product.category}</span></td>
                                         <td className="p-4 text-center font-bold text-gray-700 dark:text-gray-300">
                                             <span className="text-lg">{big}</span><span className="text-xs text-gray-400 mx-1">{product.unitBig || '整'}</span>
                                             <span className="text-lg ml-2">{small}</span><span className="text-xs text-gray-400 mx-1">{product.unitSmall || '散'}</span>
                                         </td>
                                         <td className="p-4 text-right">
                                             <div className="flex justify-end gap-2">
                                                 {canOperate && (
                                                    <>
                                                     <button onClick={() => setAddBatchModal({ open: true, product })} className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 rounded-lg" title="新增批号"><Plus className="w-4 h-4"/></button>
                                                     <button onClick={() => setProductEditModal({ open: true, product })} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 rounded-lg" title="编辑商品档案"><Edit2 className="w-4 h-4"/></button>
                                                    </>
                                                 )}
                                             </div>
                                         </td>
                                     </tr>
                                     {isExpanded && (
                                         <tr>
                                             <td colSpan={isDeleteMode ? 7 : 6} className="p-0 bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700 shadow-inner">
                                                 <div className="p-4 pl-16">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="text-gray-400 border-b dark:border-gray-700">
                                                                {isParentView && <th className="pb-2 pl-2 text-left font-medium">所属门店</th>}
                                                                <th className="pb-2 pl-2 text-left font-medium">批号</th>
                                                                <th className="pb-2 text-left font-medium">有效期</th>
                                                                <th className="pb-2 text-center font-medium">换算制</th>
                                                                <th className="pb-2 text-center font-medium">库存详情</th>
                                                                <th className="pb-2 text-right font-medium">操作</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                            {product.batches.map(batch => {
                                                                const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
                                                                const storeName = isParentView ? (stores.find(s => s.id === product.storeId)?.name || '未知') : '';
                                                                const bRate = Number(batch.conversionRate) || 10;
                                                                const effectiveBRate = bRate === 0 ? 10 : bRate;
                                                                const bTotal = Number(batch.totalQuantity) || 0;
                                                                const bBig = Math.floor(bTotal / effectiveBRate);
                                                                const bSmall = bTotal % effectiveBRate;
                                                                
                                                                return (
                                                                    <tr key={batch.id} className="hover:bg-white dark:hover:bg-gray-800 transition-colors">
                                                                        {isParentView && (
                                                                            <td className="py-3 pl-2 text-blue-600 dark:text-blue-400 font-bold text-xs">{storeName}</td>
                                                                        )}
                                                                        <td className="py-3 pl-2 font-mono font-bold" style={{color: 'var(--accent-color)'}}>{batch.batchNumber}</td>
                                                                        <td className="py-3">
                                                                            {batch.expiryDate ? (
                                                                                <span className={isExpired ? 'text-[#FF4D4F] font-bold' : ''} style={{color: isExpired ? '#FF4D4F' : 'var(--text-secondary)'}}>
                                                                                    {batch.expiryDate} {isExpired && '(已过期)'}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-yellow-600 text-xs bg-yellow-100 px-2 py-0.5 rounded font-bold">无有效期</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="py-3 text-center text-gray-500">{batch.conversionRate}</td>
                                                                        <td className="py-3 text-center font-bold">
                                                                            {bBig}{product.unitBig || '整'} {bSmall}{product.unitSmall || '散'}
                                                                        </td>
                                                                        <td className="py-3 text-right">
                                                                            <div className="flex justify-end gap-2">
                                                                                {canOperate ? (
                                                                                    <>
                                                                                    <button onClick={() => setBillingModal({ open: true, batch, product })} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50">开单</button>
                                                                                    <button onClick={() => setStocktakingModal({ open: true, batch, product })} className="px-3 py-1 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg text-xs flex items-center gap-1"><Calculator className="w-3 h-3"/> 调整</button>
                                                                                    </>
                                                                                ) : (
                                                                                    <span className="text-xs text-gray-300 italic">--</span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                            {product.batches.length === 0 && (
                                                                <tr><td colSpan={isParentView ? 7 : 6} className="py-4 text-center text-gray-400 italic">暂无批号数据</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                 </div>
                                             </td>
                                         </tr>
                                     )}
                                 </React.Fragment>
                             );
                         })}
                     </tbody>
                 </table>
             </div>
             <Pagination current={currentPage} total={filteredProducts.length} pageSize={pageSize} onChange={setCurrentPage} />
             </>
         )}
      </div>
    </div>
  );
};

export default Inventory;
