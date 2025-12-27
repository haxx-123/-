
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ChevronDown, ChevronRight, Plus, Package, FileText, Edit2, X, Save, ArrowRightLeft, Info, ScanLine, Filter, MapPin, Trash2, Image as ImageIcon, ChevronLeft, CheckSquare, Square, Box, Loader2, Calculator, AlertTriangle, Calendar, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Product, Batch, RoleLevel, LogAction } from '../types';
import { useApp } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import BarcodeScanner from '../components/BarcodeScanner';
import { supabase, syncProductStock } from '../supabase';
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

// 13. 分页功能组件
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
        <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"><ChevronLeft className="w-5 h-5"/></button>
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 shadow-sm">
                <span style={{ color: 'var(--text-secondary)' }} className="text-sm">第</span>
                <input 
                    className="w-8 bg-transparent text-center outline-none text-sm font-bold" 
                    style={{ color: 'var(--text-primary)' }}
                    value={inputVal} 
                    onChange={(e) => setInputVal(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                />
                <span style={{ color: 'var(--text-secondary)' }} className="text-sm">/ {totalPages} 页</span>
            </div>
            <button onClick={() => onChange(Math.min(totalPages, current + 1))} disabled={current === totalPages} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"><ChevronRight className="w-5 h-5"/></button>
        </div>
    );
};

// 16.2.3 Image Lightbox
const ImageLightbox = ({ src, onClose }: { src: string, onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in" onClick={onClose}>
        <img src={src} className="max-w-full max-h-full rounded-lg shadow-2xl" alt="Product Full" />
        <button className="absolute top-4 right-4 text-white p-2 bg-gray-800 rounded-full"><X className="w-6 h-6"/></button>
    </div>
);

// --- Modals ---

const AddBatchModal = ({ product, onClose, onConfirm }: any) => {
    const [form, setForm] = useState({
        batchNumber: '',
        expiryDate: '',
        quantityBig: 0,
        quantitySmall: 0,
        conversionRate: product.conversionRate || 10
    });
    const [loading, setLoading] = useState(false);

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

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Plus className="w-5 h-5 text-blue-500"/> 新增批号</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
                </div>
                <div className="space-y-4 text-sm">
                    <div>
                        <label className="block text-xs font-bold mb-1" style={{color: 'var(--text-secondary)'}}>批号 <span className="text-red-500">*</span></label>
                        <input className="w-full p-2 border rounded font-mono" value={form.batchNumber} onChange={e => setForm({...form, batchNumber: e.target.value})} />
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
            <h3 className="font-bold text-lg">快速开单</h3>
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
    const [form, setForm] = useState({...product});
    const [loading, setLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(product.image_url || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPreviewImage(URL.createObjectURL(file));
            try {
                const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true };
                const compressedFile = await imageCompression(file, options);
                const fileName = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`;
                const { error: uploadError } = await supabase.storage.from('images').upload(fileName, compressedFile);
                if (uploadError) throw uploadError;
                const { data: publicData } = supabase.storage.from('images').getPublicUrl(fileName);
                setForm(prev => ({ ...prev, image_url: publicData.publicUrl }));
            } catch (err: any) {
                console.error("Image upload failed:", err);
                alert("图片上传失败: " + err.message);
            }
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
                    <LoadingButton onClick={async () => { setLoading(true); await onSave(form); setLoading(false); }} loading={loading} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold shadow-lg">保存档案</LoadingButton>
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
  const [billingModal, setBillingModal] = useState<any>({ open: false });
  const [productEditModal, setProductEditModal] = useState<any>({ open: false });
  const [stocktakingModal, setStocktakingModal] = useState<any>({ open: false });
  const [addBatchModal, setAddBatchModal] = useState<any>({ open: false });
  const [showScanner, setShowScanner] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

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

  const handleBillingConfirm = async (type: 'in' | 'out', deltaTotal: number, detail: { big: number, small: number }) => {
      const { batch, product } = billingModal;
      if (!batch || !product) return;
      const currentTotal = Number(batch.totalQuantity) || 0;
      const newTotal = type === 'in' ? currentTotal + deltaTotal : currentTotal - deltaTotal;
      setProducts(prev => prev.map(p => {
          if (p.id !== product.id) return p;
          return { ...p, batches: p.batches.map(b => b.id === batch.id ? { ...b, totalQuantity: newTotal } : b) };
      }));
      setBillingModal({ open: false });
      try {
          const { error } = await supabase.from('batches').update({ total_quantity: newTotal }).eq('id', batch.id);
          if (error) throw error;
          const logDesc = `[${type === 'in' ? '入库' : '出库'}]: ${product.name} × ${detail.big}${product.unitBig}${detail.small}${product.unitSmall}`;
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
          await supabase.from('batches').update({ batch_number: data.batchNumber, total_quantity: data.totalQuantity, conversion_rate: data.conversionRate, expiry_date: data.expiryDate || null, notes: data.notes }).eq('id', batch.id);
          await supabase.from('operation_logs').insert({ id: `log_${Date.now()}`, action_type: LogAction.ENTRY_ADJUST, target_id: batch.id, target_name: product.name, change_desc: `[库存调整]: ${product.name}`, operator_id: user?.id, operator_name: user?.username, role_level: user?.role, snapshot_data: { type: 'batch_edit', originalData: batch, newData: data }, created_at: new Date().toISOString() });
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
  const handleBatchDelete = async () => { if (selectedProducts.size === 0) return; if (!window.confirm(`确定删除?`)) return; await supabase.from('products').delete().in('id', Array.from(selectedProducts)); await reloadData(); setIsDeleteMode(false); setSelectedProducts(new Set()); };
  const toggleSelectAll = () => { if (selectedProducts.size === paginatedProducts.length) setSelectedProducts(new Set()); else setSelectedProducts(new Set(paginatedProducts.map(p => p.id))); };
  const toggleExpand = (id: string) => { const next = new Set(expandedProducts); if (next.has(id)) next.delete(id); else next.add(id); setExpandedProducts(next); };

  const isParentView = currentStore.isParent;
  const canOperate = !isParentView && user?.role !== RoleLevel.GUEST && !currentStore.viewerIds?.includes(user?.id || '');

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
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
                <button onClick={() => navigate('/import')} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"><Plus className="w-4 h-4"/> 导入新商品</button>
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
                                                 <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border dark:border-gray-600 cursor-pointer" onClick={() => product.image_url && setLightboxSrc(product.image_url)}>
                                                     {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover"/> : <Package className="w-5 h-5 text-gray-400"/>}
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
                                                                
                                                                // 36.5.1 Sub-row Color Coding Logic
                                                                // Batch No: var(--accent-color) (Theme Color) Highlighting
                                                                // Expiry: Red if expired, var(--text-secondary) if not, Yellow label if null
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
