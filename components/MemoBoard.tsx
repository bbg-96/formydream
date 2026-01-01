import React, { useState, useEffect } from 'react';
import { Plus, Trash2, StickyNote, Save, Check } from 'lucide-react';
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
    const newMemo: Memo = {
      id: `memo-${Date.now()}`,
      content: '',
      color: 'YELLOW',
      x: 0,
      y: 0,
      createdAt: new Date().toISOString()
    };
    // Add locally immediately
    setMemos(prev => [newMemo, ...prev]);
    // Sync
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

    // Optimistic Update
    setMemos(prev => prev.map(m => m.id === id ? updatedMemo : m));

    // Save to DB
    try {
        await api.memos.save(userId, updatedMemo);
    } catch (e) {
        console.error("Failed to save memo", e);
        // Optionally revert state here if strict consistency is needed
    }
  };

  const MemoCard: React.FC<{ memo: Memo }> = ({ memo }) => {
      const [localContent, setLocalContent] = useState(memo.content);
      const [isFocused, setIsFocused] = useState(false);

      useEffect(() => {
          setLocalContent(memo.content);
      }, [memo.content]);

      const handleBlur = () => {
          setIsFocused(false);
          if (localContent !== memo.content) {
              handleUpdate(memo.id, { content: localContent });
          }
      };

      return (
        <div className={`relative p-5 rounded-lg shadow-md border ${COLORS[memo.color as keyof typeof COLORS]} h-64 flex flex-col transition-transform hover:-translate-y-1 hover:shadow-lg animate-fade-in group`}>
            {/* Color Picker */}
            <div className="flex justify-between items-start mb-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 left-4">
                <div className="flex gap-1 bg-white/50 p-1 rounded-full backdrop-blur-sm">
                    {Object.keys(COLORS).map((c) => (
                        <button
                            key={c}
                            onClick={() => handleUpdate(memo.id, { color: c as any })}
                            className={`w-3 h-3 rounded-full border border-gray-300 hover:scale-125 transition-transform ${COLORS[c as keyof typeof COLORS].split(' ')[0]}`}
                        />
                    ))}
                </div>
                <button 
                    onClick={() => handleDelete(memo.id)}
                    className="text-gray-500 hover:text-red-600 bg-white/50 p-1 rounded-full"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <textarea
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                className="w-full h-full bg-transparent resize-none outline-none text-gray-800 placeholder:text-gray-500/50 mt-4 leading-relaxed font-medium"
                placeholder="내용을 입력하세요..."
            />
            
            <div className="absolute bottom-3 right-3 text-[10px] text-gray-500 flex items-center gap-1">
                {isFocused && <span className="text-blue-600 animate-pulse">작성 중...</span>}
                {!isFocused && localContent === memo.content && <span className="text-green-600 flex items-center gap-1"><Check size={10}/> Saved</span>}
            </div>
        </div>
      );
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <StickyNote className="text-yellow-500" />
            퀵 메모
            </h2>
            <p className="text-sm text-gray-500">잊기 쉬운 아이디어나 급한 내용을 빠르게 기록하세요.</p>
        </div>
        <button
          onClick={handleAddMemo}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg transition-colors shadow-sm font-bold"
        >
          <Plus size={18} />
          새 메모
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-1">
            {memos.map(memo => (
                <MemoCard key={memo.id} memo={memo} />
            ))}
            {memos.length === 0 && !loading && (
                 <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    <StickyNote size={48} className="mb-2 opacity-20" />
                    <p>작성된 메모가 없습니다.</p>
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};