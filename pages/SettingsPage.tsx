
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, User as UserIcon, Shield, Palette, Plus, Edit, Trash2, X, Save, RefreshCcw, ArrowRight, AlertCircle, ChevronLeft, ChevronRight, UserCheck, Lock, Eye, EyeOff, Layout, FileText, Database, Settings } from 'lucide-react';
import { THEMES } from '../constants';
import { RoleLevel, User, UserPermissions, LogPermissionLevel } from '../types';
import { useApp } from '../App';
import UsernameBadge from '../components/UsernameBadge';
import FaceID from '../components/FaceID';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase';

// 13. Pagination Component
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

// --- Section 21: User Edit Modal (Permission Matrix) ---
const UserEditModal = ({ user: editingUser, onClose, onSave, currentUser }: { user: User, onClose: () => void, onSave: (u: User) => void, currentUser: User }) => {
    const [form, setForm] = useState<User>({ ...editingUser, permissions: { ...editingUser.permissions } });
    const isSelf = form.id === currentUser.id;
    
    // Role selection logic: can only assign roles <= current user's role (numeric value >= current user's role)
    const allowedRoles = Object.values(RoleLevel).filter(r => r >= currentUser.role);

    const handlePermissionChange = (key: keyof UserPermissions, value: any) => {
        setForm(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [key]: value }
        }));
    };

    const getRoleLabel = (r: RoleLevel) => {
        switch(r) {
            case RoleLevel.ROOT: return '00 - 超级管理员';
            case RoleLevel.BOSS: return '01 - SVIP';
            case RoleLevel.FRONT_DESK: return '02 - VIP';
            default: return r;
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl h-[90vh] rounded-2xl shadow-2xl p-6 relative flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Shield className="w-6 h-6 text-purple-500" /> 用户权限配置
                    </h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-gray-500" /></button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                    {/* 21.3.1.1 Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-500 mb-1">用户 ID (不可修)</label>
                            <input disabled value={form.id} className="w-full p-2 rounded border bg-gray-100 dark:bg-gray-700 dark:border-gray-600 text-gray-500 cursor-not-allowed font-mono text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-500 mb-1">用户名</label>
                            <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-500 mb-1">登录密码</label>
                            <input value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 outline-none" placeholder="******" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-500 mb-1">管理权限等级</label>
                            <select 
                                value={form.role} 
                                onChange={e => setForm({...form, role: e.target.value as RoleLevel})}
                                className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 outline-none"
                                disabled={isSelf && currentUser.role !== RoleLevel.ROOT} // Prevent locking oneself out unless root
                            >
                                {allowedRoles.map(r => (
                                    <option key={r} value={r}>{getRoleLabel(r)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 21.3.1.2 Permission Matrix */}
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl space-y-4">
                        <h4 className="font-bold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 pb-2">权限矩阵</h4>
                        
                        {/* 1. Log Permissions */}
                        <div>
                            <label className="block text-sm font-bold text-gray-500 mb-2">日志权限等级</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { k: 'A', label: 'A级 (查看所有+任意撤销)' },
                                    { k: 'B', label: 'B级 (查看所有+撤销低级)' },
                                    { k: 'C', label: 'C级 (查看所有+撤销自己)' },
                                    { k: 'D', label: 'D级 (仅看自己+撤销自己)' },
                                ].map(opt => (
                                    <label key={opt.k} className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${form.permissions?.logPermission === opt.k ? 'bg-blue-50 border-blue-500' : 'hover:bg-white dark:hover:bg-gray-700 border-transparent'}`}>
                                        <input 
                                            type="radio" 
                                            name="logPerm" 
                                            checked={form.permissions?.logPermission === opt.k} 
                                            onChange={() => handlePermissionChange('logPermission', opt.k)}
                                        />
                                        <span className="text-sm">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 2. Feature Hiding Toggles */}
                        <div>
                            <label className="block text-sm font-bold text-gray-500 mb-2">功能隐藏配置 (勾选以隐藏)</label>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border dark:border-gray-600 cursor-pointer">
                                    <input type="checkbox" checked={form.permissions?.hideAuditHall} onChange={e => handlePermissionChange('hideAuditHall', e.target.checked)} />
                                    <span className="text-sm">隐藏审计大厅</span>
                                </label>
                                <label className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border dark:border-gray-600 cursor-pointer">
                                    <input type="checkbox" checked={form.permissions?.hideStoreEdit} onChange={e => handlePermissionChange('hideStoreEdit', e.target.checked)} />
                                    <span className="text-sm">隐藏门店“修改”按钮</span>
                                </label>
                                <label className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border dark:border-gray-600 cursor-pointer">
                                    <input type="checkbox" checked={form.permissions?.hideNewStore} onChange={e => handlePermissionChange('hideNewStore', e.target.checked)} />
                                    <span className="text-sm">隐藏“新建门店”页面</span>
                                </label>
                                <label className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border dark:border-gray-600 cursor-pointer">
                                    <input type="checkbox" checked={form.permissions?.hideExcelExport} onChange={e => handlePermissionChange('hideExcelExport', e.target.checked)} />
                                    <span className="text-sm">隐藏“Excel 导出”</span>
                                </label>
                                <label className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border dark:border-gray-600 cursor-pointer">
                                    <input type="checkbox" checked={form.permissions?.hideSettings} onChange={e => handlePermissionChange('hideSettings', e.target.checked)} />
                                    <span className="text-sm">隐藏“权限设置”入口</span>
                                </label>
                            </div>
                        </div>

                        {/* 3. Visibility */}
                        <div>
                            <label className="block text-sm font-bold text-gray-500 mb-2">列表可见性</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.permissions?.allowPeerLevel} onChange={e => handlePermissionChange('allowPeerLevel', e.target.checked)} />
                                    <span className="text-sm">允许查看/管理同级用户</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.permissions?.hideSelf} onChange={e => handlePermissionChange('hideSelf', e.target.checked)} />
                                    <span className="text-sm">在列表中隐藏自己</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold text-gray-600 dark:text-gray-300">取消</button>
                    <button onClick={() => onSave(form)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg">保存配置</button>
                </div>
            </div>
        </div>
    );
};

// --- Main Settings Page ---
const SettingsPage = () => {
  const { theme, setTheme, user, login, logout, users, setUsers, reloadData } = useApp();
  const [openSection, setOpenSection] = useState<string | null>('account');
  const [showFaceReg, setShowFaceReg] = useState(false);
  
  // Section 20: Account Settings State
  const [accountForm, setAccountForm] = useState({ username: '', password: '', avatar: '', face_descriptor: [] as number[] });
  const [isAccountDirty, setIsAccountDirty] = useState(false);
  const [isSwitchAccountOpen, setIsSwitchAccountOpen] = useState(false);

  // Section 21: Permission Settings State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userPage, setUserPage] = useState(1);
  const userPageSize = 10;

  // Initialize Account Form
  useEffect(() => {
      if (user) {
          const currentUserData = users.find(u => u.id === user.id) || user;
          setAccountForm({ 
              username: currentUserData.username, 
              password: currentUserData.password || '', 
              avatar: currentUserData.avatar || '', 
              face_descriptor: currentUserData.face_descriptor || [] 
          });
          setIsAccountDirty(false);
      }
  }, [user, users]);

  // Handlers for Account Settings
  const handleAccountChange = (key: string, value: any) => {
      setAccountForm(prev => ({ ...prev, [key]: value }));
      setIsAccountDirty(true);
  };

  const handleSaveAccount = async () => {
      if (!user) return;
      try {
          await supabase.from('users').update({
              username: accountForm.username,
              password: accountForm.password,
              face_descriptor: accountForm.face_descriptor
          }).eq('id', user.id);
          await reloadData();
          setIsAccountDirty(false);
          alert("账户信息已更新");
      } catch (e: any) { alert("保存失败: " + e.message); }
  };

  const handleFaceRegister = (descriptor?: number[]) => {
      if (descriptor) {
          handleAccountChange('face_descriptor', descriptor);
          alert("人脸数据已录入，请点击保存生效。");
      }
      setShowFaceReg(false);
  };

  const handleSwitchAccount = (targetUser: User) => {
      login(targetUser);
      setIsSwitchAccountOpen(false);
      window.location.reload(); // Refresh to ensure clean state transition
  };

  // Handlers for Permission Settings
  const handleUserSave = async (u: User) => {
      try {
          // If creating new user
          if (u.id.startsWith('new_')) {
              await supabase.from('users').insert({
                  id: `u_${Date.now()}`,
                  username: u.username,
                  password: u.password,
                  role: u.role,
                  permissions: u.permissions,
                  store_id: user?.storeId // Inherit store for now
              });
          } else {
              await supabase.from('users').update({
                  username: u.username,
                  password: u.password,
                  role: u.role,
                  permissions: u.permissions
              }).eq('id', u.id);
          }
          await reloadData();
          setEditingUser(null);
      } catch (e: any) { alert("操作失败: " + e.message); }
  };

  const handleUserDelete = async (u: User) => {
      if (!window.confirm(`确定要删除用户 "${u.username}" 吗？此操作不可恢复。`)) return;
      try {
          await supabase.from('users').delete().eq('id', u.id);
          await reloadData();
      } catch (e: any) { alert("删除失败: " + e.message); }
  };

  // Filter Users Logic (21.2)
  const filteredUsers = users.filter(u => {
      if (!user) return false;
      // Requirement: Show lower or equal (if allowed)
      const isLower = u.role > user.role; // Larger number = lower role
      const isPeer = u.role === user.role;
      const isSelf = u.id === user.id;

      if (isSelf && user.permissions?.hideSelf) return false;
      if (isPeer && !user.permissions?.allowPeerLevel && !isSelf) return false;
      
      // Basic rule: can see self, lower, and peer (if allowed)
      return isLower || isSelf || (isPeer && user.permissions?.allowPeerLevel);
  });

  const paginatedUsers = filteredUsers.slice((userPage - 1) * userPageSize, userPage * userPageSize);

  const toggleSection = (id: string) => setOpenSection(openSection === id ? null : id);

  const SectionHeader = ({ id, title, icon: Icon, colorClass }: any) => (
    <button onClick={() => toggleSection(id)} className={`w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${openSection === id ? 'rounded-b-none border-b-0' : ''}`}>
      <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${colorClass}`}><Icon className="w-5 h-5 text-white" /></div><span className="font-bold text-lg dark:text-gray-200">{title}</span></div>
      {openSection === id ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
    </button>
  );

  return (
    <div id="printable-content" className="space-y-6 animate-fade-in-up pb-20">
      {showFaceReg && <FaceID onSuccess={handleFaceRegister} onCancel={() => setShowFaceReg(false)} mode='register' />}
      {editingUser && user && <UserEditModal user={editingUser} currentUser={user} onClose={() => setEditingUser(null)} onSave={handleUserSave} />}
      
      {/* Switch Account Modal */}
      {isSwitchAccountOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm p-6 rounded-2xl shadow-xl">
                  <h3 className="font-bold mb-4">切换账户</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                      {users.filter(u => u.role > (user?.role || RoleLevel.GUEST)).map(u => (
                          <button key={u.id} onClick={() => handleSwitchAccount(u)} className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-left">
                              <UsernameBadge name={u.username} roleLevel={u.role} />
                              <ChevronRight className="w-4 h-4 text-gray-400"/>
                          </button>
                      ))}
                      {users.filter(u => u.role > (user?.role || RoleLevel.GUEST)).length === 0 && <p className="text-gray-400 text-center">无低级账户可切换</p>}
                  </div>
                  <button onClick={() => setIsSwitchAccountOpen(false)} className="mt-4 w-full py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">取消</button>
              </div>
          </div>
      )}

      <h2 className="text-2xl font-bold dark:text-white">系统设置</h2>
      
      {/* 20. Account Settings */}
      <div>
        <SectionHeader id="account" title="账户设置" icon={UserIcon} colorClass="bg-blue-500" />
        {openSection === 'account' && (
           <div className="p-6 bg-white dark:bg-gray-800 rounded-b-xl border-x border-b border-gray-100 dark:border-gray-700 animate-slide-down">
             <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-500 mb-1">用户名</label>
                        <input value={accountForm.username} onChange={e => handleAccountChange('username', e.target.value)} className="w-full p-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 mb-1">密码</label>
                        <div className="flex gap-2">
                            <input type="password" value={accountForm.password} onChange={e => handleAccountChange('password', e.target.value)} className="flex-1 p-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 mb-1">人脸识别</label>
                        <button onClick={() => setShowFaceReg(true)} className={`w-full p-3 rounded-xl border flex items-center justify-center gap-2 ${accountForm.face_descriptor?.length ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200'}`}>
                            {accountForm.face_descriptor?.length ? <UserCheck className="w-5 h-5"/> : <UserIcon className="w-5 h-5"/>}
                            {accountForm.face_descriptor?.length ? '已录入 (点击重新录入)' : '点击录入'}
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 mb-1">用户 ID (只读)</label>
                        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-mono text-sm text-gray-500 overflow-hidden text-ellipsis">{user?.id}</div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
                    <button onClick={() => setIsSwitchAccountOpen(true)} className="flex items-center gap-2 text-blue-600 font-bold hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors">
                        <RefreshCcw className="w-4 h-4"/> 切换账户
                    </button>
                    
                    <div className="flex gap-3">
                        <button onClick={logout} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors">退出登录</button>
                        <button 
                            onClick={handleSaveAccount} 
                            disabled={!isAccountDirty}
                            className={`px-6 py-2 rounded-xl font-bold shadow-lg transition-all ${isAccountDirty ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            保存
                        </button>
                    </div>
                </div>
             </div>
           </div>
        )}
      </div>

      {/* 21. Permission Settings */}
      {!user?.permissions?.hideSettings && (
        <div>
            <SectionHeader id="permissions" title="权限设置" icon={Shield} colorClass="bg-purple-500" />
            {openSection === 'permissions' && (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-b-xl border-x border-b border-gray-100 dark:border-gray-700 animate-slide-down">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-700 dark:text-gray-300">用户管理列表</h3>
                    <button 
                        onClick={() => setEditingUser({ id: `new_${Date.now()}`, username: '', password: '', role: RoleLevel.STAFF, permissions: { logPermission: 'D' } } as User)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 font-bold text-sm"
                    >
                        <Plus className="w-4 h-4"/> 新建用户
                    </button>
                </div>
                <div className="space-y-3">
                    {paginatedUsers.map(u => (
                        <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold font-mono shadow-inner">{u.role}</div>
                                <div>
                                    <div className="flex items-center gap-2"><UsernameBadge name={u.username} roleLevel={u.role} /></div>
                                    <div className="text-xs text-gray-400 font-mono mt-0.5 max-w-[100px] truncate">{u.id}</div>
                                </div>
                            </div>
                            
                            {/* 21.3 Buttons */}
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setEditingUser(u)} className="px-3 py-1.5 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg text-sm font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-1 shadow-sm">
                                    <Settings className="w-4 h-4"/> 设置
                                </button>
                                <button onClick={() => handleUserDelete(u)} className="px-3 py-1.5 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-1 shadow-sm">
                                    <Trash2 className="w-4 h-4"/> 删除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <Pagination current={userPage} total={filteredUsers.length} pageSize={userPageSize} onChange={setUserPage} />
            </div>
            )}
        </div>
      )}
      
      {/* 33. Theme Settings (Simplified for brevity as it was correct) */}
      <div>
        <SectionHeader id="theme" title="应用主题" icon={Palette} colorClass="bg-pink-500" />
        {openSection === 'theme' && (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-b-xl border-x border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 animate-slide-down">
                {THEMES.map(t => (
                    <button key={t.mode} onClick={() => setTheme(t.mode)} className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${theme === t.mode ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent bg-gray-100 dark:bg-gray-700'}`}>
                        <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: t.bg }}></div>
                        <span className="font-bold text-sm" style={{ color: t.mode.includes('dark') ? '#fff' : '#333' }}>{t.name}</span>
                    </button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
