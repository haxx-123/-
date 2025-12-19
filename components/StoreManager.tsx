import React, { useState } from 'react';
import { X, Plus, Store as StoreIcon, Settings, Trash2, ArrowLeft, CheckCircle, Users, Eye } from 'lucide-react';
import { MOCK_STORES, MOCK_USERS } from '../constants';
import { Store, RoleLevel, User } from '../types';
import { useApp } from '../App';
import UsernameBadge from './UsernameBadge';

interface StoreManagerProps {
  onClose: () => void;
}

const StoreManager: React.FC<StoreManagerProps> = ({ onClose }) => {
  const { currentStore, setCurrentStore, user } = useApp();
  const [stores, setStores] = useState<Store[]>(MOCK_STORES);
  
  // Views: 'list', 'edit', 'new'
  const [view, setView] = useState<'list' | 'edit' | 'new'>('list');
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  // -- Actions --

  const handleSwitchStore = (store: Store) => {
     setCurrentStore(store);
     onClose();
  };

  const handleEdit = (store: Store) => {
    setEditingStore({...store});
    setView('edit');
  };

  const handleCreate = () => {
    setEditingStore({ 
        id: `new_${Date.now()}`, 
        name: '', 
        isParent: false, 
        childrenIds: [],
        managerIds: [user?.id || ''], // Creator is manager by default
        viewerIds: []
    });
    setView('new');
  };

  const handleSave = () => {
    if (editingStore) {
      if (editingStore.isParent && (editingStore.childrenIds?.length || 0) < 2) {
          alert('母门店必须包含至少 2 个子门店');
          return;
      }

      if (view === 'new') {
        setStores([...stores, editingStore]);
      } else {
        setStores(stores.map(s => s.id === editingStore.id ? editingStore : s));
      }
      setView('list');
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
         <div className="flex items-center gap-2 mb-4">
           <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ArrowLeft className="w-5 h-5"/></button>
           <h3 className="text-xl font-bold">{view === 'new' ? '新建门店' : '编辑门店'}</h3>
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

            {/* Permission Management: Managers & Viewers */}
            <div className="border-t dark:border-gray-700 pt-4">
               <h4 className="font-bold mb-3 text-gray-700 dark:text-gray-300">权限配置</h4>
               
               <div className="mb-4">
                   <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                       <Users className="w-4 h-4 text-blue-500"/> 门店管理员 (可操作)
                   </label>
                   <div className="p-3 border rounded-xl dark:border-gray-600 max-h-32 overflow-y-auto bg-white dark:bg-gray-800">
                        {/* 00 Users are implicitly managers but hidden from list */}
                        {MOCK_USERS.filter(u => u.role !== RoleLevel.ROOT).map(u => (
                            <label key={u.id} className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        checked={editingStore.managerIds?.includes(u.id)}
                                        onChange={() => setEditingStore({
                                            ...editingStore, 
                                            managerIds: toggleId(editingStore.managerIds, u.id),
                                            viewerIds: editingStore.viewerIds?.filter(vid => vid !== u.id) 
                                        })}
                                        disabled={u.id === user?.id} // Cannot remove self from managers if not 00
                                    />
                                    <UsernameBadge name={u.username} roleLevel={u.role} />
                                </div>
                            </label>
                        ))}
                   </div>
                   <p className="text-xs text-gray-400 mt-1">管理员拥有修改、调整、开单、导入等全部权限 (00权限用户默认拥有所有权限，且不在此显示)。</p>
               </div>

               <div>
                   <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                       <Eye className="w-4 h-4 text-green-500"/> 门店浏览者 (仅查看)
                   </label>
                   <div className="p-3 border rounded-xl dark:border-gray-600 max-h-32 overflow-y-auto bg-white dark:bg-gray-800">
                        {MOCK_USERS.filter(u => u.role !== RoleLevel.ROOT).map(u => (
                            <label key={u.id} className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
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
                   <p className="text-xs text-gray-400 mt-1">浏览者仅可查看数据，无法进行任何修改操作。</p>
               </div>
            </div>

            <button onClick={handleSave} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all mt-6">
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
           门店管理
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
                  
                  // Visibility Logic: Root sees all, others see only where they are Manager or Viewer
                  if (!isRoot && !isManager && !isViewer) return null;

                  // 00 is implicitly a manager for everything
                  const canManage = isRoot || isManager;

                  return (
                    <div 
                      key={store.id} 
                      className={`relative p-6 rounded-2xl border-2 transition-all group bg-white dark:bg-gray-800 ${
                        isCurrent 
                          ? 'border-orange-500 shadow-xl scale-[1.02]' 
                          : 'border-transparent shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="flex justify-between items-start" onClick={() => handleSwitchStore(store)}>
                         <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-2xl cursor-pointer">
                           {isParent ? '🏢' : '🏪'}
                         </div>
                         <div className="flex flex-col items-end">
                            {isCurrent && <CheckCircle className="w-6 h-6 text-orange-500 mb-1" />}
                            {!canManage && isViewer && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">仅浏览</span>}
                         </div>
                      </div>
                      
                      <div className="mt-4 cursor-pointer" onClick={() => handleSwitchStore(store)}>
                        <h3 className="text-lg font-bold">{store.name}</h3>
                        <p className="text-sm text-gray-500">{isParent ? '母门店 (总店)' : '子门店'}</p>
                      </div>
                      
                      {isParent && store.childrenIds && (
                         <div className="mt-4 pt-4 border-t dark:border-gray-700 flex flex-wrap gap-1">
                            {store.childrenIds.map(cid => {
                               const child = stores.find(s => s.id === cid);
                               return child ? <span key={cid} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">{child.name}</span> : null;
                            })}
                         </div>
                      )}

                      {/* Edit Actions - Only for Managers/Root */}
                      {canManage && (
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleEdit(store); }} 
                             className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"
                           >
                              <Settings className="w-4 h-4" />
                           </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add New Store - Only for Root */}
                {(user?.role === RoleLevel.ROOT) && (
                  <button 
                    onClick={handleCreate}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all bg-transparent h-full min-h-[200px]"
                  >
                     <Plus className="w-12 h-12 mb-2" />
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