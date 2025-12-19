import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Smartphone, Globe, Eye, X } from 'lucide-react';
import { RoleLevel } from '../types';
import UsernameBadge from '../components/UsernameBadge';
import { useApp } from '../App';
import * as XLSX from 'xlsx';

// --- Audit Detail Modal ---
const AuditDetailModal = ({ audit, onClose }: { audit: any; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
         <button onClick={onClose} className="absolute top-4 right-4 text-gray-500"><X className="w-5 h-5"/></button>
         <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-500" /> 审计详情
         </h3>
         
         <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl space-y-2 text-sm">
               <div className="flex justify-between border-b dark:border-gray-700 pb-2">
                  <span className="text-gray-500">操作ID</span>
                  <span className="font-mono text-xs">{audit.id}</span>
               </div>
               <div className="flex justify-between border-b dark:border-gray-700 pb-2">
                  <span className="text-gray-500">时间</span>
                  <span>{new Date(audit.created_at || audit.login_at).toLocaleString()}</span>
               </div>
               <div className="flex justify-between border-b dark:border-gray-700 pb-2">
                  <span className="text-gray-500">IP地址</span>
                  <span className="font-mono">{audit.ip_address || '192.168.1.x'}</span>
               </div>
               <div className="flex justify-between">
                  <span className="text-gray-500">设备指纹</span>
                  <span className="font-mono text-xs">{audit.device_name || 'Generic Device'}</span>
               </div>
            </div>

            {audit.change_desc && (
                <div>
                <h4 className="font-bold text-sm mb-2">变更详情</h4>
                <div className="p-2 bg-gray-100 dark:bg-gray-700/30 rounded border dark:border-gray-600 text-sm">
                    {audit.change_desc}
                </div>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

const AuditHall = () => {
  const { setPageActions, loginRecords, logs } = useApp();
  const [selectedAudit, setSelectedAudit] = useState<any>(null);

  // Use real data from context
  const deviceAudits = loginRecords;
  const dataAudits = logs;

  useEffect(() => {
    setPageActions({
      handleCopy: () => {
        const text = `--- 登录审计 ---\n${deviceAudits.map(a => `${a.login_at} - ${a.user_name} - ${a.device_name}`).join('\n')}\n\n--- 数据审计 ---\n${dataAudits.map(l => `${l.created_at} - ${l.operator_name} - ${l.change_desc}`).join('\n')}`;
        navigator.clipboard.writeText(text).then(() => alert('审计信息已复制'));
      },
      handleExcel: () => {
        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet(deviceAudits);
        const ws2 = XLSX.utils.json_to_sheet(dataAudits);
        XLSX.utils.book_append_sheet(wb, ws1, "Login Records");
        XLSX.utils.book_append_sheet(wb, ws2, "Data Changes");
        XLSX.writeFile(wb, `audits_export_${Date.now()}.xlsx`);
      }
    });
    return () => setPageActions({});
  }, [deviceAudits, dataAudits, setPageActions]);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {selectedAudit && <AuditDetailModal audit={selectedAudit} onClose={() => setSelectedAudit(null)} />}
      
      <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-purple-500" /> 审计大厅
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Login Audits */}
         <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
               <Smartphone className="w-5 h-5 text-blue-500" /> 账户设备登录
            </h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
               {deviceAudits.map(a => (
                 <div key={a.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer" onClick={() => setSelectedAudit(a)}>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                          {a.device_name.includes('Mobile') || a.device_name.includes('iPhone') ? '📱' : '💻'}
                       </div>
                       <div>
                          <div className="font-medium">{a.user_name}</div>
                          <div className="text-xs text-gray-500">{a.device_name}</div>
                       </div>
                    </div>
                    <div className="text-right">
                       <div className="text-sm font-mono text-gray-600 dark:text-gray-400">{a.ip_address}</div>
                       <div className="text-xs text-gray-400">{new Date(a.login_at).toLocaleTimeString()}</div>
                    </div>
                 </div>
               ))}
               {deviceAudits.length === 0 && <p className="text-center text-gray-400">暂无登录记录</p>}
            </div>
         </div>

         {/* Data Audits */}
         <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
               <Globe className="w-5 h-5 text-green-500" /> 核心数据变更
            </h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
               {dataAudits.map(a => (
                 <div key={a.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-l-4 border-green-500 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                       <div className="flex-1">
                          <div className="flex justify-between w-full mb-1">
                             <span className="font-medium text-sm">{a.action_type}</span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center flex-wrap">
                             <UsernameBadge name={a.operator_name} roleLevel={a.role_level} className="mr-1" />
                             <span className="truncate max-w-[200px]">{a.change_desc}</span>
                          </div>
                       </div>
                       <button onClick={() => setSelectedAudit(a)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-blue-500">
                          <Eye className="w-4 h-4" />
                       </button>
                    </div>
                    <div className="mt-2 text-right text-xs text-gray-400">{new Date(a.created_at).toLocaleString()}</div>
                 </div>
               ))}
               {dataAudits.length === 0 && <p className="text-center text-gray-400">暂无数据变更记录</p>}
            </div>
         </div>
      </div>
    </div>
  );
};

export default AuditHall;