
import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Smartphone, Globe, Eye, X, Filter, Calendar, User as UserIcon, ChevronLeft, ChevronRight, List, Monitor } from 'lucide-react';
import { RoleLevel } from '../types';
import UsernameBadge from '../components/UsernameBadge';
import { useApp } from '../App';
import * as XLSX from 'xlsx';

// --- Snapshot Detail Modal (19.1) ---
const SnapshotModal = ({ log, onClose }: { log: any; onClose: () => void }) => {
  // Defensive parsing: ensure snapshot is an object
  let snapshot: any = {};
  try {
      if (typeof log.snapshot_data === 'string') {
          snapshot = JSON.parse(log.snapshot_data);
      } else if (log.snapshot_data && typeof log.snapshot_data === 'object') {
          snapshot = log.snapshot_data;
      }
  } catch(e) { console.error("Snapshot parse error", e); }

  const renderContent = () => {
      let oldData: any = "无原始数据";
      let newData: any = snapshot;

      // Handle known types
      if (snapshot.type === 'stock_change') {
          oldData = { 
              库存总量: snapshot.old_stock,
              批号: snapshot.batchNumber,
              产品ID: snapshot.productId || 'Unknown'
          };
          newData = { 
              库存总量: snapshot.new_stock, 
              变动: (snapshot.delta > 0 ? '+' : '') + snapshot.delta + (snapshot.qtyDetail ? ` (${snapshot.qtyDetail})` : ''),
              操作: snapshot.operation === 'in' ? '入库' : '出库'
          };
      } else if (snapshot.type === 'batch_edit') {
          oldData = snapshot.originalData;
          newData = snapshot.newData;
      } else if (snapshot.type === 'product_edit') {
          oldData = snapshot.originalData;
          newData = snapshot.newData;
      } else if (snapshot.type === 'new_batch') {
          oldData = "无 (新增)";
          newData = snapshot.data;
      } else if (snapshot.type === 'product_delete') {
          oldData = { IDs: snapshot.deletedIds, count: snapshot.count };
          newData = "已删除";
      }

      // Fallback if data is empty object
      if (!newData || (typeof newData === 'object' && Object.keys(newData).length === 0)) {
          newData = { 提示: "无详细变更数据 recorded in this log", 原始快照: log.snapshot_data };
      }

      return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border dark:border-gray-700 overflow-hidden">
                  <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">原始数据 (Old Code)</h4>
                  <pre className="text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap overflow-auto max-h-60 bg-red-50 dark:bg-red-900/10 p-2 rounded">
                      {typeof oldData === 'string' ? oldData : JSON.stringify(oldData, null, 2)}
                  </pre>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border dark:border-gray-700 overflow-hidden">
                  <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">新数据 (New Code)</h4>
                  <pre className="text-xs font-mono text-green-600 dark:text-green-400 whitespace-pre-wrap overflow-auto max-h-60 bg-green-50 dark:bg-green-900/10 p-2 rounded">
                      {typeof newData === 'string' ? newData : JSON.stringify(newData, null, 2)}
                  </pre>
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl p-6 relative">
         <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"><X className="w-5 h-5"/></button>
         <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-500" /> 操作快照详情
         </h3>
         <div className="mb-4 text-sm text-gray-600 dark:text-gray-300 grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border dark:border-gray-600">
             <div><span className="font-bold">操作ID:</span> <span className="font-mono">{log.id}</span></div>
             <div><span className="font-bold">操作人:</span> {log.operator_name}</div>
             <div><span className="font-bold">时间:</span> {new Date(log.created_at).toLocaleString()}</div>
             <div><span className="font-bold">类型:</span> {log.action_type}</div>
         </div>
         {renderContent()}
      </div>
    </div>
  );
};

