import React, { useState } from 'react';
import { useApp } from '../App';
import { AlertTriangle, Clock, Settings, X, TrendingUp, BarChart2, Calendar } from 'lucide-react';
import { MOCK_PRODUCTS } from '../constants';

// --- Helper Components for Charts (SVG) ---

const SimpleBarChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  return (
    <div className="flex items-end justify-around h-48 gap-2 pt-4">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 group relative">
          <div className="relative w-full flex justify-center items-end h-40 bg-gray-100 dark:bg-gray-700/50 rounded-t-lg overflow-hidden cursor-pointer">
             <div 
               className="w-full max-w-[40px] transition-all duration-700 ease-out hover:opacity-80 rounded-t-sm"
               style={{ height: `${(d.value / maxValue) * 100}%`, backgroundColor: d.color }}
             ></div>
             {/* Tooltip */}
             <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded pointer-events-none z-10 whitespace-nowrap shadow-xl transform translate-y-2 group-hover:translate-y-0">
               <span className="font-bold">{d.label}</span>: {d.value}
             </div>
          </div>
          <span className="text-xs text-gray-500 truncate w-full text-center mt-1">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

const SimpleLineChart = ({ data }: { data: { day: string; in: number; out: number }[] }) => {
  const maxVal = Math.max(...data.map(d => Math.max(d.in, d.out)));
  
  const getPoints = (key: 'in' | 'out') => {
    return data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - (d[key] / maxVal) * 100;
      return `${x},${y}`;
    }).join(' ');
  };

  const [hoverData, setHoverData] = useState<{ day: string; in: number; out: number; x: number } | null>(null);

  return (
    <div 
      className="relative h-48 w-full group"
      onMouseLeave={() => setHoverData(null)}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
         {/* Grid Lines */}
         {[25, 50, 75].map(y => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2" />
         ))}
         
         {/* Inbound Line */}
         <polyline fill="none" stroke="#10b981" strokeWidth="2" points={getPoints('in')} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
         {/* Outbound Line */}
         <polyline fill="none" stroke="#ef4444" strokeWidth="2" points={getPoints('out')} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
         
         {/* Interactive Areas */}
         {data.map((d, i) => (
            <rect 
                key={i}
                x={(i / (data.length - 1)) * 100 - 5}
                y="0"
                width="10"
                height="100"
                fill="transparent"
                onMouseEnter={() => setHoverData({ ...d, x: (i / (data.length - 1)) * 100 })}
            />
         ))}

         {/* Hover Indicator */}
         {hoverData && (
             <line x1={hoverData.x} y1="0" x2={hoverData.x} y2="100" stroke="#9ca3af" strokeWidth="1" strokeDasharray="4" vectorEffect="non-scaling-stroke"/>
         )}
      </svg>

      {/* Tooltip Overlay */}
      {hoverData && (
          <div 
            className="absolute top-0 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 text-xs z-20 pointer-events-none transition-all"
            style={{ left: `${hoverData.x}%`, transform: 'translate(-50%, -120%)' }}
          >
              <div className="font-bold mb-1 text-gray-700 dark:text-gray-200">{hoverData.day}</div>
              <div className="flex items-center gap-2 text-green-600">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  入库: {hoverData.in}
              </div>
              <div className="flex items-center gap-2 text-red-600">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  出库: {hoverData.out}
              </div>
          </div>
      )}

      <div className="flex justify-between mt-2 text-xs text-gray-400">
         {data.map((d, i) => <span key={i}>{d.day}</span>)}
      </div>
    </div>
  );
};

// --- Modals ---

