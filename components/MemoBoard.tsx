import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Plus, Trash2, StickyNote, Check, GripHorizontal } from 'lucide-react';
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
        
        const initialX = rect && parentRect ? rect.left - parentRect.left + (memoRef.current?.parentElement?.scrollLeft || 0) : (memo.x || 0);
        const initialY = rect && parentRect ? rect.top - parentRect.top + (memoRef.current?.parentElement?.scrollTop || 0) : (memo.y || 0);

        const handleMouseMove = (me: MouseEvent) => {
            const dx = me.clientX - startX;
            const dy = me.clientY - startY;
            
            if (memoRef.current) {
                memoRef.current.style.left = `${initialX + dx}px`;
                memoRef.current.style.top = `${initialY + dy}px`;
            }
        };

        const handleMouseUp = (ue: MouseEvent) => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            
            const dx = ue.clientX - startX;
            const dy = ue.clientY - startY;
            
            if (dx !== 0 || dy !== 0) {
                onUpdate(memo.id, { x: initialX + dx, y: initialY + dy });
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
              // Visual optimization: High z-index during interaction
              zIndex: isDragging || isResizing ? 9999 : 'auto' 
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
    const offset = Math.floor(Math.random() * 40);
    const newMemo: Memo = {
      id: `memo-${Date.now()}`,
      content: '',
      color: 'YELLOW',
      x: 50 + offset,
      y: 50 + offset,
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

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6 z-10 relative">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <StickyNote className="text-yellow-500" />
            퀵 메모
            </h2>
            <p className="text-sm text-gray-500">배경을 드래그하여 자유롭게 배치하고 모서리를 잡아 크기를 조절하세요.</p>
        </div>
        <button
          onClick={handleAddMemo}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg transition-colors shadow-sm font-bold"
        >
          <Plus size={18} />
          새 메모
        </button>
      </div>

      <div className="flex-1 relative overflow-auto bg-gray-50/50 rounded-xl border border-dashed border-gray-200 shadow-inner">
        <div className="w-full h-full min-w-[1000px] min-h-[800px] relative">
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
    </div>
  );
};