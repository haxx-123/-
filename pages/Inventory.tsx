
import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Plus, Package, FileText, Edit2, X, Save, ArrowRightLeft, Info, ScanLine, Filter, MapPin, Trash2, Image as ImageIcon, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Product, Batch, RoleLevel, LogAction } from '../types';
import { useApp } from '../App';
import { motion } from 'framer-motion';
import BarcodeScanner from '../components/BarcodeScanner';
import CameraModal from '../components/CameraModal';
import { supabase } from '../supabase';
import * as XLSX from 'xlsx';

// --- Loading Button ---
const LoadingButton = ({ onClick, loading, children, className }: any) => (
    <button onClick={onClick} disabled={loading} className={`${className} ${loading ? 'opacity-70 cursor-not-allowed' : ''} flex items-center justify-center gap-2`}>
        {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
        {children}
    </button>
);

// --- Modals ---
const BillingModal = ({ batch, productName, onClose, onConfirm }: any) => {
  const [type, setType] = useState<'in' | 'out'>('out');
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState('big');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
      setLoading(true);
      await onConfirm(type, qty, unit);
      setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <h3 className="font-bold text-lg mb-4">开单 - {productName}</h3>
        <div className="flex gap-2 mb-4">
            <button onClick={() => setType('out')} className={`flex-1 py-2 rounded ${type==='out'?'bg-red-500 text-white':'bg-gray-100 text-gray-500'}`}>出库</button>
            <button onClick={() => setType('in')} className={`flex-1 py-2 rounded ${type==='in'?'bg-green-500 text-white':'bg-gray-100 text-gray-500'}`}>入库</button>
        </div>
        <div className="space-y-4">
             <div className="text-sm">批号: {batch.batchNumber}</div>
             <div className="flex gap-4">
               <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="flex-1 p-2 border rounded" placeholder="数量"/>
               <select value={unit} onChange={(e) => setUnit(e.target.value)} className="p-2 border rounded">
                   <option value="big">{batch.unitBig}</option>
                   <option value="small">{batch.unitSmall}</option>
               </select>
             </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">取消</button>
            <LoadingButton onClick={handleConfirm} loading={loading} className="px-4 py-2 bg-blue-600 text-white rounded">确认</LoadingButton>
        </div>
      </div>
    </div>
  );
};

const AdjustModal = ({ target, type, onClose, onSave }: any) => {
    const [formData, setFormData] = useState({...target});
    const [loading, setLoading] = useState(false);
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl">
                <h3 className="font-bold text-lg mb-4">调整信息</h3>
                <div className="space-y-3">
                    {type === 'batch' ? (
                        <>
                            <div><label>批号</label><input className="w-full border p-2 rounded" value={formData.batchNumber} onChange={e=>setFormData({...formData, batchNumber: e.target.value})}/></div>
                            <div><label>整数量</label><input type="number" className="w-full border p-2 rounded" value={formData.quantityBig} onChange={e=>setFormData({...formData, quantityBig: Number(e.target.value)})}/></div>
                            <div><label>散数量</label><input type="number" className="w-full border p-2 rounded" value={formData.quantitySmall} onChange={e=>setFormData({...formData, quantitySmall: Number(e.target.value)})}/></div>
                        </>
                    ) : (
                        <>
                            <div><label>名称</label><input className="w-full border p-2 rounded" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})}/></div>
                            <div><label>SKU</label><input className="w-full border p-2 rounded" value={formData.sku} onChange={e=>setFormData({...formData, sku: e.target.value})}/></div>
                        </>
                    )}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">取消</button>
                    <LoadingButton onClick={async () => { setLoading(true); await onSave(formData); setLoading(false); }} loading={loading} className="px-4 py-2 bg-blue-600 text-white rounded">保存</LoadingButton>
                </div>
            </div>
        </div>
    );
};

const AddBatchModal = ({ product, onClose, onAdd }: any) => {
    const [form, setForm] = useState({ batchNumber: '', expiryDate: '', quantityBig: 0, quantitySmall: 0, unitBig: '整', unitSmall: '散', notes: '' });
    const [loading, setLoading] = useState(false);
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
                <h3 className="font-bold text-lg mb-4">新增批号 - {product.name}</h3>
                <div className="space-y-3">
                    <input className="w-full border p-2 rounded" placeholder="批号" value={form.batchNumber} onChange={e=>setForm({...form, batchNumber: e.target.value})}/>
                    <input type="date" className="w-full border p-2 rounded" value={form.expiryDate} onChange={e=>setForm({...form, expiryDate: e.target.value})}/>
                    <div className="flex gap-2">
                        <input type="number" className="w-full border p-2 rounded" placeholder="整数量" value={form.quantityBig} onChange={e=>setForm({...form, quantityBig: Number(e.target.value)})}/>
                        <input type="number" className="w-full border p-2 rounded" placeholder="散数量" value={form.quantitySmall} onChange={e=>setForm({...form, quantitySmall: Number(e.target.value)})}/>
                    </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">取消</button>
                    <LoadingButton onClick={async () => { setLoading(true); await onAdd(form); setLoading(false); }} loading={loading} className="px-4 py-2 bg-blue-600 text-white rounded">添加</LoadingButton>
                </div>
            </div>
        </div>
    );
};

