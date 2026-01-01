
import React, { useState } from 'react';
import { X, Plus, Store as StoreIcon, Settings, Trash2, ArrowLeft, CheckCircle, Users, Eye, CornerDownRight, ChevronDown, ChevronRight, Layers, Home, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Store, RoleLevel, User, Product } from '../types';
import { useApp } from '../App';
import UsernameBadge from './UsernameBadge';
import { supabase } from '../supabase';

interface StoreManagerProps {
  onClose: () => void;
}

const StoreManager: React.FC<StoreManagerProps> = ({ onClose }) => {
  const { currentStore, setCurrentStore, user, stores, setStores, users, reloadData, products } = useApp();
  
  // Views: 'list', 'edit', 'new' - 实现 4.1 原位视图切换
  const [view, setView] = useState<'list' | 'edit' | 'new'>('list');
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  
  // Collapsible state for manager/viewer selection
  const [showManagerSelect, setShowManagerSelect] = useState(false);
  const [showViewerSelect, setShowViewerSelect] = useState(false);

  // -- Actions --

  const handleSwitchStore = (store: Store) => {
     setCurrentStore(store);
     onClose();
  };

  const handleEdit = (store: Store) => {
    setEditingStore({...store});
    setShowManagerSelect(false);
    setShowViewerSelect(false);
    setView('edit');
  };

  const handleCreate = () => {
    setEditingStore({ 
        id: `store_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, 
        name: '', 
        isParent: false, 
        childrenIds: [],
        managerIds: [user?.id || ''], // Creator is manager by default
        viewerIds: []
    });
    setShowManagerSelect(false);
    setShowViewerSelect(false);
    setView('new');
  };

  // 4.2.2 核心定义与架构 & 4.3 逻辑补全
  const handleSave = async () => {
    if (editingStore) {
      // 逻辑补全：虽然不做强制删除，但给出警告（系统处理在展示层，这里做保存校验）
      if (editingStore.isParent && (editingStore.childrenIds?.length || 0) < 2) {
          if (!window.confirm("当前聚合门店不足 2 家，无法发挥汇总分析作用。确定要保存吗？")) {
              return;
          }
      }

      if (!editingStore.name) {
          alert('请输入门店名称');
          return;
      }

      try {
          // 逻辑：如果是母门店，更新其子门店的 parent_id
          // 如果转为子门店，逻辑上应该由后端处理关联，这里简化前端处理
          
          const storeData = {
              name: editingStore.name,
              is_parent: editingStore.isParent,
              parent_id: editingStore.isParent ? null : editingStore.parentId || null,
              children_ids: editingStore.childrenIds || [],
              manager_ids: editingStore.managerIds || [],
              viewer_ids: editingStore.viewerIds || []
          };

          let error;
          if (view === 'new') {
              const payload = { ...storeData, id: editingStore.id };
              const res = await supabase.from('stores').insert(payload);
              error = res.error;
          } else {
              const res = await supabase.from('stores').update(storeData).eq('id', editingStore.id);
              error = res.error;
          }

          if (error) throw error;

          // 系统逻辑：如果是母门店，必须更新所有子门店的 parent_id 指向它
          if (editingStore.isParent && editingStore.childrenIds) {
              // 先清空旧的（可选，简化逻辑直接覆盖）
              // 将选中的子门店 parent_id 设为当前 store id
              await supabase.from('stores').update({ parent_id: editingStore.id }).in('id', editingStore.childrenIds);
              // 抢人逻辑：如果子门店之前属于别人，这里直接更新就抢过来了
          }

          await reloadData(); 
          alert('保存成功！');
          setView('list');
          
      } catch (err: any) {
          console.error("Store Save Error:", err);
          alert(`保存失败: ${err.message || JSON.stringify(err)}`);
      }
    }
  };

  // 4.5 删除逻辑
  const handleDeleteStore = async (store: Store) => {
      // 4.5.1 删除“子门店”（物理实体）—— 高风险，严约束
      if (!store.isParent) {
          // 检查库存
          // 这里使用前端已加载的 products 进行快速检查，实际应使用后端 Count
          const hasInventory = products.some(p => p.storeId === store.id && p.batches.length > 0);
          
          if (hasInventory) {
              alert("禁止删除：请先清空该门店所有库存。\n(Total_Inventory > 0 -> 禁止删除)");
              return;
          }

          if (!window.confirm("确定要删除此门店吗？这是一个物理实体，删除不可恢复。")) return;

          try {
              const { error } = await supabase.from('stores').delete().eq('id', store.id);
              if (error) throw error;
              alert("子门店已删除。");
          } catch(err: any) {
              alert("删除失败: " + err.message);
          }
      } 
      // 4.5.2 删除“母门店”（虚拟视图）—— 低风险，直接删
      else {
          if (!window.confirm(`删除母门店“${store.name}”仅会解除归属关系，不会删除子门店的任何数据。\n子门店将恢复为“独立门店”。\n确认删除？`)) return;

          try {
              // 系统执行动作：找到所有 parent_id 为该门店的子门店，设为 NULL
              const { error: updateError } = await supabase.from('stores')
                  .update({ parent_id: null })
                  .eq('parent_id', store.id);
              
              if (updateError) throw updateError;

              // 删除母门店记录
              const { error: deleteError } = await supabase.from('stores').delete().eq('id', store.id);
              if (deleteError) throw deleteError;

              alert("母门店已删除，归属关系已解除。");
          } catch(err: any) {
              alert("删除失败: " + err.message);
          }
      }

      await reloadData();
      if (currentStore.id === store.id) {
          setCurrentStore({ id: 'dummy', name: '请选择门店', isParent: false });
      }
      setView('list');
  };

  // Helper to toggle IDs in arrays
  const toggleId = (array: string[] = [], id: string) => {
      if (array.includes(id)) return array.filter(x => x !== id);
      return [...array, id];
  };

  // -- Render Views --

  const renderForm = () => {
    if (!editingStore) return null;
    // 过滤：母门店选项不能是自己
    const parentStores = stores.filter(s => s.isParent && s.id !== editingStore.id);
    // 过滤：可选子门店（不能是自己，不能是母门店）
    const availableChildren = stores.filter(s => !s.isParent && s.id !== editingStore.id);

    return (
      <div className="p-6 space-y-6 animate-fade-in pb-20">
         <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2">
                <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ArrowLeft className="w-5 h-5"/></button>
                <h3 className="text-xl font-bold">{view === 'new' ? '新建门店' : '修改门店属性'}</h3>
           </div>
           {view === 'edit' && (
               <button onClick={() => handleDeleteStore(editingStore)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg" title="删除门店"><Trash2 className="w-5 h-5"/></button>
           )}
         </div>

         <div className="space-y-4 max-w-lg mx-auto">
            <div>
              <label className="block text-sm font-medium mb-1">门店名称</label>
              <input 
                type="text" 
                value={editingStore.name} 
                onChange={e => setEditingStore({...editingStore, name: e.target.value})}
                className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
               <span className="block text-sm font-medium mb-2">门店性质 (实体/虚拟)</span>
               <div className="flex gap-4">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="radio" 
                     name="isParent" 
                     checked={editingStore.isParent} 
                     onChange={() => setEditingStore({...editingStore, isParent: true, parentId: undefined})} 
                   />
                   <span className="font-bold text-purple-600">母门店 (虚拟分组)</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="radio" 
                     name="isParent" 
                     checked={!editingStore.isParent} 
                     onChange={() => setEditingStore({...editingStore, isParent: false})} 
                   />
                   <span className="font-bold text-green-600">子门店 (物理实体)</span>
                 </label>
               </div>
            </div>

            {!editingStore.isParent && (
               <div>
                  <label className="block text-sm font-medium mb-1">归属母门店 (可选)</label>
                  <select 
                    value={editingStore.parentId || ''} 
                    onChange={e => setEditingStore({...editingStore, parentId: e.target.value})}
                    className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none"
                  >
                    <option value="">-- 独立运营 (无归属) --</option>
                    {parentStores.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
               </div>
            )}

            {editingStore.isParent && (
               <div className="border border-purple-100 dark:border-purple-900 bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl">
                 <label className="block text-sm font-bold text-purple-700 mb-2">聚合子门店 (至少2个)</label>
                 <div className="max-h-60 overflow-y-auto space-y-2">
                    {availableChildren.map(child => {
                        const isSelected = editingStore.childrenIds?.includes(child.id);
                        // 抢人逻辑提示
                        const belongsToOther = child.parentId && child.parentId !== editingStore.id;
                        const otherParentName = belongsToOther ? stores.find(s => s.id === child.parentId)?.name : '';

                        return (
                           <label key={child.id} className={`flex items-center justify-between p-2 rounded cursor-pointer border ${isSelected ? 'bg-white border-purple-400' : 'border-transparent hover:bg-white/50'}`}>
                              <div className="flex items-center gap-2">
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    onChange={(e) => {
                                       const ids = editingStore.childrenIds || [];
                                       if (e.target.checked) {
                                           if (belongsToOther && !window.confirm(`子门店“${child.name}”当前属于“${otherParentName}”，确认要将它移动到当前母门店吗？`)) {
                                               return;
                                           }
                                           setEditingStore({...editingStore, childrenIds: [...ids, child.id]});
                                       }
                                       else setEditingStore({...editingStore, childrenIds: ids.filter(id => id !== child.id)});
                                    }}
                                    className="text-purple-600 focus:ring-purple-500"
                                  />
                                  <span>{child.name}</span>
                              </div>
                              {belongsToOther && <span className="text-xs text-orange-500 bg-orange-100 px-1 rounded">属: {otherParentName}</span>}
                           </label>
                        );
                    })}
                 </div>
                 {editingStore.childrenIds && editingStore.childrenIds.length < 2 && (
                     <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> 当前不足 2 家，无法发挥聚合作用</p>
                 )}
               </div>
            )}

            {/* Permission Management: Managers & Viewers */}
            <div className="border-t dark:border-gray-700 pt-4 space-y-4">
               <h4 className="font-bold mb-3 text-gray-700 dark:text-gray-300">4.7 门店人员配置</h4>
               
               {/* Manager Selection */}
               <div className="border rounded-xl dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-800">
                   <button 
                     onClick={() => setShowManagerSelect(!showManagerSelect)}
                     className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                   >
                       <span className="flex items-center gap-2 font-medium">
                           <Users className="w-4 h-4 text-blue-500"/> 4.7.1 门店管理员 (可修改/调整/开单)
                       </span>
                       {showManagerSelect ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                   </button>
                   
                   {showManagerSelect && (
                       <div className="p-3 border-t dark:border-gray-600 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                            {users.filter(u => u.role !== RoleLevel.ROOT).map(u => (
                                <label key={u.id} className="flex items-center justify-between py-2 px-2 hover:bg-white dark:hover:bg-gray-700 rounded cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            checked={editingStore.managerIds?.includes(u.id)}
                                            onChange={() => setEditingStore({
                                                ...editingStore, 
                                                managerIds: toggleId(editingStore.managerIds, u.id),
                                                viewerIds: editingStore.viewerIds?.filter(vid => vid !== u.id) 
                                            })}
                                            disabled={u.id === user?.id} 
                                        />
                                        <UsernameBadge name={u.username} roleLevel={u.role} />
                                    </div>
                                </label>
                            ))}
                       </div>
                   )}
               </div>

               {/* Viewer Selection */}
               <div className="border rounded-xl dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-800">
                   <button 
                     onClick={() => setShowViewerSelect(!showViewerSelect)}
                     className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                   >
                       <span className="flex items-center gap-2 font-medium">
                           <Eye className="w-4 h-4 text-green-500"/> 4.7.2 门店浏览者 (仅查看/隐藏操作键)
                       </span>
                       {showViewerSelect ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                   </button>
                   
                   {showViewerSelect && (
                       <div className="p-3 border-t dark:border-gray-600 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                            {users.filter(u => u.role !== RoleLevel.ROOT).map(u => (
                                <label key={u.id} className="flex items-center justify-between py-2 px-2 hover:bg-white dark:hover:bg-gray-700 rounded cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            checked={editingStore.viewerIds?.includes(u.id)}
                                            onChange={() => setEditingStore({
                                                ...editingStore, 
                                                viewerIds: toggleId(editingStore.viewerIds, u.id),
                                                managerIds: editingStore.managerIds?.filter(mid => mid !== u.id) 
                                            })}
                                            disabled={editingStore.managerIds?.includes(u.id)} 
                                        />
                                        <UsernameBadge name={u.username} roleLevel={u.role} />
                                    </div>
                                </label>
                            ))}
                       </div>
                   )}
               </div>
            </div>

            <button onClick={handleSave} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all mt-6">
               保存设置
            </button>
         </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
           <StoreIcon className="w-6 h-6 text-orange-500" />
           门店视图
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        {view === 'list' ? (
           <div className="p-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stores.map(store => {
                  const isCurrent = currentStore.id === store.id;
                  const isParent = store.isParent;
                  const isRoot = user?.role === RoleLevel.ROOT;
                  const isManager = store.managerIds?.includes(user?.id || '');
                  const isViewer = store.viewerIds?.includes(user?.id || '');
                  
                  // Visibility Logic
                  if (!isRoot && !isManager && !isViewer && store.id !== currentStore.id) return null;

                  const canManage = isRoot || isManager;
                  const parentStore = !isParent && store.parentId ? stores.find(s => s.id === store.parentId) : null;
                  
                  // 4.4 视觉区分 (彩色标签系统)
                  // 母门店：深蓝/紫色
                  // 独立子门店：绿色
                  // 附属子门店：灰色/橙色
                  let badgeColorClass = "";
                  let borderColorClass = "";
                  let statusText = "";
                  
                  if (isParent) {
                      badgeColorClass = "bg-purple-100 text-purple-700 border-purple-200";
                      borderColorClass = "border-purple-500 shadow-purple-100";
                      statusText = "聚合视图";
                  } else if (parentStore) {
                      badgeColorClass = "bg-gray-100 text-gray-600 border-gray-200";
                      borderColorClass = "border-gray-400";
                      statusText = `隶属于 [${parentStore.name}]`;
                  } else {
                      badgeColorClass = "bg-green-100 text-green-700 border-green-200";
                      borderColorClass = "border-green-500 shadow-green-100";
                      statusText = "独立运营";
                  }

                  return (
                    <div 
                      key={store.id} 
                      className={`relative p-6 rounded-2xl border-l-4 bg-white dark:bg-gray-800 transition-all group ${borderColorClass} ${
                        isCurrent 
                          ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900 shadow-xl scale-[1.02]' 
                          : 'shadow hover:shadow-lg'
                      }`}
                    >
                      <div className="flex justify-between items-start" onClick={() => handleSwitchStore(store)}>
                         <div className="flex flex-col">
                             <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">{store.name}</h3>
                             <div className={`text-xs px-2 py-1 rounded border w-fit ${badgeColorClass}`}>
                                {isParent ? "母门店" : "子门店"} | {statusText}
                             </div>
                         </div>
                         <div className="flex flex-col items-end">
                            {isCurrent && <CheckCircle className="w-6 h-6 text-blue-500 mb-1" />}
                            {!canManage && isViewer && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">访客</span>}
                         </div>
                      </div>
                      
                      {/* 4.4 副标题：下辖 X 家门店 */}
                      {isParent && store.childrenIds && (
                         <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <span className="text-xs text-gray-500 block mb-1">下辖 {store.childrenIds.length} 家门店:</span>
                            <div className="flex flex-wrap gap-1">
                                {store.childrenIds.map(cid => {
                                const child = stores.find(s => s.id === cid);
                                return child ? <span key={cid} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">{child.name}</span> : null;
                                })}
                            </div>
                            {/* 4.3.1 警告 */}
                            {store.childrenIds.length < 2 && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 p-1 rounded">
                                    <AlertTriangle className="w-3 h-3"/> 聚合门店不足 2 家
                                </div>
                            )}
                         </div>
                      )}

                      {/* Edit Actions - 4.6.1 修改按钮 - Visible always if permitted */}
                      {canManage && !user?.permissions?.hideStoreEdit && (
                        <div className="absolute bottom-4 right-4">
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleEdit(store); }} 
                             className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-blue-600 hover:text-white transition-colors text-sm font-bold"
                           >
                              <Settings className="w-3 h-3" /> 修改
                           </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 4.7 Add New Store */}
                {(!user?.permissions?.hideNewStore) && (
                  <button 
                    onClick={handleCreate}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all bg-transparent h-full min-h-[160px]"
                  >
                     <Plus className="w-10 h-10 mb-2" />
                     <span className="font-bold">新建门店</span>
                  </button>
                )}
             </div>
           </div>
        ) : (
           renderForm()
        )}
      </div>
    </div>
  );
};

export default StoreManager;
