
import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2, Edit3, Send, AlertCircle, Bold, Italic, Underline, Image as ImageIcon, Link, AlignLeft, AlignCenter, AlignRight, Users, Filter, ArrowLeft, MoreHorizontal, Eye, CheckCircle, ChevronLeft, ChevronRight, Save, Plus, Clock, Video } from 'lucide-react';
import { Announcement, RoleLevel, AnnouncementFrequency } from '../types';
import { useApp } from '../App';
import UsernameBadge from './UsernameBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_LOGO_URL } from '../constants';
import { supabase } from '../supabase';

interface AnnouncementCenterProps {
  onClose: () => void;
  initialPopup?: Announcement | null;
}

// ... (RichToolbar remains unchanged) ...
const RichToolbar = ({ onCmd }: { onCmd: (cmd: string, val?: string) => void }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                if (evt.target?.result) {
                    onCmd('insertImage', evt.target.result as string);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 rounded-t-lg sticky top-0 z-10">
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('bold')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Bold className="w-4 h-4"/></button>
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('italic')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Italic className="w-4 h-4"/></button>
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('underline')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Underline className="w-4 h-4"/></button>
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('justifyLeft')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><AlignLeft className="w-4 h-4"/></button>
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('justifyCenter')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><AlignCenter className="w-4 h-4"/></button>
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('justifyRight')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><AlignRight className="w-4 h-4"/></button>
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            <input type="color" onChange={(e) => onCmd('foreColor', e.target.value)} className="w-6 h-6 border-none bg-transparent cursor-pointer" title="字体颜色"/>
            <select onChange={(e) => onCmd('fontSize', e.target.value)} className="text-xs p-1 rounded border dark:bg-gray-600 dark:border-gray-500">
                <option value="3">正常</option>
                <option value="5">大号</option>
                <option value="7">超大</option>
            </select>
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            <button onMouseDown={(e) => {e.preventDefault(); fileInputRef.current?.click()}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><ImageIcon className="w-4 h-4"/></button>
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
            <button onMouseDown={(e) => {e.preventDefault(); const url = prompt('输入视频链接'); if(url) onCmd('insertHTML', `<video controls src="${url}" style="max-width:100%"></video><br/>`)}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Video className="w-4 h-4"/></button>
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('insertHTML', '<table border="1" style="width:100%; border-collapse: collapse;"><tr><td style="border:1px solid #ccc; padding: 5px;">列1</td><td style="border:1px solid #ccc; padding: 5px;">列2</td></tr></table><br/>')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs font-bold">表格</button>
        </div>
    );
};

const AnnouncementCenter: React.FC<AnnouncementCenterProps> = ({ onClose, initialPopup }) => {
  const { user, announcements, setAnnouncements, users, reloadData } = useApp();
  const [view, setView] = useState<'list' | 'detail' | 'edit'>('list');
  const [activeTab, setActiveTab] = useState<'my' | 'publish' | 'manage' | 'suggestion'>('my');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  
  // Suggestion Success Modal State
  const [showSuggestionSuccess, setShowSuggestionSuccess] = useState(false);

  // Handle Initial Popup
  useEffect(() => {
      if (initialPopup) {
          setSelectedAnnouncement(initialPopup);
          setView('detail');
          // Also mark as read
          if (user && !initialPopup.read_user_ids.includes(user.id)) {
              const newReadList = [...initialPopup.read_user_ids, user.id];
              supabase.from('announcements').update({ read_user_ids: newReadList }).eq('id', initialPopup.id).then();
          }
      }
  }, [initialPopup, user]);

  // Publish Form State
  const [publishForm, setPublishForm] = useState({ 
      title: '', 
      content: '', 
      targets: [] as string[],
      popupEnabled: false,
      popupFrequency: 'once' as AnnouncementFrequency,
      allowHide: true,
      autoRevokeEnabled: false,
      autoRevokeDuration: '1', // months by default for simple UI
      autoRevokeUnit: 'months'
  });
  
  const contentEditableRef = useRef<HTMLDivElement>(null);

  // Manage Filter
  const [manageFilterUser, setManageFilterUser] = useState<string>('');

  // Pagination for "My Announcements"
  const [myPage, setMyPage] = useState(1);
  const pageSize = 10;
  // "Delete" mode for "My Announcements" (Soft hide)
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedForHide, setSelectedForHide] = useState<string[]>([]);

  // Sync contentEditable with state
  const handleContentChange = () => {
      if (contentEditableRef.current) {
          setPublishForm(prev => ({ ...prev, content: contentEditableRef.current?.innerHTML || '' }));
      }
  };

  const execCmd = (cmd: string, val?: string) => {
      document.execCommand(cmd, false, val);
      handleContentChange(); // Update state after cmd
  };

  // --- Handlers ---

  const handlePublish = async (isEdit: boolean = false) => {
    if (user?.role === RoleLevel.GUEST) {
        alert('您没有权限发布公告。');
        return;
    }

    // Calculate auto revoke date if enabled
    let revokeAt = null;
    if (publishForm.autoRevokeEnabled) {
        const date = new Date();
        const num = parseInt(publishForm.autoRevokeDuration);
        if (publishForm.autoRevokeUnit === 'days') date.setDate(date.getDate() + num);
        else if (publishForm.autoRevokeUnit === 'months') date.setMonth(date.getMonth() + num);
        revokeAt = date.toISOString();
    }

    try {
        const payload = {
            title: publishForm.title,
            content: publishForm.content,
            target_user_ids: publishForm.targets,
            popup_config: publishForm.popupEnabled ? { enabled: true, frequency: publishForm.popupFrequency } : null,
            allow_hide: publishForm.allowHide,
            auto_revoke_config: publishForm.autoRevokeEnabled ? { enabled: true, revoke_at: revokeAt } : null
        };

        if (isEdit && selectedAnnouncement) {
            const { error } = await supabase.from('announcements').update(payload).eq('id', selectedAnnouncement.id);
            if (error) throw error;
            alert('修改成功！');
        } else {
            const newAnn = {
                id: `ann_${Date.now()}`,
                ...payload,
                author_id: user?.id || 'unknown',
                author_name: user?.username || 'Unknown',
                author_role: user?.role || RoleLevel.STAFF,
                created_at: new Date().toISOString(),
                target_roles: [],
                read_user_ids: [],
                type: 'notice',
            };
            const { error } = await supabase.from('announcements').insert(newAnn);
            if (error) throw error;
            alert('发布成功！');
        }

        await reloadData();
        setPublishForm({ title: '', content: '', targets: [], popupEnabled: false, popupFrequency: 'once', allowHide: true, autoRevokeEnabled: false, autoRevokeDuration: '1', autoRevokeUnit: 'months' });
        if (contentEditableRef.current) contentEditableRef.current.innerHTML = '';
        setView('list');
        setActiveTab('my'); // Redirect to my list to see it (if target includes self)

    } catch (err: any) {
        alert('操作失败: ' + err.message);
    }
  };

  const handleHardDelete = async (id: string) => {
      if(confirm('确定撤销此公告吗？撤销后，所有人将不可见。')) {
          const { error } = await supabase.from('announcements').delete().eq('id', id);
          if (error) throw error;
          await reloadData();
      }
  };

  const handleSoftHide = async () => {
      if (selectedForHide.length === 0) return;
      try {
          for (const id of selectedForHide) {
              const ann = announcements.find(a => a.id === id);
              if (ann) {
                  const newHidden = [...(ann.hidden_by_users || []), user?.id || ''];
                  await supabase.from('announcements').update({ hidden_by_users: newHidden }).eq('id', id);
              }
          }
          await reloadData();
          setIsDeleteMode(false);
          setSelectedForHide([]);
          alert('选中公告已隐藏');
      } catch (err: any) {
          alert('操作失败: ' + err.message);
      }
  };

  const handleItemClick = async (ann: Announcement) => {
      if (isDeleteMode) {
          if (selectedForHide.includes(ann.id)) setSelectedForHide(prev => prev.filter(id => id !== ann.id));
          else setSelectedForHide(prev => [...prev, ann.id]);
          return;
      }

      setSelectedAnnouncement(ann);
      
      if (user && !ann.read_user_ids.includes(user.id)) {
          try {
              const newReadList = [...ann.read_user_ids, user.id];
              setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, read_user_ids: newReadList } : a));
              await supabase.from('announcements').update({ read_user_ids: newReadList }).eq('id', ann.id);
          } catch (err) {
              console.error("Failed to mark read", err);
          }
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
          popupFrequency: ann.popup_config?.frequency || 'once',
          allowHide: ann.allow_hide !== false,
          autoRevokeEnabled: !!ann.auto_revoke_config?.enabled,
          autoRevokeDuration: '1', 
          autoRevokeUnit: 'months'
      });
      setTimeout(() => {
          if (contentEditableRef.current) contentEditableRef.current.innerHTML = ann.content;
      }, 100);
      setView('edit');
  };

  const handleForceShow = async (ann: Announcement) => {
      if (user && !ann.target_userIds?.includes(user.id)) {
          try {
             const newTargets = [...(ann.target_userIds || []), user.id];
             const { error } = await supabase.from('announcements').update({ target_user_ids: newTargets, hidden_by_users: [] }).eq('id', ann.id); // also clear hidden status
             if (error) throw error;
             await reloadData();
             alert(`棱镜: 已在‘我的公告’页面显示`);
          } catch (err: any) {
             alert('操作失败: ' + err.message);
          }
      } else {
          // Also unhide if hidden
          if (ann.hidden_by_users?.includes(user?.id || '')) {
              const newHidden = ann.hidden_by_users?.filter(u => u !== user?.id);
              await supabase.from('announcements').update({ hidden_by_users: newHidden }).eq('id', ann.id);
              await reloadData();
              alert(`棱镜: 已在‘我的公告’页面显示 (已取消隐藏)`);
          } else {
              alert('已在显示列表中');
          }
      }
  };

  const handleSuggestionSubmit = async () => {
      const content = document.querySelector('textarea')?.value;
      if (!content) return alert('请输入建议内容');

      try {
          await supabase.from('announcements').insert({
              id: `sug_${Date.now()}`,
              title: `意见反馈: ${user?.username}`,
              content: content,
              author_id: user?.id || 'unknown',
              author_name: user?.username || 'Unknown',
              author_role: user?.role || RoleLevel.STAFF,
              created_at: new Date().toISOString(),
              target_roles: [RoleLevel.ROOT, RoleLevel.BOSS], // 00 and 01 see suggestions
              target_user_ids: [],
              read_user_ids: [],
              type: 'suggestion',
              allow_hide: true
          });
          setShowSuggestionSuccess(true);
      } catch (err: any) {
          alert('提交失败: ' + err.message);
      }
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
      if (ann.hidden_by_users?.includes(user?.id || '')) return false; 
      
      // Targeted logic
      let visible = false;
      if (ann.type === 'suggestion') return false; 

      if (!ann.target_userIds || ann.target_userIds.length === 0) visible = true; 
      else if (ann.target_userIds.includes(user?.id || '')) visible = true;
      
      // Author sees their own
      if (ann.author_id === user?.id) visible = true;

      // Check Auto Revoke
      if (ann.auto_revoke_config?.enabled && new Date() > new Date(ann.auto_revoke_config.revoke_date)) {
          return false; // Expired
      }

      return visible;
  });

  const paginatedMyAnnouncements = myAnnouncements.slice((myPage - 1) * pageSize, myPage * pageSize);

  const manageAnnouncements = announcements.filter(ann => {
      if (!manageFilterUser) return false;
      if (ann.type === 'suggestion') {
          return user?.role === RoleLevel.ROOT || user?.role === RoleLevel.BOSS;
      }
      return ann.author_id === manageFilterUser;
  });

  const availableManageUsers = users.filter(u => {
      if (user?.role === RoleLevel.ROOT) return true;
      if (u.id === user?.id) return true; 
      return user?.role && u.role > user.role; 
  });

  // Target User Filter (Cannot select higher authority)
  const availableTargetUsers = users.filter(u => {
      if (user?.role === RoleLevel.ROOT) return true;
      return u.role >= (user?.role || RoleLevel.GUEST);
  });

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

      {/* Detail View Overlay */}
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
                    <div 
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
                    />
                </div>
            </motion.div>
        )}

        {view === 'edit' && (
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
                    <h3 className="font-bold text-lg flex-1">{selectedAnnouncement ? '编辑公告' : '发布公告'}</h3>
                </div>
                {/* Re-use Publish Form UI here for editing */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                     <div>
                        <label className="block text-sm font-bold mb-2">标题</label>
                        <input type="text" value={publishForm.title} onChange={e => setPublishForm({...publishForm, title: e.target.value})} className="w-full p-3 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700"/>
                     </div>
                     <div>
                        <label className="block text-sm font-bold mb-2">内容</label>
                        <div className="border dark:border-gray-600 rounded-xl overflow-hidden bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500">
                            <RichToolbar onCmd={execCmd} />
                            <div 
                                ref={contentEditableRef}
                                className="w-full p-4 min-h-[300px] outline-none text-gray-700 dark:text-gray-200 overflow-y-auto"
                                contentEditable
                                onInput={handleContentChange}
                            />
                        </div>
                     </div>
                     <div className="flex flex-col gap-4">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={publishForm.popupEnabled} onChange={e => setPublishForm({...publishForm, popupEnabled: e.target.checked})} /> 弹窗提醒</label>
                        {publishForm.popupEnabled && (
                            <select value={publishForm.popupFrequency} onChange={e => setPublishForm({...publishForm, popupFrequency: e.target.value as any})} className="p-2 border rounded">
                                <option value="once">一次性 (仅弹一次)</option>
                                <option value="daily">每天一次</option>
                                <option value="weekly">每周一次</option>
                                <option value="monthly">每月一次</option>
                                <option value="permanent">永久 (每次登录)</option>
                            </select>
                        )}
                        <label className="flex items-center gap-2"><input type="checkbox" checked={publishForm.allowHide} onChange={e => setPublishForm({...publishForm, allowHide: e.target.checked})} /> 允许用户删除/隐藏</label>
                        
                        <label className="flex items-center gap-2"><input type="checkbox" checked={publishForm.autoRevokeEnabled} onChange={e => setPublishForm({...publishForm, autoRevokeEnabled: e.target.checked})} /> 自动撤销</label>
                        {publishForm.autoRevokeEnabled && (
                            <div className="flex gap-2 items-center">
                                <input type="number" value={publishForm.autoRevokeDuration} onChange={e => setPublishForm({...publishForm, autoRevokeDuration: e.target.value})} className="w-16 p-2 border rounded" />
                                <select value={publishForm.autoRevokeUnit} onChange={e => setPublishForm({...publishForm, autoRevokeUnit: e.target.value})} className="p-2 border rounded">
                                    <option value="days">天后</option>
                                    <option value="months">月后</option>
                                </select>
                            </div>
                        )}
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
          { id: 'manage', label: '公告管理' },
          { id: 'suggestion', label: '意见箱' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setView('list'); }}
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
          // ... (My Announcements rendering remains same) ...
          <div className="space-y-3">
            <div className="flex justify-end mb-4">
                {isDeleteMode ? (
                    <div className="flex gap-2">
                        <button onClick={() => { setIsDeleteMode(false); setSelectedForHide([]); }} className="px-3 py-1 text-gray-500 bg-gray-100 rounded-lg text-sm">取消</button>
                        <button onClick={handleSoftHide} className="px-3 py-1 text-white bg-red-500 rounded-lg text-sm">确认隐藏 ({selectedForHide.length})</button>
                    </div>
                ) : (
                    <button onClick={() => setIsDeleteMode(true)} className="flex items-center gap-1 text-gray-500 hover:bg-gray-100 px-3 py-1 rounded-lg text-sm">
                        <Trash2 className="w-4 h-4" /> 删除/隐藏
                    </button>
                )}
            </div>

            {paginatedMyAnnouncements.map((ann, index) => {
              const isRead = user ? ann.read_user_ids.includes(user.id) : false;
              const isSelected = selectedForHide.includes(ann.id);
              
              return (
                <motion.div 
                    key={ann.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group relative p-4 rounded-xl bg-white dark:bg-gray-700/30 border transition-all cursor-pointer flex gap-3 items-center ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-100 dark:border-gray-600 hover:shadow-md'}`}
                    onClick={() => handleItemClick(ann)}
                >
                    {isDeleteMode && (
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                    )}
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                {ann.title}
                                {!isRead && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                            </h3>
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 text-sm line-clamp-1 mb-2" dangerouslySetInnerHTML={{ __html: ann.content.replace(/<[^>]+>/g, '') }}></div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                            <UsernameBadge name={ann.author_name} roleLevel={ann.author_role} />
                            <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </motion.div>
              );
            })}
            
            {myAnnouncements.length === 0 && <p className="text-center text-gray-400 mt-10">暂无公告</p>}
            
            {myAnnouncements.length > pageSize && (
                <div className="flex justify-center mt-6 gap-4">
                    <button onClick={() => setMyPage(p => Math.max(1, p - 1))} disabled={myPage === 1} className="p-2 bg-gray-100 rounded-lg disabled:opacity-50"><ChevronLeft className="w-4 h-4"/></button>
                    <span className="text-sm self-center">第 {myPage} 页</span>
                    <button onClick={() => setMyPage(p => Math.min(Math.ceil(myAnnouncements.length / pageSize), p + 1))} disabled={myPage >= Math.ceil(myAnnouncements.length / pageSize)} className="p-2 bg-gray-100 rounded-lg disabled:opacity-50"><ChevronRight className="w-4 h-4"/></button>
                </div>
            )}
          </div>
        )}

        {/* ... (Publish Tab remains same) ... */}
        {activeTab === 'publish' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-10">
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
                 <RichToolbar onCmd={execCmd} />
                 <div 
                   ref={contentEditableRef}
                   className="w-full p-4 min-h-[300px] outline-none text-gray-700 dark:text-gray-200 overflow-y-auto"
                   contentEditable
                   onInput={handleContentChange}
                 />
               </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                       <Users className="w-4 h-4" /> 接收对象 (默认排除00)
                   </label>
                   <div className="p-3 border rounded-xl dark:border-gray-600 max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-800">
                      {availableTargetUsers.map(u => {
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

                 <div className="space-y-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                    <h4 className="font-bold text-sm mb-2">高级设置</h4>
                    <div>
                        <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
                            <input 
                                type="checkbox" 
                                checked={publishForm.popupEnabled}
                                onChange={e => setPublishForm({...publishForm, popupEnabled: e.target.checked})}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>启用强提醒弹窗</span>
                        </label>
                        {publishForm.popupEnabled && (
                            <div className="ml-6 mb-2">
                                <select 
                                    value={publishForm.popupFrequency}
                                    onChange={e => setPublishForm({...publishForm, popupFrequency: e.target.value as any})}
                                    className="w-full p-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                                >
                                    <option value="once">一次性 (仅弹一次)</option>
                                    <option value="daily">每天一次</option>
                                    <option value="weekly">每周一次</option>
                                    <option value="monthly">每月一次</option>
                                    <option value="permanent">永久 (每次登录)</option>
                                </select>
                            </div>
                        )}
                    </div>
                    
                    <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
                        <input type="checkbox" checked={publishForm.allowHide} onChange={e => setPublishForm({...publishForm, allowHide: e.target.checked})} />
                        <span>允许用户删除/隐藏</span>
                    </label>

                    <div>
                        <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
                            <input type="checkbox" checked={publishForm.autoRevokeEnabled} onChange={e => setPublishForm({...publishForm, autoRevokeEnabled: e.target.checked})} />
                            <span>自动撤销</span>
                        </label>
                        {publishForm.autoRevokeEnabled && (
                            <div className="ml-6 flex items-center gap-2">
                                <input type="number" value={publishForm.autoRevokeDuration} onChange={e => setPublishForm({...publishForm, autoRevokeDuration: e.target.value})} className="w-16 p-1 border rounded text-sm"/>
                                <select value={publishForm.autoRevokeUnit} onChange={e => setPublishForm({...publishForm, autoRevokeUnit: e.target.value})} className="p-1 border rounded text-sm">
                                    <option value="days">天后</option>
                                    <option value="months">月后</option>
                                </select>
                            </div>
                        )}
                    </div>
                 </div>
             </div>

             <button onClick={() => handlePublish(false)} className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 hover:scale-[1.01] transition-transform flex items-center justify-center gap-2">
               <Send className="w-5 h-5" /> 立即发布
             </button>
          </div>
        )}

        {/* ... (Manage Tab remains same) ... */}
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
                            <button onClick={() => handleForceShow(ann)} className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg flex items-center gap-1 text-xs" title="强制在'我的公告'显示">
                                <Eye className="w-4 h-4"/>
                            </button>
                            
                            {/* Edit Button (Highlighed Save in edit mode) */}
                            <button onClick={() => handleEditClick(ann)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                                <Edit3 className="w-4 h-4"/>
                            </button>
                            
                            {/* Revoke Button */}
                            <button 
                                onClick={() => handleHardDelete(ann.id)}
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

        {/* Updated Suggestion Tab */}
        {activeTab === 'suggestion' && (
           <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-sm">
                  <p className="font-bold flex items-center gap-2 mb-1"><AlertCircle className="w-4 h-4"/> 意见反馈箱</p>
                  <p>您的建议将直接发送给棱镜app。我们重视每一条反馈。</p>
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
