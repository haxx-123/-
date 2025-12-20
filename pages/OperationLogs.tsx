import React, { useState, useEffect, useMemo } from 'react';
import { Filter, RotateCcw, AlertTriangle, Search, X, Calendar, User as UserIcon, Tag } from 'lucide-react';
import { formatDate } from '../constants';
import { OperationLog, RoleLevel, LogAction, Product } from '../types';
import UsernameBadge from '../components/UsernameBadge';
import { useApp } from '../App';
import * as XLSX from 'xlsx';

// Translate action types for display
const getActionLabel = (type: LogAction) => {
    switch (type) {
        case LogAction.ENTRY_INBOUND: return '入库';
        case LogAction.ENTRY_OUTBOUND: return '出库';
        case LogAction.ENTRY_ADJUST: return '库存调整';
        case LogAction.PRODUCT_DELETE: return '商品删除';
        case LogAction.BATCH_IMPORT: return '批量导入';
        default: return type;
    }
};

const getActionColor = (type: LogAction) => {
    switch (type) {
        case LogAction.ENTRY_INBOUND: return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
        case LogAction.ENTRY_OUTBOUND: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
        case LogAction.ENTRY_ADJUST: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
        case LogAction.PRODUCT_DELETE: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
        case LogAction.BATCH_IMPORT: return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
};

const FilterModal = ({ filters, onApply, onClose, users }: { filters: any; onApply: (f: any) => void; onClose: () => void; users: any[] }) => {
  const [localFilters, setLocalFilters] = useState(filters);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
       <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500"><X className="w-5 h-5"/></button>
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Filter className="w-5 h-5 text-blue-500" /> 日志筛选</h3>
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-bold mb-2 flex items-center gap-2 text-gray-700 dark:text-gray-300"><Tag className="w-4 h-4"/> 操作类型</label>
                <select value={localFilters.actionType || ''} onChange={e => setLocalFilters({...localFilters, actionType: e.target.value})} className="w-full p-2 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none">
                   <option value="">全部类型</option>
                   <option value={LogAction.ENTRY_INBOUND}>入库 (Inbound)</option>
                   <option value={LogAction.ENTRY_OUTBOUND}>出库 (Outbound)</option>
                   <option value={LogAction.ENTRY_ADJUST}>库存调整 (Adjust)</option>
                   <option value={LogAction.PRODUCT_DELETE}>商品删除 (Delete)</option>
                   <option value={LogAction.BATCH_IMPORT}>批量导入 (Import)</option>
                </select>
             </div>
             <div>
                <label className="block text-sm font-bold mb-2 flex items-center gap-2 text-gray-700 dark:text-gray-300"><UserIcon className="w-4 h-4"/> 操作人</label>
                <select value={localFilters.operator || ''} onChange={e => setLocalFilters({...localFilters, operator: e.target.value})} className="w-full p-2 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none">
                   <option value="">全部</option>
                   {users.map(u => (<option key={u.id} value={u.username}>{u.username}</option>))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-bold mb-2 flex items-center gap-2 text-gray-700 dark:text-gray-300"><Calendar className="w-4 h-4"/> 时间范围</label>
                <div className="flex items-center gap-2">
                   <input type="date" value={localFilters.startDate || ''} onChange={e => setLocalFilters({...localFilters, startDate: e.target.value})} className="flex-1 p-2 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none text-xs"/>
                   <span className="text-gray-400">-</span>
                   <input type="date" value={localFilters.endDate || ''} onChange={e => setLocalFilters({...localFilters, endDate: e.target.value})} className="flex-1 p-2 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none text-xs"/>
                </div>
             </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
             <button onClick={() => { setLocalFilters({}); onApply({}); onClose(); }} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-bold">重置</button>
             <button onClick={() => { onApply(localFilters); onClose(); }} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-600/20">应用筛选</button>
          </div>
       </div>
    </div>
  );
};

const OperationLogs = () => {
  const { user, setPageActions, isMobile, logs, setLogs, users, products, setProducts } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<{ operator?: string; actionType?: string; startDate?: string; endDate?: string }>({});

  const logPermission = user?.permissions?.logPermission || (user?.role === RoleLevel.ROOT ? 'A' : 'D');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Permission Check
      if (logPermission === 'D' && log.operator_id !== user?.id) return false;
      
      // Filter Logic
      const matchesSearch = log.change_desc.includes(searchTerm) || log.operator_name.includes(searchTerm) || log.target_name.includes(searchTerm) || log.target_id.includes(searchTerm);
      const matchesOperator = filters.operator ? log.operator_name === filters.operator : true;
      const matchesType = filters.actionType ? log.action_type === filters.actionType : true;
      
      let matchesDate = true;
      if (filters.startDate) matchesDate = matchesDate && new Date(log.created_at) >= new Date(filters.startDate);
      if (filters.endDate) {
         const end = new Date(filters.endDate);
         end.setDate(end.getDate() + 1);
         matchesDate = matchesDate && new Date(log.created_at) < end;
      }
      return matchesSearch && matchesOperator && matchesType && matchesDate;
    });
  }, [logs, searchTerm, filters, logPermission, user?.id]);

  useEffect(() => {
    setPageActions({
      handleCopy: () => {
        const text = filteredLogs.map(l => `${formatDate(l.created_at)} - ${l.operator_name} [${getActionLabel(l.action_type)}] ${l.change_desc} (ID: ${l.id})`).join('\n\n');
        navigator.clipboard.writeText(text).then(() => alert('日志信息已复制'));
      },
      handleExcel: () => {
        const ws = XLSX.utils.json_to_sheet(filteredLogs.map(l => ({...l, action_label: getActionLabel(l.action_type)})));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Logs");
        XLSX.writeFile(wb, `logs_export_${Date.now()}.xlsx`);
      }
    });
    return () => setPageActions({});
  }, [filteredLogs, setPageActions]);

  const canRevoke = (log: OperationLog) => {
      if (log.is_revoked) return false;
      switch (logPermission) {
          case 'A': return true;
          case 'B': return log.role_level > (user?.role || RoleLevel.GUEST);
          case 'C': return log.operator_id === user?.id;
          case 'D': return log.operator_id === user?.id;
          default: return false;
      }
  };

  const handleUndo = (log: OperationLog, e?: React.MouseEvent) => {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }

    if (!canRevoke(log)) {
        alert("无权撤销此操作");
        return;
    }

    // Secondary Confirmation as per requirement
    const confirmMsg = `确定撤销？\n\n操作：${getActionLabel(log.action_type)}\n内容：${log.change_desc}\n\n后果：将回滚库存或数据状态，此操作不可逆。`;
    if (!window.confirm(confirmMsg)) return;

    let rollbackSuccess = false;
    let errorMessage = '';

    try {
        const snap = log.snapshot_data;

        // --- 1. 入库 (Inbound) 撤销逻辑 ---
        if (log.action_type === LogAction.ENTRY_INBOUND) {
            if (snap && snap.productId && snap.batchId && (snap.deltaQty !== undefined)) {
                const unit = snap.unitType || 'big';
                const isCreation = snap.isCreation; // Check if this was a new batch creation
                
                // 查找目标商品
                const targetProduct = products.find(p => p.id === snap.productId);
                if (targetProduct) {
                    if (isCreation) {
                        // Special handling for undoing a manual entry creation
                        // Check if we can just delete it or if it has been used?
                        // For simplicity, we try to revert stock. If stock < created stock, fail.
                    }

                    // 查找目标批号
                    const targetBatch = targetProduct.batches.find(b => b.id === snap.batchId);
                    if (targetBatch) {
                        const currentQty = unit === 'big' ? targetBatch.quantityBig : targetBatch.quantitySmall;
                        // 检查库存充足性
                        if (currentQty < snap.deltaQty) {
                            errorMessage = "库存不足，无法撤销！\n(入库后商品可能已被售出或出库)";
                        } else {
                            // 执行：当前库存 = 当前库存 - change_delta
                            setProducts(prev => prev.map(p => {
                                if (p.id === snap.productId) {
                                    return {
                                        ...p,
                                        batches: p.batches.map(b => {
                                            if (b.id === snap.batchId) {
                                                return {
                                                    ...b,
                                                    quantityBig: unit === 'big' ? b.quantityBig - snap.deltaQty : b.quantityBig,
                                                    quantitySmall: unit === 'small' ? b.quantitySmall - snap.deltaQty : b.quantitySmall
                                                }
                                            }
                                            return b;
                                        })
                                    }
                                }
                                return p;
                            }));
                            rollbackSuccess = true;
                        }
                    } else {
                        errorMessage = '批号已不存在，无法撤销入库。';
                    }
                } else {
                    errorMessage = '商品已不存在，无法撤销入库。';
                }
            } else {
                errorMessage = '缺少入库快照数据，无法回滚。';
            }
        }

        // --- 2. 出库 (Outbound) 撤销逻辑 ---
        else if (log.action_type === LogAction.ENTRY_OUTBOUND) {
            if (snap && snap.productId && snap.batchId && (snap.deltaQty !== undefined)) {
                const unit = snap.unitType || 'big';
                setProducts(prev => prev.map(p => {
                    if (p.id === snap.productId) {
                        return {
                            ...p,
                            batches: p.batches.map(b => {
                                if (b.id === snap.batchId) {
                                    return {
                                        ...b,
                                        quantityBig: unit === 'big' ? b.quantityBig + snap.deltaQty : b.quantityBig,
                                        quantitySmall: unit === 'small' ? b.quantitySmall + snap.deltaQty : b.quantitySmall
                                    }
                                }
                                return b;
                            })
                        }
                    }
                    return p;
                }));
                rollbackSuccess = true;
            } else {
                errorMessage = '缺少出库快照数据，无法回滚。';
            }
        }

        // --- 3. 库存调整 (Adjustment) 撤销逻辑 ---
        else if (log.action_type === LogAction.ENTRY_ADJUST) {
            if (snap && snap.originalData) {
                if (snap.type === 'batch') {
                    setProducts(prev => prev.map(p => {
                        if (p.batches.some(b => b.id === snap.originalData.id)) {
                            return {
                                ...p,
                                batches: p.batches.map(b => b.id === snap.originalData.id ? snap.originalData : b)
                            }
                        }
                        return p;
                    }));
                    rollbackSuccess = true;
                } else if (snap.type === 'product') {
                    setProducts(prev => prev.map(p => p.id === snap.originalData.id ? snap.originalData : p));
                    rollbackSuccess = true;
                }
            } else {
                errorMessage = '缺少调整前快照，无法还原。';
            }
        }

        // --- 4. 商品删除 (Delete) 撤销逻辑 ---
        else if (log.action_type === LogAction.PRODUCT_DELETE) {
            if (snap && snap.originalProduct) {
                setProducts(prev => [...prev, snap.originalProduct]);
                rollbackSuccess = true;
            } else {
                errorMessage = '缺少被删除商品的数据快照。';
            }
        }

        // --- 5. 批量导入 (Import) 撤销逻辑 ---
        else if (log.action_type === LogAction.BATCH_IMPORT) {
            const batchIdsToDelete = snap.batchIds || (snap.batchId ? [snap.batchId] : []);
            const productIdsToDelete = snap.productIds || (snap.productId ? [snap.productId] : []);

            if (productIdsToDelete.length > 0) {
                setProducts(prev => prev.filter(p => !productIdsToDelete.includes(p.id)));
                rollbackSuccess = true;
            } else if (batchIdsToDelete.length > 0) {
                setProducts(prev => prev.map(p => ({
                    ...p,
                    batches: p.batches.filter(b => !batchIdsToDelete.includes(b.id))
                })).filter(p => p.batches.length > 0)); 
                rollbackSuccess = true;
            } else {
                errorMessage = '快照中未找到导入的ID记录，无法批量撤销。';
            }
        }

        else {
            errorMessage = '未知操作类型，系统无法自动回滚。';
        }

    } catch (err) {
        console.error(err);
        errorMessage = '撤销执行过程中发生系统错误。';
    }

    if (rollbackSuccess) {
        const updatedLogs = logs.map(l => l.id === log.id ? { ...l, is_revoked: true } : l);
        setLogs(updatedLogs);
        alert("撤销成功：数据已还原。");
    } else {
        alert(`撤销失败: ${errorMessage}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {showFilter && <FilterModal filters={filters} onApply={setFilters} onClose={() => setShowFilter(false)} users={users} />}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold dark:text-white">操作日志</h2>
            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-500">权限等级: {logPermission}</span>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" placeholder="搜索日志..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
           </div>
           <button onClick={() => setShowFilter(true)} className={`px-4 py-2 border dark:border-gray-700 rounded-xl flex items-center gap-2 transition-colors ${Object.keys(filters).length > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Filter className="w-4 h-4" /> 筛选</button>
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-4">
            {filteredLogs.map(log => (
                <div key={log.id} className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 ${log.is_revoked ? 'opacity-50 grayscale' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-sm text-gray-500">{formatDate(log.created_at)}</div>
                        <UsernameBadge name={log.operator_name} roleLevel={log.role_level} className="text-sm" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getActionColor(log.action_type)}`}>
                            {getActionLabel(log.action_type)}
                        </span>
                    </div>
                    <div className="font-bold text-gray-800 dark:text-white mb-1">
                        {log.is_revoked && <span className="text-red-500 mr-1">[已撤销]</span>}
                        {log.change_desc}
                    </div>
                    <div className="flex justify-between items-center mt-3">
                        <span className="text-xs text-gray-400">ID: {log.target_id}</span>
                        {!log.is_revoked ? (
                            canRevoke(log) ? (
                                <button onClick={(e) => handleUndo(log, e)} className="px-3 py-1 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-xs hover:bg-red-100 transition-colors z-10 relative">撤销</button>
                            ) : <span className="text-xs text-gray-300 italic">无权限</span>
                        ) : <span className="text-xs text-gray-400">已回滚</span>}
                    </div>
                </div>
            ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
            <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                    <th className="p-4">时间</th>
                    <th className="p-4">操作人</th>
                    <th className="p-4">类型</th>
                    <th className="p-4">操作内容</th>
                    <th className="p-4">对象</th>
                    <th className="p-4 text-right">撤销</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredLogs.map(log => (
                <tr key={log.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${log.is_revoked ? 'opacity-50 grayscale' : ''}`}>
                    <td className="p-4 text-gray-500 text-sm">{formatDate(log.created_at)}</td>
                    <td className="p-4"><UsernameBadge name={log.operator_name} roleLevel={log.role_level} /></td>
                    <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getActionColor(log.action_type)}`}>
                            {getActionLabel(log.action_type)}
                        </span>
                    </td>
                    <td className="p-4"><div className="font-medium text-gray-800 dark:text-gray-200">{log.is_revoked && <span className="text-red-500 font-bold mr-2">[已撤销]</span>}{log.change_desc}</div></td>
                    <td className="p-4 text-sm text-gray-500">ID: {log.target_id}</td>
                    <td className="p-4 text-right">
                    {!log.is_revoked ? (
                        canRevoke(log) ? (
                            <button onClick={(e) => handleUndo(log, e)} className="px-3 py-1 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center gap-1 ml-auto transition-colors cursor-pointer z-10 relative"><RotateCcw className="w-3 h-3" /> 撤销</button>
                        ) : <span className="text-xs text-gray-300 italic">无权限</span>
                    ) : <span className="text-xs text-gray-400">已回滚</span>}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
            {filteredLogs.length === 0 && <div className="p-8 text-center text-gray-400">暂无日志数据</div>}
        </div>
      )}
    </div>
  );
};

export default OperationLogs;