const LoginHistoryModal = ({ deviceName, records, onClose }: { deviceName: string; records: any[]; onClose: () => void }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
         <button onClick={onClose} className="absolute top-4 right-4 text-gray-500"><X className="w-5 h-5"/></button>
         <h3 className="text-lg font-bold mb-4">最近 7 次登录记录</h3>
         <p className="text-xs text-gray-500 mb-4">设备: {deviceName}</p>
         <div className="space-y-2 max-h-60 overflow-y-auto">
             {records.slice(0, 7).map((r, i) => (
                 <div key={i} className="flex justify-between text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600">
                     <span>{new Date(r.login_at).toLocaleDateString()}</span>
                     <span className="font-mono">{new Date(r.login_at).toLocaleTimeString()}</span>
                 </div>
             ))}
         </div>
      </div>
    </div>
);

const Pagination = ({ current, total, pageSize, onChange }: { current: number, total: number, pageSize: number, onChange: (p: number) => void }) => {
    const totalPages = Math.ceil(total / pageSize);
    const [inputVal, setInputVal] = useState(current.toString());
    useEffect(() => setInputVal(current.toString()), [current]);
    const handleBlur = () => {
        let val = parseInt(inputVal);
        if (isNaN(val)) val = 1; if (val < 1) val = 1; if (val > totalPages) val = totalPages;
        onChange(val); setInputVal(val.toString());
    };
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t dark:border-gray-700">
            <button onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"><ChevronLeft className="w-4 h-4"/></button>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded px-2 py-0.5">
                <input className="w-6 bg-transparent text-center outline-none text-xs font-bold" value={inputVal} onChange={(e) => setInputVal(e.target.value)} onBlur={handleBlur} onKeyDown={(e) => e.key === 'Enter' && handleBlur()}/>
                <span className="text-gray-500 text-xs">/ {totalPages}</span>
            </div>
            <button onClick={() => onChange(Math.min(totalPages, current + 1))} disabled={current === totalPages} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"><ChevronRight className="w-4 h-4"/></button>
        </div>
    );
}

