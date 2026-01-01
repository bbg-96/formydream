import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Plus, Trash2, StickyNote, Check, GripHorizontal, List, Search, MapPin, X } from 'lucide-react';
import { Memo } from '../types';
import { api } from '../services/api';

interface MemoBoardProps {
  userId: string;
}

const COLORS = {
  YELLOW: 'bg-yellow-200 border-yellow-300',
  BLUE: 'bg-blue-200 border-blue-300',
  GREEN: 'bg-green-200 border-green-300',
  PINK: 'bg-pink-200 border-pink-300',
  PURPLE: 'bg-purple-200 border-purple-300',
};

// [Optimized] Extracted MemoCard to prevent re-creation on every parent render
interface MemoCardProps {
    memo: Memo;
    onUpdate: (id: string, updates: Partial<Memo>) => void;
    onDelete: (id: string) => void;
    onBringToFront: (id: string) => void;
}

const MemoCard: React.FC<MemoCardProps> = ({ memo, onUpdate, onDelete, onBringToFront }) => {
    const [localContent, setLocalContent] = useState(memo.content);
    const [isFocused, setIsFocused] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const memoRef = useRef<HTMLDivElement>(null);

    // Sync props to DOM styles ensuring React doesn't overwrite manual drag/resize updates.
    useLayoutEffect(() => {
        if (memoRef.current) {
            // Only apply props-based styles if we are NOT actively interacting.
            if (!isDragging && !isResizing) {
                memoRef.current.style.left = `${memo.x || 0}px`;
                memoRef.current.style.top = `${memo.y || 0}px`;
                memoRef.current.style.width = `${memo.width || 280}px`;
                memoRef.current.style.height = `${memo.height || 280}px`;
            }
        }
    }, [memo.x, memo.y, memo.width, memo.height, isDragging, isResizing]);

    useEffect(() => {
        setLocalContent(memo.content);
    }, [memo.content]);

    const handleBlur = () => {
        setIsFocused(false);
        if (localContent !== memo.content) {
            onUpdate(memo.id, { content: localContent });
        }
    };

    // --- Drag Logic (Position) ---
    const handleDragStart = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'TEXTAREA') return; 
        if (target.closest('button')) return;
        if (target.closest('.resize-handle')) return;

        e.preventDefault();
        // Don't call onBringToFront here to avoid re-render loop start. 
        // We use z-index in style to handle visual layering during drag.
        setIsDragging(true);

        const startX = e.clientX;
        const startY = e.clientY;
        
        const rect = memoRef.current?.getBoundingClientRect();
        const parentRect = memoRef.current?.parentElement?.getBoundingClientRect();
        
        // Calculate initial relative position
        const currentLeft = rect && parentRect ? rect.left - parentRect.left + (memoRef.current?.parentElement?.scrollLeft || 0) : (memo.x || 0);
        const currentTop = rect && parentRect ? rect.top - parentRect.top + (memoRef.current?.parentElement?.scrollTop || 0) : (memo.y || 0);

        const handleMouseMove = (me: MouseEvent) => {
            const dx = me.clientX - startX;
            const dy = me.clientY - startY;
            
            // Apply Boundary Constraint (Prevent negative coordinates)
            // This fixes the issue where memos get hidden top/left
            const newX = Math.max(0, currentLeft + dx);
            const newY = Math.max(0, currentTop + dy);
            
            if (memoRef.current) {
                memoRef.current.style.left = `${newX}px`;
                memoRef.current.style.top = `${newY}px`;
            }
        };

        const handleMouseUp = (ue: MouseEvent) => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            
            const dx = ue.clientX - startX;
            const dy = ue.clientY - startY;
            
            // Final Boundary Check
            const finalX = Math.max(0, currentLeft + dx);
            const finalY = Math.max(0, currentTop + dy);
            
            if (dx !== 0 || dy !== 0) {
                onUpdate(memo.id, { x: finalX, y: finalY });
            }
            
            // Reorder only after drag finishes
            onBringToFront(memo.id);
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // --- Resize Logic (Size) ---
    const handleResizeStart = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); 
      setIsResizing(true);
      // z-index will handle layering during resize

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = memoRef.current?.offsetWidth || memo.width || 280;
      const startHeight = memoRef.current?.offsetHeight || memo.height || 280;

      const handleMouseMove = (moveEvent: MouseEvent) => {
          const newWidth = Math.max(200, startWidth + (moveEvent.clientX - startX));
          const newHeight = Math.max(200, startHeight + (moveEvent.clientY - startY));
          
          if (memoRef.current) {
              memoRef.current.style.width = `${newWidth}px`;
              memoRef.current.style.height = `${newHeight}px`;
          }
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          
          const newWidth = Math.max(200, startWidth + (upEvent.clientX - startX));
          const newHeight = Math.max(200, startHeight + (upEvent.clientY - startY));

          onUpdate(memo.id, { width: newWidth, height: newHeight });
          onBringToFront(memo.id);
          setIsResizing(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    return (
      <div 
          ref={memoRef}
          onMouseDown={handleDragStart}
          style={{ 
              position: 'absolute',
              // Visual optimization: High z-index during interaction. 
              // Using '1' instead of 'auto' creates a new stacking context so children (resize handle) don't bleed through other elements.
              zIndex: isDragging || isResizing ? 9999 : 1 
          }}
          className={`
              p-5 rounded-lg shadow-md border ${COLORS[memo.color as keyof typeof COLORS]} 
              flex flex-col transition-shadow hover:shadow-xl group
              ${isDragging ? 'cursor-grabbing shadow-2xl opacity-90' : 'cursor-grab'}
              ${isResizing ? 'cursor-se-resize' : ''}
          `}
      >
          {/* Color Picker & Delete */}
          <div className="flex justify-between items-start mb-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 left-4 z-10">
              <div 
                  className="flex gap-1 bg-white/50 p-1 rounded-full backdrop-blur-sm"
                  onMouseDown={(e) => e.stopPropagation()} 
              >
                  {Object.keys(COLORS).map((c) => (
                      <button
                          key={c}
                          onClick={() => onUpdate(memo.id, { color: c as any })}
                          className={`w-3 h-3 rounded-full border border-gray-300 hover:scale-125 transition-transform ${COLORS[c as keyof typeof COLORS].split(' ')[0]}`}
                      />
                  ))}
              </div>
              <button 
                  onClick={() => onDelete(memo.id)}
                  className="text-gray-500 hover:text-red-600 bg-white/50 p-1 rounded-full"
                  onMouseDown={(e) => e.stopPropagation()}
              >
                  <Trash2 size={14} />
              </button>
          </div>

          <textarea
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              onFocus={() => {
                  setIsFocused(true);
                  onBringToFront(memo.id);
              }}
              onBlur={handleBlur}
              className={`
                  w-full h-full bg-transparent resize-none outline-none text-gray-800 
                  placeholder:text-gray-500/50 mt-4 leading-relaxed font-medium cursor-text
                  ${isDragging || isResizing ? 'pointer-events-none' : ''}
              `}
              placeholder="내용을 입력하세요..."
              onMouseDown={(e) => e.stopPropagation()}
          />
          
          <div className="absolute bottom-3 left-4 text-[10px] text-gray-500 flex items-center gap-1 pointer-events-none select-none">
              {isFocused && <span className="text-blue-600 animate-pulse">작성 중...</span>}
              {!isFocused && localContent === memo.content && <span className="text-green-600 flex items-center gap-1"><Check size={10}/> Saved</span>}
          </div>

          <div 
              className="resize-handle absolute bottom-0 right-0 w-8 h-8 flex items-end justify-end p-1.5 cursor-se-resize text-gray-400 hover:text-gray-600 z-20 hover:bg-black/5 rounded-tl-xl transition-colors"
              onMouseDown={handleResizeStart}
              title="크기 조절"
          >
              <GripHorizontal size={16} className="-rotate-45" />
          </div>
      </div>
    );
};

export const MemoBoard: React.FC<MemoBoardProps> = ({ userId }) => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // List View State
  const [showList, setShowList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMemos();
  }, [userId]);

  const loadMemos = async () => {
    setLoading(true);
    const fetched = await api.memos.getAll(userId);
    setMemos(fetched);
    setLoading(false);
  };

  const handleAddMemo = async () => {
    // Determine center of current view for new memo placement
    let centerX = 50;
    let centerY = 50;
    
    if (containerRef.current) {
        centerX = containerRef.current.scrollLeft + 100;
        centerY = containerRef.current.scrollTop + 100;
    }

    const offset = Math.floor(Math.random() * 40);
    const newMemo: Memo = {
      id: `memo-${Date.now()}`,
      content: '',
      color: 'YELLOW',
      x: centerX + offset,
      y: centerY + offset,
      width: 280,
      height: 280,
      createdAt: new Date().toISOString()
    };
    setMemos(prev => [...prev, newMemo]); 
    await api.memos.save(userId, newMemo);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('메모를 삭제하시겠습니까?')) {
        setMemos(prev => prev.filter(m => m.id !== id));
        await api.memos.delete(id);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Memo>) => {
    const currentMemo = memos.find(m => m.id === id);
    if (!currentMemo) return;

    const updatedMemo = { ...currentMemo, ...updates };
    setMemos(prev => prev.map(m => m.id === id ? updatedMemo : m));

    try {
        await api.memos.save(userId, updatedMemo);
    } catch (e) {
        console.error("Failed to save memo", e);
    }
  };

  const bringToFront = (id: string) => {
      setMemos(prev => {
          const index = prev.findIndex(m => m.id === id);
          if (index === -1 || index === prev.length - 1) return prev;
          const newMemos = [...prev];
          const [moved] = newMemos.splice(index, 1);
          newMemos.push(moved);
          return newMemos;
      });
  };

  // Scroll to specific memo functionality
  const scrollToMemo = (id: string) => {
    const memo = memos.find(m => m.id === id);
    if (!memo || !containerRef.current) return;

    const container = containerRef.current;
    
    // Calculate position to center the memo
    const targetX = (memo.x || 0) - (container.clientWidth / 2) + ((memo.width || 280) / 2);
    const targetY = (memo.y || 0) - (container.clientHeight / 2) + ((memo.height || 280) / 2);

    container.scrollTo({
        left: Math.max(0, targetX),
        top: Math.max(0, targetY),
        behavior: 'smooth'
    });
    
    bringToFront(id);
  };

  // Calculate canvas size to allow scrolling if memos are far out
  // But also enforce a minimum size
  const maxWidth = memos.reduce((max, m) => Math.max(max, (m.x || 0) + (m.width || 280) + 200), 2000);
  const maxHeight = memos.reduce((max, m) => Math.max(max, (m.y || 0) + (m.height || 280) + 200), 1600);

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden relative">
      <div className="flex justify-between items-center mb-6 z-10 relative">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <StickyNote className="text-yellow-500" />
            퀵 메모
            </h2>
            <p className="text-sm text-gray-500">
                메모는 좌측/상단 경계를 넘어갈 수 없습니다.
            </p>
        </div>
        <div className="flex gap-2">
            <button
                onClick={() => setShowList(!showList)}
                className={`p-2 rounded-lg transition-colors border ${showList ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                title="메모 리스트 보기"
            >
                <List size={20} />
            </button>
            <button
            onClick={handleAddMemo}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg transition-colors shadow-sm font-bold"
            >
            <Plus size={18} />
            새 메모
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden gap-4 relative">
          {/* Canvas Area */}
          <div 
            ref={containerRef}
            className="flex-1 relative overflow-auto bg-gray-50/50 rounded-xl border border-dashed border-gray-200 shadow-inner scroll-smooth"
          >
            <div 
                className="relative"
                style={{ 
                    width: `${maxWidth}px`, 
                    height: `${maxHeight}px` 
                }}
            >
                {memos.map(memo => (
                    <MemoCard 
                        key={memo.id} 
                        memo={memo} 
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                        onBringToFront={bringToFront}
                    />
                ))}
                
                {memos.length === 0 && !loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                        <StickyNote size={48} className="mb-2 opacity-20" />
                        <p>작성된 메모가 없습니다.</p>
                    </div>
                )}
            </div>
          </div>

          {/* Sidebar List View */}
          <div 
            className={`
                bg-white border border-gray-200 rounded-xl shadow-lg transition-all duration-300 overflow-hidden flex flex-col
                ${showList ? 'w-80 opacity-100' : 'w-0 opacity-0 border-0'}
            `}
          >
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                      <List size={16} /> 메모 목록
                  </h3>
                  <button onClick={() => setShowList(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                  </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {memos.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-4">목록 없음</p>
                  ) : (
                      memos.slice().reverse().map(memo => (
                          <div 
                            key={memo.id}
                            onClick={() => scrollToMemo(memo.id)}
                            className="group p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-sm cursor-pointer transition-all bg-white relative overflow-hidden"
                          >
                              {/* Color Indicator Strip */}
                              <div className={`absolute left-0 top-0 bottom-0 w-1 ${COLORS[memo.color as keyof typeof COLORS].split(' ')[0]}`}></div>
                              
                              <div className="pl-2">
                                  <p className="text-sm text-gray-800 line-clamp-2 font-medium">
                                      {memo.content || '(내용 없음)'}
                                  </p>
                                  <div className="flex justify-between items-end mt-2">
                                      <span className="text-[10px] text-gray-400">
                                          {new Date(memo.createdAt).toLocaleDateString()}
                                      </span>
                                      <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] flex items-center gap-1">
                                          <MapPin size={10} /> 이동
                                      </span>
                                  </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};