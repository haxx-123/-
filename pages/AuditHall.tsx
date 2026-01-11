
import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Smartphone, Globe, Eye, X, Filter, Calendar, User as UserIcon, ChevronLeft, ChevronRight, List, Monitor, Database, Code, RefreshCw, Copy, Power, Activity } from 'lucide-react';
import { RoleLevel, DbAuditLog } from '../types';
import UsernameBadge from '../components/UsernameBadge';
import { useApp } from '../App';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase';

// --- Technical Snapshot Detail Modal ---
const SnapshotModal = ({ log, onClose }: { log: DbAuditLog; onClose: () => void }) => {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => alert('内容已复制'));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm animate-fade-in">
      <style>{`
        .snapshot-scroll::-webkit-scrollbar { width: 8px; }
        .snapshot-scroll::-webkit-scrollbar-track { background: transparent; }
        .snapshot-scroll::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 4px; }
        .snapshot-scroll::-webkit-scrollbar-thumb:hover { background: #2563eb; }
      `}</style>
      <div className="bg-white dark:bg-gray-900 w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl p-0 relative flex flex-col overflow-hidden border dark:border-gray-700">
         {/* Header */}
         <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                        审计详情 - 数据快照
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {log.id}
                        </span>
                    </h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                        Table: <span className="text-blue-600 font-bold">{log.table_name}</span> | 
                        Action: <span className={log.action === 'DELETE' ? 'text-red-600 font-bold' : log.action === 'INSERT' ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>{log.action}</span>
                    </p>
                </div>
             </div>
             <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><X className="w-5 h-5"/></button>
         </div>
         
         {/* Diff View Area */}
         <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x dark:divide-gray-700 bg-gray-50 dark:bg-black">
              {/* OLD DATA */}
              <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-3 bg-red-50 dark:bg-red-900/10 border-b dark:border-gray-700 flex justify-between items-center">
                      <span className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
                          <MinusCircleIcon className="w-3 h-3"/> ORIGINAL CODE / 原数据
                      </span>
                      <button onClick={() => handleCopy(log.old_data ? JSON.stringify(log.old_data, null, 2) : 'NULL')} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500 transition-colors" title="复制">
                        <Copy className="w-4 h-4"/>
                      </button>
                  </div>
                  <div className="flex-1 overflow-auto p-4 snapshot-scroll">
                      <pre className="text-xs font-mono text-red-700 dark:text-red-300/80 whitespace-pre-wrap break-all leading-relaxed">
                          {log.old_data ? JSON.stringify(log.old_data, null, 2) : <span className="text-gray-400 italic">NULL (Insert Operation)</span>}
                      </pre>
                  </div>
              </div>

              {/* NEW DATA */}
              <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-3 bg-green-50 dark:bg-green-900/10 border-b dark:border-gray-700 flex justify-between items-center">
                      <span className="text-xs font-bold text-green-600 uppercase tracking-wider flex items-center gap-2">
                          <PlusCircleIcon className="w-3 h-3"/> CURRENT CODE / 现数据
                      </span>
                      <button onClick={() => handleCopy(log.new_data ? JSON.stringify(log.new_data, null, 2) : 'NULL')} className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-500 transition-colors" title="复制">
                        <Copy className="w-4 h-4"/>
                      </button>
                  </div>
                  <div className="flex-1 overflow-auto p-4 snapshot-scroll">
                      <pre className="text-xs font-mono text-green-700 dark:text-green-300/80 whitespace-pre-wrap break-all leading-relaxed">
                          {log.new_data ? JSON.stringify(log.new_data, null, 2) : <span className="text-gray-400 italic">NULL (Delete Operation)</span>}
                      </pre>
                  </div>
              </div>
         </div>

         {/* Footer Info */}
         <div className="p-3 bg-white dark:bg-gray-800 border-t dark:border-gray-700 text-xs text-gray-500 flex justify-between">
             <span>Record ID: <span className="font-mono">{log.record_id}</span></span>
             <span>Time: {new Date(log.created_at).toLocaleString()}</span>
         </div>
      </div>
    </div>
  );
};

const MinusCircleIcon = ({className}:{className?:string}) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
);
const PlusCircleIcon = ({className}:{className?:string}) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
);

const LoginHistoryModal = ({ deviceName, records, onClose, onKickOut }: { deviceName: string; records: any[]; onClose: () => void, onKickOut: (id: string) => void }) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
             <button onClick={onClose} className="absolute top-4 right-4 text-gray-500"><X className="w-5 h-5"/></button>
             <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Monitor className="w-5 h-5"/> 设备会话详情</h3>
             <p className="text-xs text-gray-500 mb-4">设备: {deviceName}</p>
             <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                 {records.map((r, i) => (
                     <div key={i} className={`flex justify-between items-center text-sm p-3 rounded border dark:border-gray-600 ${r.is_active ? 'bg-green-50 border-green-200 dark:bg-green-900/10' : 'bg-gray-50 dark:bg-gray-700'}`}>
                         <div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono">{new Date(r.login_at).toLocaleString()}</span>
                                {r.is_active ? <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">活跃</span> : <span className="text-xs text-gray-400">已过期</span>}
                            </div>
                            <div className="text-xs text-gray-400 mt-1 truncate max-w-[200px]" title={r.raw_user_agent}>{r.location || 'Unknown Location'}</div>
                         </div>
                         {r.is_active && (
                             <button onClick={() => onKickOut(r.id)} className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors flex items-center gap-1">
                                <Power className="w-3 h-3"/> 下线
                             </button>
                         )}
                     </div>
                 ))}
             </div>
          </div>
        </div>
    );
};

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

