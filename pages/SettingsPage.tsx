import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Database, User as UserIcon, Shield, Palette, Plus, Edit, Trash2, X, Save, ScanFace, Lock, RefreshCcw, Eye, EyeOff, LayoutTemplate } from 'lucide-react';
import { THEMES } from '../constants';
import { RoleLevel, User, LogPermissionLevel, UserPermissions } from '../types';
import { useApp } from '../App';
import UsernameBadge from '../components/UsernameBadge';
import * as XLSX from 'xlsx';
import { SUPABASE_URL } from '../supabase';

const SettingsPage = () => {
  const { theme, setTheme, user, login, logout, setPageActions, users, setUsers } = useApp();
  const [openSection, setOpenSection] = useState<string | null>('account');
  
  // Permission Management Local UI State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Account Settings Form State
  const [accountForm, setAccountForm] = useState({
      username: '',
      password: '',
      avatar: '',
  });
  const [isAccountDirty, setIsAccountDirty] = useState(false);

  // Initialize form with current user data
  useEffect(() => {
      if (user) {
          // If the logged-in user details change in global state, update the local form
          const currentUserData = users.find(u => u.id === user.id) || user;
          setAccountForm({
              username: currentUserData.username,
              password: '', 
              avatar: currentUserData.avatar || '',
          });
          setIsAccountDirty(false);
      }
  }, [user, users]);

  // Register Actions for User List
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

  // Check for dirty state
  const handleAccountChange = (field: string, value: string) => {
      setAccountForm(prev => {
          const next = { ...prev, [field]: value };
          setIsAccountDirty(true); 
          return next;
      });
  };

  const handleSaveAccount = () => {
      if (!isAccountDirty || !user) return;
      
      // Update global users state
      const updatedUsers = users.map(u => 
        u.id === user.id ? { ...u, username: accountForm.username } : u
      );
      setUsers(updatedUsers);
      
      // Update current session user
      const updatedUser = updatedUsers.find(u => u.id === user.id);
      if(updatedUser) login(updatedUser);

      alert('账户信息已更新 (已同步至全局状态)');
      setIsAccountDirty(false);
  };

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  // --- Permission Logic ---

  const handleEditUser = (u: User) => {
    // REJECT OLD DATA: Force fetch from global state
    const freshUser = users.find(existing => existing.id === u.id) || u;
    setEditingUser({...freshUser, permissions: freshUser.permissions || {}});
    setIsEditModalOpen(true);
  };

  const handleCreateUser = () => {
    setEditingUser({ 
        id: `new_${Date.now()}`, 
        username: '', 
        role: RoleLevel.STAFF, 
        permissions: {} 
    });
    setIsEditModalOpen(true);
  };

  const savePermissionUser = () => {
    if (editingUser) {
      const exists = users.find(u => u.id === editingUser.id);
      let updatedUsers;
      if (exists) {
        updatedUsers = users.map(u => u.id === editingUser.id ? editingUser : u);
      } else {
        updatedUsers = [...users, editingUser];
      }
      setUsers(updatedUsers);
      setIsEditModalOpen(false);
      setEditingUser(null);
      
      // If editing self, update context
      if (user && editingUser.id === user.id) {
          login(editingUser);
      }
    }
  };

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

  const UserEditModal = () => {
    if (!isEditModalOpen || !editingUser) return null;
    
    const canChangeRole = user?.role === RoleLevel.ROOT || (user?.role && user.role < editingUser.role);
    const permissions = editingUser.permissions || {};

    const updatePermission = (key: keyof UserPermissions, value: any) => {
        setEditingUser({
            ...editingUser,
            permissions: { ...permissions, [key]: value }
        });
    };

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
         <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 text-gray-500"><X className="w-5 h-5"/></button>
            <h3 className="text-xl font-bold mb-6 dark:text-white">{users.some(u => u.id === editingUser.id) ? '编辑用户' : '新建用户'}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Col: Basic Info */}
                <div className="space-y-5">
                    <h4 className="font-bold text-gray-700 dark:text-gray-300 border-b pb-2 flex items-center gap-2">
                        <UserIcon className="w-4 h-4"/> 基础信息
                    </h4>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-500">用户 ID (不可修改)</label>
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 font-mono text-xs break-all">{editingUser.id}</div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">用户名</label>
                        <input 
                            type="text" 
                            value={editingUser.username} 
                            onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">登录密码</label>
                        <input 
                            type="password" 
                            placeholder="******** (如不修改请留空)"
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">权限等级 (00-09)</label>
                        {canChangeRole ? (
                            <select 
                            value={editingUser.role} 
                            onChange={e => setEditingUser({...editingUser, role: e.target.value as RoleLevel})}
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500"
                            >
                            {Object.values(RoleLevel).map(r => (
                                // Logic: Show options strictly lower than current logged-in user, unless Root
                                (user?.role === RoleLevel.ROOT || r > (user?.role || RoleLevel.GUEST)) && (
                                    <option key={r} value={r}>{r}</option>
                                )
                            ))}
                            </select>
                        ) : (
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-500">{editingUser.role} (权限不足，不可修改)</div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{getPermissionDesc(editingUser.role)}</p>
                    </div>
                </div>

                {/* Right Col: Permission Matrix */}
                <div className="space-y-6">
                    <h4 className="font-bold text-gray-700 dark:text-gray-300 border-b pb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4"/> 权限矩阵配置
                    </h4>
                    
                    {/* Log Levels */}
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border dark:border-gray-600">
                        <label className="block text-sm font-bold mb-2 text-blue-600 dark:text-blue-400">日志操作权限</label>
                        <div className="space-y-2">
                            {[
                                { val: 'A', label: 'A级: 查看所有，任意撤销 (最高)' },
                                { val: 'B', label: 'B级: 查看所有，仅撤销低级 (受限)' },
                                { val: 'C', label: 'C级: 查看所有，仅撤销自己 (受限)' },
                                { val: 'D', label: 'D级: 仅查看/撤销自己' },
                            ].map(opt => (
                                <label key={opt.val} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-white dark:hover:bg-gray-600 transition-colors">
                                    <input 
                                        type="radio" 
                                        name="logPermission"
                                        checked={permissions.logPermission === opt.val}
                                        onChange={() => updatePermission('logPermission', opt.val)}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Functional Toggles */}
                    <div>
                        <label className="block text-sm font-bold mb-2 text-red-500">功能隐藏开关 (选中即隐藏)</label>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { key: 'hideAuditHall', label: '隐藏“审计大厅”页面' },
                                { key: 'hideStoreEdit', label: '隐藏门店“修改”按钮' },
                                { key: 'hideNewStore', label: '隐藏“新建门店”页面' },
                                { key: 'hideExcelExport', label: '隐藏“Excel导出”图标' },
                                { key: 'hideSettings', label: '隐藏“权限设置”页面入口' },
                            ].map(item => (
                                <label key={item.key} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    <span className="text-sm">{item.label}</span>
                                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                        <input 
                                            type="checkbox" 
                                            checked={!!permissions[item.key as keyof UserPermissions]}
                                            onChange={(e) => updatePermission(item.key as keyof UserPermissions, e.target.checked)}
                                            className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-5"
                                        />
                                        <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${permissions[item.key as keyof UserPermissions] ? 'bg-red-500' : 'bg-gray-300'}`}></label>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Visibility Scope */}
                    <div>
                        <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">列表可见性范围</label>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 text-sm p-1">
                                <input 
                                    type="checkbox" 
                                    checked={permissions.allowPeerLevel}
                                    onChange={e => updatePermission('allowPeerLevel', e.target.checked)}
                                    className="rounded"
                                />
                                允许查看/创建同级用户 (例如 03 可见 03)
                            </label>
                            <label className="flex items-center gap-2 text-sm p-1">
                                <input 
                                    type="checkbox" 
                                    checked={!permissions.hideSelf}
                                    onChange={e => updatePermission('hideSelf', !e.target.checked)}
                                    className="rounded"
                                />
                                在列表中显示自己
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-4 border-t dark:border-gray-700 flex justify-between items-center">
               <div className="text-xs text-gray-400 flex items-center gap-1">
                   <Trash2 className="w-3 h-3"/>
                   * 删除模式：系统强制执行全员软删除 (逻辑隐藏)，无法物理删除数据。
               </div>
               <div className="flex gap-3">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">取消</button>
                    <button onClick={savePermissionUser} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-colors">保存配置</button>
               </div>
            </div>
         </div>
      </div>
    );
  };

  const SectionHeader = ({ id, title, icon: Icon, colorClass }: any) => (
    <button 
      onClick={() => toggleSection(id)}
      className={`w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${openSection === id ? 'rounded-b-none border-b-0' : ''}`}
    >
      <div className="flex items-center gap-3">
         <div className={`p-2 rounded-lg ${colorClass}`}>
           <Icon className="w-5 h-5 text-white" />
         </div>
         <span className="font-bold text-lg dark:text-gray-200">{title}</span>
      </div>
      {openSection === id ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      <h2 className="text-2xl font-bold dark:text-white">系统设置</h2>
      
      {/* 1. Account Settings */}
      <div>
        <SectionHeader id="account" title="账户设置" icon={UserIcon} colorClass="bg-blue-500" />
        {openSection === 'account' && (
           <div className="p-6 bg-white dark:bg-gray-800 rounded-b-xl border-x border-b border-gray-100 dark:border-gray-700 animate-slide-down">
             <div className="flex flex-col md:flex-row gap-8">
                {/* Profile Card */}
                <div className="flex-shrink-0 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 flex items-center justify-center text-4xl text-white font-bold shadow-lg mb-3">
                        {user?.username[0]}
                    </div>
                    <UsernameBadge name={user?.username || ''} roleLevel={user?.role || RoleLevel.STAFF} className="text-lg px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full" />
                    <div className="mt-4 w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs text-gray-500 text-center">
                        <p className="font-mono mb-1 text-gray-400">Supabase ID (Read Only)</p>
                        <p className="font-bold text-gray-700 dark:text-gray-300 break-all">{user?.id}</p>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="flex-1 space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">用户名</label>
                        <input 
                            type="text" 
                            value={accountForm.username} 
                            onChange={(e) => handleAccountChange('username', e.target.value)} 
                            className="w-full p-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">新密码</label>
                        <input 
                            type="password" 
                            placeholder="如果不修改请留空"
                            value={accountForm.password} 
                            onChange={(e) => handleAccountChange('password', e.target.value)} 
                            className="w-full p-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">人脸识别设置</label>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                            <span className="flex items-center gap-2 text-green-600 font-medium"><Shield className="w-4 h-4"/> 已启用保护</span>
                            <button className="text-sm text-blue-600 hover:underline font-bold">重新录入</button>
                        </div>
                    </div>

                    <button 
                        onClick={handleSaveAccount}
                        disabled={!isAccountDirty}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                            isAccountDirty 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transform active:scale-95' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                        }`}
                    >
                        <Save className="w-5 h-5" /> 保存修改
                    </button>
                </div>
             </div>

             <div className="mt-8 pt-6 border-t dark:border-gray-700 grid grid-cols-2 gap-4">
                <button className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 font-bold flex items-center justify-center gap-2 text-gray-700 dark:text-gray-200">
                    <RefreshCcw className="w-5 h-5"/> 切换账号
                </button>
                <button onClick={logout} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 font-bold flex items-center justify-center gap-2">
                    <Trash2 className="w-5 h-5"/> 退出登录
                </button>
             </div>
           </div>
        )}
      </div>

      {/* 2. Permission Settings */}
      {!user?.permissions?.hideSettings && (
        <div>
            <SectionHeader id="permissions" title="权限设置" icon={Shield} colorClass="bg-purple-500" />
            {openSection === 'permissions' && (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-b-xl border-x border-b border-gray-100 dark:border-gray-700 animate-slide-down">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-700 dark:text-gray-300">用户管理列表</h3>
                    {/* Rule: Can create user if current user is Root(00) OR has allowPeerLevel permissions etc. */}
                    {(user?.role === RoleLevel.ROOT || user?.permissions?.allowPeerLevel) && (
                        <button onClick={handleCreateUser} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-purple-700">
                        <Plus className="w-4 h-4" /> 新建用户
                        </button>
                    )}
                </div>
                <div className="space-y-3">
                    {users.map(u => {
                        // Visibility Logic
                        if (u.id === user?.id && user?.permissions?.hideSelf) return null;
                        
                        return (
                        <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold font-mono">{u.role}</div>
                                <div>
                                    <UsernameBadge name={u.username} roleLevel={u.role} />
                                    <p className="text-xs text-gray-500">{getPermissionDesc(u.role)}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {/* Logic: Can edit self, or if user is Root, or if current user role < target user role (strictly higher authority) */}
                                {(user?.id === u.id || user?.role === RoleLevel.ROOT || (user?.role && user.role < u.role)) && (
                                    <>
                                        <button onClick={() => handleEditUser(u)} className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg shadow-sm"><Edit className="w-4 h-4 text-blue-500" /></button>
                                        {/* Force Soft Delete - Icon implies delete but logic will be soft */}
                                        {user?.id !== u.id && (
                                            <button className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg shadow-sm"><Trash2 className="w-4 h-4 text-red-500" /></button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        );
                    })}
                </div>
                <UserEditModal />
            </div>
            )}
        </div>
      )}

      {/* 3. Connection Config (Only 00) */}
      <div>
        <SectionHeader id="connection" title="连接配置" icon={Database} colorClass="bg-red-500" />
        {openSection === 'connection' && (
          <div className="p-6 bg-white dark:bg-gray-800 rounded-b-xl border-x border-b border-gray-100 dark:border-gray-700 animate-slide-down">
             {user?.role === RoleLevel.ROOT ? (
               <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg overflow-x-auto">
                 <p className="opacity-50">// System Status: Online</p>
                 <p>SUPABASE_URL = "{SUPABASE_URL}"</p>
                 <p className="text-yellow-400">SQL_SYNC: No changes detected.</p>
                 <p className="text-gray-500 mt-2">// SQL是否必须包含重置数据库: 否</p>
                 <button className="mt-2 px-3 py-1 bg-green-900/50 border border-green-700 text-xs rounded hover:bg-green-800">Force Sync</button>
               </div>
             ) : (
               <div className="text-center py-8 text-gray-400">
                 <Shield className="w-12 h-12 mx-auto mb-2 opacity-20" />
                 <p>您没有权限查看连接配置 (需要 00 权限)</p>
               </div>
             )}
          </div>
        )}
      </div>

      {/* 4. App Theme */}
      <div>
        <SectionHeader id="theme" title="应用主题" icon={Palette} colorClass="bg-orange-500" />
        {openSection === 'theme' && (
           <div className="p-6 bg-white dark:bg-gray-800 rounded-b-xl border-x border-b border-gray-100 dark:border-gray-700 animate-slide-down">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {THEMES.map((t) => (
                  <button
                    key={t.mode}
                    onClick={() => setTheme(t.mode)}
                    className={`relative p-4 rounded-xl border-2 transition-all overflow-hidden ${theme === t.mode ? 'border-orange-500 shadow-lg scale-105' : 'border-transparent bg-gray-100 dark:bg-gray-700'}`}
                  >
                    <div className="w-full h-12 rounded mb-2 shadow-inner" style={{ background: t.bg }}>
                       <div className="h-full w-1/2 opacity-20 bg-black"></div>
                    </div>
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