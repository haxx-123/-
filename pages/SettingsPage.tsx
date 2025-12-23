
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, User as UserIcon, Shield, Palette, Plus, Edit, Trash2, X, Save, RefreshCcw, ArrowRight, AlertCircle } from 'lucide-react';
import { THEMES } from '../constants';
import { RoleLevel, User, UserPermissions } from '../types';
import { useApp } from '../App';
import UsernameBadge from '../components/UsernameBadge';
import CameraModal from '../components/CameraModal';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase';

const SettingsPage = () => {
  const { theme, setTheme, user, login, logout, setPageActions, users, setUsers, reloadData } = useApp();
  const [openSection, setOpenSection] = useState<string | null>('account');
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSwitchAccountModalOpen, setIsSwitchAccountModalOpen] = useState(false);
  const [showFaceReg, setShowFaceReg] = useState(false);

  const [accountForm, setAccountForm] = useState({
      username: '',
      password: '',
      avatar: '',
  });
  const [isAccountDirty, setIsAccountDirty] = useState(false);

  useEffect(() => {
      if (user) {
          const currentUserData = users.find(u => u.id === user.id) || user;
          setAccountForm({
              username: currentUserData.username,
              password: '', 
              avatar: currentUserData.avatar || '',
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
          const updates: any = {
              username: accountForm.username,
              avatar: accountForm.avatar
          };
          if (accountForm.password) {
              updates.password = accountForm.password;
          }

          const { error } = await supabase.from('users').update(updates).eq('id', user.id);
          if (error) throw error;

          await reloadData();
          alert('账户信息已更新');
          setIsAccountDirty(false);
          
          // Re-login to update local state context
          const updatedUser = users.find(u => u.id === user.id);
          if (updatedUser) login({...updatedUser, ...updates});

      } catch (err: any) {
          alert('保存失败: ' + err.message);
      }
  };

  const handleFaceRegister = (base64: string) => {
      setAccountForm(prev => ({ ...prev, avatar: base64 }));
      setIsAccountDirty(true);
      setShowFaceReg(false);
  };

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  const handleEditUser = (u: User) => {
    const freshUser = users.find(existing => existing.id === u.id) || u;
    setEditingUser(JSON.parse(JSON.stringify(freshUser)));
    setIsEditModalOpen(true);
  };

  const handleCreateUser = () => {
    setEditingUser({ 
        id: `u_${Date.now()}`, 
        username: 'New User', 
        password: '123', // Default password
        role: RoleLevel.STAFF, 
        permissions: {
            logPermission: 'D' 
        } 
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = async (targetUserId: string) => {
      if (!window.confirm("确定要删除该用户吗？此操作不可撤销。")) return;
      try {
          const { error } = await supabase.from('users').delete().eq('id', targetUserId);
          if (error) throw error;
          await reloadData();
          alert("用户已删除");
      } catch (err: any) {
          alert("删除失败: " + err.message);
      }
  };

  const savePermissionUser = async () => {
    if (editingUser) {
      // Logic constraint: Cannot save if editing existing peer user (unless self or root)
      const isPeer = user?.role === editingUser.role && user?.id !== editingUser.id;
      const isNew = !users.some(u => u.id === editingUser.id);
      const isRoot = user?.role === RoleLevel.ROOT;

      if (isPeer && !isNew && !isRoot) {
          alert("权限不足：同级用户不可修改，仅可查看。");
          return;
      }

      if (!window.confirm("是否确定保存，立刻生效？")) return;

      try {
          // Prepare payload for Supabase
          const payload = {
              id: editingUser.id,
              username: editingUser.username,
              password: editingUser.password, // Be careful in real apps
              role: editingUser.role,
              permissions: editingUser.permissions || {},
              avatar: editingUser.avatar || ''
          };

          const { error } = await supabase.from('users').upsert(payload);
          if (error) throw error;

          await reloadData();
          
          if (user && editingUser.id === user.id) {
              // Update self session
              login(editingUser);
          }

          setIsEditModalOpen(false);
          setEditingUser(null);
          alert("保存成功");

      } catch (err: any) {
          alert("保存失败: " + err.message);
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

  // Helper for inline update of editing user
  const updateEditingPermission = (key: keyof UserPermissions, value: any) => {
    if (!editingUser) return;
    const permissions = editingUser.permissions || {};
    setEditingUser({
        ...editingUser,
        permissions: { ...permissions, [key]: value }
    });
  };

  const UserEditModal = () => {
    if (!isEditModalOpen || !editingUser) return null;
    
    // Check if creating new user or editing existing
    const isNewUser = !users.some(u => u.id === editingUser.id);
    const isSelf = user?.id === editingUser.id;
    const isRoot = user?.role === RoleLevel.ROOT;
    const isPeer = user?.role === editingUser.role;
    
    // Permission Logic for UI
    const canModify = isRoot || isSelf || isNewUser || (!isPeer && user && user.role < editingUser.role);
    const canSeePassword = isRoot || isSelf || isNewUser; // Peer cannot see password of existing user

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
         <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 text-gray-500"><X className="w-5 h-5"/></button>
            <h3 className="text-xl font-bold mb-6 dark:text-white">
                {isNewUser ? '新建用户' : '编辑用户'}
                {!canModify && <span className="ml-3 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded border border-yellow-200">仅查看模式</span>}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                    <h4 className="font-bold text-gray-700 dark:text-gray-300 border-b pb-2 flex items-center gap-2"><UserIcon className="w-4 h-4"/> 基础信息</h4>
                    <div><label className="block text-sm font-medium mb-1 text-gray-500">用户 ID (不可修改)</label><div className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 font-mono text-xs break-all">{editingUser.id}</div></div>
                    <div>
                        <label className="block text-sm font-medium mb-1">用户名</label>
                        <input 
                            type="text" 
                            value={editingUser.username} 
                            onChange={e => setEditingUser({...editingUser, username: e.target.value})} 
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                            disabled={!canModify}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">登录密码 (管理员可重置)</label>
                        <input 
                            type="text" 
                            value={canSeePassword ? (editingUser.password || '') : '******'} 
                            onChange={e => setEditingUser({...editingUser, password: e.target.value})} 
                            placeholder="设置密码" 
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 font-mono disabled:opacity-50 disabled:bg-gray-100"
                            disabled={!canModify} // Peer cannot modify password
                        />
                        {!canSeePassword && <p className="text-xs text-gray-400 mt-1">* 密码已隐藏</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">角色等级 (00-09)</label>
                        <select 
                            value={editingUser.role} 
                            onChange={e => setEditingUser({...editingUser, role: e.target.value as RoleLevel})} 
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 disabled:opacity-50"
                            disabled={!canModify}
                        >
                            {Object.values(RoleLevel).map(r => {
                                // Logic: ROOT sees all. Others see roles lower than themselves OR equal if allowPeerLevel is on.
                                const canSelect = isRoot || (user && r > user.role) || (user?.permissions?.allowPeerLevel && r === user.role);
                                return canSelect && (<option key={r} value={r}>{r}</option>);
                            })}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">{getPermissionDesc(editingUser.role)}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <h4 className="font-bold text-gray-700 dark:text-gray-300 border-b pb-2 flex items-center gap-2"><Shield className="w-4 h-4"/> 权限矩阵配置 (独立控制)</h4>
                    <p className="text-xs text-gray-400">以下开关独立于角色等级，严格控制功能入口。</p>
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border dark:border-gray-600">
                        <label className="block text-sm font-bold mb-2 text-blue-600 dark:text-blue-400">日志操作权限 (Log Permission)</label>
                        <div className="space-y-2">
                            {[{ val: 'A', label: 'A级: 查看所有 / 任意撤销 (最高)' }, { val: 'B', label: 'B级: 查看所有 / 仅撤销低级 (受限)' }, { val: 'C', label: 'C级: 查看所有 / 仅撤销自己' }, { val: 'D', label: 'D级: 仅查看自己 / 仅撤销自己 (最低)' }].map(opt => (
                                <label key={opt.val} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-white dark:hover:bg-gray-600 transition-colors">
                                    <input 
                                        type="radio" 
                                        name="logPermission" 
                                        checked={(editingUser.permissions?.logPermission || 'D') === opt.val} 
                                        onChange={() => updateEditingPermission('logPermission', opt.val)} 
                                        className="text-blue-600 focus:ring-blue-500"
                                        disabled={!canModify}
                                    />
                                    <span className={`text-sm ${!canModify ? 'opacity-50' : ''}`}>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2 text-red-500">功能隐藏开关 (选中即隐藏)</label>
                        <div className="grid grid-cols-1 gap-2">
                            {[{ key: 'hideAuditHall', label: '隐藏“审计大厅”页面' }, { key: 'hideStoreEdit', label: '隐藏门店“修改”按钮' }, { key: 'hideNewStore', label: '隐藏“新建门店”页面' }, { key: 'hideExcelExport', label: '隐藏“Excel导出”图标' }, { key: 'hideSettings', label: '隐藏“权限设置”页面入口' }].map(item => (
                                <label key={item.key} className={`flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${!canModify ? 'opacity-70 pointer-events-none' : ''}`}>
                                    <span className="text-sm">{item.label}</span>
                                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                        <input type="checkbox" checked={!!editingUser.permissions?.[item.key as keyof UserPermissions]} onChange={(e) => updateEditingPermission(item.key as keyof UserPermissions, e.target.checked)} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-5" disabled={!canModify}/>
                                        <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${editingUser.permissions?.[item.key as keyof UserPermissions] ? 'bg-red-500' : 'bg-gray-300'}`}></label>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">列表可见性范围</label>
                        <div className="flex flex-col gap-2">
                            <label className={`flex items-center gap-2 text-sm p-1 ${!canModify ? 'opacity-70' : ''}`}><input type="checkbox" checked={editingUser.permissions?.allowPeerLevel} onChange={e => updateEditingPermission('allowPeerLevel', e.target.checked)} className="rounded" disabled={!canModify}/>允许查看/创建同级用户 (例如 03 可见 03)</label>
                            <label className={`flex items-center gap-2 text-sm p-1 ${!canModify ? 'opacity-70' : ''}`}><input type="checkbox" checked={!editingUser.permissions?.hideSelf} onChange={e => updateEditingPermission('hideSelf', !e.target.checked)} className="rounded" disabled={!canModify}/>在列表中显示自己</label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-4 border-t dark:border-gray-700 flex justify-between items-center">
               <div className="text-xs text-gray-400 flex items-center gap-1"><Trash2 className="w-3 h-3"/> * 删除模式：直接从数据库物理删除。</div>
               <div className="flex gap-3">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">取消</button>
                    {canModify && <button onClick={savePermissionUser} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-colors">保存配置</button>}
               </div>
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      {showFaceReg && <CameraModal onCapture={handleFaceRegister} onClose={() => setShowFaceReg(false)} title="录入人脸数据" />}
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
                    <div className="mt-4 w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs text-gray-500 text-center"><p className="font-mono mb-1 text-gray-400">Supabase ID (Read Only)</p><p className="font-bold text-gray-700 dark:text-gray-300 break-all">{user?.id}</p></div>
                </div>
                <div className="flex-1 space-y-5">
                    <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">用户名</label><input type="text" value={accountForm.username} onChange={(e) => handleAccountChange('username', e.target.value)} className="w-full p-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                    <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">新密码</label><input type="password" placeholder="如果不修改请留空" value={accountForm.password} onChange={(e) => handleAccountChange('password', e.target.value)} className="w-full p-3 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">人脸识别设置</label>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                            {accountForm.avatar || user?.avatar ? (<span className="flex items-center gap-2 text-green-600 font-medium"><Shield className="w-4 h-4"/> 已启用保护</span>) : (<span className="flex items-center gap-2 text-gray-500 font-medium"><AlertCircle className="w-4 h-4"/> 未录入人脸</span>)}
                            <button onClick={() => setShowFaceReg(true)} className="text-sm text-blue-600 hover:underline font-bold">{accountForm.avatar || user?.avatar ? '重新录入' : '立即录入'}</button>
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
                  <p className="text-sm text-gray-500 mb-4">只能切换到权限等级低于当前账号的用户。</p>
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
                    <h3 className="font-bold text-gray-700 dark:text-gray-300">用户管理列表</h3>
                    {(user?.role === RoleLevel.ROOT || user?.permissions?.allowPeerLevel) && (<button onClick={handleCreateUser} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-purple-700"><Plus className="w-4 h-4" /> 新建用户</button>)}
                </div>
                <div className="space-y-3">
                    {users.map(u => {
                        if (u.id === user?.id && user?.permissions?.hideSelf) return null;
                        const isLower = u.role > (user?.role || RoleLevel.GUEST);
                        const isPeer = u.role === (user?.role || RoleLevel.GUEST);
                        const canSee = user?.role === RoleLevel.ROOT || isLower || (isPeer && user?.permissions?.allowPeerLevel);
                        if (!canSee) return null;
                        return (
                        <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                            <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold font-mono">{u.role}</div><div><UsernameBadge name={u.username} roleLevel={u.role} /><p className="text-xs text-gray-500">{getPermissionDesc(u.role)}</p></div></div>
                            <div className="flex gap-2">
                                {/* Edit Button visibility based on roles */}
                                {(user?.id === u.id || user?.role === RoleLevel.ROOT || isLower || (isPeer && user?.permissions?.allowPeerLevel)) && (
                                    <>
                                        <button onClick={() => handleEditUser(u)} className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg shadow-sm"><Edit className="w-4 h-4 text-blue-500" /></button>
                                        {user?.id !== u.id && user?.role !== u.role && (
                                            <button onClick={() => handleDeleteUser(u.id)} className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg shadow-sm"><Trash2 className="w-4 h-4 text-red-500" /></button>
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
