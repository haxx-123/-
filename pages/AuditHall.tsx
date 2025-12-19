import React, { useState, useEffect } from 'react';
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
                  <span className="font-mono">AUD-{audit.id}</span>
               </div>
               <div className="flex justify-between border-b dark:border-gray-700 pb-2">
                  <span className="text-gray-500">时间</span>
                  <span>2023-10-25 14:00:23</span>
               </div>
               <div className="flex justify-between border-b dark:border-gray-700 pb-2">
                  <span className="text-gray-500">IP地址</span>
                  <span className="font-mono">192.168.1.10</span>
               </div>
               <div className="flex justify-between">
                  <span className="text-gray-500">设备指纹</span>
                  <span className="font-mono text-xs">Mozilla/5.0 (iPhone; CPU...)</span>
               </div>
            </div>

            <div>
               <h4 className="font-bold text-sm mb-2">数据快照 (Before/After)</h4>
               <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-red-50 dark:bg-red-900/10 rounded border border-red-100 dark:border-red-900">
                     <div className="font-bold text-red-500 mb-1">变更前</div>
                     <pre>qty: 10</pre>
                  </div>
                  <div className="p-2 bg-green-50 dark:bg-green-900/10 rounded border border-green-100 dark:border-green-900">
                     <div className="font-bold text-green-500 mb-1">变更后</div>
                     <pre>qty: 5</pre>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const AuditHall = () => {
  const { setPageActions } = useApp();
  const [selectedAudit, setSelectedAudit] = useState<any>(null);

  // Mock data for display and export
  const audits = [1, 2, 3].map(i => ({
      id: i,
      user: 'AdminMaster',
      device: 'iPhone 14 Pro',
      ip: `192.168.1.${i}`,
      action: '库存调整',
      detail: `将 P00${i} 库存从 10 修改为 5`,
      time: '2023-10-25 14:00'
  }));

  useEffect(() => {
    setPageActions({
      handleCopy: () => {
        const text = audits.map(a => 
          `审计记录 [${a.time}]:\n用户: ${a.user} (IP: ${a.ip})\n设备: ${a.device}\n动作: ${a.action}\n详情: ${a.detail}`
        ).join('\n\n');
        navigator.clipboard.writeText(text).then(() => alert('审计信息已复制'));
      },
      handleExcel: () => {
        const ws = XLSX.utils.json_to_sheet(audits);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Audits");
        XLSX.writeFile(wb, `audits_export_${Date.now()}.xlsx`);
      }
    });
    return () => setPageActions({});
  }, [audits, setPageActions]);

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
            <div className="space-y-4">
               {audits.map(a => (
                 <div key={a.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                          {a.id === 1 ? 'PC' : 'iOS'}
                       </div>
                       <div>
                          <div className="font-medium">{a.user}</div>
                          <div className="text-xs text-gray-500">{a.device}</div>
                       </div>
                    </div>
                    <div className="text-right">
                       <div className="text-sm font-mono text-gray-600 dark:text-gray-400">{a.ip}</div>
                       <div className="text-xs text-gray-400">10分钟前</div>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* Data Audits */}
         <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
               <Globe className="w-5 h-5 text-green-500" /> 核心数据变更
            </h3>
            <div className="space-y-4">
               {audits.map(a => (
                 <div key={a.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-l-4 border-green-500 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                       <div>
                          <div className="flex justify-between w-full mb-1">
                             <span className="font-medium text-sm">{a.action}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                             <UsernameBadge name="Manager" roleLevel={RoleLevel.MANAGER_TEAL} className="mr-1" />
                             {a.detail}
                          </p>
                       </div>
                       <button onClick={() => setSelectedAudit(a)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-blue-500">
                          <Eye className="w-4 h-4" />
                       </button>
                    </div>
                    <div className="mt-2 text-right text-xs text-gray-400">{a.time}</div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default AuditHall;