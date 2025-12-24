
import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Smartphone, Globe, Eye, X, Filter, Calendar, User as UserIcon, ChevronLeft, ChevronRight, List, Monitor } from 'lucide-react';
import { RoleLevel } from '../types';
import UsernameBadge from '../components/UsernameBadge';
import Pagination from '../components/Pagination';
import { useApp } from '../App';
import * as XLSX from 'xlsx';

// --- Audit Detail Modal ---
const AuditDetailModal = ({ audit, onClose }: { audit: any; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-paper w-full max-w-lg rounded-2xl shadow-2xl p-6 relative border border-borderbase">
         <button onClick={onClose} className="absolute top-4 right-4 text-sub"><X className="w-5 h-5"/></button>
         <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-main">
            <ShieldCheck className="w-6 h-6 text-purple-500" /> 审计详情
         </h3>
         <div className="space-y-4">
            <div className="p-4 bg-primary rounded-xl space-y-2 text-sm border border-borderbase">
               <div className="flex justify-between border-b border-borderbase pb-2">
                  <span className="text-sub">操作ID</span>
                  <span className="font-mono text-xs text-main">{audit.id}</span>
               </div>
               <div className="flex justify-between border-b border-borderbase pb-2">
                  <span className="text-sub">时间</span>
                  <span className="text-main">{new Date(audit.created_at || audit.login_at).toLocaleString()}</span>
               </div>
               {audit.snapshot_data && (
                   <div className="mt-2">
                       <p className="text-xs font-bold mb-1 text-sub">数据快照 (JSON)</p>
                       <div className="bg-paper p-2 rounded text-xs font-mono overflow-auto max-h-40 text-main border border-borderbase">
                           <pre>{JSON.stringify(audit.snapshot_data, null, 2)}</pre>
                       </div>
                   </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

const AuditHall = () => {
  const { setPageActions, loginRecords, logs, users } = useApp();
  const [activeTab, setActiveTab] = useState<'operations' | 'devices'>('operations');
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [filterUser, setFilterUser] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filteredData = useMemo(() => {
      if (activeTab === 'operations') {
          return logs.filter(l => !filterUser || l.operator_name === filterUser);
      } else {
          // Device query logic
          return loginRecords.filter(r => !filterUser || r.user_name === filterUser);
      }
  }, [logs, loginRecords, activeTab, filterUser]);

  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [activeTab, filterUser]);

  // Handle Copy text formatting
  useEffect(() => {
      setPageActions({
          handleCopy: () => {
              const text = paginatedData.map((d: any) => {
                  if (activeTab === 'operations') {
                      return `${new Date(d.created_at).toLocaleString()} | ${d.operator_name} | ${d.action_type} | ${d.change_desc}`;
                  } else {
                      return `${new Date(d.login_at).toLocaleString()} | ${d.user_name} | ${d.device_name} | ${d.ip_address}`;
                  }
              }).join('\n');
              navigator.clipboard.writeText(text).then(() => alert("审计数据已复制"));
          }
      });
      return () => setPageActions({});
  }, [paginatedData, activeTab, setPageActions]);

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {selectedAudit && <AuditDetailModal audit={selectedAudit} onClose={() => setSelectedAudit(null)} />}
      
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-main flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-500" /> 审计大厅
        </h2>
        {/* User Select for Device Query */}
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="p-2 border border-borderbase rounded-lg text-sm bg-paper text-main">
            <option value="">所有用户</option>
            {users.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}
        </select>
      </div>

      {/* Segmented Control */}
      <div className="flex p-1 bg-primary rounded-xl w-full max-w-md mx-auto border border-borderbase">
          <button onClick={() => setActiveTab('operations')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'operations' ? 'bg-paper shadow text-purple-600' : 'text-sub'}`}>
              <List className="w-4 h-4" /> 所有操作查询
          </button>
          <button onClick={() => setActiveTab('devices')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'devices' ? 'bg-paper shadow text-blue-600' : 'text-sub'}`}>
              <Monitor className="w-4 h-4" /> 登录设备查询
          </button>
      </div>

      <div className="bg-paper p-6 rounded-2xl shadow-sm border border-borderbase min-h-[500px]">
          {activeTab === 'operations' ? (
              <div className="space-y-3">
                  {paginatedData.map((l: any) => (
                      <div key={l.id} className="flex justify-between items-center p-3 hover:bg-black/5 rounded-xl border-l-4 border-purple-500 transition-all cursor-pointer" onClick={() => setSelectedAudit(l)}>
                          <div>
                              <div className="flex items-center gap-2">
                                  <span className="font-bold text-main">{l.action_type}</span>
                                  <UsernameBadge name={l.operator_name} roleLevel={l.role_level} className="text-xs" />
                              </div>
                              <div className="text-sm text-sub mt-1">{l.change_desc}</div>
                          </div>
                          <div className="text-right">
                              <div className="text-xs text-sub">{new Date(l.created_at).toLocaleString()}</div>
                              <button className="text-xs text-purple-500 font-bold mt-1">查看详情</button>
                          </div>
                      </div>
                  ))}
                  {paginatedData.length === 0 && <div className="text-center text-sub py-10">暂无操作记录</div>}
              </div>
          ) : (
              <div className="space-y-3">
                  {filterUser && <div className="p-2 text-sm text-blue-600 font-bold text-center">用户 {filterUser} 过去 28 天内的登录记录</div>}
                  {paginatedData.map((r: any) => (
                      <div key={r.id} className="flex justify-between items-center p-3 hover:bg-black/5 rounded-xl border-l-4 border-blue-500 transition-all">
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
                                  {r.device_name.includes('Mobile') ? '📱' : '💻'}
                              </div>
                              <div>
                                  <div className="font-bold text-main">{r.user_name}</div>
                                  <div className="text-xs text-sub">{r.device_name} • {r.ip_address}</div>
                              </div>
                          </div>
                          <div className="text-right text-xs text-sub">
                              {new Date(r.login_at).toLocaleString()}
                          </div>
                      </div>
                  ))}
                  {paginatedData.length === 0 && <div className="text-center text-sub py-10">暂无登录记录</div>}
              </div>
          )}
          <Pagination current={page} total={filteredData.length} pageSize={pageSize} onChange={setPage} />
      </div>
    </div>
  );
};

export default AuditHall;
