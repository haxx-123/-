
// ... existing imports ...
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Filter, RotateCcw, AlertTriangle, Search, X, Calendar, User as UserIcon, Tag, ScanLine, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { formatDate } from '../constants';
import { OperationLog, RoleLevel, LogAction, Product } from '../types';
import UsernameBadge from '../components/UsernameBadge';
import { useApp } from '../App';
import * as XLSX from 'xlsx';
import { supabase, syncProductStock } from '../supabase';
import BarcodeScanner from '../components/BarcodeScanner';

// ... (retain helpers and components) ...
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

// New Component: Truncated Text with Tooltip
const TruncatedText = ({ text, className = '', maxLines = 2 }: { text: string; className?: string; maxLines?: number }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const timerRef = useRef<any>(null);
    const [coords, setCoords] = useState({ x: 0, y: 0 });

    const handleMouseEnter = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCoords({ x: rect.left, y: rect.bottom + 5 });
        
        // 0.5s delay before showing tooltip
        timerRef.current = setTimeout(() => {
            setShowTooltip(true);
        }, 500);
    };

    const handleMouseLeave = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setShowTooltip(false);
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            // User requirement: Click text to copy when box appears. 
            // We use alert to notify success.
            alert('详细信息已复制到剪切板');
        });
        setShowTooltip(false);
    };

    return (
        <div 
            className={`relative group cursor-pointer ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleCopy}
        >
            <div className={`line-clamp-${maxLines} break-all overflow-hidden text-ellipsis`}>
                {text}
            </div>
            
            {showTooltip && (
                <div 
                    className="fixed z-[100] bg-gray-900/95 backdrop-blur text-white text-xs p-3 rounded-lg shadow-xl max-w-sm border border-gray-700 animate-fade-in pointer-events-none"
                    style={{ top: coords.y, left: Math.min(coords.x, window.innerWidth - 300) }} 
                >
                    <div className="break-all whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">{text}</div>
                    <div className="mt-2 pt-2 border-t border-gray-700 text-gray-400 text-[10px] flex items-center gap-1 justify-end">
                        <Copy className="w-3 h-3"/> 点击文字复制全部
                    </div>
                </div>
            )}
        </div>
    );
};

// 13. Pagination Component Update
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
  const { user, setPageActions, isMobile, logs, setLogs, users, products, currentStore, reloadData } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<{ operator?: string; actionType?: string; startDate?: string; endDate?: string }>({});
  const [showScanner, setShowScanner] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const logPermission = user?.permissions?.logPermission || (user?.role === RoleLevel.ROOT ? 'A' : 'D');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Data Isolation
      let snapshot: any = {};
      try {
          // Defensive parsing
          if (typeof log.snapshot_data === 'string') {
              snapshot = JSON.parse(log.snapshot_data);
          } else if (log.snapshot_data) {
              snapshot = log.snapshot_data;
          }
      } catch(e) {}

      const productId = snapshot?.productId || snapshot?.originalProduct?.id || snapshot?.originalData?.product_id; 
      if (productId) {
          const product = products.find(p => p.id === productId);
          if (product) {
              if (currentStore.isParent) {
                  if (!(currentStore.childrenIds || []).includes(product.storeId)) return false;
              } else {
                  if (product.storeId !== currentStore.id) return false;
              }
          }
      }

      // Permission Check
      if (logPermission === 'D' && log.operator_id !== user?.id) return false;
      
      // Filters
      const lowerTerm = searchTerm.toLowerCase();
      const matchesSearch = 
        log.change_desc.toLowerCase().includes(lowerTerm) || 
        log.operator_name.toLowerCase().includes(lowerTerm) || 
        log.target_name.toLowerCase().includes(lowerTerm) ||
        log.target_id.toLowerCase().includes(lowerTerm);

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
  }, [logs, searchTerm, filters, logPermission, user?.id, currentStore, products]);

  const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [searchTerm, filters]);

  useEffect(() => {
    setPageActions({
      handleCopy: () => {
        const text = filteredLogs.map(l => `${formatDate(l.created_at)} - ${l.operator_name} ${l.change_desc}`).join('\n\n');
        navigator.clipboard.writeText(text).then(() => alert('日志信息已复制'));
      },
      handleExcel: () => {
        const ws = XLSX.utils.json_to_sheet(filteredLogs.map(l => ({
            '时间': formatDate(l.created_at),
            '操作人': l.operator_name,
            '类型': getActionLabel(l.action_type),
            '内容': l.change_desc,
            '是否撤销': l.is_revoked ? '是' : '否'
        })));
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

  const renderChangeDesc = (log: OperationLog) => {
      return log.change_desc; 
  };

  // 18.2 Rollback Functionality using DB RPC
  const handleUndo = async (log: OperationLog, e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (!canRevoke(log)) { alert("无权撤销此操作"); return; }
    
    const confirmMsg = `撤销操作警告\n\n操作：${getActionLabel(log.action_type)}\n内容：${log.change_desc}\n\n确定要撤销吗？这将尝试自动回滚库存变动。`;
    if (!window.confirm(confirmMsg)) return;

    try {
        const { data, error } = await supabase.rpc('rollback_operation', { 
            log_id: log.id 
        });

        if (error) throw error;

        // data format returned by RPC: { success: boolean, message: string }
        if (data && data.success) {
            alert('撤销成功');
            await reloadData();
        } else {
            alert(`撤销失败: ${data?.message || '未知错误'}`);
        }
    } catch (err: any) {
        console.error("Rollback Error:", err);
        alert('系统错误: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      {showFilter && <FilterModal filters={filters} onApply={setFilters} onClose={() => setShowFilter(false)} users={users} />}
      {showScanner && <BarcodeScanner onScan={(val) => { setSearchTerm(val); setShowScanner(false); }} onClose={() => setShowScanner(false)} />}
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent select-none">操作日志</h2>
            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-500">当前门店: {currentStore.name}</span>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" placeholder="搜索日志/ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-10 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
              <button onClick={() => setShowScanner(true)} className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 bg-gray-100 dark:bg-gray-700 rounded hover:text-blue-500"><ScanLine className="w-4 h-4"/></button>
           </div>
           <button onClick={() => setShowFilter(true)} className={`px-4 py-2 border dark:border-gray-700 rounded-xl flex items-center gap-2 transition-colors ${Object.keys(filters).length > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Filter className="w-4 h-4" /> 筛选</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
        {paginatedLogs.length > 0 ? (
            <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                    <th className="p-4 w-40">时间</th>
                    <th className="p-4 w-32">操作人</th>
                    <th className="p-4 w-24">类型</th>
                    <th className="p-4">操作内容</th>
                    {!isMobile && <th className="p-4 w-32">对象ID</th>}
                    <th className="p-4 text-right w-24">撤销</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedLogs.map(log => {
                    if (log.is_revoked) return null;
                    return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="p-4 text-gray-500 text-sm">{formatDate(log.created_at)}</td>
                        <td className="p-4"><UsernameBadge name={log.operator_name} roleLevel={log.role_level} /></td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${getActionColor(log.action_type)}`}>
                                {getActionLabel(log.action_type)}
                            </span>
                        </td>
                        <td className="p-4">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-500 mb-1">{log.target_name}</span>
                                <TruncatedText 
                                    text={renderChangeDesc(log)} 
                                    className="font-medium text-gray-800 dark:text-gray-200" 
                                />
                            </div>
                        </td>
                        {!isMobile && (
                            <td className="p-4 text-sm text-gray-500">
                                <TruncatedText text={log.target_id} />
                            </td>
                        )}
                        <td className="p-4 text-right">
                            {canRevoke(log) ? (
                                <button onClick={(e) => handleUndo(log, e)} className="px-3 py-1 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center gap-1 ml-auto transition-colors cursor-pointer z-10 relative">
                                    <RotateCcw className="w-3 h-3" /> 撤销
                                </button>
                            ) : <span className="text-xs text-gray-300 italic">无权限</span>}
                        </td>
                    </tr>
                    );
                })}
            </tbody>
            </table>
        ) : (
            <div className="p-10 text-center text-gray-400">暂无日志数据</div>
        )}
        <Pagination current={page} total={filteredLogs.length} pageSize={pageSize} onChange={setPage} />
      </div>
    </div>
  );
};

export default OperationLogs;
