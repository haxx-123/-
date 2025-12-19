import React, { useState, useEffect } from 'react';
import { Filter, RotateCcw, AlertTriangle, Search, X, Calendar, User as UserIcon } from 'lucide-react';
import { MOCK_LOGS, formatDate, MOCK_USERS } from '../constants';
import { OperationLog, RoleLevel } from '../types';
import UsernameBadge from '../components/UsernameBadge';
import { useApp } from '../App';
import * as XLSX from 'xlsx';

// --- Filter Modal ---
const FilterModal = ({ 
  filters, 
  onApply, 
  onClose 
}: { 
  filters: any; 
  onApply: (f: any) => void; 
  onClose: () => void 
}) => {
  const [localFilters, setLocalFilters] = useState(filters);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
       <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500"><X className="w-5 h-5"/></button>
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
             <Filter className="w-5 h-5 text-blue-500" /> 日志筛选
          </h3>
          
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-bold mb-2 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                   <UserIcon className="w-4 h-4"/> 操作人
                </label>
                <select 
                   value={localFilters.operator || ''} 
                   onChange={e => setLocalFilters({...localFilters, operator: e.target.value})}
                   className="w-full p-2 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none"
                >
                   <option value="">全部</option>
                   {MOCK_USERS.map(u => (
                      <option key={u.id} value={u.username}>{u.username}</option>
                   ))}
                </select>
             </div>
             
             <div>
                <label className="block text-sm font-bold mb-2 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                   <Calendar className="w-4 h-4"/> 时间范围
                </label>
                <div className="flex items-center gap-2">
                   <input 
                     type="date" 
                     value={localFilters.startDate || ''}
                     onChange={e => setLocalFilters({...localFilters, startDate: e.target.value})}
                     className="flex-1 p-2 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none text-xs"
                   />
                   <span className="text-gray-400">-</span>
                   <input 
                     type="date" 
                     value={localFilters.endDate || ''}
                     onChange={e => setLocalFilters({...localFilters, endDate: e.target.value})}
                     className="flex-1 p-2 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none text-xs"
                   />
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
  const { setPageActions, isMobile } = useApp();
  const [logs, setLogs] = useState<OperationLog[]>(MOCK_LOGS);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<{ operator?: string; startDate?: string; endDate?: string }>({});

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.change_desc.includes(searchTerm) || 
      log.operator_name.includes(searchTerm) ||
      log.target_name.includes(searchTerm) ||
      log.target_id.includes(searchTerm);
    
    const matchesOperator = filters.operator ? log.operator_name === filters.operator : true;
    
    let matchesDate = true;
    if (filters.startDate) {
       matchesDate = matchesDate && new Date(log.created_at) >= new Date(filters.startDate);
    }
    if (filters.endDate) {
       const end = new Date(filters.endDate);
       end.setDate(end.getDate() + 1);
       matchesDate = matchesDate && new Date(log.created_at) < end;
    }

    return matchesSearch && matchesOperator && matchesDate;
  });

  useEffect(() => {
    setPageActions({
      handleCopy: () => {
        const text = filteredLogs.map(l => 
          `${formatDate(l.created_at)} - ${l.operator_name} 执行了 ${l.action_type} 操作。\n对象: ${l.target_name}\n变动: ${l.change_desc}\n(ID: ${l.id})`
        ).join('\n\n');
        navigator.clipboard.writeText(text).then(() => alert('日志信息已复制'));
      },
      handleExcel: () => {
        const ws = XLSX.utils.json_to_sheet(filteredLogs);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Logs");
        XLSX.writeFile(wb, `logs_export_${Date.now()}.xlsx`);
      }
    });
    return () => setPageActions({});
  }, [filteredLogs, setPageActions]);

  const handleUndo = (log: OperationLog) => {
    if (window.confirm(`确认要撤销此操作吗？\n${log.change_desc}`)) {
       const updatedLogs = logs.map(l => l.id === log.id ? { ...l, is_revoked: true } : l);
       setLogs(updatedLogs);
       alert('操作已撤销 (数据已回滚)');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {showFilter && (
        <FilterModal 
          filters={filters} 
          onApply={setFilters} 
          onClose={() => setShowFilter(false)} 
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold dark:text-white">操作日志</h2>
        <div className="flex gap-2 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="搜索日志..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
           </div>
           <button 
             onClick={() => setShowFilter(true)}
             className={`px-4 py-2 border dark:border-gray-700 rounded-xl flex items-center gap-2 transition-colors ${
               Object.keys(filters).length > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
             }`}
           >
             <Filter className="w-4 h-4" /> 筛选
           </button>
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
                    <div className="font-bold text-gray-800 dark:text-white mb-1">
                        {log.is_revoked && <span className="text-red-500 mr-1">[已撤销]</span>}
                        {log.change_desc}
                    </div>
                    <div className="flex justify-between items-center mt-3">
                        <span className="text-xs text-gray-400">ID: {log.target_id}</span>
                        {!log.is_revoked ? (
                            <button 
                                onClick={() => handleUndo(log)}
                                className="px-3 py-1 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-xs"
                            >
                                撤销
                            </button>
                        ) : (
                            <span className="text-xs text-gray-400">已回滚</span>
                        )}
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
                <th className="p-4">操作内容</th>
                <th className="p-4">对象</th>
                <th className="p-4 text-right">撤销</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredLogs.map(log => (
                <tr key={log.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${log.is_revoked ? 'opacity-50 grayscale' : ''}`}>
                    <td className="p-4 text-gray-500 text-sm">{formatDate(log.created_at)}</td>
                    <td className="p-4">
                    <UsernameBadge name={log.operator_name} roleLevel={log.role_level} />
                    </td>
                    <td className="p-4">
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                        {log.is_revoked && <span className="text-red-500 font-bold mr-2">[已撤销]</span>}
                        {log.change_desc}
                    </div>
                    </td>
                    <td className="p-4 text-sm text-gray-500">ID: {log.target_id}</td>
                    <td className="p-4 text-right">
                    {!log.is_revoked && (
                        <button 
                        onClick={() => handleUndo(log)}
                        className="px-3 py-1 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center gap-1 ml-auto transition-colors"
                        >
                        <RotateCcw className="w-3 h-3" /> 撤销
                        </button>
                    )}
                    {log.is_revoked && <span className="text-xs text-gray-400">已回滚</span>}
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