const AuditHall = () => {
  const { setPageActions, loginRecords, users, user, reloadData } = useApp();
  const [activeTab, setActiveTab] = useState<'operations' | 'devices'>('operations');
  
  // DB Audit Logs State
  const [dbLogs, setDbLogs] = useState<DbAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [totalLogCount, setTotalLogCount] = useState(0);
  const [selectedDbLog, setSelectedDbLog] = useState<DbAuditLog | null>(null);

  const [selectedAccount, setSelectedAccount] = useState<string>(''); 
  const [deviceModalData, setDeviceModalData] = useState<{name: string, records: any[]} | null>(null);
  
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const availableUsers = useMemo(() => {
      if (!user) return [];
      if (user.role === RoleLevel.ROOT) return users;
      return users.filter(u => u.id === user.id || u.role > user.role);
  }, [users, user]);

  // Fetch DB Logs (Server Side Pagination)
  const fetchDbLogs = async () => {
      if (activeTab !== 'operations') return;
      setLoadingLogs(true);
      try {
          // Get Count
          const { count } = await supabase.from('logs').select('*', { count: 'exact', head: true });
          setTotalLogCount(count || 0);

          // Get Data
          const from = (page - 1) * pageSize;
          const to = from + pageSize - 1;
          const { data, error } = await supabase
              .from('logs')
              .select('*')
              .order('created_at', { ascending: false })
              .range(from, to);
          
          if (error) throw error;
          setDbLogs(data as DbAuditLog[]);
      } catch (err) {
          console.error("Failed to fetch audit logs", err);
      } finally {
          setLoadingLogs(false);
      }
  };

  useEffect(() => {
      fetchDbLogs();
  }, [page, activeTab]);

  // Login Devices Logic
  const filteredDevices = useMemo(() => {
      if (activeTab !== 'devices' || !selectedAccount) return [];
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

      return Object.entries(deviceGroups).map(([devName, records]) => {
          // Calculate active session count for this device
          const activeCount = records.filter(r => r.is_active).length;
          return {
              device_name: devName,
              last_login: records[0].login_at, 
              count: records.length,
              activeCount: activeCount,
              records: records
          };
      });
  }, [loginRecords, activeTab, selectedAccount]);

  const handleKickOut = async (recordId: string) => {
      if (!window.confirm("确定要强制下线该会话吗？")) return;
      try {
          await supabase.from('login_records').update({ is_active: false }).eq('id', recordId);
          await reloadData();
          // Update local modal data if open
          if (deviceModalData) {
              setDeviceModalData(prev => prev ? ({
                  ...prev,
                  records: prev.records.map(r => r.id === recordId ? { ...r, is_active: false } : r)
              }) : null);
          }
          alert("操作成功，用户下次操作时将失效");
      } catch (err: any) {
          alert("操作失败: " + err.message);
      }
  };

  // Bulk kick out all active sessions for a device
  const handleKickDevice = async (deviceName: string) => {
      if (!window.confirm(`确定要强制下线 "${deviceName}" 上的所有活跃会话吗？`)) return;
      
      const activeIds = filteredDevices
          .find(d => d.device_name === deviceName)?.records
          .filter(r => r.is_active)
          .map(r => r.id) || [];
          
      if (activeIds.length === 0) return;

      try {
          await supabase.from('login_records').update({ is_active: false }).in('id', activeIds);
          await reloadData();
          alert("已强制下线该设备所有会话");
      } catch (err: any) {
          alert("操作失败: " + err.message);
      }
  };

  // Page Actions (Excel Export)
  useEffect(() => {
    setPageActions({
      handleExcel: () => {
        if (activeTab === 'operations') {
            const ws = XLSX.utils.json_to_sheet(dbLogs);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "AuditLogs");
            XLSX.writeFile(wb, `audit_db_logs_${Date.now()}.xlsx`);
        } else {
            const flatRecords = filteredDevices.flatMap(d => d.records);
            const ws = XLSX.utils.json_to_sheet(flatRecords);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Devices");
            XLSX.writeFile(wb, `audit_devices_${Date.now()}.xlsx`);
        }
      }
    });
    return () => setPageActions({});
  }, [activeTab, dbLogs, filteredDevices, setPageActions]);

  // Helper to find username by ID (since triggers might save ID)
  const resolveOperatorName = (idOrName: string) => {
      if (!idOrName) return 'System/Unknown';
      const u = users.find(u => u.id === idOrName);
      return u ? u.username : idOrName; // Fallback to raw ID if not found
  };

  return (
    <div id="printable-content" className="space-y-6 animate-fade-in-up pb-10">
      {selectedDbLog && <SnapshotModal log={selectedDbLog} onClose={() => setSelectedDbLog(null)} />}
      {deviceModalData && <LoginHistoryModal deviceName={deviceModalData.name} records={deviceModalData.records} onClose={() => setDeviceModalData(null)} onKickOut={handleKickOut} />}
      
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-500" /> 审计大厅
        </h2>
        {activeTab === 'operations' && (
            <button onClick={fetchDbLogs} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:rotate-180 transition-transform">
                <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300"/>
            </button>
        )}
      </div>

      <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-xl w-full max-w-md mx-auto mb-6">
          <button onClick={() => setActiveTab('operations')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'operations' ? 'bg-white dark:bg-gray-800 shadow text-purple-600' : 'text-gray-500'}`}>
              <Database className="w-4 h-4" /> 所有操作查询
          </button>
          <button onClick={() => setActiveTab('devices')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'devices' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-500'}`}>
              <Monitor className="w-4 h-4" /> 登录设备查询
          </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 min-h-[500px]">
          {activeTab === 'operations' ? (
              <div className="space-y-0">
                  {/* Technical Header */}
                  <div className="grid grid-cols-12 gap-2 pb-3 border-b dark:border-gray-700 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      <div className="col-span-3">Time / Operator</div>
                      <div className="col-span-2">Action</div>
                      <div className="col-span-3">Table</div>
                      <div className="col-span-3">Record ID</div>
                      <div className="col-span-1 text-right">Detail</div>
                  </div>

                  {loadingLogs ? (
                      <div className="py-20 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-purple-500"/></div>
                  ) : dbLogs.length === 0 ? (
                      <div className="text-center text-gray-400 py-10">暂无审计记录 (System Logs Empty)</div>
                  ) : (
                      dbLogs.map((log) => (
                          <div key={log.id} className="grid grid-cols-12 gap-2 py-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors items-center text-sm font-mono group">
                              <div className="col-span-3 min-w-0">
                                  <div className="text-gray-800 dark:text-gray-200 truncate">{new Date(log.created_at).toLocaleString()}</div>
                                  <div className="text-xs text-gray-400 flex items-center gap-1">
                                      <UserIcon className="w-3 h-3"/> {resolveOperatorName(log.performed_by)}
                                  </div>
                              </div>
                              <div className="col-span-2">
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                                      log.action === 'INSERT' ? 'bg-green-50 text-green-700 border-green-200' :
                                      log.action === 'DELETE' ? 'bg-red-50 text-red-700 border-red-200' :
                                      'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}>
                                      {log.action}
                                  </span>
                              </div>
                              <div className="col-span-3 text-gray-600 dark:text-gray-400 truncate font-bold">
                                  {log.table_name}
                              </div>
                              <div className="col-span-3 text-gray-500 text-xs truncate" title={log.record_id}>
                                  {log.record_id}
                              </div>
                              <div className="col-span-1 text-right">
                                  <button 
                                    onClick={() => setSelectedDbLog(log)} 
                                    className="p-1.5 hover:bg-purple-50 text-gray-400 hover:text-purple-600 rounded transition-colors"
                                    title="View Snapshot"
                                  >
                                      <Code className="w-4 h-4"/>
                                  </button>
                              </div>
                          </div>
                      ))
                  )}
                  <Pagination current={page} total={totalLogCount} pageSize={pageSize} onChange={setPage} />
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
                              {filteredDevices.map((dev: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => setDeviceModalData({name: dev.device_name, records: dev.records})}>
                                      <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-white dark:bg-gray-600 rounded-full flex items-center justify-center shadow-sm relative">
                                              {dev.device_name.includes('Mobile') ? <Smartphone className="w-5 h-5 text-blue-500"/> : <Monitor className="w-5 h-5 text-gray-500"/>}
                                              {dev.activeCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-700 rounded-full"></span>}
                                          </div>
                                          <div>
                                              <div className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                  {dev.device_name}
                                                  {dev.activeCount > 0 && <span className="text-xs bg-green-100 text-green-700 px-1.5 rounded">{dev.activeCount} 活跃</span>}
                                              </div>
                                              <div className="text-xs text-gray-400">共登录 {dev.count} 次</div>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          {dev.activeCount > 0 && (
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); handleKickDevice(dev.device_name); }} 
                                                className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors flex items-center gap-1 z-10"
                                              >
                                                 <Power className="w-3 h-3"/> 强制下线
                                              </button>
                                          )}
                                          <ChevronRight className="w-5 h-5 text-gray-400"/>
                                      </div>
                                  </div>
                              ))}
                              {filteredDevices.length === 0 && <div className="text-center text-gray-400 py-10">该用户近期无登录记录</div>}
                          </div>
                      </div>
                  ) : (
                      <div className="text-center text-gray-400 py-20">请先在上方选择要查询的账户</div>
                  )}
              </div>
          )}
      </div>
    </div>
  );
};

export default AuditHall;
