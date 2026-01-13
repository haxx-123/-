
import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2, Edit3, Send, AlertCircle, Bold, Italic, Underline, Image as ImageIcon, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight, Users, Filter, ArrowLeft, MoreHorizontal, Eye, CheckCircle, ChevronLeft, ChevronRight, Save, Plus, Clock, Video, CheckSquare, Square, Loader2, MessageSquare, UserCheck, Type, Palette, PenTool } from 'lucide-react';
import { Announcement, RoleLevel, AnnouncementFrequency, LogAction } from '../types';
import { useApp } from '../App';
import UsernameBadge from './UsernameBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_LOGO_URL } from '../constants';
import { supabase, supabaseStorage } from '../supabase';
import imageCompression from 'browser-image-compression';

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

// Lightbox Component for viewing full images
const Lightbox = ({ src, onClose }: { src: string, onClose: () => void }) => (
    <div className="fixed inset-0 z-[200] bg-black bg-opacity-90 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in" onClick={onClose}>
        <img src={src} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" alt="Full View" />
        <button className="absolute top-4 right-4 text-white p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
            <X className="w-6 h-6"/>
        </button>
    </div>
);

const RichToolbar = ({ onCmd, onImageClick, onLinkClick, isUploading }: { onCmd: (cmd: string, val?: string) => void, onImageClick: () => void, onLinkClick: () => void, isUploading: boolean }) => {
    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 rounded-t-lg sticky top-0 z-10 select-none">
            {/* Basic Format */}
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('bold')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="加粗"><Bold className="w-4 h-4"/></button>
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('italic')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="斜体"><Italic className="w-4 h-4"/></button>
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('underline')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="下划线"><Underline className="w-4 h-4"/></button>
            
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            
            {/* Style & Color */}
            <div className="flex items-center gap-1">
                <select onChange={(e) => onCmd('fontSize', e.target.value)} defaultValue="3" className="h-7 w-16 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 outline-none" title="字号">
                    <option value="1">极小</option>
                    <option value="2">小</option>
                    <option value="3">正常</option>
                    <option value="4">中等</option>
                    <option value="5">大</option>
                    <option value="6">极大</option>
                    <option value="7">巨无霸</option>
                </select>
                
                <div className="relative group">
                    <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center" onMouseDown={e => e.preventDefault()} title="文字颜色">
                        <Palette className="w-4 h-4 text-gray-600 dark:text-gray-300"/>
                    </button>
                    <input 
                        type="color" 
                        onChange={(e) => onCmd('foreColor', e.target.value)} 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                </div>
            </div>

            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>

            {/* Alignment */}
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('justifyLeft')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="左对齐"><AlignLeft className="w-4 h-4"/></button>
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('justifyCenter')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="居中"><AlignCenter className="w-4 h-4"/></button>
            <button onMouseDown={(e) => {e.preventDefault(); onCmd('justifyRight')}} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="右对齐"><AlignRight className="w-4 h-4"/></button>
            
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>

            {/* Media & Link */}
            <button 
                onMouseDown={(e) => {e.preventDefault(); onImageClick()}} 
                disabled={isUploading}
                className={`p-1.5 rounded relative ${isUploading ? 'opacity-50 cursor-wait' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`} 
                title="插入图片 (自动压缩)"
            >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <ImageIcon className="w-4 h-4 text-blue-600"/>}
            </button>
            <button 
                onMouseDown={(e) => {e.preventDefault(); onLinkClick()}} 
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" 
                title="插入链接 (视频/文档/附件)"
            >
                <LinkIcon className="w-4 h-4 text-green-600"/>
            </button>
        </div>
    );
};

