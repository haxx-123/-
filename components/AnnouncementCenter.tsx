
import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2, Edit3, Send, AlertCircle, Bold, Italic, Underline, Image as ImageIcon, Link, AlignLeft, AlignCenter, AlignRight, Users, Filter, ArrowLeft, MoreHorizontal, Eye, CheckCircle, ChevronLeft, ChevronRight, Save, Plus, Clock, Video, CheckSquare, Square, Loader2, MessageSquare } from 'lucide-react';
import { Announcement, RoleLevel, AnnouncementFrequency, LogAction } from '../types';
import { useApp } from '../App';
import UsernameBadge from './UsernameBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_LOGO_URL } from '../constants';
import { supabase } from '../supabase';

interface AnnouncementCenterProps {
  onClose: () => void;
  initialPopup?: Announcement | null;
}

// 6.2 Loading Button Component
const LoadingButton = ({ onClick, loading, children, className, disabled }: any) => (
    <button 
        onClick={onClick} 
        disabled={loading || disabled} 
        className={`${className} ${loading || disabled ? 'opacity-70 cursor-not-allowed' : ''} flex items-center justify-center gap-2`}
    >
        {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : children}
    </button>
);

const RichToolbar = ({ onCmd }: { onCmd: (cmd: string, val?: string) => void }) => {
    // Simplified Rich Text Toolbar
    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 rounded-t-lg sticky top-0 z-10">
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('bold')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Bold className="w-4 h-4"/></button>
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('italic')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Italic className="w-4 h-4"/></button>
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('underline')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Underline className="w-4 h-4"/></button>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('justifyLeft')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><AlignLeft className="w-4 h-4"/></button>
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('justifyCenter')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><AlignCenter className="w-4 h-4"/></button>
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('justifyRight')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><AlignRight className="w-4 h-4"/></button>
        </div>
    );
};

