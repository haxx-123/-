
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../App';
import { AlertTriangle, Clock, Settings, X, TrendingUp, BarChart2, Calendar, Copy, FileSpreadsheet, Crop, ChevronLeft, ChevronRight } from 'lucide-react';
import { LogAction } from '../types';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

// --- Helper Components for Charts (SVG) ---

const SimpleBarChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="flex items-end justify-around h-48 gap-2 pt-8 relative">
      {/* Fixed Tooltip Overlay */}
      {hoveredIndex !== null && (
        <div 
            className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1 rounded shadow-lg z-20 transition-all pointer-events-none"
            style={{ top: '-10px' }}
        >
            <span className="font-bold">{data[hoveredIndex].label}</span>: {data[hoveredIndex].value}
        </div>
      )}

      {data.map((d, i) => (
        <div 
            key={i} 
            className="flex flex-col items-center gap-1 flex-1 group relative h-full justify-end cursor-pointer"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
        >
          <div className="relative w-full flex justify-center items-end h-[85%] bg-gray-100 dark:bg-gray-700/50 rounded-t-lg overflow-hidden">
             <div 
               className="w-full max-w-[40px] transition-all duration-700 ease-out rounded-t-sm hover:opacity-80"
               style={{ 
                   height: `${(d.value / maxValue) * 100}%`, 
                   backgroundColor: d.color,
                   opacity: hoveredIndex === i ? 0.9 : 1
               }}
             ></div>
          </div>
          <span className="text-xs text-gray-500 truncate w-full text-center h-[15%]">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

const SimpleLineChart = ({ data }: { data: { day: string; in: number; out: number }[] }) => {
  const maxVal = Math.max(...data.map(d => Math.max(d.in, d.out)), 10); // Ensure minimal scale
  
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

// --- Pagination Component ---
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

// --- Modals ---

const AlertListModal = ({ title, items, onClose }: { title: string; items: any[]; onClose: () => void }) => {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

  const handleCopy = () => {
      const text = items.map(i => `${i.name} | ${i.detail} | ${i.value}`).join('\n');
      navigator.clipboard.writeText(text).then(() => alert('清单内容已复制'));
  };

  const handleExcel = () => {
      const ws = XLSX.utils.json_to_sheet(items.map(i => ({ '商品名称': i.name, '详情': i.detail, '状态': i.value })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Alerts");
      XLSX.writeFile(wb, `alert_list_${Date.now()}.xlsx`);
  };

  const handleScreenshot = async () => {
      const el = document.getElementById('alert-modal-content');
      if (el) {
          const originalStyle = el.style.transform;
          el.style.transform = 'none'; // Fix potential transform issues with html2canvas
          try {
              const canvas = await html2canvas(el, { useCORS: true, backgroundColor: null });
              const link = document.createElement('a');
              link.download = `alert_screenshot_${Date.now()}.png`;
              link.href = canvas.toDataURL();
              link.click();
          } catch(e) {
              console.error(e);
              alert("截图生成失败");
          } finally {
              el.style.transform = originalStyle;
          }
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in p-4">
        <div id="alert-modal-content" className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-4 shrink-0 gap-2">
                <h3 className="text-xl font-bold flex items-center gap-2 truncate text-gray-800 dark:text-white">
                    {title.includes('过期') ? <Clock className="text-yellow-600 shrink-0"/> : <AlertTriangle className="text-red-600 shrink-0"/>}
                    <span className="truncate">{title}</span>
                </h3>
                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={handleCopy} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500" title="复制文本"><Copy className="w-4 h-4"/></button>
                    <button onClick={handleExcel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500" title="导出 Excel"><FileSpreadsheet className="w-4 h-4"/></button>
                    <button onClick={handleScreenshot} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500" title="长截图"><Crop className="w-4 h-4"/></button>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
                </div>
            </div>
            
            <div className="space-y-3 overflow-y-auto p-1 min-h-[300px]">
                {paginatedItems.length === 0 ? <p className="text-gray-400 text-center py-4">无相关数据</p> : 
                    paginatedItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600">
                        <div className="min-w-0 pr-2">
                            <div className="font-bold truncate text-gray-800 dark:text-gray-200">{item.name}</div>
                            <div className="text-xs text-gray-500 truncate">{item.detail}</div>
                        </div>
                        <div className="font-mono font-bold text-lg shrink-0 text-gray-800 dark:text-gray-200">{item.value}</div>
                    </div>
                    ))
                }
            </div>
            
            <Pagination current={page} total={items.length} pageSize={pageSize} onChange={setPage} />
        </div>
    </div>
  );
};

const Dashboard = () => {
  const { currentStore, products, logs } = useApp();
  // Initialize with cached values or defaults
  const [thresholds, setThresholds] = useState(() => {
      const cached = localStorage.getItem('prism_thresholds');
      return cached ? JSON.parse(cached) : { low: 10, expiry: 30 };
  });
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [activeModal, setActiveModal] = useState<'low' | 'expiry' | null>(null);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('7');

  // --- DATA ISOLATION LOGIC ---
  // Get products that belong to current store (or children if parent)
  const isolatedProducts = useMemo(() => {
      return products.filter(p => {
          if (currentStore.isParent) {
            // Safety check: childrenIds might be undefined
            return (currentStore.childrenIds || []).includes(p.storeId);
          }
          else return p.storeId === currentStore.id;
      });
  }, [products, currentStore]);

  // Calculate stats from ISOLATED products
  // FIXED: Access p.quantityBig (aggregated on Product) instead of b.quantityBig (undefined on Batch)
  const totalStock = isolatedProducts.reduce((acc, p) => acc + (p.quantityBig || 0), 0);
  
  const lowStockItems = isolatedProducts.flatMap(p => 
    p.batches.filter(b => {
        // Calculate approx big quantity for alert check
        const rate = b.conversionRate || 10;
        const approxBig = Math.floor(b.totalQuantity / rate);
        return approxBig < thresholds.low;
    }).map(b => ({ 
        name: p.name, 
        detail: `批号: ${b.batchNumber}`, 
        value: `${Math.floor(b.totalQuantity / (b.conversionRate || 10))}件` // Approximate display
    }))
  );

  const expiryItems = isolatedProducts.flatMap(p => 
    p.batches.map(b => {
       if (!b.expiryDate) return null;
       const days = Math.floor((new Date(b.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
       return days < thresholds.expiry ? { name: p.name, detail: `有效期: ${b.expiryDate}`, value: `${days}天` } : null;
    }).filter(Boolean)
  );

  // Dynamic Chart Data based on current categories
  // FIXED: Sum up p.quantityBig instead of trying to reduce undefined batch properties
  const categoryCounts = isolatedProducts.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + (p.quantityBig || 0);
      return acc;
  }, {} as Record<string, number>);

  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const chartDataBar = Object.entries(categoryCounts).map(([label, value], idx) => ({
      label, value: value as number, color: chartColors[idx % chartColors.length]
  }));

  // Logic for Dynamic Line Chart Data using Operation Logs
  const chartDataLine = useMemo(() => {
      const days = parseInt(dateRange);
      const dataMap = new Map<string, { in: number, out: number }>();
      const today = new Date();
      // Normalize today to start of day for comparison stability
      today.setHours(0,0,0,0);

      // Initialize map with 0s for the past X days
      for (let i = days - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const key = d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
          dataMap.set(key, { in: 0, out: 0 });
      }

      // Filter and aggregate logs
      logs.forEach(log => {
          let snapshot: any = {};
          try {
              if (typeof log.snapshot_data === 'string') snapshot = JSON.parse(log.snapshot_data);
              else snapshot = log.snapshot_data || {};
          } catch(e) {}
          
          const productId = snapshot?.productId || snapshot?.originalProduct?.id || snapshot?.originalData?.product_id;
          if (!productId) return;

          // Check if product belongs to current view (store)
          const belongsToView = isolatedProducts.some(p => p.id === productId);
          if (!belongsToView) return;

          const logDate = new Date(log.created_at);
          logDate.setHours(0,0,0,0);
          
          const diffTime = Math.abs(today.getTime() - logDate.getTime());
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays < days) {
              const key = logDate.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
              if (dataMap.has(key)) {
                  const entry = dataMap.get(key)!;
                  // FIXED: Use 'delta' (from Inventory.tsx write logic) instead of 'deltaQty'
                  const qty = Math.abs(snapshot.delta || log.change_delta || 0);
                  
                  if (log.action_type === LogAction.ENTRY_INBOUND) {
                      entry.in += qty;
                  } else if (log.action_type === LogAction.ENTRY_OUTBOUND) {
                      entry.out += qty;
                  }
              }
          }
      });

      return Array.from(dataMap.entries()).map(([day, val]) => ({ day, ...val }));
  }, [logs, dateRange, isolatedProducts]);

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
                 <button onClick={() => {
                     localStorage.setItem('prism_thresholds', JSON.stringify(thresholds));
                     setShowThresholdSettings(false);
                 }} className="w-full py-2 bg-blue-600 text-white rounded-lg">保存</button>
              </div>
           </div>
        </div>
      )}

      {/* Detail Modals */}
      {activeModal === 'low' && <AlertListModal title="低库存预警清单" items={lowStockItems} onClose={() => setActiveModal(null)} />}
      {activeModal === 'expiry' && <AlertListModal title="即将过期清单" items={expiryItems as any[]} onClose={() => setActiveModal(null)} />}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold dark:text-white">仪表盘 - {currentStore.name}</h2>
        <div className="flex items-center gap-3">
            <div className="text-xs font-mono font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg border dark:border-gray-700 select-none">
                <span className="text-red-400">{thresholds.low}</span> / <span className="text-yellow-500">{thresholds.expiry}</span>
            </div>
            <button onClick={() => setShowThresholdSettings(true)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="设置阈值">
               <Settings className="w-5 h-5" />
            </button>
        </div>
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
            {chartDataBar.length > 0 ? (
                <SimpleBarChart data={chartDataBar} />
            ) : (
                <p className="text-center text-gray-400 py-10">暂无库存数据</p>
            )}
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
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="bg-transparent text-xs font-bold outline-none text-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                     <option value="7">近7天</option>
                     <option value="30">近30天</option>
                     <option value="90">本季度</option>
                  </select>
               </div>
            </div>
            {chartDataLine.some(d => d.in > 0 || d.out > 0) ? (
                <SimpleLineChart data={chartDataLine} />
            ) : (
                <p className="text-center text-gray-400 py-10">此时间段暂无进出库数据</p>
            )}
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