// --- Pagination Component ---
const Pagination = ({ current, total, pageSize, onChange }: { current: number, total: number, pageSize: number, onChange: (p: number) => void }) => {
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t dark:border-gray-700">
            <button onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"><ChevronLeft className="w-5 h-5"/></button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">第 {current} 页 / 共 {totalPages} 页</span>
            <button onClick={() => onChange(Math.min(totalPages, current + 1))} disabled={current === totalPages} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"><ChevronRight className="w-5 h-5"/></button>
        </div>
    );
}

const Inventory = () => {
  const { user, currentStore, setPageActions, products, stores, reloadData } = useApp();
  const navigate = useNavigate();
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [billingModal, setBillingModal] = useState<any>({ open: false });
  const [adjustModal, setAdjustModal] = useState<any>({ open: false });
  const [addBatchModal, setAddBatchModal] = useState<any>({ open: false });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const isolatedProducts = useMemo(() => {
      return products.filter(p => {
          if (currentStore.isParent) return currentStore.childrenIds?.includes(p.storeId);
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

  // Paginated Data
  const paginatedProducts = useMemo(() => {
      const start = (currentPage - 1) * pageSize;
      return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage]);

  // Reset page on search
  useEffect(() => { setCurrentPage(1); }, [searchTerm, categoryFilter]);

  // --- Real DB Actions ---

  const handleBillingConfirm = async (type: 'in' | 'out', qty: number, unit: 'big' | 'small') => {
      const { batch, product } = billingModal;
      if (!batch || !product) return;

      const newBig = unit === 'big' ? (type === 'in' ? batch.quantityBig + qty : batch.quantityBig - qty) : batch.quantityBig;
      const newSmall = unit === 'small' ? (type === 'in' ? batch.quantitySmall + qty : batch.quantitySmall - qty) : batch.quantitySmall;

      try {
          // Update DB
          const { error } = await supabase.from('batches').update({
              quantity_big: newBig,
              quantity_small: newSmall
          }).eq('id', batch.id);

          if (error) throw error;

          // Log
          await supabase.from('operation_logs').insert({
              id: `log_${Date.now()}`,
              action_type: type === 'in' ? LogAction.ENTRY_INBOUND : LogAction.ENTRY_OUTBOUND,
              target_id: batch.id,
              target_name: product.name,
              change_desc: `${type === 'in' ? '入库' : '出库'}: ${product.name} x ${qty}${unit}`,
              operator_id: user?.id,
              operator_name: user?.username,
              role_level: user?.role,
              snapshot_data: { productId: product.id, batchId: batch.id, deltaQty: qty, unitType: unit, operation: type },
              created_at: new Date().toISOString()
          });

          await reloadData();
          setBillingModal({ open: false });
          // alert('操作成功'); // Removed alert to improve speed perception
      } catch (err) {
          alert('操作失败');
          console.error(err);
      }
  };

  const handleAdjustSave = async (data: any) => {
      const { type, target } = adjustModal;
      try {
          if (type === 'batch') {
              const { error } = await supabase.from('batches').update({
                  batch_number: data.batchNumber,
                  quantity_big: data.quantityBig,
                  quantity_small: data.quantitySmall
              }).eq('id', target.id);
              if (error) throw error;
          } else {
              const { error } = await supabase.from('products').update({
                  name: data.name,
                  sku: data.sku
              }).eq('id', target.id);
              if (error) throw error;
          }
          // Log adjustment
          await supabase.from('operation_logs').insert({
              id: `log_${Date.now()}`,
              action_type: LogAction.ENTRY_ADJUST,
              target_id: target.id,
              target_name: type === 'batch' ? '批号调整' : '商品调整',
              change_desc: `调整数据`,
              operator_id: user?.id,
              operator_name: user?.username,
              created_at: new Date().toISOString()
          });

          await reloadData();
          setAdjustModal({ open: false });
      } catch (err) {
          alert('保存失败');
      }
  };

  const handleAddBatch = async (batchData: any) => {
      const { product } = addBatchModal;
      try {
          const { error } = await supabase.from('batches').insert({
              id: `b_${Date.now()}`,
              product_id: product.id,
              batch_number: batchData.batchNumber,
              expiry_date: batchData.expiryDate || '2099-12-31',
              quantity_big: batchData.quantityBig,
              quantity_small: batchData.quantitySmall,
              unit_big: batchData.unitBig,
              unit_small: batchData.unitSmall,
              notes: batchData.notes
          });
          if (error) throw error;

          await reloadData();
          setAddBatchModal({ open: false });
      } catch (err) {
          alert('新增失败');
      }
  };

  const handleDeleteProduct = async (product: Product) => {
      if(!window.confirm(`确定要删除 "${product.name}" 吗？`)) return;
      try {
          const { error } = await supabase.from('products').delete().eq('id', product.id);
          if (error) throw error;

          await supabase.from('operation_logs').insert({
              id: `log_${Date.now()}`,
              action_type: LogAction.PRODUCT_DELETE,
              target_id: product.id,
              target_name: product.name,
              change_desc: `删除商品`,
              operator_id: user?.id,
              operator_name: user?.username,
              created_at: new Date().toISOString()
          });

          await reloadData();
      } catch (err) {
          alert('删除失败');
      }
  };

  const canEdit = user?.role === RoleLevel.ROOT || currentStore.managerIds?.includes(user?.id || '');
  const toggleExpand = (pid: string) => { const newSet = new Set(expandedProducts); if (newSet.has(pid)) newSet.delete(pid); else newSet.add(pid); setExpandedProducts(newSet); };
  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];

  return (
    <div className="space-y-6">
      {billingModal.open && <BillingModal batch={billingModal.batch} productName={billingModal.product.name} onClose={() => setBillingModal({ open: false })} onConfirm={handleBillingConfirm} />}
      {adjustModal.open && <AdjustModal target={adjustModal.target} type={adjustModal.type} onClose={() => setAdjustModal({ open: false })} onSave={handleAdjustSave} />}
      {addBatchModal.open && <AddBatchModal product={addBatchModal.product} onClose={() => setAddBatchModal({ open: false })} onAdd={handleAddBatch} />}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in-up">
        <h2 className="text-2xl font-bold dark:text-white">库存管理</h2>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
           <div className="relative flex-1 min-w-[250px]"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="text" placeholder="搜索商品" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-12 py-2 rounded-xl border outline-none"/></div>
           <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="pl-3 pr-8 py-2 rounded-xl border outline-none cursor-pointer">{categories.map(c => <option key={c} value={c}>{c === 'ALL' ? '全部分类' : c}</option>)}</select>
           {canEdit && !currentStore.isParent && (<button onClick={() => navigate('/import')} className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 flex items-center gap-2"><Plus className="w-5 h-5" /> 新增商品</button>)}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 text-sm uppercase">
                <tr><th className="p-4 w-12"></th><th className="p-4">商品信息</th><th className="p-4">SKU / 分类</th><th className="p-4 text-center">总整存</th><th className="p-4 text-center">总散存</th><th className="p-4 text-right">操作</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedProducts.map((product, index) => {
                    const isExpanded = expandedProducts.has(product.id);
                    const totalBig = product.batches.reduce((acc, b) => acc + b.quantityBig, 0);
                    const totalSmall = product.batches.reduce((acc, b) => acc + b.quantitySmall, 0);
                    return (
                    <React.Fragment key={product.id}>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer" onClick={() => toggleExpand(product.id)}>
                        <td className="p-4 text-gray-400">{isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}</td>
                        <td className="p-4 font-medium flex items-center gap-3">
                            <div className="text-gray-900 dark:text-gray-100 font-bold">{product.name}</div>
                        </td>
                        <td className="p-4"><div className="font-mono text-sm">{product.sku}</div></td>
                        <td className="p-4 text-center font-bold text-blue-600">{totalBig}</td>
                        <td className="p-4 text-center font-bold text-green-600">{totalSmall}</td>
                        <td className="p-4 text-right space-x-2">
                            {canEdit && !currentStore.isParent && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); setAddBatchModal({ open: true, product }); }} className="text-sm px-3 py-1 bg-gray-100 rounded-lg">新增批号</button>
                                <button onClick={(e) => { e.stopPropagation(); setAdjustModal({ open: true, target: product, type: 'product' }); }} className="text-sm px-3 py-1 text-blue-600 rounded-lg">调整</button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product); }} className="text-sm px-3 py-1 text-red-600 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                            </>
                            )}
                        </td>
                        </tr>
                        {isExpanded && (
                        <tr className="bg-gray-50 dark:bg-gray-900/30">
                            <td colSpan={6} className="p-0">
                            <div className="py-2 px-4 space-y-2">
                                {product.batches.map(batch => (
                                <div key={batch.id} className="grid grid-cols-8 gap-4 items-center px-4 py-3 bg-white dark:bg-gray-800 rounded-lg border">
                                    <div className="col-span-2 font-mono text-blue-600">{batch.batchNumber}</div>
                                    <div className="col-span-2">{batch.expiryDate}</div>
                                    <div className="col-span-1 text-center font-bold">{batch.quantityBig} {batch.unitBig}</div>
                                    <div className="col-span-1 text-center font-bold">{batch.quantitySmall} {batch.unitSmall}</div>
                                    <div className="col-span-2 flex justify-end gap-2">
                                        {canEdit && !currentStore.isParent && (<>
                                            <button onClick={() => setBillingModal({ open: true, batch, product })} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">开单</button>
                                            <button onClick={() => setAdjustModal({ open: true, target: batch, type: 'batch' })} className="text-xs px-2 py-1 bg-gray-100 rounded">调整</button>
                                        </>)}
                                    </div>
                                </div>
                                ))}
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
      </div>
      
      {/* Pagination Control */}
      <Pagination current={currentPage} total={filteredProducts.length} pageSize={pageSize} onChange={setCurrentPage} />
    </div>
  );
};

export default Inventory;
