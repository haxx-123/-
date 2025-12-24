
import React, { useState } from 'react';
import { X, Plus, Store as StoreIcon, Settings, Trash2, ArrowLeft, CheckCircle, Users, Eye, CornerDownRight, ChevronDown, ChevronRight, Layers, Home } from 'lucide-react';
import { Store, RoleLevel, User } from '../types';
import { useApp } from '../App';
import UsernameBadge from './UsernameBadge';
import { supabase } from '../supabase';

interface StoreManagerProps {
  onClose: () => void;
}

const StoreManager: React.FC<StoreManagerProps> = ({ onClose }) => {
  const { currentStore, setCurrentStore, user, stores, setStores, users, reloadData, products } = useApp();
  
  // Views: 'list', 'edit', 'new'
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

  const handleSave = async () => {
    if (editingStore) {
      if (editingStore.isParent && (editingStore.childrenIds?.length || 0) < 2) {
          alert('母门店必须包含至少 2 个子门店');
          return;
      }

      if (!editingStore.name) {
          alert('请输入门店名称');
          return;
      }

      try {
          // Explicit mapping to snake_case for DB
          const storeData = {
              name: editingStore.name,
              is_parent: editingStore.isParent,
              parent_id: editingStore.parentId || null,
              children_ids: editingStore.childrenIds || [],
              manager_ids: editingStore.managerIds || [],
              viewer_ids: editingStore.viewerIds || []
          };

          if (view === 'new') {
              const payload = { ...storeData, id: editingStore.id };
              const { error } = await supabase.from('stores').insert(payload);
              if (error) throw error;
          } else {
              const { error } = await supabase.from('stores').update(storeData).eq('id', editingStore.id);
              if (error) throw error;
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

  const handleDeleteStore = async (store: Store) => {
      // 20.5 Strict Delete Logic
      if (store.isParent) {
          // Parent Store Delete Logic
          if (!window.confirm("删除母门店仅会解除归属关系，子门店将恢复为独立门店。确认删除？")) return;
          try {
              // 1. Unlink children
              if (store.childrenIds && store.childrenIds.length > 0) {
                  await supabase.from('stores').update({ parent_id: null }).in('id', store.childrenIds);
              }
              // 2. Delete Parent
              const { error } = await supabase.from('stores').delete().eq('id', store.id);
              if (error) throw error;
              
              await reloadData();
              if (currentStore.id === store.id) setCurrentStore({ id: 'dummy', name: '请选择门店', isParent: false });
              alert("母门店已删除，子门店已重置为独立状态。");
              setView('list');
          } catch (err: any) {
              alert("删除母门店失败: " + err.message);
          }
      } else {
          // Child Store Delete Logic
          // Check inventory count
          const storeProducts = products.filter(p => p.storeId === store.id);
          const totalInventory = storeProducts.reduce((acc, p) => acc + p.batches.reduce((sum, b) => sum + b.quantityBig, 0), 0);
          
          if (totalInventory > 0) {
              alert("禁止删除：请先清空该门店所有库存。");
              return;
          }

          if (!window.confirm("确定要删除此子门店吗？此操作不可恢复。")) return;

          try {
              const { error } = await supabase.from('stores').delete().eq('id', store.id);
              if (error) throw error;
              
              await reloadData();
              if (currentStore.id === store.id) setCurrentStore({ id: 'dummy', name: '请选择门店', isParent: false });
              alert("子门店已删除");
              setView('list');
          } catch (err: any) {
              alert("删除失败: " + err.message);
          }
      }
  };

  // Helper to toggle IDs in arrays
  const toggleId = (array: string[] = [], id: string) => {
      if (array.includes(id)) return array.filter(x => x !== id);
      return [...array, id];
  };

  // -- Render Views --

  const renderForm = () => {
    if (!editingStore) return null;
    const parentStores = stores.filter(s => s.isParent && s.id !== editingStore.id);
    const availableChildren = stores.filter(s => !s.isParent && s.id !== editingStore.id && (!s.parentId || s.parentId === editingStore.id));

    return (
      <div className="p-6 space-y-6 animate-fade-in pb-20">
         <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2">
                <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ArrowLeft className="w-5 h-5"/></button>
                <h3 className="text-xl font-bold">{view === 'new' ? '新建门店' : '编辑门店'}</h3>
           </div>
           {view === 'edit' && (
               <button onClick={() => handleDeleteStore(editingStore)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 className="w-5 h-5"/></button>
           )}
         </div>

         <div className="space-y-4 max-w-lg mx-auto">
            <div>
              <label className="block text-sm font-medium mb-1">门店名称</label>
              <input 
                type="text" 
                value={editingStore.name} 
                onChange={e => setEditingStore({...editingStore, name: e.target.value})}
                className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none focus:border-orange-500"
              />
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
               <span className="block text-sm font-medium mb-2">门店类型</span>
               <div className="flex gap-4">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="radio" 
                     name="isParent" 
                     checked={editingStore.isParent} 
                     onChange={() => setEditingStore({...editingStore, isParent: true, parentId: undefined})} 
                   />
                   <span>母门店 (总店)</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="radio" 
                     name="isParent" 
                     checked={!editingStore.isParent} 
                     onChange={() => setEditingStore({...editingStore, isParent: false})} 
                   />
                   <span>子门店 (分店)</span>
                 </label>
               </div>
            </div>

            {!editingStore.isParent && (
               <div>
                  <label className="block text-sm font-medium mb-1">所属母门店</label>
                  <select 
                    value={editingStore.parentId || ''} 
                    onChange={e => setEditingStore({...editingStore, parentId: e.target.value})}
                    className="w-full p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 outline-none"
                  >
                    <option value="">-- 独立门店 --</option>
                    {parentStores.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
               </div>
            )}

            {editingStore.isParent && (
               <div>
                 <label className="block text-sm font-medium mb-1">包含子门店 (至少2个)</label>
                 <div className="p-3 border rounded-xl dark:border-gray-600 max-h-40 overflow-y-auto bg-white dark:bg-gray-800">
                    {availableChildren.map(child => (
                       <label key={child.id} className="flex items-center gap-2 py-2 px-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={editingStore.childrenIds?.includes(child.id)}
                            onChange={(e) => {
                               const ids = editingStore.childrenIds || [];
                               if (e.target.checked) setEditingStore({...editingStore, childrenIds: [...ids, child.id]});
                               else setEditingStore({...editingStore, childrenIds: ids.filter(id => id !== child.id)});
                            }}
                          />
                          <span>{child.name}</span>
                       </label>
                    ))}
                 </div>
                 {editingStore.childrenIds && editingStore.childrenIds.length < 2 && (
                     <p className="text-xs text-red-500 mt-1">* 需至少选择2个子门店</p>
                 )}
               </div>
            )}

            {/* Permission Management */}
            <div className="border-t dark:border-gray-700 pt-4 space-y-4">
               <h4 className="font-bold mb-3 text-gray-700 dark:text-gray-300">权限配置</h4>
               {/* Manager Selection */}
               <div className="border rounded-xl dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-800">
                   <button onClick={() => setShowManagerSelect(!showManagerSelect)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                       <span className="flex items-center gap-2 font-medium"><Users className="w-4 h-4 text-blue-500"/> 门店管理员</span>
                       {showManagerSelect ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                   </button>
                   {showManagerSelect && (
                       <div className="p-3 border-t dark:border-gray-600 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                            {users.filter(u => u.role !== RoleLevel.ROOT).map(u => (
                                <label key={u.id} className="flex items-center justify-between py-2 px-2 hover:bg-white dark:hover:bg-gray-700 rounded cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={editingStore.managerIds?.includes(u.id)} onChange={() => setEditingStore({...editingStore, managerIds: toggleId(editingStore.managerIds, u.id), viewerIds: editingStore.viewerIds?.filter(vid => vid !== u.id) })} disabled={u.id === user?.id} />
                                        <UsernameBadge name={u.username} roleLevel={u.role} />
                                    </div>
                                </label>
                            ))}
                       </div>
                   )}
               </div>
               {/* Viewer Selection */}
               <div className="border rounded-xl dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-800">
                   <button onClick={() => setShowViewerSelect(!showViewerSelect)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                       <span className="flex items-center gap-2 font-medium"><Eye className="w-4 h-4 text-green-500"/> 门店浏览者</span>
                       {showViewerSelect ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                   </button>
                   {showViewerSelect && (
                       <div className="p-3 border-t dark:border-gray-600 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                            {users.filter(u => u.role !== RoleLevel.ROOT).map(u => (
                                <label key={u.id} className="flex items-center justify-between py-2 px-2 hover:bg-white dark:hover:bg-gray-700 rounded cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={editingStore.viewerIds?.includes(u.id)} onChange={() => setEditingStore({...editingStore, viewerIds: toggleId(editingStore.viewerIds, u.id), managerIds: editingStore.managerIds?.filter(mid => mid !== u.id) })} disabled={editingStore.managerIds?.includes(u.id)} />
                                        <UsernameBadge name={u.username} roleLevel={u.role} />
                                    </div>
                                </label>
                            ))}
                       </div>
                   )}
               </div>
            </div>

            <button onClick={handleSave} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all mt-6">保存设置</button>
         </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <h2 className="text-xl font-bold dark:text-white flex items-center gap-2"><StoreIcon className="w-6 h-6 text-orange-500" /> 门店管理</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6" /></button>
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
                  
                  if (!isRoot && !isManager && !isViewer) return null;

                  const canManage = isRoot || isManager;
                  const parentStore = !isParent && store.parentId ? stores.find(s => s.id === store.parentId) : null;

                  // 20.4 Visual Distinction with Badge Colors
                  let containerStyle = 'bg-white border-gray-200';
                  let badgeColor = 'bg-gray-100 text-gray-700';
                  let statusText = '独立门店';

                  if (isParent) {
                      containerStyle = 'bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800';
                      badgeColor = 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200';
                      statusText = '母门店 (聚合视图)';
                  } else if (parentStore) {
                      containerStyle = 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
                      badgeColor = 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
                      statusText = `隶属于 [${parentStore.name}]`;
                  } else {
                      containerStyle = 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800';
                      badgeColor = 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200';
                      statusText = '独立子门店';
                  }

                  return (
                    <div 
                      key={store.id} 
                      className={`relative p-6 rounded-2xl border-2 transition-all group ${containerStyle} ${isCurrent ? 'ring-2 ring-offset-2 ring-orange-500 dark:ring-offset-gray-900 shadow-xl scale-[1.02]' : 'shadow-sm hover:shadow-md'}`}
                    >
                      <div className="flex justify-between items-start" onClick={() => handleSwitchStore(store)}>
                         <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl cursor-pointer shadow-inner ${badgeColor}`}>
                           {isParent ? <Layers className="w-6 h-6"/> : <Home className="w-6 h-6"/>}
                         </div>
                         <div className="flex flex-col items-end">
                            {isCurrent && <CheckCircle className="w-6 h-6 text-orange-500 mb-1" />}
                            {!canManage && isViewer && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">仅浏览</span>}
                         </div>
                      </div>
                      
                      <div className="mt-4 cursor-pointer" onClick={() => handleSwitchStore(store)}>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{store.name}</h3>
                        <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-bold ${badgeColor}`}>{statusText}</span>
                      </div>
                      
                      {isParent && store.childrenIds && (
                         <div className="mt-4 pt-3 border-t border-purple-200 dark:border-purple-800">
                            <span className="text-xs text-purple-800 dark:text-purple-300 block mb-1">下辖 {store.childrenIds.length} 家门店:</span>
                            <div className="flex flex-wrap gap-1">
                                {store.childrenIds.map(cid => {
                                    const child = stores.find(s => s.id === cid);
                                    return child ? <span key={cid} className="text-xs px-2 py-0.5 bg-white dark:bg-gray-800 rounded border border-purple-100 dark:border-purple-900 text-purple-700 dark:text-purple-300">{child.name}</span> : null;
                                })}
                            </div>
                         </div>
                      )}

                      {canManage && (
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={(e) => { e.stopPropagation(); handleEdit(store); }} className="p-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-blue-500 hover:text-white transition-colors shadow-sm"><Settings className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {(!user?.permissions?.hideNewStore) && (
                  <button onClick={handleCreate} className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all bg-transparent h-full min-h-[200px]">
                     <Plus className="w-12 h-12 mb-2" />
                     <span className="font-bold">新建门店</span>
                  </button>
                )}
             </div>
           </div>
        ) : ( renderForm() )}
      </div>
    </div>
  );
};

export default StoreManager;