const AnnouncementCenter: React.FC<AnnouncementCenterProps> = ({ onClose, initialPopup }) => {
  const { user, announcements, users, reloadData } = useApp();
  
  // View State
  const [view, setView] = useState<'list' | 'detail' | 'edit'>('list');
  const [activeTab, setActiveTab] = useState<'my' | 'publish' | 'manage' | 'suggestion'>('my');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  
  // Forms & Loading
  const [publishForm, setPublishForm] = useState({ 
      title: '', content: '', 
      targetMode: 'all' as 'all' | 'specific',
      targets: [] as string[], 
      popupEnabled: false, popupFrequency: 'once' as AnnouncementFrequency, 
      allowHide: true, autoRevokeEnabled: false, autoRevokeDuration: '1', autoRevokeUnit: 'months' 
  });
  const [suggestionText, setSuggestionText] = useState('');
  
  // Refs
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);

  const [loading, setLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Image Garbage Collection State (GC)
  const [tempUploads, setTempUploads] = useState<string[]>([]); // Tracks images uploaded in THIS session

  // Pagination & Filters
  const [myPage, setMyPage] = useState(1);
  const pageSize = 10;
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedForHide, setSelectedForHide] = useState<string[]>([]);
  const [manageFilterUser, setManageFilterUser] = useState<string>('');

  useEffect(() => {
      if (initialPopup) {
          setSelectedAnnouncement(initialPopup);
          setView('detail');
          if (user && !initialPopup.read_user_ids.includes(user.id)) {
              supabase.from('announcements').update({ 
                  read_user_ids: [...initialPopup.read_user_ids, user.id] 
              }).eq('id', initialPopup.id).then();
          }
      }
  }, [initialPopup, user]);

  // Clean up on component unmount if there are unsaved uploads
  useEffect(() => {
      return () => {
          if (tempUploads.length > 0) {
              console.log("Cleaning up unsaved images on unmount", tempUploads);
              supabaseStorage.storage.from('images').remove(tempUploads).then();
          }
      };
  }, []); 

  // --- Logic: Image Garbage Collection (GC) ---

  // GC: Call this when closing without saving (Cancel/Switch Tab)
  const cleanupTempImages = async () => {
      if (tempUploads.length > 0) {
          try {
              const { error } = await supabaseStorage.storage.from('images').remove(tempUploads);
              if (error) console.error("Cleanup error:", error);
              else console.log("Cleaned up unsaved images:", tempUploads);
          } catch (e) {
              console.error("Cleanup failed:", e);
          }
          setTempUploads([]);
      }
  };

  // GC: Call this when deleting an existing announcement
  const deleteAnnouncementImages = async (htmlContent: string) => {
      try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlContent, 'text/html');
          const imgs = doc.querySelectorAll('img');
          const filesToDelete: string[] = [];

          imgs.forEach(img => {
              const src = img.src;
              // Check if it's a Supabase storage image
              if (src.includes('/storage/v1/object/public/images/')) {
                  // Extract filename: split by last '/'
                  const parts = src.split('/');
                  const fileName = parts[parts.length - 1];
                  if (fileName) filesToDelete.push(fileName);
              }
          });

          if (filesToDelete.length > 0) {
              const { error } = await supabaseStorage.storage.from('images').remove(filesToDelete);
              if (error) console.error("Failed to delete announcement images:", error);
              else console.log("Deleted announcement images:", filesToDelete);
          }
      } catch (e) {
          console.error("Error parsing images for deletion:", e);
      }
  };

  const handleCloseWrapper = async () => {
      await cleanupTempImages();
      onClose();
  };

  const handleTabChange = async (newTab: 'my' | 'publish' | 'manage' | 'suggestion') => {
      if (activeTab === 'publish' && newTab !== 'publish') {
          // Leaving publish tab, clean up unsaved images
          await cleanupTempImages();
      }
      setActiveTab(newTab);
  };

  // --- Rich Text Logic ---

  const saveSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
          savedSelectionRef.current = sel.getRangeAt(0);
      }
  };

  const restoreSelection = () => {
      const sel = window.getSelection();
      if (sel && savedSelectionRef.current) {
          sel.removeAllRanges();
          sel.addRange(savedSelectionRef.current);
      }
  };

  const execCmd = (cmd: string, val?: string) => { 
      document.execCommand(cmd, false, val); 
      updateContentState();
  };

  const updateContentState = () => {
      if (contentEditableRef.current) {
          setPublishForm(prev => ({ ...prev, content: contentEditableRef.current?.innerHTML || '' }));
      }
  };

  // --- Image Upload Logic ---

  const uploadAndInsertImage = async (file: File) => {
      setIsUploadingImage(true);
      try {
          // 1. Compress
          const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true };
          const compressedFile = await imageCompression(file, options);
          
          // 2. Upload
          const fileName = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`;
          const { error } = await supabaseStorage.storage.from('images').upload(fileName, compressedFile, {
              contentType: 'image/jpeg',
              upsert: false
          });
          if (error) throw error;

          // Track for cleanup
          setTempUploads(prev => [...prev, fileName]);

          // 3. Get URL
          const { data: publicData } = supabaseStorage.storage.from('images').getPublicUrl(fileName);
          const url = publicData.publicUrl;

          // 4. Insert
          restoreSelection(); // Restore cursor position
          contentEditableRef.current?.focus(); 
          document.execCommand('insertImage', false, url);
          updateContentState();

      } catch (e: any) {
          console.error(e);
          alert("图片上传失败: " + e.message);
      } finally {
          setIsUploadingImage(false);
          if (imageInputRef.current) imageInputRef.current.value = ''; // Reset input
      }
  };

  const handleImageToolbarClick = () => {
      saveSelection(); 
      imageInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          uploadAndInsertImage(e.target.files[0]);
      }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
              const file = items[i].getAsFile();
              if (file) {
                  e.preventDefault(); 
                  saveSelection(); 
                  uploadAndInsertImage(file);
              }
          }
      }
  };

  const handleDrop = (e: React.DragEvent) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0 && files[0].type.startsWith('image/')) {
          e.preventDefault(); 
          contentEditableRef.current?.focus(); 
          uploadAndInsertImage(files[0]);
      }
  };

  // --- Link Logic ---

  const handleLinkToolbarClick = () => {
      saveSelection();
      const url = prompt("请输入链接地址 (例如: https://...)\n支持视频/网盘/文档链接", "https://");
      if (url) {
          restoreSelection();
          contentEditableRef.current?.focus();
          
          const sel = window.getSelection();
          const text = sel && !sel.isCollapsed ? sel.toString() : url;
          // Force blue style and security attributes
          const html = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; cursor: pointer;">${text}</a>&nbsp;`;
          
          document.execCommand('insertHTML', false, html);
          updateContentState();
      }
  };

  // --- Handling Content Click (Lightbox) ---
  const handleContentClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      // Handle Image Click
      if (target.tagName === 'IMG') {
          const img = target as HTMLImageElement;
          setLightboxSrc(img.src);
      }
  };

  // --- Standard Logic ---

  const isExpired = (ann: Announcement) => {
      if (!ann.auto_revoke_config?.enabled || !ann.auto_revoke_config.revoke_date) return false;
      return new Date(ann.auto_revoke_config.revoke_date) < new Date();
  };

  const handlePublish = async (isEdit: boolean = false) => {
    if (user?.role === RoleLevel.GUEST) return alert('权限不足');
    if (!publishForm.title || !publishForm.content) return alert('标题和内容不能为空');
    if (publishForm.targetMode === 'specific' && publishForm.targets.length === 0) return alert('请至少选择一个接收对象');
    if (isUploadingImage) return alert('图片正在上传中，请稍后...');

    setLoading(true);
    let revokeAt = null;
    if (publishForm.autoRevokeEnabled) {
        const date = new Date(); const num = parseInt(publishForm.autoRevokeDuration);
        if (publishForm.autoRevokeUnit === 'days') date.setDate(date.getDate() + num); else date.setMonth(date.getMonth() + num);
        revokeAt = date.toISOString();
    }

    try {
        // 1. Process Content: Force link attributes (Safety + Styling)
        const parser = new DOMParser();
        const doc = parser.parseFromString(publishForm.content, 'text/html');
        
        // Links
        doc.querySelectorAll('a').forEach(a => {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
            a.style.color = '#2563eb';
            a.style.textDecoration = 'underline';
            a.style.cursor = 'pointer';
        });

        // 2. GC Check: Detect images deleted from editor before publish
        // If a file is in tempUploads but NOT in the final HTML, delete it.
        const usedImageUrls = Array.from(doc.querySelectorAll('img')).map(img => img.src);
        const unusedFiles = tempUploads.filter(fileName => !usedImageUrls.some(url => url.includes(fileName)));
        
        if (unusedFiles.length > 0) {
            console.log("Deleting unused images before publish:", unusedFiles);
            await supabaseStorage.storage.from('images').remove(unusedFiles);
        }

        const processedContent = doc.body.innerHTML;

        const payload = {
            title: publishForm.title, 
            content: processedContent, 
            target_user_ids: publishForm.targetMode === 'all' ? [] : publishForm.targets,
            popup_config: publishForm.popupEnabled ? { enabled: true, frequency: publishForm.popupFrequency } : null,
            allow_hide: publishForm.allowHide,
            auto_revoke_config: publishForm.autoRevokeEnabled ? { enabled: true, revoke_date: revokeAt } : null
        };

        if (isEdit && selectedAnnouncement) { 
            // --- NEW: Detect removed original images (Previously saved images) ---
            const oldHtml = selectedAnnouncement.content;
            const newHtml = processedContent;
            
            const getImgNames = (html: string) => {
                const p = new DOMParser();
                const d = p.parseFromString(html, 'text/html');
                return Array.from(d.querySelectorAll('img'))
                    .map(img => img.src)
                    .filter(src => src.includes('/storage/v1/object/public/images/'))
                    .map(src => src.split('/').pop() || '');
            };

            const oldImages = getImgNames(oldHtml);
            const newImages = getImgNames(newHtml);
            
            // Find images present in old but missing in new (removed during edit)
            const imagesToDelete = oldImages.filter(img => !newImages.includes(img) && img);

            if (imagesToDelete.length > 0) {
                console.log("Deleting removed original images:", imagesToDelete);
                await supabaseStorage.storage.from('images').remove(imagesToDelete);
            }
            // ------------------------------------------

            await supabase.from('announcements').update(payload).eq('id', selectedAnnouncement.id); 
            // Edit success, clear temp tracking (files are now permanent)
            setTempUploads([]); 
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
            // Publish success, clear temp tracking (files are now permanent)
            setTempUploads([]);
            alert('发布成功！'); 
        }
        await reloadData(); 
        setPublishForm({ title: '', content: '', targetMode: 'all', targets: [], popupEnabled: false, popupFrequency: 'once', allowHide: true, autoRevokeEnabled: false, autoRevokeDuration: '1', autoRevokeUnit: 'months' });
        if(contentEditableRef.current) contentEditableRef.current.innerHTML = '';
        setView('list'); 
        setActiveTab('my');
    } catch (err: any) { alert('操作失败: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleSoftHide = async () => {
      if (selectedForHide.length === 0) return;
      setLoading(true);
      try {
          for (const id of selectedForHide) {
              const ann = announcements.find(a => a.id === id);
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

  const handleRevoke = async (ann: Announcement) => {
      if (!window.confirm(`确定要撤销公告 "${ann.title}" 吗？撤销后全员不可见。`)) return;
      setLoading(true);
      try {
          // 1. Delete associated images from storage (Clean up bucket)
          await deleteAnnouncementImages(ann.content);
          
          // 2. Delete record from database
          await supabase.from('announcements').delete().eq('id', ann.id);
          await reloadData();
      } catch (err) { alert('撤销失败'); }
      finally { setLoading(false); }
  };

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
              target_roles: [RoleLevel.ROOT],
              read_user_ids: [],
              created_at: new Date().toISOString()
          });
          setSuggestionText('');
          alert('感谢您的建议！');
          setActiveTab('my');
      } catch(err) { alert('提交失败'); }
      finally { setLoading(false); }
  };

  const getFilteredAnnouncements = () => {
      if (activeTab === 'my') {
          return announcements.filter(ann => {
              if (ann.hidden_by_users?.includes(user?.id || '')) return false;
              if (ann.type === 'suggestion') return false; 
              if (isExpired(ann)) return false;
              if (ann.author_id === user?.id) return true;
              const isTargetExplicit = (!ann.target_userIds || ann.target_userIds.length === 0 || ann.target_userIds.includes(user?.id || ''));
              const isHigherRank = user?.role && ann.author_role && (user.role < ann.author_role);
              if (isTargetExplicit || isHigherRank) return true;
              return false;
          });
      }
      if (activeTab === 'manage') {
          return announcements.filter(ann => {
              if (ann.type === 'suggestion') return false;
              if (manageFilterUser && ann.author_name !== manageFilterUser) return false;
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
          targetMode: (ann.target_userIds && ann.target_userIds.length > 0) ? 'specific' : 'all',
          targets: ann.target_userIds || [],
          popupEnabled: !!ann.popup_config,
          popupFrequency: ann.popup_config?.frequency || 'once',
          allowHide: ann.allow_hide,
          autoRevokeEnabled: !!ann.auto_revoke_config,
          autoRevokeDuration: '1',
          autoRevokeUnit: 'months'
      });
      setSelectedAnnouncement(ann);
      setActiveTab('publish');
      // Reset temp uploads when starting an edit (existing images are safe)
      setTempUploads([]); 
      setTimeout(() => {
          if(contentEditableRef.current) contentEditableRef.current.innerHTML = ann.content;
      }, 100);
  };

  const eligibleTargets = users.filter(u => {
      if (!user) return false;
      if (u.id === user.id) return true;
      return u.role > user.role;
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 relative overflow-hidden">
      {/* Lightbox */}
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      
      {/* Hidden File Input for Image Upload */}
      <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={handleFileChange} />

      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2">
            {view !== 'list' && <button onClick={() => { setView('list'); setSelectedAnnouncement(null); }}><ArrowLeft className="w-5 h-5"/></button>}
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                {view === 'detail' ? '公告详情' : '公告中心'}
            </h2>
        </div>
        <button onClick={handleCloseWrapper} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6" /></button>
      </div>

      {view === 'list' && (
          <div className="flex border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            {[{ id: 'my', label: '我的公告' }, { id: 'publish', label: '发布公告' }, { id: 'manage', label: '公告管理' }, { id: 'suggestion', label: '意见箱' }].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => handleTabChange(tab.id as any)} 
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
                {/* 
                    CONTENT RENDERER 
                    Added styles for Thumbnails and Links
                */}
                <div 
                    className="prose dark:prose-invert max-w-none mb-8 break-words [&_img]:max-h-48 [&_img]:rounded-lg [&_img]:cursor-zoom-in [&_img]:border [&_img]:dark:border-gray-700 [&_img]:inline-block [&_img]:m-1 [&_img]:shadow-sm hover:[&_img]:opacity-90 [&_a]:text-blue-600 [&_a]:underline [&_a]:font-medium" 
                    dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }} 
                    onClick={handleContentClick}
                />
                
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
                {/* My Announcements */}
                {activeTab === 'my' && (
                  <div className="space-y-3">
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
                                    <UsernameBadge name={ann.author_name} roleLevel={ann.author_role} />
                                    <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </motion.div>
                      );
                    })}
                    {paginatedList.length === 0 && <p className="text-center text-gray-400 py-10">暂无公告</p>}
                  </div>
                )}

                {/* Publish Announcement */}
                {activeTab === 'publish' && (
                    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
                        {/* Segmented Control for Edit Mode */}
                        {selectedAnnouncement && (
                            <div className="flex justify-center mb-2">
                                <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-xl gap-1">
                                    <button 
                                        onClick={async () => {
                                            await cleanupTempImages();
                                            setSelectedAnnouncement(null);
                                            setPublishForm({ title: '', content: '', targetMode: 'all', targets: [], popupEnabled: false, popupFrequency: 'once', allowHide: true, autoRevokeEnabled: false, autoRevokeDuration: '1', autoRevokeUnit: 'months' });
                                            if(contentEditableRef.current) contentEditableRef.current.innerHTML = '';
                                            setTempUploads([]);
                                        }}
                                        className="px-6 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                    >
                                        发布公告
                                    </button>
                                    <button 
                                        className="px-6 py-2 rounded-lg text-sm font-bold bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm cursor-default"
                                    >
                                        修改公告
                                    </button>
                                </div>
                            </div>
                        )}

                        <input value={publishForm.title} onChange={e => setPublishForm({...publishForm, title: e.target.value})} placeholder="公告标题" className="w-full p-3 text-lg font-bold border-b outline-none bg-transparent placeholder-gray-400" />
                        
                        {/* Rich Text Editor */}
                        <div className="border rounded-xl overflow-hidden dark:border-gray-600 bg-white dark:bg-gray-800 flex flex-col relative">
                            <RichToolbar 
                                onCmd={execCmd} 
                                onImageClick={handleImageToolbarClick}
                                onLinkClick={handleLinkToolbarClick}
                                isUploading={isUploadingImage}
                            />
                            {/* Editor Area with thumbnail styles applied */}
                            <div 
                                ref={contentEditableRef} 
                                contentEditable 
                                className="min-h-[300px] p-4 outline-none dark:text-gray-200 overflow-y-auto [&_img]:max-h-32 [&_img]:rounded-md [&_img]:border [&_img]:m-1 [&_img]:inline-block" 
                                onInput={updateContentState} 
                                onPaste={handlePaste}
                                onDrop={handleDrop}
                                onBlur={saveSelection} 
                            />
                            {isUploadingImage && (
                                <div className="absolute inset-0 bg-white/70 dark:bg-gray-800/70 flex flex-col items-center justify-center z-20 backdrop-blur-sm text-blue-600">
                                    <Loader2 className="w-8 h-8 animate-spin mb-2"/>
                                    <span className="text-sm font-bold">图片压缩上传中...</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="text-xs text-gray-400 px-2 flex justify-between">
                            <span>支持粘贴/拖拽图片。大图将自动压缩。</span>
                            <span>发布后链接将自动变为蓝色可点。</span>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                            
                            {/* Recipient Selection */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 md:col-span-2">
                                <label className="flex items-center gap-2 mb-3 font-bold text-gray-700 dark:text-gray-300">
                                    <input 
                                        type="checkbox" 
                                        checked={publishForm.targetMode === 'specific'} 
                                        onChange={e => setPublishForm({...publishForm, targetMode: e.target.checked ? 'specific' : 'all'})} 
                                        className="w-4 h-4 text-blue-600 rounded" 
                                    /> 
                                    指定接收对象 {publishForm.targetMode === 'all' && <span className="text-gray-400 font-normal">(默认: 全员可见)</span>}
                                </label>
                                
                                {publishForm.targetMode === 'specific' && (
                                    <div className="max-h-40 overflow-y-auto bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-600 grid grid-cols-2 gap-2">
                                        {eligibleTargets.map(u => (
                                            <label key={u.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={publishForm.targets.includes(u.id)}
                                                    onChange={e => {
                                                        if (e.target.checked) setPublishForm(prev => ({ ...prev, targets: [...prev.targets, u.id] }));
                                                        else setPublishForm(prev => ({ ...prev, targets: prev.targets.filter(id => id !== u.id) }));
                                                    }}
                                                    className="w-3 h-3 text-blue-600 rounded"
                                                />
                                                <span className="text-xs truncate"><UsernameBadge name={u.username} roleLevel={u.role} /></span>
                                            </label>
                                        ))}
                                        {eligibleTargets.length === 0 && <p className="col-span-2 text-xs text-gray-400 text-center">无可选低权限用户</p>}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                                <label className="flex items-center gap-2 mb-3 font-bold text-gray-700 dark:text-gray-300">
                                    <input type="checkbox" checked={publishForm.popupEnabled} onChange={e => setPublishForm({...publishForm, popupEnabled: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" /> 
                                    强弹窗提醒
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
                                    自动撤销 (过期)
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
                                    允许用户删除/隐藏
                                </label>
                            </div>
                        </div>

                        <LoadingButton onClick={() => handlePublish(!!selectedAnnouncement)} loading={loading || isUploadingImage} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">
                            {selectedAnnouncement ? '保存修改' : '发布公告'}
                        </LoadingButton>
                    </div>
                )}

                {/* Announcement Management */}
                {activeTab === 'manage' && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <select value={manageFilterUser} onChange={e => setManageFilterUser(e.target.value)} className="p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm">
                                <option value="">所有发布人</option>
                                {users.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}
                            </select>
                        </div>

                        {paginatedList.map(ann => {
                            const expired = isExpired(ann);
                            return (
                            <div key={ann.id} className="p-4 bg-white dark:bg-gray-700/30 border rounded-xl flex justify-between items-center hover:shadow-md transition-shadow">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="font-bold text-gray-800 dark:text-gray-200">{ann.title}</div>
                                        {expired && <span className="text-xs bg-red-100 text-red-600 px-2 rounded font-bold">已过期</span>}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        发布人: <UsernameBadge name={ann.author_name} roleLevel={ann.author_role} /> | {new Date(ann.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => prepareEdit(ann)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="编辑"><Edit3 className="w-4 h-4"/></button>
                                    <LoadingButton loading={loading && selectedAnnouncement?.id === ann.id} onClick={() => handleRevoke(ann)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="撤销">
                                        <Trash2 className="w-4 h-4"/>
                                    </LoadingButton>
                                </div>
                            </div>
                        )})}
                        {paginatedList.length === 0 && <p className="text-center text-gray-400 py-10">无公告记录</p>}
                    </div>
                )}

                {/* Suggestion Box */}
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
