
import React, { useState } from 'react';
import { X, Trash2, Edit3, Send, AlertCircle, Bold, Italic, Underline, Image as ImageIcon, Link, AlignLeft, AlignCenter, AlignRight, Users, Filter, ArrowLeft, MoreHorizontal, Eye, CheckCircle } from 'lucide-react';
import { Announcement, RoleLevel, AnnouncementFrequency } from '../types';
import { useApp } from '../App';
import UsernameBadge from './UsernameBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_LOGO_URL } from '../constants';

interface AnnouncementCenterProps {
  onClose: () => void;
}

const RichToolbar = () => (
  <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 rounded-t-lg">
     <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Bold className="w-4 h-4"/></button>
     <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Italic className="w-4 h-4"/></button>
     <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Underline className="w-4 h-4"/></button>
     <div className="w-px h-4 bg-gray-300 mx-1"></div>
     <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><AlignLeft className="w-4 h-4"/></button>
     <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><AlignCenter className="w-4 h-4"/></button>
     <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><AlignRight className="w-4 h-4"/></button>
     <div className="w-px h-4 bg-gray-300 mx-1"></div>
     <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><ImageIcon className="w-4 h-4"/></button>
     <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Link className="w-4 h-4"/></button>
  </div>
);

const AnnouncementCenter: React.FC<AnnouncementCenterProps> = ({ onClose }) => {
  const { user, announcements, setAnnouncements, users } = useApp();
  const [view, setView] = useState<'list' | 'detail' | 'edit'>('list');
  const [activeTab, setActiveTab] = useState<'my' | 'publish' | 'manage' | 'suggestion'>('my');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  
  // Suggestion Success Modal State
  const [showSuggestionSuccess, setShowSuggestionSuccess] = useState(false);

  const [publishForm, setPublishForm] = useState({ 
      title: '', 
      content: '', 
      targets: [] as string[],
      popupEnabled: false,
      popupFrequency: 'once' as AnnouncementFrequency
  });
  
  // Strict: Manage Tab requires user selection first. Default to empty if not root.
  const [manageFilterUser, setManageFilterUser] = useState<string>('');

  // --- Handlers ---

  const handlePublish = (isEdit: boolean = false) => {
    if (user?.role === RoleLevel.GUEST) {
        alert('您没有权限发布公告。');
        return;
    }

    if (isEdit && selectedAnnouncement) {
        setAnnouncements(announcements.map(a => 
            a.id === selectedAnnouncement.id 
            ? { ...a, title: publishForm.title, content: publishForm.content, popup_config: publishForm.popupEnabled ? { enabled: true, frequency: publishForm.popupFrequency } : undefined }
            : a
        ));
        alert('修改成功！');
        setView('list');
        return;
    }

    const newAnn: Announcement = {
      id: `new_${Date.now()}`,
      title: publishForm.title,
      content: publishForm.content,
      author_id: user?.id || 'unknown',
      author_name: user?.username || 'Unknown',
      author_role: user?.role || RoleLevel.STAFF,
      created_at: new Date().toISOString(),
      target_roles: [],
      target_userIds: publishForm.targets,
      read_user_ids: [],
      type: 'notice',
      popup_config: publishForm.popupEnabled ? { enabled: true, frequency: publishForm.popupFrequency } : undefined
    };
    setAnnouncements([newAnn, ...announcements]);
    alert('发布成功！');
    setPublishForm({ title: '', content: '', targets: [], popupEnabled: false, popupFrequency: 'once' });
    setActiveTab('my');
  };

  const handleDelete = (id: string, physical: boolean = false) => {
      if (physical) {
          // Hard Delete (Revoke)
          if(confirm('确定撤销此公告吗？撤销后，所有人将不可见。')) {
            setAnnouncements(announcements.filter(a => a.id !== id));
          }
      } else {
          // Soft Delete (Hide for self)
          if(confirm('确定删除此条公告吗？(仅对自己隐藏)')) {
             setAnnouncements(announcements.map(a => {
                 if (a.id === id) {
                     return { ...a, hidden_by_users: [...(a.hidden_by_users || []), user?.id || ''] };
                 }
                 return a;
             }));
          }
      }
  };

  const handleItemClick = (ann: Announcement) => {
      setSelectedAnnouncement(ann);
      
      // Mark as read for this user if not already
      if (user && !ann.read_user_ids.includes(user.id)) {
          setAnnouncements(prev => prev.map(a => 
              a.id === ann.id 
              ? { ...a, read_user_ids: [...a.read_user_ids, user.id] } 
              : a
          ));
      }

      setView('detail');
  };

  const handleEditClick = (ann: Announcement) => {
      setSelectedAnnouncement(ann);
      setPublishForm({
          title: ann.title,
          content: ann.content,
          targets: ann.target_userIds || [],
          popupEnabled: !!ann.popup_config?.enabled,
          popupFrequency: ann.popup_config?.frequency || 'once'
      });
      setView('edit');
  };

  const handleForceShow = (ann: Announcement) => {
      // Force show on MY announcement page
      // Add current user ID to target_userIds if not present
      if (user && !ann.target_userIds?.includes(user.id)) {
          setAnnouncements(prev => prev.map(a => 
              a.id === ann.id 
              ? { ...a, target_userIds: [...(a.target_userIds || []), user.id] } 
              : a
          ));
          alert(`棱镜: 已在‘我的公告’页面显示`);
      } else {
          alert('已在显示列表中');
      }
  };

  const handleSuggestionSubmit = () => {
      setShowSuggestionSuccess(true);
  };

  const toggleTargetUser = (uid: string) => {
      const targets = publishForm.targets;
      if (targets.includes(uid)) {
          setPublishForm({...publishForm, targets: targets.filter(id => id !== uid)});
      } else {
          setPublishForm({...publishForm, targets: [...targets, uid]});
      }
  };

  // --- Filtering Logic ---

  const myAnnouncements = announcements.filter(ann => {
      if (ann.hidden_by_users?.includes(user?.id || '')) return false; // Hidden by me
      if (user?.role === RoleLevel.ROOT) return true; // Root sees all
      
      // Targeted logic
      let visible = false;
      if (!ann.target_userIds || ann.target_userIds.length === 0) visible = true; // Public
      else if (ann.target_userIds.includes(user?.id || '')) visible = true;
      
      // Author sees their own
      if (ann.author_id === user?.id) visible = true;

      return visible;
  });

  const manageAnnouncements = announcements.filter(ann => {
      if (!manageFilterUser) return false; // Must select user first
      return ann.author_id === manageFilterUser;
  });

  // Allowed to manage: Self or lower rank users (if admin)
  const availableManageUsers = users.filter(u => {
      if (user?.role === RoleLevel.ROOT) return true;
      if (u.id === user?.id) return true; // Can manage self
      return user?.role && u.role > user.role; // Can manage lower
  });

  // --- Render ---

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 relative overflow-hidden">
      
      {/* Suggestion Success Modal */}
      {showSuggestionSuccess && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl border-2 border-orange-500/50">
                  <img src={APP_LOGO_URL} alt="Prism" className="w-16 h-16 rounded-xl mb-4 shadow-lg"/>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">提交成功</h3>
                  <p className="text-gray-500 mb-6">棱镜 app 感谢您的建议</p>
                  <button onClick={() => setShowSuggestionSuccess(false)} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">关闭</button>
              </div>
          </div>
      )}

      {/* Detail/Edit View Overlay (In-Place) */}
      <AnimatePresence>
        {view === 'detail' && selectedAnnouncement && (
            <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute inset-0 z-20 bg-white dark:bg-gray-800 flex flex-col"
            >
                <div className="flex items-center p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <button onClick={() => setView('list')} className="p-2 mr-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="font-bold text-lg flex-1">公告详情</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{selectedAnnouncement.title}</h1>
                    <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
                        <UsernameBadge name={selectedAnnouncement.author_name} roleLevel={selectedAnnouncement.author_role} />
                        <span>•</span>
                        <span>{new Date(selectedAnnouncement.created_at).toLocaleString()}</span>
                    </div>
                    <div className="prose dark:prose-invert max-w-none">
                        {selectedAnnouncement.content}
                    </div>
                </div>
            </motion.div>
        )}

        {view === 'edit' && selectedAnnouncement && (
            <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute inset-0 z-20 bg-white dark:bg-gray-800 flex flex-col"
            >
                <div className="flex items-center p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <button onClick={() => setView('list')} className="p-2 mr-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="font-bold text-lg flex-1">发布公告 (修改)</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                     <div>
                        <label className="block text-sm font-bold mb-2">标题</label>
                        <input type="text" value={publishForm.title} onChange={e => setPublishForm({...publishForm, title: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700"/>
                     </div>
                     <div>
                        <label className="block text-sm font-bold mb-2">内容</label>
                        <textarea value={publishForm.content} onChange={e => setPublishForm({...publishForm, content: e.target.value})} className="w-full h-40 p-3 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700"></textarea>
                     </div>
                     <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={publishForm.popupEnabled} onChange={e => setPublishForm({...publishForm, popupEnabled: e.target.checked})} /> 弹窗提醒</label>
                     </div>
                     <button onClick={() => handlePublish(true)} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl">保存修改</button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">公告中心</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        {[
          { id: 'my', label: '我的公告' },
          { id: 'publish', label: '发布公告' },
          { id: 'manage', label: '管理公告' },
          { id: 'suggestion', label: '意见箱' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 ${
              activeTab === tab.id 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 relative">
        {activeTab === 'my' && (
          <div className="space-y-3">
            {myAnnouncements.map((ann, index) => {
              const isRead = user ? ann.read_user_ids.includes(user.id) : false;
              return (
                <motion.div 
                    key={ann.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative p-4 rounded-xl bg-white dark:bg-gray-700/30 border border-gray-100 dark:border-gray-600 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleItemClick(ann)}
                >
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">{ann.title}</h3>
                        {!isRead && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-1 mb-2">{ann.content}</p>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                        <UsernameBadge name={ann.author_name} roleLevel={ann.author_role} />
                        <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {/* Delete Button (Soft Delete) */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(ann.id, false); }}
                        className="absolute top-2 right-2 p-2 bg-white dark:bg-gray-800 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50"
                        title="删除(仅隐藏)"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </motion.div>
              );
            })}
            {myAnnouncements.length === 0 && <p className="text-center text-gray-400 mt-10">暂无公告</p>}
          </div>
        )}

        {activeTab === 'publish' && (
          <div className="space-y-6 max-w-3xl mx-auto animate-fade-in pb-10">
             <div>
               <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">公告标题</label>
               <input 
                 type="text" 
                 value={publishForm.title}
                 onChange={e => setPublishForm({...publishForm, title: e.target.value})}
                 className="w-full p-3 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500" 
                 placeholder="请输入标题"
               />
             </div>
             <div>
               <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">公告内容</label>
               <div className="border dark:border-gray-600 rounded-xl overflow-hidden bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500">
                 <RichToolbar />
                 <div 
                   className="w-full p-4 min-h-[200px] outline-none text-gray-700 dark:text-gray-200"
                   contentEditable
                   onInput={e => setPublishForm({...publishForm, content: e.currentTarget.textContent || ''})}
                 />
               </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                       <Users className="w-4 h-4" /> 接收对象 (默认排除00)
                   </label>
                   <div className="p-3 border rounded-xl dark:border-gray-600 max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-800">
                      {users.map(u => {
                        const is00 = u.role === RoleLevel.ROOT;
                        return (
                            <label key={u.id} className="flex items-center space-x-3 p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={publishForm.targets.includes(u.id)}
                                onChange={() => toggleTargetUser(u.id)}
                                className="rounded text-blue-600 focus:ring-blue-500" 
                            /> 
                            <UsernameBadge name={u.username} roleLevel={u.role} className="text-sm" />
                            {is00 && <span className="text-xs text-gray-400 ml-auto">(00权限)</span>}
                            </label>
                        );
                      })}
                   </div>
                 </div>

                 <div className="space-y-4">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold mb-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={publishForm.popupEnabled}
                                onChange={e => setPublishForm({...publishForm, popupEnabled: e.target.checked})}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>启用强提醒弹窗</span>
                        </label>
                        {publishForm.popupEnabled && (
                            <select 
                                value={publishForm.popupFrequency}
                                onChange={e => setPublishForm({...publishForm, popupFrequency: e.target.value as any})}
                                className="w-full p-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                            >
                                <option value="once">一次性 (看过即焚)</option>
                                <option value="daily">每天一次</option>
                                <option value="monthly">每月一次</option>
                                <option value="permanent">永久 (每次登录)</option>
                            </select>
                        )}
                    </div>
                 </div>
             </div>

             <button onClick={() => handlePublish(false)} className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 hover:scale-[1.01] transition-transform flex items-center justify-center gap-2">
               <Send className="w-5 h-5" /> 立即发布
             </button>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-xl">
                <label className="text-sm font-bold flex items-center gap-2">
                    <Filter className="w-4 h-4"/> 账户筛选(必选):
                </label>
                <select 
                    value={manageFilterUser}
                    onChange={(e) => setManageFilterUser(e.target.value)}
                    className="bg-white dark:bg-gray-600 p-1.5 rounded-lg text-sm outline-none border border-transparent focus:border-blue-500"
                >
                    <option value="">-- 请选择账户 --</option>
                    {availableManageUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                </select>
            </div>

            {!manageFilterUser ? (
                <div className="text-center py-20 text-gray-400">请先选择一个账户以管理其公告</div>
            ) : (
                <>
                    {manageAnnouncements.map(ann => (
                    <div key={ann.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-600">
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                {ann.title}
                                {ann.popup_config?.enabled && <span className="text-xs bg-red-100 text-red-600 px-1 rounded">弹窗</span>}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">{new Date(ann.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Force Show Button */}
                            <button onClick={() => handleForceShow(ann)} className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg flex items-center gap-1 text-xs">
                                <Eye className="w-4 h-4"/> 显示
                            </button>
                            
                            {/* Edit Button (Highlighed Save) */}
                            <button onClick={() => handleEditClick(ann)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                                <Edit3 className="w-4 h-4"/>
                            </button>
                            
                            {/* Revoke Button */}
                            <button 
                                onClick={() => handleDelete(ann.id, true)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-1 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> 撤销
                            </button>
                        </div>
                    </div>
                    ))}
                    {manageAnnouncements.length === 0 && <p className="text-center text-gray-400 mt-10">该账户暂无已发布公告</p>}
                </>
            )}
          </div>
        )}

        {activeTab === 'suggestion' && (
           <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-sm">
                  <p className="font-bold flex items-center gap-2 mb-1"><AlertCircle className="w-4 h-4"/> 意见反馈箱</p>
                  <p>您的建议将直接发送给管理员 (00/01权限可见)。我们重视每一条反馈！</p>
              </div>
              <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">反馈内容</label>
                  <textarea 
                     className="w-full p-4 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 h-40 outline-none focus:ring-2 focus:ring-blue-500"
                     placeholder="请详细描述您遇到的问题或改进建议..."
                  ></textarea>
              </div>
              <button 
                onClick={handleSuggestionSubmit}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 hover:scale-[1.01] transition-transform"
              >
                提交反馈
              </button>
           </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementCenter;
