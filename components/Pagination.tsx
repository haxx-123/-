
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ current, total, pageSize, onChange }) => {
  const totalPages = Math.ceil(total / pageSize);
  const [inputVal, setInputVal] = useState(current.toString());

  useEffect(() => {
    setInputVal(current.toString());
  }, [current]);

  if (totalPages <= 1) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGo();
    }
  };

  const handleGo = () => {
    let p = parseInt(inputVal);
    if (isNaN(p)) p = 1;
    if (p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    if (p !== current) {
        onChange(p);
    } else {
        setInputVal(p.toString()); // Reset to valid if invalid
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t dark:border-gray-700 select-none">
        <button 
            onClick={() => onChange(Math.max(1, current - 1))} 
            disabled={current === 1} 
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 transition-all active:scale-95"
        >
            <ChevronLeft className="w-5 h-5"/>
        </button>
        
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <span className="text-sm text-gray-500 font-medium">第</span>
            <input 
                type="number" 
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleGo}
                className="w-10 text-center font-bold text-blue-600 border-b-2 border-transparent focus:border-blue-500 outline-none bg-transparent appearance-none" 
            />
            <span className="text-sm text-gray-500 font-medium">页 / 共 {totalPages} 页</span>
        </div>

        <button 
            onClick={() => onChange(Math.min(totalPages, current + 1))} 
            disabled={current === totalPages} 
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 transition-all active:scale-95"
        >
            <ChevronRight className="w-5 h-5"/>
        </button>
    </div>
  );
};

export default Pagination;
