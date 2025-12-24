
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, User as UserIcon, Shield, Palette, Plus, Edit, Trash2, X, Save, RefreshCcw, ArrowRight, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { THEMES } from '../constants';
import { RoleLevel, User, UserPermissions } from '../types';
import { useApp } from '../App';
import UsernameBadge from '../components/UsernameBadge';
import FaceID from '../components/FaceID';
import Pagination from '../components/Pagination';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase';

// ... (getPermissionDesc remain same) ...
const getPermissionDesc = (role: RoleLevel) => {
    switch (role) {
      case RoleLevel.ROOT: return '00 - 最高权限 (系统管理/任意撤销)';
      case RoleLevel.BOSS: return '01 - 老板 (查看所有/撤销所有)';
      case RoleLevel.FRONT_DESK: return '02 - 前台 (日常操作)';
      case RoleLevel.MANAGER_TEAL:
      case RoleLevel.MANAGER_OLIVE:
      case RoleLevel.MANAGER_GRAY: return `03-05 - 管理 (管理子用户)`;
      case RoleLevel.STAFF: return '06 - 员工 (仅限自己操作)';
      default: return '09 - 访客 (仅浏览)';
    }
};

interface UserEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetUser: User | null; // Just the target user object
    currentUser: User | null;
    onUpdate: () => void; // Callback to refresh data
}