const AlertListModal = ({ title, items, onClose }: { title: string; items: any[]; onClose: () => void }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
       <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"><X className="w-5 h-5"/></button>
       <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
         {title.includes('过期') ? <Clock className="text-yellow-600"/> : <AlertTriangle className="text-red-600"/>}
         {title}
       </h3>
       <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? <p className="text-gray-400 text-center py-4">无相关数据</p> : 
            items.map((item, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600">
                 <div>
                    <div className="font-bold">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.detail}</div>
                 </div>
                 <div className="font-mono font-bold text-lg">{item.value}</div>
              </div>
            ))
          }
       </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { currentStore } = useApp();
  const [thresholds, setThresholds] = useState({ low: 10, expiry: 30 });
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [activeModal, setActiveModal] = useState<'low' | 'expiry' | null>(null);
  const [dateRange, setDateRange] = useState('7'); // days

  // Mock Data Logic
  const totalStock = MOCK_PRODUCTS.reduce((acc, p) => acc + p.batches.reduce((bAcc, b) => bAcc + b.quantityBig * b.conversionRate + b.quantitySmall, 0), 0);
  
  const lowStockItems = MOCK_PRODUCTS.flatMap(p => 
    p.batches.filter(b => b.quantityBig < thresholds.low).map(b => ({ name: p.name, detail: `批号: ${b.batchNumber}`, value: `${b.quantityBig}盒` }))
  );

  const expiryItems = MOCK_PRODUCTS.flatMap(p => 
    p.batches.map(b => {
       const days = Math.floor((new Date(b.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
       return days < thresholds.expiry ? { name: p.name, detail: `有效期: ${b.expiryDate}`, value: `${days}天` } : null;
    }).filter(Boolean)
  );

  const chartDataBar = [
    { label: '抗生素', value: 450, color: '#3b82f6' },
    { label: '感冒药', value: 320, color: '#10b981' },
    { label: '心脑血管', value: 180, color: '#f59e0b' },
    { label: '外用药', value: 240, color: '#8b5cf6' },
    { label: '保健品', value: 100, color: '#ec4899' },
  ];

  const chartDataLine = [
    { day: '周一', in: 120, out: 80 },
    { day: '周二', in: 150, out: 100 },
    { day: '周三', in: 180, out: 200 },
    { day: '周四', in: 90, out: 120 },
    { day: '周五', in: 250, out: 150 },
    { day: '周六', in: 300, out: 280 },
    { day: '周日', in: 100, out: 90 },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      {/* Settings Modal */}
      {showThresholdSettings && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl w-80">
              <h3 className="font-bold mb-4">预警阈值设置</h3>
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm text-gray-500 mb-1">低库存阈值 (件)</label>
                    <input type="number" value={thresholds.low} onChange={e => setThresholds({...thresholds, low: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                 </div>
                 <div>
                    <label className="block text-sm text-gray-500 mb-1">临期阈值 (天)</label>
                    <input type="number" value={thresholds.expiry} onChange={e => setThresholds({...thresholds, expiry: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                 </div>
                 <button onClick={() => setShowThresholdSettings(false)} className="w-full py-2 bg-blue-600 text-white rounded-lg">保存</button>
              </div>
           </div>
        </div>
      )}

      {/* Detail Modals */}
      {activeModal === 'low' && <AlertListModal title="低库存预警清单" items={lowStockItems} onClose={() => setActiveModal(null)} />}
      {activeModal === 'expiry' && <AlertListModal title="即将过期清单" items={expiryItems as any[]} onClose={() => setActiveModal(null)} />}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold dark:text-white">仪表盘 - {currentStore.name}</h2>
        <button onClick={() => setShowThresholdSettings(true)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="设置阈值">
           <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock */}
        <div className="p-6 rounded-2xl glass shadow-sm bg-white dark:bg-gray-800 flex flex-col justify-between h-32">
          <h3 className="text-sm text-gray-500 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> 总库存量</h3>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">{totalStock.toLocaleString()}</p>
        </div>

        {/* Low Stock Alert */}
        <div 
          onClick={() => setActiveModal('low')}
          className="p-6 rounded-2xl glass shadow-sm bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 cursor-pointer hover:shadow-md transition-all h-32"
        >
          <div className="flex justify-between items-start">
             <h3 className="text-sm text-red-600 font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> 低库存预警</h3>
             <span className="text-xs bg-red-200 text-red-800 px-1.5 rounded">Running Low</span>
          </div>
          <p className="text-3xl font-bold mt-2 text-red-600">{lowStockItems.length} <span className="text-sm font-normal text-red-400">个批次</span></p>
        </div>

        {/* Expiring Alert */}
        <div 
          onClick={() => setActiveModal('expiry')}
          className="p-6 rounded-2xl glass shadow-sm bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900 cursor-pointer hover:shadow-md transition-all h-32"
        >
          <div className="flex justify-between items-start">
             <h3 className="text-sm text-yellow-700 font-bold flex items-center gap-2"><Clock className="w-4 h-4"/> 即将过期</h3>
             <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 rounded">Expiring</span>
          </div>
          <p className="text-3xl font-bold mt-2 text-yellow-700">{expiryItems.length} <span className="text-sm font-normal text-yellow-500">个批次</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Bar Chart - Inventory Classification */}
         <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-700 dark:text-gray-200">
               <BarChart2 className="w-5 h-5 text-blue-500" /> 库存分类分布
            </h3>
            <SimpleBarChart data={chartDataBar} />
         </div>

         {/* Line Chart - In/Out Time */}
         <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <TrendingUp className="w-5 h-5 text-green-500" /> 进出库趋势
               </h3>
               <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <span className="text-xs px-2 text-gray-500">范围:</span>
                  <select 
                    value={dateRange} 
                    onChange={(e) => setDateRange(e.target.value)}
                    className="bg-transparent text-xs font-bold outline-none text-gray-700 dark:text-gray-200"
                  >
                     <option value="7">近7天</option>
                     <option value="30">近30天</option>
                     <option value="90">本季度</option>
                  </select>
               </div>
            </div>
            <SimpleLineChart data={chartDataLine} />
            <div className="flex justify-center gap-6 mt-4">
               <div className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-1 bg-green-500 rounded-full"></span> 入库
               </div>
               <div className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-1 bg-red-500 rounded-full"></span> 出库
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;