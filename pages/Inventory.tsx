import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronRight, Plus, Package, FileText, Edit2, X, Save, ArrowRightLeft, Lock, Info, ScanLine, Filter, ChevronLeft, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Product, Batch, RoleLevel, LogAction } from '../types';
import { useApp } from '../App';
import { motion } from 'framer-motion';
import BarcodeScanner from '../components/BarcodeScanner';
import * as XLSX from 'xlsx';

// --- Modals ---

const BillingModal = ({ batch, productName, onClose, onConfirm }: { batch: Batch; productName: string; onClose: () => void; onConfirm: (type: 'in' | 'out', qty: number, unit: 'big' | 'small') => void }) => {
  const [type, setType] = useState<'in' | 'out'>('out');
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState<'big' | 'small'>('big');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <h3 className="font-bold text-lg dark:text-white">开单 - {productName}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button 
              onClick={() => setType('out')}
              className={`flex-1 py-2 rounded-md font-bold transition-all ${type === 'out' ? 'bg-white dark:bg-gray-600 shadow text-red-500' : 'text-gray-500'}`}
            >
              出库
            </button>
            <button 
              onClick={() => setType('in')}
              className={`flex-1 py-2 rounded-md font-bold transition-all ${type === 'in' ? 'bg-white dark:bg-gray-600 shadow text-green-500' : 'text-gray-500'}`}
            >
              入库
            </button>
          </div>

          <div className="space-y-4">
             <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
               <div className="text-xs text-gray-500 mb-1">当前批号</div>
               <div className="font-mono font-bold text-lg text-blue-700 dark:text-blue-300">{batch.batchNumber}</div>
               <div className="text-xs text-gray-400 mt-1">有效期: {batch.expiryDate}</div>
             </div>

             <div className="flex gap-4">
               <div className="flex-1">
                 <label className="block text-sm font-medium mb-1">数量</label>
                 <input 
                   type="number" 
                   value={qty} 
                   onChange={(e) => setQty(Number(e.target.value))}
                   className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 text-center font-bold text-xl" 
                 />
               </div>
               <div className="w-1/3">
                 <label className="block text-sm font-medium mb-1">单位</label>
                 <select 
                   value={unit} 
                   onChange={(e) => setUnit(e.target.value as any)}
                   className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 h-[52px]"
                 >
                   <option value="big">{batch.unitBig}</option>
                   <option value="small">{batch.unitSmall}</option>
                 </select>
               </div>
             </div>
          </div>

          <button 
            onClick={() => onConfirm(type, qty, unit)}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transform transition-transform active:scale-95 ${type === 'out' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-green-500 hover:bg-green-600 shadow-green-500/30'}`}
          >
            确认{type === 'out' ? '出库' : '入库'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdjustModal = ({ target, type, onClose, onSave, productContext }: { target: Product | Batch; type: 'product' | 'batch'; onClose: () => void; onSave: (data: any) => void; productContext?: Product }) => {
  const isBatch = type === 'batch';
  const batchTarget = isBatch ? (target as Batch) : undefined;
  const productTarget = !isBatch ? (target as Product) : undefined;
  
  const [formData, setFormData] = useState<any>(isBatch ? {...batchTarget} : {...productTarget});

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <h3 className="font-bold text-lg dark:text-white">调整信息 - {isBatch ? '批号详情' : '商品档案'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {isBatch ? (
            <>
              {/* Product Info Context for Batch Adjustment */}
              {productContext && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl mb-4 flex gap-3 items-center">
                      <img src={productContext.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-200" />
                      <div>
                          <div className="font-bold text-sm">{productContext.name}</div>
                          <div className="text-xs text-gray-500">{productContext.sku}</div>
                      </div>
                  </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">批号</label>
                <input type="text" value={formData.batchNumber} onChange={e => setFormData({...formData, batchNumber: e.target.value})} className="input-std" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">有效期</label>
                <input type="date" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} className="input-std" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium mb-1 text-blue-600 font-bold">库存 (整-{formData.unitBig})</label>
                   <input type="number" value={formData.quantityBig} onChange={e => setFormData({...formData, quantityBig: Number(e.target.value)})} className="input-std font-bold" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1 text-green-600 font-bold">库存 (散-{formData.unitSmall})</label>
                   <input type="number" value={formData.quantitySmall} onChange={e => setFormData({...formData, quantitySmall: Number(e.target.value)})} className="input-std font-bold" />
                 </div>
              </div>
              <div>
                 <label className="block text-sm font-medium mb-1">备注 (Batch Notes)</label>
                 <textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} className="input-std h-24" placeholder="批号备注..." />
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-4 mb-2">
                 <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">商品图片URL</label>
                    <input type="text" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} className="input-std text-sm" placeholder="https://..." />
                 </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">商品名称</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-std" />
              </div>
              <div>
                 <label className="block text-sm font-medium mb-1">SKU</label>
                 <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="input-std" />
              </div>
              <div>
                 <label className="block text-sm font-medium mb-1">分类</label>
                 <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="input-std" />
              </div>
              <div>
                 <label className="block text-sm font-medium mb-1">商品备注 (Product Notes)</label>
                 <textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} className="input-std h-24" />
              </div>
            </>
          )}
          
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl flex items-start gap-3">
             <ArrowRightLeft className="w-5 h-5 text-yellow-600 mt-0.5" />
             <div>
               <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200">注意</p>
               <p className="text-xs text-yellow-700 dark:text-yellow-300">修改关键信息可能会影响关联的统计数据，请谨慎操作。</p>
             </div>
          </div>
        </div>

        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex gap-3">
           <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 font-medium hover:bg-gray-100 dark:hover:bg-gray-700">取消</button>
           <button onClick={() => onSave(formData)} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
             <Save className="w-4 h-4" /> 保存修改
           </button>
        </div>
      </div>
    </div>
  );
};

const AddBatchModal = ({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: (batchData: any) => void }) => {
  const [showScanner, setShowScanner] = useState(false);
  const [formData, setFormData] = useState({
      batchNumber: '',
      expiryDate: '',
      quantityBig: 0,
      quantitySmall: 0,
      unitBig: '整',
      unitSmall: '散',
      conversionRate: product.batches[0]?.conversionRate || 1,
      notes: '' // New Note Field
  });

  return (
    <>
        {showScanner && (
            <BarcodeScanner 
                onScan={(code) => { setFormData({...formData, batchNumber: code}); setShowScanner(false); }}
                onClose={() => setShowScanner(false)}
            />
        )}
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                <h3 className="font-bold text-lg dark:text-white">新增批号 - {product.name}</h3>
                <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">批号 (支持扫码)</label>
                    <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={formData.batchNumber}
                        onChange={(e) => setFormData({...formData, batchNumber: e.target.value})}
                        className="input-std flex-1 font-mono" 
                        placeholder="输入或扫码" 
                    />
                    <button 
                            className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200" 
                            title="扫码识别"
                            onClick={() => setShowScanner(true)}
                    >
                        <ScanLine className="w-5 h-5" />
                    </button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">有效期</label>
                    <input 
                        type="date" 
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                        className="input-std" 
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium mb-1">初始库存 ({formData.unitBig})</label>
                    <input type="number" value={formData.quantityBig} onChange={e => setFormData({...formData, quantityBig: Number(e.target.value)})} className="input-std" placeholder="0" />
                    </div>
                    <div>
                    <label className="block text-sm font-medium mb-1">初始库存 ({formData.unitSmall})</label>
                    <input type="number" value={formData.quantitySmall} onChange={e => setFormData({...formData, quantitySmall: Number(e.target.value)})} className="input-std" placeholder="0" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">批号备注</label>
                    <textarea 
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        className="input-std h-20" 
                        placeholder="批号相关备注..."
                    />
                </div>
                
                <button onClick={() => onAdd(formData)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 mt-2">
                确认添加
                </button>
            </div>
        </div>
        </div>
    </>
  );
};

const ProductDetailModal = ({ product, onClose }: { product: Product; onClose: () => void }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="max-w-xl w-full bg-transparent p-4" onClick={e => e.stopPropagation()}>
            <img src={product.image_url} alt={product.name} className="w-full rounded-2xl shadow-2xl mb-4 max-h-[50vh] object-cover" />
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl">
                <h3 className="text-2xl font-bold mb-2">{product.name}</h3>
                <p className="text-gray-500 mb-4">SKU: {product.sku}</p>
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-xl text-sm">
                    <p className="font-bold mb-1">备注信息:</p>
                    <p>{product.notes || '暂无备注'}</p>
                </div>
            </div>
        </div>
    </div>
);

// --- Main Component ---

const Inventory = () => {
  const { user, currentStore, setPageActions, isMobile, products, setProducts, setLogs } = useApp();
  const navigate = useNavigate();
  
  // Local UI State
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showMainScanner, setShowMainScanner] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal States
  const [billingModal, setBillingModal] = useState<{ open: boolean; batch?: Batch; product?: Product }>({ open: false });
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; target?: any; type?: 'product' | 'batch'; productContext?: Product }>({ open: false });
  const [addBatchModal, setAddBatchModal] = useState<{ open: boolean; product?: Product }>({ open: false });
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // --- Logic for Modifying State ---

  const handleBillingConfirm = (type: 'in' | 'out', qty: number, unit: 'big' | 'small') => {
      const { batch, product } = billingModal;
      if (!batch || !product) return;

      const newProducts = products.map(p => {
          if (p.id === product.id) {
              const newBatches = p.batches.map(b => {
                  if (b.id === batch.id) {
                      let newBig = b.quantityBig;
                      let newSmall = b.quantitySmall;
                      
                      if (type === 'in') {
                          if (unit === 'big') newBig += qty;
                          else newSmall += qty;
                      } else {
                          if (unit === 'big') newBig -= qty;
                          else newSmall -= qty;
                      }
                      return { ...b, quantityBig: newBig, quantitySmall: newSmall };
                  }
                  return b;
              });
              return { ...p, batches: newBatches };
          }
          return p;
      });

      setProducts(newProducts);
      
      // Add Log
      const logAction = type === 'in' ? LogAction.ENTRY_INBOUND : LogAction.ENTRY_OUTBOUND;
      setLogs(prev => [{
          id: `log_${Date.now()}`,
          action_type: logAction,
          target_id: batch.id,
          target_name: product.name,
          change_desc: `${type === 'in' ? '入库' : '出库'}: ${product.name} x ${qty}${unit === 'big' ? batch.unitBig : batch.unitSmall}`,
          operator_id: user?.id || 'unknown',
          operator_name: user?.username || 'Unknown',
          created_at: new Date().toISOString(),
          is_revoked: false,
          snapshot_data: {},
          role_level: user?.role || RoleLevel.STAFF
      }, ...prev]);

      setBillingModal({ open: false });
      alert('操作成功');
  };

  const handleAdjustSave = (data: any) => {
      const { type, target } = adjustModal;
      if (type === 'batch') {
          // Adjust Batch
          const batchId = target.id;
          setProducts(products.map(p => ({
              ...p,
              batches: p.batches.map(b => b.id === batchId ? { ...b, ...data } : b)
          })));
          // Log
          setLogs(prev => [{
            id: `log_${Date.now()}`,
            action_type: LogAction.ENTRY_ADJUST,
            target_id: batchId,
            target_name: '批号调整',
            change_desc: `调整批号信息: ${data.batchNumber}`,
            operator_id: user?.id || '',
            operator_name: user?.username || '',
            created_at: new Date().toISOString(),
            is_revoked: false,
            snapshot_data: {},
            role_level: user?.role || RoleLevel.STAFF
        }, ...prev]);
      } else {
          // Adjust Product
          const productId = target.id;
          setProducts(products.map(p => p.id === productId ? { ...p, ...data } : p));
      }
      setAdjustModal({ open: false });
      alert('调整保存成功');
  };

  const handleAddBatch = (batchData: any) => {
      const { product } = addBatchModal;
      if (!product) return;

      const newBatch: Batch = {
          id: `b_${Date.now()}`,
          ...batchData
      };

      setProducts(products.map(p => {
          if (p.id === product.id) {
              return { ...p, batches: [...p.batches, newBatch] };
          }
          return p;
      }));

      // Log
      setLogs(prev => [{
        id: `log_${Date.now()}`,
        action_type: LogAction.BATCH_IMPORT,
        target_id: newBatch.id,
        target_name: product.name,
        change_desc: `新增批号: ${newBatch.batchNumber}`,
        operator_id: user?.id || '',
        operator_name: user?.username || '',
        created_at: new Date().toISOString(),
        is_revoked: false,
        snapshot_data: {},
        role_level: user?.role || RoleLevel.STAFF
      }, ...prev]);

      setAddBatchModal({ open: false });
      alert('新增批号成功');
  };

  // ---

  // Register Page Actions
  useEffect(() => {
    setPageActions({
      handleCopy: () => {
        const text = products.map(p => {
          const batches = p.batches.map(b => `  - 批号 ${b.batchNumber}: ${b.quantityBig}${b.unitBig} ${b.quantitySmall}${b.unitSmall} [有效期: ${b.expiryDate}]`).join('\n');
          return `商品：${p.name} (SKU: ${p.sku})\n分类：${p.category}\n库存详情:\n${batches}`;
        }).join('\n\n');
        navigator.clipboard.writeText(text).then(() => alert('库存信息已复制到剪贴板 (大白话格式)'));
      },
      handleExcel: () => {
        // Flatten for Excel
        const flatData = products.flatMap(p => 
          p.batches.map(b => ({
            商品名称: p.name,
            SKU: p.sku,
            分类: p.category,
            批号: b.batchNumber,
            有效期: b.expiryDate,
            整数量: b.quantityBig,
            整单位: b.unitBig,
            散数量: b.quantitySmall,
            散单位: b.unitSmall,
            备注: b.notes || ''
          }))
        );
        const ws = XLSX.utils.json_to_sheet(flatData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory");
        XLSX.writeFile(wb, `inventory_export_${Date.now()}.xlsx`);
      }
    });
    return () => setPageActions({});
  }, [products, setPageActions]);

  const canEdit = user?.role === RoleLevel.ROOT || currentStore.managerIds?.includes(user?.id || '');

  const toggleExpand = (pid: string) => {
    const newSet = new Set(expandedProducts);
    if (newSet.has(pid)) newSet.delete(pid);
    else newSet.add(pid);
    setExpandedProducts(newSet);
  };

  const handleScanSuccess = (code: string) => {
      setSearchTerm(code); // Effectively filters the list by the code
      setShowMainScanner(false);
  };

  const filteredProducts = products.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
        p.name.includes(searchTerm) || 
        p.sku.toLowerCase().includes(searchLower) || 
        p.batches.some(b => b.batchNumber.toLowerCase().includes(searchLower)) ||
        (p.keywords && p.keywords.some(k => k.includes(searchLower)));
    
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];

  // --- Render Mobile Card View ---
  const renderMobileView = () => (
    <div className="space-y-4">
        {filteredProducts.map(product => {
            const totalBig = product.batches.reduce((acc, b) => acc + b.quantityBig, 0);
            const totalSmall = product.batches.reduce((acc, b) => acc + b.quantitySmall, 0);
            const unitBig = product.batches[0]?.unitBig || '整';
            const unitSmall = product.batches[0]?.unitSmall || '散';
            
            return (
                <div key={product.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700" onClick={() => toggleExpand(product.id)}>
                    <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                            <img src={product.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100" onClick={(e) => { e.stopPropagation(); setPreviewProduct(product); }}/>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">{product.name}</h3>
                                <p className="text-xs text-gray-500">{product.sku}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-blue-600 dark:text-blue-400">{totalBig} <span className="text-xs text-gray-500">{unitBig}</span></div>
                            {totalSmall > 0 && <div className="text-xs text-green-600">{totalSmall} {unitSmall}</div>}
                        </div>
                    </div>
                    
                    {/* Action Buttons for Card */}
                    <div className="mt-3 pt-3 border-t dark:border-gray-700 flex justify-end gap-2">
                        {canEdit && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setAddBatchModal({ open: true, product }); }}
                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs"
                            >
                                + 批号
                            </button>
                        )}
                        <button 
                            className="px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-xs"
                            onClick={(e) => {e.stopPropagation(); toggleExpand(product.id);}}
                        >
                            {expandedProducts.has(product.id) ? '收起详情' : '查看批次'}
                        </button>
                    </div>

                    {/* Expanded Batch List in Mobile */}
                    {expandedProducts.has(product.id) && (
                        <div className="mt-3 space-y-2">
                            {product.batches.map(batch => (
                                <div key={batch.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-sm">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-mono text-blue-600">{batch.batchNumber}</span>
                                        <span className="text-gray-500 text-xs">效: {batch.expiryDate}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="font-bold">
                                            {batch.quantityBig}{batch.unitBig} 
                                            {batch.quantitySmall > 0 && ` ${batch.quantitySmall}${batch.unitSmall}`}
                                        </div>
                                        {canEdit && (
                                            <div className="flex gap-2">
                                                <button onClick={() => setBillingModal({ open: true, batch, product })} className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">开单</button>
                                                <button onClick={() => setAdjustModal({ open: true, target: batch, type: 'batch', productContext: product })} className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">调整</button>
                                            </div>
                                        )}
                                    </div>
                                    {batch.notes && <div className="text-xs text-gray-400 mt-1 italic">{batch.notes}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        })}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Modals */}
      {billingModal.open && billingModal.batch && billingModal.product && (
        <BillingModal 
          batch={billingModal.batch} 
          productName={billingModal.product.name} 
          onClose={() => setBillingModal({ open: false })} 
          onConfirm={handleBillingConfirm}
        />
      )}
      {adjustModal.open && adjustModal.target && adjustModal.type && (
        <AdjustModal 
          target={adjustModal.target} 
          type={adjustModal.type} 
          onClose={() => setAdjustModal({ open: false })}
          onSave={handleAdjustSave}
          productContext={adjustModal.productContext}
        />
      )}
      {addBatchModal.open && addBatchModal.product && (
        <AddBatchModal 
          product={addBatchModal.product} 
          onClose={() => setAddBatchModal({ open: false })}
          onAdd={handleAddBatch}
        />
      )}
      {previewProduct && (
          <ProductDetailModal product={previewProduct} onClose={() => setPreviewProduct(null)} />
      )}
      
      {/* Global Scanner for Main Search */}
      {showMainScanner && <BarcodeScanner onScan={handleScanSuccess} onClose={() => setShowMainScanner(false)} />}

      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in-up">
        <h2 className="text-2xl font-bold dark:text-white">库存管理</h2>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
           {/* Search Box */}
           <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="搜索: 拼音/汉字/批号" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-12 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
              />
              <button 
                onClick={() => setShowMainScanner(true)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="扫码"
              >
                  <ScanLine className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
           </div>

           <div className="relative">
               <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                   <Filter className="w-4 h-4 text-gray-400" />
               </div>
               <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors h-full"
               >
                   {categories.map(c => <option key={c} value={c}>{c === 'ALL' ? '全部分类' : c}</option>)}
               </select>
               <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
           </div>

           {canEdit ? (
             <button 
               onClick={() => navigate('/import')}
               className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/30 font-medium hover:bg-blue-700 flex items-center gap-2 transform active:scale-95 transition-all"
             >
               <Plus className="w-5 h-5" /> 新增商品
             </button>
           ) : (
             <button disabled className="px-4 py-2 bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 rounded-xl font-medium flex items-center gap-2 cursor-not-allowed">
               <Lock className="w-4 h-4" /> 仅浏览
             </button>
           )}
        </div>
      </div>

      {isMobile ? renderMobileView() : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 text-sm uppercase tracking-wider">
                <tr>
                    <th className="p-4 w-12"></th>
                    <th className="p-4">商品信息</th>
                    <th className="p-4">SKU / 分类</th>
                    <th className="p-4 text-center">总整存 (大单位)</th>
                    <th className="p-4 text-center">总散存 (小单位)</th>
                    <th className="p-4 text-right">操作</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredProducts.map((product, index) => {
                    const isExpanded = expandedProducts.has(product.id);
                    const totalBig = product.batches.reduce((acc, b) => acc + b.quantityBig, 0);
                    const totalSmall = product.batches.reduce((acc, b) => acc + b.quantitySmall, 0);
                    const unitBig = product.batches[0]?.unitBig || '整';
                    const unitSmall = product.batches[0]?.unitSmall || '散';

                    return (
                    <React.Fragment key={product.id}>
                        <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50 dark:bg-gray-700/30' : ''}`}
                        onClick={() => toggleExpand(product.id)}
                        >
                        <td className="p-4 text-gray-400">
                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </td>
                        <td className="p-4 font-medium flex items-center gap-3">
                            <div className="relative group" onClick={(e) => { e.stopPropagation(); setPreviewProduct(product); }}>
                                <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-200 border dark:border-gray-600 transition-transform group-hover:scale-110" />
                            </div>
                            <div>
                            <div className="text-gray-900 dark:text-gray-100 font-bold">{product.name}</div>
                            {product.notes && (
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <Info className="w-3 h-3"/> 有备注
                                </div>
                            )}
                            </div>
                        </td>
                        <td className="p-4">
                            <div className="font-mono text-sm text-gray-600 dark:text-gray-300">{product.sku}</div>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs mt-1 inline-block">
                            {product.category}
                            </span>
                        </td>
                        <td className="p-4 text-center font-bold text-lg text-blue-600 dark:text-blue-400">
                            {totalBig} <span className="text-xs font-normal text-gray-500">{unitBig}</span>
                        </td>
                        <td className="p-4 text-center font-bold text-lg text-green-600 dark:text-green-400">
                            {totalSmall} <span className="text-xs font-normal text-gray-500">{unitSmall}</span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                            {canEdit && (
                            <>
                                <button 
                                onClick={(e) => { e.stopPropagation(); setAddBatchModal({ open: true, product }); }}
                                className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                >
                                新增批号
                                </button>
                                <button 
                                onClick={(e) => { e.stopPropagation(); setAdjustModal({ open: true, target: product, type: 'product' }); }}
                                className="text-sm px-3 py-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                >
                                调整
                                </button>
                            </>
                            )}
                        </td>
                        </motion.tr>

                        {isExpanded && (
                        <tr className="bg-gray-50 dark:bg-gray-900/30 inset-shadow">
                            <td colSpan={6} className="p-0">
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="py-2 px-4 space-y-2"
                            >
                                <div className="grid grid-cols-8 gap-4 text-xs font-medium text-gray-500 px-4 py-2 border-b dark:border-gray-700 uppercase">
                                    <div className="col-span-2">批号 / 备注</div>
                                    <div className="col-span-2">有效期</div>
                                    <div className="col-span-1 text-center">整存</div>
                                    <div className="col-span-1 text-center">散存</div>
                                    <div className="col-span-2 text-right">批次操作</div>
                                </div>
                                {product.batches.map(batch => (
                                <div key={batch.id} className="grid grid-cols-8 gap-4 items-center px-4 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                                    <div className="col-span-2">
                                        <div className="font-mono text-blue-600 dark:text-blue-400">{batch.batchNumber}</div>
                                        {batch.notes && <div className="text-xs text-gray-400 truncate" title={batch.notes}>{batch.notes}</div>}
                                    </div>
                                    <div className="col-span-2 text-gray-600 dark:text-gray-400">{batch.expiryDate}</div>
                                    <div className="col-span-1 text-center font-bold">{batch.quantityBig} {batch.unitBig}</div>
                                    <div className="col-span-1 text-center font-bold">{batch.quantitySmall} {batch.unitSmall}</div>
                                    <div className="col-span-2 flex justify-end gap-2">
                                        {canEdit && (
                                        <>
                                            <button 
                                            onClick={() => setBillingModal({ open: true, batch, product })}
                                            className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded flex items-center gap-1 hover:bg-green-200"
                                            >
                                            <FileText className="w-3 h-3" /> 开单
                                            </button>
                                            <button 
                                            onClick={() => setAdjustModal({ open: true, target: batch, type: 'batch', productContext: product })}
                                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded flex items-center gap-1 hover:bg-gray-200"
                                            >
                                            <Edit2 className="w-3 h-3" /> 调整
                                            </button>
                                        </>
                                        )}
                                    </div>
                                </div>
                                ))}
                            </motion.div>
                            </td>
                        </tr>
                        )}
                    </React.Fragment>
                    );
                })}
                </tbody>
            </table>
            </div>
            
            <div className="p-4 border-t dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <span className="text-sm text-gray-500">共 {filteredProducts.length} 条商品</span>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-4 h-4"/>
                </button>
                
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">第</span>
                    <input 
                    type="number" 
                    value={currentPage} 
                    onChange={e => setCurrentPage(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 h-8 text-center rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500 font-bold" 
                    />
                    <span className="text-sm text-gray-500">页 / 共 5 页</span>
                </div>

                <button 
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="p-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                    <ChevronRight className="w-4 h-4"/>
                </button>
            </div>
            </div>
        </div>
      )}
      
      <style>{`
        .input-std {
          @apply w-full p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all;
        }
      `}</style>
    </div>
  );
};

export default Inventory;