// 31. Real-time Independent Permission Modal
const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, onClose, targetUser, currentUser, onUpdate }) => {
    const [localUser, setLocalUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);

    // 31. Requirement: Fetch latest data to avoid interference
    useEffect(() => {
        if (isOpen && targetUser) {
            const fetchFresh = async () => {
                const { data } = await supabase.from('users').select('*').eq('id', targetUser.id).single();
                if (data) setLocalUser(data);
                else setLocalUser(targetUser); // Fallback
            };
            fetchFresh();
        }
    }, [isOpen, targetUser]);

    if (!isOpen || !localUser) return null;
    
    const isSelf = currentUser?.id === localUser.id;
    const isRoot = currentUser?.role === RoleLevel.ROOT;
    const isPeer = currentUser?.role === localUser.role;
    
    // Strict modification rules
    const canModify = isRoot || isSelf || (!isPeer && currentUser && currentUser.role < localUser.role);
    
    // 31. Real-time update function
    const updateField = async (field: string, value: any, isPermission = false) => {
        if (!canModify) return;
        
        // Optimistic UI update
        const updatedUser = { ...localUser };
        if (isPermission) {
            updatedUser.permissions = { ...updatedUser.permissions, [field]: value };
        } else {
            (updatedUser as any)[field] = value;
        }
        setLocalUser(updatedUser);

        // Silent background update
        try {
            const payload: any = isPermission 
                ? { permissions: updatedUser.permissions }
                : { [field]: value };
            
            await supabase.from('users').update(payload).eq('id', localUser.id);
            onUpdate(); // Trigger parent refresh
        } catch (err) {
            console.error("Sync failed", err);
            // Revert on failure (optional, for simplicity we just log)
        }
    };

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
         <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500"><X className="w-5 h-5"/></button>
            <h3 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-500"/>
                权限配置: <span className="text-blue-600">{localUser.username}</span>
                {!canModify && <span className="ml-3 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded border border-yellow-200">仅查看模式</span>}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                    <h4 className="font-bold text-gray-700 dark:text-gray-300 border-b pb-2 flex items-center gap-2"><UserIcon className="w-4 h-4"/> 基础信息</h4>
                    <div><label className="block text-sm font-medium mb-1 text-gray-500">用户 ID (不可修改)</label><div className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 font-mono text-xs break-all">{localUser.id}</div></div>
                    <div>
                        <label className="block text-sm font-medium mb-1">用户名</label>
                        <input 
                            type="text" 
                            value={localUser.username} 
                            onBlur={(e) => updateField('username', e.target.value)}
                            onChange={(e) => setLocalUser({...localUser, username: e.target.value})} // Local type only
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                            disabled={!canModify}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">角色等级 (00-09)</label>
                        <select 
                            value={localUser.role} 
                            onChange={e => updateField('role', e.target.value)} 
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 disabled:opacity-50"
                            disabled={!canModify}
                        >
                            {Object.values(RoleLevel).map(r => {
                                const canSelect = isRoot || (currentUser && r > currentUser.role) || (currentUser?.permissions?.allowPeerLevel && r === currentUser.role);
                                return canSelect && (<option key={r} value={r}>{r}</option>);
                            })}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">{getPermissionDesc(localUser.role)}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <h4 className="font-bold text-gray-700 dark:text-gray-300 border-b pb-2 flex items-center gap-2"><Shield className="w-4 h-4"/> 权限矩阵 (实时生效)</h4>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border dark:border-gray-600">
                        <label className="block text-sm font-bold mb-2 text-blue-600 dark:text-blue-400">日志操作权限</label>
                        <div className="space-y-2">
                            {[{ val: 'A', label: 'A级: 查看所有 / 任意撤销 (最高)' }, { val: 'B', label: 'B级: 查看所有 / 仅撤销低级 (受限)' }, { val: 'C', label: 'C级: 查看所有 / 仅撤销自己' }, { val: 'D', label: 'D级: 仅查看自己 / 仅撤销自己 (最低)' }].map(opt => (
                                <label key={opt.val} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-white dark:hover:bg-gray-600 transition-colors">
                                    <input 
                                        type="radio" 
                                        name="logPermission" 
                                        checked={(localUser.permissions?.logPermission || 'D') === opt.val} 
                                        onChange={() => updateField('logPermission', opt.val, true)} 
                                        className="text-blue-600 focus:ring-blue-500"
                                        disabled={!canModify}
                                    />
                                    <span className={`text-sm ${!canModify ? 'opacity-50' : ''}`}>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2 text-red-500">功能隐藏开关</label>
                        <div className="grid grid-cols-1 gap-2">
                            {[{ key: 'hideAuditHall', label: '隐藏“审计大厅”页面' }, { key: 'hideStoreEdit', label: '隐藏门店“修改”按钮' }, { key: 'hideNewStore', label: '隐藏“新建门店”页面' }, { key: 'hideExcelExport', label: '隐藏“Excel导出”图标' }, { key: 'hideSettings', label: '隐藏“权限设置”页面入口' }].map(item => (
                                <label key={item.key} className={`flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${!canModify ? 'opacity-70 pointer-events-none' : ''}`}>
                                    <span className="text-sm">{item.label}</span>
                                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                        <input type="checkbox" checked={!!localUser.permissions?.[item.key as keyof UserPermissions]} onChange={(e) => updateField(item.key, e.target.checked, true)} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-5" disabled={!canModify}/>
                                        <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${localUser.permissions?.[item.key as keyof UserPermissions] ? 'bg-red-500' : 'bg-gray-300'}`}></label>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">列表可见性范围</label>
                        <div className="flex flex-col gap-2">
                            <label className={`flex items-center gap-2 text-sm p-1 ${!canModify ? 'opacity-70' : ''}`}><input type="checkbox" checked={localUser.permissions?.allowPeerLevel} onChange={e => updateField('allowPeerLevel', e.target.checked, true)} className="rounded" disabled={!canModify}/>允许查看/创建同级用户 (例如 03 可见 03)</label>
                            <label className={`flex items-center gap-2 text-sm p-1 ${!canModify ? 'opacity-70' : ''}`}><input type="checkbox" checked={!localUser.permissions?.hideSelf} onChange={e => updateField('hideSelf', !e.target.checked, true)} className="rounded" disabled={!canModify}/>在列表中显示自己</label>
                        </div>
                    </div>
                </div>
            </div>
         </div>
      </div>
    );
};

const SettingsPage = () => {
  const { theme, setTheme, user, login, logout, setPageActions, users, setUsers, reloadData } = useApp();
  const [openSection, setOpenSection] = useState<string | null>('account');
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSwitchAccountModalOpen, setIsSwitchAccountModalOpen] = useState(false);
  const [showFaceReg, setShowFaceReg] = useState(false);

  // Pagination for user list
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [accountForm, setAccountForm] = useState({
      username: '',
      password: '',
      avatar: '',
      face_descriptor: [] as number[]
  });
  const [isAccountDirty, setIsAccountDirty] = useState(false);

  useEffect(() => {
      if (user) {
          const currentUserData = users.find(u => u.id === user.id) || user;
          setAccountForm({
              username: currentUserData.username,
              password: '', 
              avatar: currentUserData.avatar || '',
              face_descriptor: currentUserData.face_descriptor || []
          });
          setIsAccountDirty(false);
      }
  }, [user, users]);

  useEffect(() => {
    setPageActions({
        handleCopy: () => {
            const text = users.map(u => `用户: ${u.username} (ID: ${u.id}) - 权限: ${u.role}`).join('\n');
            navigator.clipboard.writeText(text).then(() => alert('用户列表已复制'));
        },
        handleExcel: () => {
            const ws = XLSX.utils.json_to_sheet(users);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Users");
            XLSX.writeFile(wb, `users_export_${Date.now()}.xlsx`);
        }
    });
    return () => setPageActions({});
  }, [users, setPageActions]);

  const handleAccountChange = (field: string, value: string) => {
      setAccountForm(prev => {
          const next = { ...prev, [field]: value };
          setIsAccountDirty(true); 
          return next;
      });
  };

  const handleSaveAccount = async () => {
      if (!isAccountDirty || !user) return;
      try {
          const updates: any = { username: accountForm.username, avatar: accountForm.avatar, face_descriptor: accountForm.face_descriptor };
          if (accountForm.password) updates.password = accountForm.password;
          await supabase.from('users').update(updates).eq('id', user.id);
          await reloadData();
          alert('账户信息已更新');
          setIsAccountDirty(false);
          const updatedUser = users.find(u => u.id === user.id);
          if (updatedUser) login({...updatedUser, ...updates});
      } catch (err: any) { alert('保存失败: ' + err.message); }
  };

  const handleFaceRegister = (descriptor?: number[]) => {
      if (descriptor) { setAccountForm(prev => ({ ...prev, face_descriptor: descriptor })); setIsAccountDirty(true); }
      setShowFaceReg(false);
  };

  const toggleSection = (id: string) => setOpenSection(openSection === id ? null : id);

  // Open modal with fresh user data handled inside modal
  const handleEditUser = (u: User) => {
    setEditingUser(u);
    setIsEditModalOpen(true);
  };

  const handleCreateUser = async () => {
    // Creating user happens immediately in DB to allow immediate editing
    const newUserId = `u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newUser: User = { id: newUserId, username: 'New User', password: '123', role: RoleLevel.STAFF, permissions: { logPermission: 'D' } };
    
    await supabase.from('users').insert(newUser);
    await reloadData();
    setEditingUser(newUser);
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = async (targetUserId: string) => {
      if (!window.confirm("确定要删除该用户吗？此操作不可撤销。")) return;
      try {
          await supabase.from('users').delete().eq('id', targetUserId);
          await reloadData();
          alert("用户已删除");
      } catch (err: any) { alert("删除失败: " + err.message); }
  };

  const switchableUsers = users.filter(u => {
      if (!user) return false;
      if (user.role === RoleLevel.ROOT) return u.id !== user.id;
      return u.role > user.role;
  });

  const handleSwitchAccount = (targetUser: User) => {
      login(targetUser);
      setIsSwitchAccountModalOpen(false);
      alert(`已切换身份为: ${targetUser.username}`);
  };

  const SectionHeader = ({ id, title, icon: Icon, colorClass }: any) => (
    <button onClick={() => toggleSection(id)} className={`w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${openSection === id ? 'rounded-b-none border-b-0' : ''}`}>
      <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${colorClass}`}><Icon className="w-5 h-5 text-white" /></div><span className="font-bold text-lg dark:text-gray-200">{title}</span></div>
      {openSection === id ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
    </button>
  );

  // Pagination Logic
  const visibleUsers = users.filter(u => {
      if (u.id === user?.id && user?.permissions?.hideSelf) return false;
      const isLower = u.role > (user?.role || RoleLevel.GUEST);
      const isPeer = u.role === (user?.role || RoleLevel.GUEST);
      return user?.role === RoleLevel.ROOT || isLower || (isPeer && user?.permissions?.allowPeerLevel);
  });
  const paginatedUsers = visibleUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      {showFaceReg && <FaceID onSuccess={handleFaceRegister} onCancel={() => setShowFaceReg(false)} mode='register' />}
      <h2 className="text-2xl font-bold dark:text-white">系统设置</h2>
      
      <div>
        <SectionHeader id="account" title="账户设置" icon={UserIcon} colorClass="bg-blue-500" />
        {openSection === 'account' && (
           <div className="p-6 bg-white dark:bg-gray-800 rounded-b-xl border-x border-b border-gray-100 dark:border-gray-700 animate-slide-down">
             <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-shrink-0 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 flex items-center justify-center text-4xl text-white font-bold shadow-lg mb-3 overflow-hidden">
                        {accountForm.avatar ? (<img src={accountForm.avatar} className="w-full h-full object-cover" />) : (user?.username[0])}
                    </div>
                    <UsernameBadge name={user?.username || ''} roleLevel={user?.role || RoleLevel.STAFF} className="text-lg px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full" />
                    <div className="mt-4 w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs text-gray-500 text-center"><p className="font-mono mb-1 text-gray-400">Supabase ID</p><p className="font-bold text-gray-700 dark:text-gray-300 break-all">{user?.id}</p></div>
                </div>
                <div className="flex-1 space-y-5">
                    <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">用户名</label><input type="text" value={accountForm.username} onChange={(e) => handleAccountChange('username', e.target.value)} className="w-full p-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                    <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">新密码</label><input type="password" placeholder="如果不修改请留空" value={accountForm.password} onChange={(e) => handleAccountChange('password', e.target.value)} className="w-full p-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">人脸识别设置</label>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                            {(accountForm.face_descriptor && accountForm.face_descriptor.length > 0) ? (<span className="flex items-center gap-2 text-green-600 font-medium"><Shield className="w-4 h-4"/> 已录入人脸数据</span>) : (<span className="flex items-center gap-2 text-gray-500 font-medium"><AlertCircle className="w-4 h-4"/> 未录入人脸</span>)}
                            <button onClick={() => setShowFaceReg(true)} className="text-sm text-blue-600 hover:underline font-bold">{(accountForm.face_descriptor && accountForm.face_descriptor.length > 0) ? '重新录入' : '立即录入'}</button>
                        </div>
                    </div>
                    <button onClick={handleSaveAccount} disabled={!isAccountDirty} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isAccountDirty ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transform active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'}`}><Save className="w-5 h-5" /> 保存修改</button>
                </div>
             </div>
             <div className="mt-8 pt-6 border-t dark:border-gray-700 grid grid-cols-2 gap-4">
                <button onClick={() => setIsSwitchAccountModalOpen(true)} className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 font-bold flex items-center justify-center gap-2 text-gray-700 dark:text-gray-200"><RefreshCcw className="w-5 h-5"/> 切换账号</button>
                <button onClick={logout} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 font-bold flex items-center justify-center gap-2"><Trash2 className="w-5 h-5"/> 退出登录</button>
             </div>
           </div>
        )}
      </div>

      {isSwitchAccountModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
                  <button onClick={() => setIsSwitchAccountModalOpen(false)} className="absolute top-4 right-4 text-gray-500"><X className="w-5 h-5"/></button>
                  <h3 className="text-lg font-bold mb-4">切换身份</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {switchableUsers.length > 0 ? (switchableUsers.map(u => (
                              <button key={u.id} onClick={() => handleSwitchAccount(u)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700">
                                  <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{u.role}</div><UsernameBadge name={u.username} roleLevel={u.role} /></div>
                                  <ArrowRight className="w-4 h-4 text-gray-400"/>
                              </button>
                          ))) : (<div className="text-center py-4 text-gray-400">没有可切换的低权限账号</div>)}
                  </div>
              </div>
          </div>
      )}

      {!user?.permissions?.hideSettings && (
        <div>
            <SectionHeader id="permissions" title="权限设置" icon={Shield} colorClass="bg-purple-500" />
            {openSection === 'permissions' && (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-b-xl border-x border-b border-gray-100 dark:border-gray-700 animate-slide-down">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-700 dark:text-gray-300">用户列表管理</h3>
                    {(user?.role === RoleLevel.ROOT || user?.permissions?.allowPeerLevel) && (<button onClick={handleCreateUser} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-purple-700"><Plus className="w-4 h-4" /> 新建用户</button>)}
                </div>
                <div className="space-y-3">
                    {paginatedUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                            <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold font-mono">{u.role}</div><div><UsernameBadge name={u.username} roleLevel={u.role} /><p className="text-xs text-gray-500">{getPermissionDesc(u.role)}</p></div></div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEditUser(u)} className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg shadow-sm"><Edit className="w-4 h-4 text-blue-500" /></button>
                                {user?.id !== u.id && user?.role !== u.role && <button onClick={() => handleDeleteUser(u.id)} className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg shadow-sm"><Trash2 className="w-4 h-4 text-red-500" /></button>}
                            </div>
                        </div>
                    ))}
                </div>
                <Pagination current={currentPage} total={visibleUsers.length} pageSize={pageSize} onChange={setCurrentPage} />
                
                <UserEditModal 
                    isOpen={isEditModalOpen} 
                    onClose={() => setIsEditModalOpen(false)} 
                    targetUser={editingUser} 
                    currentUser={user}
                    onUpdate={reloadData}
                />
            </div>
            )}
        </div>
      )}

      <div>
        <SectionHeader id="theme" title="应用主题" icon={Palette} colorClass="bg-orange-500" />
        {openSection === 'theme' && (
           <div className="p-6 bg-white dark:bg-gray-800 rounded-b-xl border-x border-b border-gray-100 dark:border-gray-700 animate-slide-down">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {THEMES.map((t) => (
                  <button key={t.mode} onClick={() => setTheme(t.mode)} className={`relative p-4 rounded-xl border-2 transition-all overflow-hidden ${theme === t.mode ? 'border-orange-500 shadow-lg scale-105' : 'border-transparent bg-gray-100 dark:bg-gray-700'}`}>
                    <div className="w-full h-12 rounded mb-2 shadow-inner" style={{ background: t.bg }}><div className="h-full w-1/2 opacity-20 bg-black"></div></div>
                    <span className="text-sm font-bold block text-center" style={{ color: t.mode.includes('prism') ? '#D65D0E' : 'inherit'}}>{t.name}</span>
                    {theme === t.mode && <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full"></div>}
                  </button>
                ))}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
