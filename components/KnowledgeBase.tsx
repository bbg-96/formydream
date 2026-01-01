import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Tag, BookOpen, X, Hash, Trash2, Image as ImageIcon, ArrowLeft, Save, List, ListOrdered, Indent, Outdent, AlertCircle, FileText, Edit } from 'lucide-react';
import { KnowledgeItem } from '../types';
import { api } from '../services/api';

interface KnowledgeBaseProps {
  items: KnowledgeItem[];
  setItems: React.Dispatch<React.SetStateAction<KnowledgeItem[]>>;
}

const CATEGORIES = ['AWS', 'GCP', 'Azure', 'Kubernetes', 'DevOps', 'General'] as const;

// Helper functions
const getSafeContent = (content: string) => {
  let safe = content.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg shadow-sm my-4 border border-gray-200" />');
  if (!safe.includes('<div') && !safe.includes('<p') && !safe.includes('<img') && !safe.includes('<br') && !safe.includes('<ul') && !safe.includes('<ol')) {
       safe = safe.replace(/\n/g, '<br />');
  }
  return safe;
};

const stripHtml = (html: string) => {
   const doc = new DOMParser().parseFromString(html, 'text/html');
   return doc.body.textContent || "";
};

const getUserId = () => {
    const userStr = localStorage.getItem('cloudops_user');
    return userStr ? JSON.parse(userStr).id : 'unknown';
};

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ items, setItems }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'ALL'>('ALL');
  
  // Editor State
  const [isWriting, setIsWriting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // To track if we are editing a draft or existing item
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Viewer State
  const [viewingItem, setViewingItem] = useState<KnowledgeItem | null>(null);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState(''); 
  const [newCategory, setNewCategory] = useState<typeof CATEGORIES[number]>('General');
  const [newTags, setNewTags] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRangeRef = useRef<Range | null>(null);

  const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase();
    const contentText = stripHtml(item.content).toLowerCase();
    const matchesSearch = item.title.toLowerCase().includes(term) || 
                          item.tags.some(t => t.toLowerCase().includes(term)) ||
                          contentText.includes(term);
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Effect to sync content to editor div when opening existing item/draft
  useEffect(() => {
    if (isWriting && editorRef.current && newContent) {
      if (editorRef.current.innerHTML !== newContent) {
        editorRef.current.innerHTML = newContent;
      }
    }
  }, [isWriting]);

  const handleStartWriting = (item?: KnowledgeItem) => {
    resetForm();
    if (item) {
      setEditingId(item.id);
      setNewTitle(item.title);
      setNewContent(item.content);
      setNewCategory(item.category);
      setNewTags(item.tags.join(', '));
    }
    setIsWriting(true);
  };

  const handleEditStart = (item: KnowledgeItem) => {
      setViewingItem(null);
      handleStartWriting(item);
  };

  const handleCancelRequest = () => {
    const hasContent = newTitle.trim().length > 0 || stripHtml(newContent).trim().length > 0;
    
    if (hasContent) {
      setShowExitDialog(true);
    } else {
      exitEditor();
    }
  };

  const exitEditor = () => {
    setIsWriting(false);
    resetForm();
    setShowExitDialog(false);
    setEditingId(null);
  };

  const handleDraftSave = () => {
    handleAddItem(true); // Save as draft
    exitEditor();
  };

  const handleDiscard = () => {
    exitEditor();
  };

  const handleSave = () => {
    if (!newTitle.trim()) {
        alert('제목을 입력해주세요.');
        return;
    }
    handleAddItem(false); // Save as published
    exitEditor();
  };

  const handleAddItem = async (isDraft: boolean) => {
    const finalTitle = newTitle.trim() || (isDraft ? '(제목 없음)' : '');
    if (!finalTitle && !isDraft) return;

    // [Fix] Generate Local Date (YYYY-MM-DD) for DB storage
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - offset).toISOString().split('T')[0];

    const newItem: KnowledgeItem = {
      id: editingId || `k-${Date.now()}`,
      title: finalTitle,
      content: newContent,
      category: newCategory,
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: localDate, // Use Local Date
      isDraft: isDraft
    };

    // Determine if we are updating an existing non-draft item or creating new/updating draft
    const isExistingPublishedItem = editingId && items.some(i => i.id === editingId && !i.isDraft);

    setItems(prev => {
      // If we are editing an existing item (draft or published), replace it
      if (editingId) {
        return prev.map(item => item.id === editingId ? newItem : item);
      }
      // Otherwise add new
      return [newItem, ...prev];
    });

    if (isExistingPublishedItem) {
        await api.knowledge.update(getUserId(), newItem.id, newItem);
    } else {
        await api.knowledge.save(getUserId(), newItem);
    }
  };

  const handleDeleteItem = async (id: string, e?: React.MouseEvent) => {
     e?.stopPropagation();
     if(window.confirm('정말 삭제하시겠습니까?')) {
       setItems(prev => prev.filter(item => item.id !== id));
       if (viewingItem?.id === id) setViewingItem(null);
       await api.knowledge.delete(id);
     }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewContent('');
    setNewCategory('General');
    setNewTags('');
    if (editorRef.current) {
        editorRef.current.innerHTML = '';
    }
  };

  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'AWS': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'GCP': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Azure': return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'Kubernetes': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'DevOps': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // --- Editor Logic (ContentEditable) ---
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      selectionRangeRef.current = sel.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && selectionRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(selectionRangeRef.current);
    }
  };

  const insertImage = (base64: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
      document.execCommand('insertImage', false, base64);
      setNewContent(editorRef.current.innerHTML);
    }
  };

  const execCmd = (command: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command);
      setNewContent(editorRef.current.innerHTML);
    }
  }

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      insertImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let hasImage = false;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        hasImage = true;
        e.preventDefault(); 
        const blob = item.getAsFile();
        if (blob) {
          processImageFile(blob);
        }
      }
    }

    if (!hasImage) {
      setTimeout(() => {
        if(editorRef.current) setNewContent(editorRef.current.innerHTML);
      }, 0);
    }
  };

  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    setNewContent(e.currentTarget.innerHTML);
  };

  // --- Editor View ---
  if (isWriting) {
    return (
        <div className="h-full flex flex-col bg-white animate-fade-in relative z-0">
            {/* Exit Confirmation Dialog */}
            {showExitDialog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-fade-in-up">
                  <div className="flex items-center gap-3 mb-4 text-amber-600">
                    <AlertCircle size={28} />
                    <h3 className="text-lg font-bold text-gray-800">작성 취소</h3>
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    작성 중인 내용이 있습니다.<br/>
                    저장하지 않고 나가시겠습니까?
                  </p>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={handleDraftSave}
                      className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      임시 저장하고 나가기
                    </button>
                    <button 
                      onClick={handleDiscard}
                      className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      저장 안 함 (삭제)
                    </button>
                    <button 
                      onClick={() => setShowExitDialog(false)}
                      className="w-full py-2.5 text-gray-500 hover:text-gray-800 transition-colors text-sm mt-2"
                    >
                      계속 작성하기
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Editor Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
                 <div className="flex items-center gap-4">
                     <button 
                        onClick={handleCancelRequest}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                     >
                        <ArrowLeft size={24} />
                     </button>
                     <h2 className="text-lg font-bold text-gray-800">
                        {editingId ? '지식 수정' : '새 지식 작성'}
                     </h2>
                 </div>
                 <div className="flex gap-2">
                     <button 
                        onClick={handleCancelRequest}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                     >
                        취소
                     </button>
                     <button 
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors"
                     >
                        <Save size={18} />
                        발행하기
                     </button>
                 </div>
            </div>

            {/* Editor Body */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
                <div className="max-w-4xl mx-auto my-8 bg-white rounded-xl shadow-sm border border-gray-200 min-h-[calc(100%-4rem)] p-8 sm:p-12 flex flex-col">
                    
                    {/* Title Input */}
                    <input 
                        type="text"
                        placeholder="제목을 입력하세요"
                        className="text-4xl font-bold text-gray-800 placeholder:text-gray-300 w-full outline-none bg-transparent mb-6"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        autoFocus
                    />

                    {/* Meta Controls */}
                    <div className="flex flex-wrap items-center gap-4 mb-8 text-sm">
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                            <span className="text-gray-500 font-medium">카테고리</span>
                            <select 
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value as any)}
                                className="bg-transparent outline-none font-semibold text-gray-700 cursor-pointer"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 flex-1 hover:border-blue-300 transition-colors focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                            <Hash size={14} className="text-gray-400" />
                            <input 
                                type="text"
                                placeholder="태그 (쉼표로 구분)..."
                                className="bg-transparent outline-none w-full text-gray-700 placeholder:text-gray-400"
                                value={newTags}
                                onChange={e => setNewTags(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-4 sticky top-0 bg-white z-[5]">
                        <button 
                            onClick={() => {
                                saveSelection();
                                fileInputRef.current?.click();
                            }}
                            className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                            title="이미지 첨부"
                        >
                            <ImageIcon size={18} />
                            <span>이미지</span>
                        </button>
                        <input 
                           type="file" 
                           ref={fileInputRef} 
                           className="hidden" 
                           accept="image/*" 
                           onChange={handleFileChange}
                        />

                        <div className="w-px h-4 bg-gray-200 mx-1"></div>

                        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5">
                            <button 
                                onClick={() => execCmd('insertUnorderedList')}
                                className="p-1.5 text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded transition-all"
                                title="글머리 기호"
                            >
                                <List size={18} />
                            </button>
                            <button 
                                onClick={() => execCmd('insertOrderedList')}
                                className="p-1.5 text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded transition-all"
                                title="번호 매기기"
                            >
                                <ListOrdered size={18} />
                            </button>
                            <div className="w-px h-3 bg-gray-300 mx-1"></div>
                            <button 
                                onClick={() => execCmd('outdent')}
                                className="p-1.5 text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded transition-all"
                                title="내어쓰기"
                            >
                                <Outdent size={18} />
                            </button>
                            <button 
                                onClick={() => execCmd('indent')}
                                className="p-1.5 text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded transition-all"
                                title="들여쓰기"
                            >
                                <Indent size={18} />
                            </button>
                        </div>

                        <div className="flex-1"></div>
                        
                        <span className="text-xs text-gray-400">
                            팁: 캡처 이미지를 바로 붙여넣기(Ctrl+V) 하세요.
                        </span>
                    </div>

                    {/* Content Editable Area */}
                    <div
                        ref={editorRef}
                        contentEditable
                        onInput={handleEditorInput}
                        onPaste={handlePaste}
                        onBlur={saveSelection}
                        className="flex-1 outline-none text-gray-700 leading-relaxed text-lg prose max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                        data-placeholder="이곳에 내용을 자유롭게 작성하세요..."
                        style={{ minHeight: '400px' }}
                    />
                </div>
            </div>
        </div>
    );
  }

  // --- List View ---
  return (
    <div className="h-full flex flex-col p-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="text-blue-600" /> 
            지식 저장소
          </h2>
          <p className="text-sm text-gray-500 mt-1">기술 노하우와 트러블슈팅 가이드를 기록하세요.</p>
        </div>
        <button
          onClick={() => handleStartWriting()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={18} />
          새 기록
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="제목, 태그, 내용 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          <button 
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${selectedCategory === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
             <button 
               key={cat}
               onClick={() => setSelectedCategory(cat)}
               className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-slate-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
             >
               {cat}
             </button>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-4">
        {filteredItems.map(item => (
          <div 
            key={item.id} 
            onClick={() => {
                if(item.isDraft) {
                    handleStartWriting(item);
                } else {
                    setViewingItem(item);
                }
            }}
            className={`
                bg-white rounded-xl p-5 shadow-sm border hover:shadow-md transition-all cursor-pointer flex flex-col h-64 group relative
                ${item.isDraft ? 'border-dashed border-blue-300 bg-blue-50/10' : 'border-gray-100'}
            `}
          >
            {item.isDraft && (
                <div className="absolute top-4 right-4 bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                    <FileText size={10} />
                    임시저장
                </div>
            )}
            
            <div className="flex justify-between items-start mb-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getCategoryColor(item.category)}`}>
                {item.category}
              </span>
              <span className="text-xs text-gray-400">{item.createdAt}</span>
            </div>
            
            <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 pr-12">{item.title}</h3>
            
            <p className="text-sm text-gray-500 mb-4 line-clamp-3 flex-1 break-words">
              {stripHtml(getSafeContent(item.content))}
            </p>
            
            <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                    <Hash size={14} className="text-gray-300" />
                    <div className="flex gap-1 overflow-hidden">
                        {item.tags.map(tag => (
                        <span key={tag} className="text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                            {tag}
                        </span>
                        ))}
                    </div>
                </div>
                {item.isDraft && (
                     <button 
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="임시저장 삭제"
                     >
                        <Trash2 size={16} />
                     </button>
                )}
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
            <BookOpen size={48} className="opacity-20 mb-4" />
            <p>저장된 지식이 없습니다. 새로운 기록을 추가해보세요!</p>
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                <div>
                   <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded border mb-2 ${getCategoryColor(viewingItem.category)}`}>
                      {viewingItem.category}
                   </span>
                   <h2 className="text-2xl font-bold text-gray-800">{viewingItem.title}</h2>
                   <p className="text-sm text-gray-400 mt-1">{viewingItem.createdAt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEditStart(viewingItem)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="수정"
                  >
                    <Edit size={20} />
                  </button>
                  <button 
                    onClick={(e) => {
                        if(window.confirm('삭제하시겠습니까?')) {
                            handleDeleteItem(viewingItem.id);
                        }
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="삭제"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button onClick={() => setViewingItem(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Render Safe HTML Content */}
              <div 
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed [&>img]:rounded-lg [&>img]:shadow-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: getSafeContent(viewingItem.content) }}
              />

              <div className="mt-8 pt-4 border-t border-gray-100 flex items-center gap-2">
                <Tag size={16} className="text-gray-400" />
                <div className="flex gap-2">
                   {viewingItem.tags.map(tag => (
                      <span key={tag} className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        #{tag}
                      </span>
                   ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};