const AuditHall = () => {
  const { setPageActions, loginRecords, logs, users, user } = useApp();
  const [activeTab, setActiveTab] = useState<'operations' | 'devices'>('operations');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>(''); 
  const [deviceModalData, setDeviceModalData] = useState<{name: string, records: any[]} | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const availableUsers = useMemo(() => {
      if (!user) return [];
      if (user.role === RoleLevel.ROOT) return users;
      return users.filter(u => u.id === user.id || u.role > user.role);
  }, [users, user]);

  const filteredData = useMemo(() => {
      if (activeTab === 'operations') {
          return logs || []; // Defensive fallback
      } else {
          if (!selectedAccount) return [];
          const now = new Date();
          const cutoff = new Date(now.setDate(now.getDate() - 28));
          
          const userRecords = loginRecords.filter(r => 
              r.user_name === selectedAccount && 
              new Date(r.login_at) >= cutoff
          );

          const deviceGroups: Record<string, any[]> = {};
          userRecords.forEach(r => {
              const key = r.device_name;
              if (!deviceGroups[key]) deviceGroups[key] = [];
              deviceGroups[key].push(r);
          });

          return Object.entries(deviceGroups).map(([devName, records]) => ({
              device_name: devName,
              last_login: records[0].login_at, 
              count: records.length,
              records: records
          }));
      }
  }, [logs, loginRecords, activeTab, selectedAccount]);

  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [activeTab, selectedAccount]);

  useEffect(() => {
    setPageActions({
      handleCopy: () => {
        if (activeTab === 'operations') {
             const text = filteredData.map((l: any) => `${new Date(l.created_at).toLocaleString()} - ${l.operator_name} - ${l.action_type} - ${l.change_desc}`).join('\n');
             navigator.clipboard.writeText(text).then(() => alert('操作日志已复制'));
        } else {
             const text = filteredData.map((d: any) => `设备: ${d.device_name}, 最近登录: ${new Date(d.last_login).toLocaleString()}, 次数: ${d.count}`).join('\n');
             navigator.clipboard.writeText(text).then(() => alert('设备信息已复制'));
        }
      },
      handleExcel: () => {
        if (activeTab === 'operations') {
            const ws = XLSX.utils.json_to_sheet(filteredData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Operations");
            XLSX.writeFile(wb, `audit_operations_${Date.now()}.xlsx`);
        } else {
            const ws = XLSX.utils.json_to_sheet(filteredData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Devices");
            XLSX.writeFile(wb, `audit_devices_${Date.now()}.xlsx`);
        }
      }
    });
    return () => setPageActions({});
  }, [activeTab, filteredData, setPageActions]);

  return (
    <div id="printable-content" className="space-y-6 animate-fade-in-up pb-10">
      {selectedLog && <SnapshotModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
      {deviceModalData && <LoginHistoryModal deviceName={deviceModalData.name} records={deviceModalData.records} onClose={() => setDeviceModalData(null)} />}
      
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-500" /> 审计大厅
        </h2>
      </div>

      <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-xl w-full max-w-md mx-auto mb-6">
          <button onClick={() => setActiveTab('operations')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'operations' ? 'bg-white dark:bg-gray-800 shadow text-purple-600' : 'text-gray-500'}`}>
              <List className="w-4 h-4" /> 所有操作查询
          </button>
          <button onClick={() => setActiveTab('devices')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'devices' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-500'}`}>
              <Monitor className="w-4 h-4" /> 登录设备查询
          </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 min-h-[500px]">
          {activeTab === 'operations' ? (
              <div className="space-y-3">
                  {paginatedData.map((l: any) => (
                      <div key={l.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl border-l-4 border-purple-500 transition-all">
                          <div>
                              <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-800 dark:text-gray-200">{l.action_type}</span>
                                  <UsernameBadge name={l.operator_name} roleLevel={l.role_level} className="text-xs" />
                              </div>
                              <div className="text-sm text-gray-500 mt-1">{l.change_desc}</div>
                          </div>
                          <div className="text-right">
                              <div className="text-xs text-gray-400 mb-1">{new Date(l.created_at).toLocaleString()}</div>
                              <button onClick={() => setSelectedLog(l)} className="px-3 py-1 bg-purple-50 text-purple-600 rounded text-xs font-bold hover:bg-purple-100">
                                  详情
                              </button>
                          </div>
                      </div>
                  ))}
                  {paginatedData.length === 0 && <div className="text-center text-gray-400 py-10">暂无操作记录</div>}
              </div>
          ) : (
              <div>
                  <div className="mb-6 flex justify-center">
                      <div className="relative w-64">
                          <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">账户 (必须先选)</label>
                          <select 
                            value={selectedAccount} 
                            onChange={e => setSelectedAccount(e.target.value)} 
                            className="w-full p-2 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none font-bold"
                          >
                              <option value="">-- 请选择账户 --</option>
                              {availableUsers.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}
                          </select>
                      </div>
                  </div>

                  {selectedAccount ? (
                      <div className="space-y-4">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center text-sm text-blue-800 dark:text-blue-200">
                              <span className="font-bold">{selectedAccount}</span> 过去 28 天内曾在这些设备上登录过 棱镜 账号
                          </div>
                          <div className="space-y-3">
                              {paginatedData.map((dev: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => setDeviceModalData({name: dev.device_name, records: dev.records})}>
                                      <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-white dark:bg-gray-600 rounded-full flex items-center justify-center shadow-sm">
                                              {dev.device_name.includes('Mobile') ? <Smartphone className="w-5 h-5 text-blue-500"/> : <Monitor className="w-5 h-5 text-gray-500"/>}
                                          </div>
                                          <div>
                                              <div className="font-bold text-gray-800 dark:text-gray-200">{dev.device_name}</div>
                                              <div className="text-xs text-gray-400">共登录 {dev.count} 次</div>
                                          </div>
                                      </div>
                                      <ChevronRight className="w-5 h-5 text-gray-400"/>
                                  </div>
                              ))}
                              {paginatedData.length === 0 && <div className="text-center text-gray-400 py-10">该用户近期无登录记录</div>}
                          </div>
                      </div>
                  ) : (
                      <div className="text-center text-gray-400 py-20">请先在上方选择要查询的账户</div>
                  )}
              </div>
          )}
          {activeTab === 'operations' && <Pagination current={page} total={filteredData.length} pageSize={pageSize} onChange={setPage} />}
      </div>
    </div>
  );
};

export default AuditHall;