const AnnouncementCenter: React.FC<AnnouncementCenterProps> = ({ onClose, initialPopup }) => {
  const { user, announcements, users, reloadData } = useApp();
  
  // 22.1 In-Place View Switching
  const [view, setView] = useState<'list' | 'detail' | 'edit'>('list');
  const [activeTab, setActiveTab] = useState<'my' | 'publish' | 'manage' | 'suggestion'>('my');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  
  // Forms & Loading
  const [publishForm, setPublishForm] = useState({ title: '', content: '', targets: [] as string[], popupEnabled: false, popupFrequency: 'once' as AnnouncementFrequency, allowHide: true, autoRevokeEnabled: false, autoRevokeDuration: '1', autoRevokeUnit: 'months' });
  const [suggestionText, setSuggestionText] = useState('');
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  // Pagination & Filters
  const [myPage, setMyPage] = useState(1);
  const pageSize = 10;
  const [isDeleteMode, setIsDeleteMode] = useState(false); // 22.3 Delete/Hide mode
  const [selectedForHide, setSelectedForHide] = useState<string[]>([]);
  const [manageFilterUser, setManageFilterUser] = useState<string>(''); // 22.5.1 Filter

  useEffect(() => {
      if (initialPopup) {
          setSelectedAnnouncement(initialPopup);
          setView('detail');
          // Mark as read immediately on open
          if (user && !initialPopup.read_user_ids.includes(user.id)) {
              supabase.from('announcements').update({ 
                  read_user_ids: [...initialPopup.read_user_ids, user.id] 
              }).eq('id', initialPopup.id).then();
          }
      }
  }, [initialPopup, user]);

  const execCmd = (cmd: string, val?: string) => { 
      document.execCommand(cmd, false, val); 
      if (contentEditableRef.current) setPublishForm(prev => ({ ...prev, content: contentEditableRef.current?.innerHTML || '' }));
  };

  // 22.4 Publish Logic
  const handlePublish = async (isEdit: boolean = false) => {
    if (user?.role === RoleLevel.GUEST) return alert('权限不足');
    if (!publishForm.title || !publishForm.content) return alert('标题和内容不能为空');

    setLoading(true); // 6.2 Lock
    let revokeAt = null;
    if (publishForm.autoRevokeEnabled) {
        const date = new Date(); const num = parseInt(publishForm.autoRevokeDuration);
        if (publishForm.autoRevokeUnit === 'days') date.setDate(date.getDate() + num); else date.setMonth(date.getMonth() + num);
        revokeAt = date.toISOString();
    }

    try {
        const payload = {
            title: publishForm.title, 
            content: publishForm.content, 
            target_user_ids: publishForm.targets,
            popup_config: publishForm.popupEnabled ? { enabled: true, frequency: publishForm.popupFrequency } : null,
            allow_hide: publishForm.allowHide, // 22.4.3
            auto_revoke_config: publishForm.autoRevokeEnabled ? { enabled: true, revoke_at: revokeAt } : null
        };

        if (isEdit && selectedAnnouncement) { 
            await supabase.from('announcements').update(payload).eq('id', selectedAnnouncement.id); 
            alert('修改成功！'); 
        } else { 
            await supabase.from('announcements').insert({ 
                id: `ann_${Date.now()}`, 
                ...payload, 
                author_id: user?.id, 
                author_name: user?.username, 
                author_role: user?.role, 
                created_at: new Date().toISOString(), 
                target_roles: [], 
                read_user_ids: [], 
                type: 'notice' 
            }); 
            alert('发布成功！'); 
        }
        await reloadData(); 
        // Reset
        setPublishForm({ title: '', content: '', targets: [], popupEnabled: false, popupFrequency: 'once', allowHide: true, autoRevokeEnabled: false, autoRevokeDuration: '1', autoRevokeUnit: 'months' });
        if(contentEditableRef.current) contentEditableRef.current.innerHTML = '';
        setView('list'); 
        setActiveTab('my');
    } catch (err: any) { alert('操作失败: ' + err.message); }
    finally { setLoading(false); }
  };

  // 22.3 "Delete" (Hide) for User
  const handleSoftHide = async () => {
      if (selectedForHide.length === 0) return;
      setLoading(true);
      try {
          for (const id of selectedForHide) {
              const ann = announcements.find(a => a.id === id);
              // Append current user to hidden list
              if (ann) await supabase.from('announcements').update({ 
                  hidden_by_users: [...(ann.hidden_by_users || []), user?.id || ''] 
              }).eq('id', id);
          }
          await reloadData(); 
          setIsDeleteMode(false); 
          setSelectedForHide([]); 
      } catch (err: any) { alert('操作失败'); }
      finally { setLoading(false); }
  };

  // 22.5.2 Revoke (Withdraw)
  const handleRevoke = async (ann: Announcement) => {
      if (!window.confirm(`确定要撤销公告 "${ann.title}" 吗？撤销后全员不可见。`)) return;
      setLoading(true);
      try {
          // Physical delete or soft delete? Requirement says "Revoked announcements are physically deleted/invisible".
          // Let's do physical delete for simplicity as per requirement implication, or a flag. 
          // Going with DELETE for cleanliness based on "physically invisible".
          await supabase.from('announcements').delete().eq('id', ann.id);
          await reloadData();
      } catch (err) { alert('撤销失败'); }
      finally { setLoading(false); }
  };

  // 22.6 Suggestion Box
  const handleSuggestionSubmit = async () => {
      if (!suggestionText.trim()) return;
      setLoading(true);
      try {
          await supabase.from('announcements').insert({
              id: `sug_${Date.now()}`,
              title: '用户建议反馈',
              content: suggestionText,
              author_id: user?.id,
              author_name: user?.username,
              author_role: user?.role,
              type: 'suggestion',
              target_roles: [RoleLevel.ROOT], // Only visible to root
              read_user_ids: [],
              created_at: new Date().toISOString()
          });
          setSuggestionText('');
          alert('感谢您的建议！');
          setActiveTab('my');
      } catch(err) { alert('提交失败'); }
      finally { setLoading(false); }
  };

  // Filtering Logic
  const getFilteredAnnouncements = () => {
      if (activeTab === 'my') {
          return announcements.filter(ann => {
              if (ann.hidden_by_users?.includes(user?.id || '')) return false;
              if (ann.type === 'suggestion') return false; // Don't show suggestions in general feed
              // Author sees own, others check target
              if (ann.author_id === user?.id) return true;
              // Check targeting
              if ((!ann.target_userIds || ann.target_userIds.length === 0 || ann.target_userIds.includes(user?.id || ''))) return true;
              return false;
          });
      }
      if (activeTab === 'manage') {
          return announcements.filter(ann => {
              if (ann.type === 'suggestion') return false;
              // 22.5.1 Filter by account
              if (manageFilterUser && ann.author_name !== manageFilterUser) return false;
              // Admin sees all, others see own
              if (user?.role === RoleLevel.ROOT) return true;
              return ann.author_id === user?.id;
          });
      }
      return [];
  };

  const currentList = getFilteredAnnouncements();
  const paginatedList = currentList.slice((myPage - 1) * pageSize, myPage * pageSize);

  const toggleSelectAll = () => {
      if (selectedForHide.length === paginatedList.length) setSelectedForHide([]);
      else setSelectedForHide(paginatedList.map(a => a.id));
  };

  const handleItemClick = (ann: Announcement) => {
      if (activeTab === 'my' && isDeleteMode) {
          if (selectedForHide.includes(ann.id)) setSelectedForHide(prev => prev.filter(id => id !== ann.id));
          else setSelectedForHide(prev => [...prev, ann.id]);
      } else {
          setSelectedAnnouncement(ann); 
          setView('detail');
          if (activeTab === 'my' && user && !ann.read_user_ids.includes(user.id)) {
              supabase.from('announcements').update({ read_user_ids: [...ann.read_user_ids, user.id] }).eq('id', ann.id).then(() => reloadData());
          }
      }
  };

  const prepareEdit = (ann: Announcement) => {
      setPublishForm({
          title: ann.title,
          content: ann.content,
          targets: ann.target_userIds || [],
          popupEnabled: !!ann.popup_config,
          popupFrequency: ann.popup_config?.frequency || 'once',
          allowHide: ann.allow_hide,
          autoRevokeEnabled: !!ann.auto_revoke_config,
          autoRevokeDuration: '1', // Cannot easily restore duration from date, defaulting
          autoRevokeUnit: 'months'
      });
      setSelectedAnnouncement(ann);
      setActiveTab('publish'); // Switch tab
      // Set timeout to allow render then set HTML
      setTimeout(() => {
          if(contentEditableRef.current) contentEditableRef.current.innerHTML = ann.content;
      }, 100);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2">
            {view !== 'list' && <button onClick={() => { setView('list'); setSelectedAnnouncement(null); }}><ArrowLeft className="w-5 h-5"/></button>}
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                {view === 'detail' ? '公告详情' : '公告中心'}
            </h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6" /></button>
      </div>

      {/* 22.1 Tab Switching (Only in List View) */}
      {view === 'list' && (
          <div className="flex border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            {[{ id: 'my', label: '我的公告' }, { id: 'publish', label: '发布公告' }, { id: 'manage', label: '公告管理' }, { id: 'suggestion', label: '意见箱' }].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-500 text-blue-600 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:bg-white/50'}`}
              >
                  {tab.label}
              </button>
            ))}
          </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 relative">
        
        {/* Detail View */}
        {view === 'detail' && selectedAnnouncement && (
            <div className="animate-slide-up max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-2">{selectedAnnouncement.title}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <UsernameBadge name={selectedAnnouncement.author_name} roleLevel={selectedAnnouncement.author_role} />
                    <span>{new Date(selectedAnnouncement.created_at).toLocaleString()}</span>
                </div>
                <div className="prose dark:prose-invert max-w-none mb-8" dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }} />
                
                {activeTab === 'my' && selectedAnnouncement.allow_hide && (
                    <div className="pt-4 border-t dark:border-gray-700 flex justify-end">
                        <LoadingButton 
                            loading={loading}
                            onClick={async () => {
                                setLoading(true);
                                await supabase.from('announcements').update({ hidden_by_users: [...(selectedAnnouncement.hidden_by_users || []), user?.id || ''] }).eq('id', selectedAnnouncement.id);
                                await reloadData();
                                setView('list');
                                setLoading(false);
                            }}
                            className="text-gray-500 hover:text-red-500 flex items-center gap-1 text-sm px-3 py-2 rounded-lg hover:bg-red-50"
                        >
                            <Eye className="w-4 h-4"/> 隐藏此公告
                        </LoadingButton>
                    </div>
                )}
            </div>
        )}

        {/* List Views */}
        {view === 'list' && (
            <>
                {/* 22.3 My Announcements */}
                {activeTab === 'my' && (
                  <div className="space-y-3">
                    {/* Delete Toolbar */}
                    <div className="flex justify-end mb-4 items-center gap-2 h-8">
                        {isDeleteMode ? (
                            <>
                                <div onClick={toggleSelectAll} className="flex items-center gap-1 cursor-pointer mr-auto ml-2">
                                    {selectedForHide.length > 0 && selectedForHide.length === paginatedList.length ? <CheckSquare className="w-5 h-5 text-blue-500"/> : <Square className="w-5 h-5 text-gray-400"/>}
                                    <span className="text-sm text-gray-600">全选本页</span>
                                </div>
                                <button onClick={() => { setIsDeleteMode(false); setSelectedForHide([]); }} className="px-3 py-1 text-gray-500 bg-gray-100 rounded-lg text-sm">取消</button>
                                <LoadingButton loading={loading} onClick={handleSoftHide} className="px-3 py-1 text-white bg-red-500 rounded-lg text-sm shadow-sm">
                                    确认隐藏 ({selectedForHide.length})
                                </LoadingButton>
                            </>
                        ) : (
                            <button onClick={() => setIsDeleteMode(true)} className="flex items-center gap-1 text-gray-500 hover:bg-gray-100 px-3 py-1 rounded-lg text-sm transition-colors">
                                <Trash2 className="w-4 h-4" /> 批量隐藏
                            </button>
                        )}
                    </div>

                    {/* List Items */}
                    {paginatedList.map((ann) => {
                      const isSelected = selectedForHide.includes(ann.id);
                      const isRead = ann.read_user_ids.includes(user?.id || '');
                      return (
                        <motion.div key={ann.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`group relative p-4 rounded-xl bg-white dark:bg-gray-700/30 border transition-all cursor-pointer flex gap-3 items-center ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:shadow-md'}`} onClick={() => handleItemClick(ann)}>
                            {isDeleteMode && ( <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>{isSelected && <CheckCircle className="w-3 h-3 text-white" />}</div> )}
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className={`font-bold text-base ${isRead ? 'text-gray-600 dark:text-gray-400 font-normal' : 'text-gray-900 dark:text-white'}`}>
                                        {!isRead && <span className="w-2 h-2 bg-red-500 rounded-full inline-block mr-2 align-middle"></span>}
                                        {ann.title}
                                    </h3>
                                    {ann.popup_config?.enabled && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">弹窗</span>}
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-400 mt-2">
                                    <span>{ann.author_name}</span>
                                    <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </motion.div>
                      );
                    })}
                    {paginatedList.length === 0 && <p className="text-center text-gray-400 py-10">暂无公告</p>}
                  </div>
                )}

                {/* 22.4 Publish Announcement */}
                {activeTab === 'publish' && (
                    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
                        <input value={publishForm.title} onChange={e => setPublishForm({...publishForm, title: e.target.value})} placeholder="公告标题" className="w-full p-3 text-lg font-bold border-b outline-none bg-transparent placeholder-gray-400" />
                        
                        {/* 22.4.1 Rich Text Editor */}
                        <div className="border rounded-xl overflow-hidden dark:border-gray-600 bg-white dark:bg-gray-800">
                            <RichToolbar onCmd={execCmd} />
                            <div ref={contentEditableRef} contentEditable className="min-h-[300px] p-4 outline-none dark:text-gray-200" onInput={(e) => setPublishForm({...publishForm, content: e.currentTarget.innerHTML})} />
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                                <label className="flex items-center gap-2 mb-3 font-bold text-gray-700 dark:text-gray-300">
                                    <input type="checkbox" checked={publishForm.popupEnabled} onChange={e => setPublishForm({...publishForm, popupEnabled: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" /> 
                                    22.4.2 强弹窗提醒
                                </label>
                                {publishForm.popupEnabled && (
                                    <select value={publishForm.popupFrequency} onChange={e => setPublishForm({...publishForm, popupFrequency: e.target.value as any})} className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-xs">
                                        <option value="once">一次性 (看过不再弹)</option>
                                        <option value="daily">每天一次</option>
                                        <option value="weekly">每周一次</option>
                                        <option value="monthly">每月一次</option>
                                        <option value="permanent">每次登录 (永久)</option>
                                    </select>
                                )}
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                                <label className="flex items-center gap-2 mb-3 font-bold text-gray-700 dark:text-gray-300">
                                    <input type="checkbox" checked={publishForm.autoRevokeEnabled} onChange={e => setPublishForm({...publishForm, autoRevokeEnabled: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" /> 
                                    22.4.4 自动撤销 (过期)
                                </label>
                                {publishForm.autoRevokeEnabled && (
                                    <div className="flex gap-2 items-center">
                                        <input type="number" value={publishForm.autoRevokeDuration} onChange={e => setPublishForm({...publishForm, autoRevokeDuration: e.target.value})} className="w-16 p-1.5 rounded-lg border text-xs text-center dark:bg-gray-700" />
                                        <select value={publishForm.autoRevokeUnit} onChange={e => setPublishForm({...publishForm, autoRevokeUnit: e.target.value})} className="p-1.5 rounded-lg border text-xs dark:bg-gray-700">
                                            <option value="days">天后</option>
                                            <option value="months">个月后</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 md:col-span-2">
                                <label className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                                    <input type="checkbox" checked={publishForm.allowHide} onChange={e => setPublishForm({...publishForm, allowHide: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" /> 
                                    22.4.3 允许用户删除/隐藏
                                </label>
                            </div>
                        </div>

                        <LoadingButton onClick={() => handlePublish(!!selectedAnnouncement)} loading={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">
                            {selectedAnnouncement ? '保存修改' : '发布公告'}
                        </LoadingButton>
                    </div>
                )}

                {/* 22.5 Announcement Management */}
                {activeTab === 'manage' && (
                    <div className="space-y-4">
                        {/* 22.5.1 Account Filter */}
                        <div className="flex justify-end">
                            <select value={manageFilterUser} onChange={e => setManageFilterUser(e.target.value)} className="p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm">
                                <option value="">所有发布人</option>
                                {users.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}
                            </select>
                        </div>

                        {paginatedList.map(ann => (
                            <div key={ann.id} className="p-4 bg-white dark:bg-gray-700/30 border rounded-xl flex justify-between items-center hover:shadow-md transition-shadow">
                                <div>
                                    <div className="font-bold text-gray-800 dark:text-gray-200">{ann.title}</div>
                                    <div className="text-xs text-gray-400 mt-1">发布人: {ann.author_name} | {new Date(ann.created_at).toLocaleDateString()}</div>
                                </div>
                                <div className="flex gap-2">
                                    {/* 22.5.3 Edit */}
                                    <button onClick={() => prepareEdit(ann)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="编辑"><Edit3 className="w-4 h-4"/></button>
                                    {/* 22.5.2 Revoke */}
                                    <LoadingButton loading={loading && selectedAnnouncement?.id === ann.id} onClick={() => handleRevoke(ann)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="撤销">
                                        <Trash2 className="w-4 h-4"/>
                                    </LoadingButton>
                                </div>
                            </div>
                        ))}
                        {paginatedList.length === 0 && <p className="text-center text-gray-400 py-10">无公告记录</p>}
                    </div>
                )}

                {/* 22.6 Suggestion Box */}
                {activeTab === 'suggestion' && (
                    <div className="flex flex-col items-center justify-center h-full animate-fade-in py-10">
                        <img src={APP_LOGO_URL} className="w-16 h-16 mb-6 rounded-2xl shadow-lg opacity-90" />
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">棱镜 App 意见箱</h3>
                        <p className="text-sm text-gray-500 mb-8 text-center max-w-xs">您的建议是我们进步的动力。<br/>内容仅管理员可见。</p>
                        
                        <div className="w-full max-w-lg relative">
                            <textarea 
                                value={suggestionText}
                                onChange={e => setSuggestionText(e.target.value)}
                                className="w-full p-4 h-40 rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                placeholder="请输入您的宝贵意见..." 
                            />
                            <div className="absolute bottom-4 right-4">
                                <LoadingButton loading={loading} onClick={handleSuggestionSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 text-sm">
                                    提交反馈
                                </LoadingButton>
                            </div>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default AnnouncementCenter;
