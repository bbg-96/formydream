import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority, SubTask } from '../types';
import { Plus, Trash2, CheckSquare, Sparkles, Loader2, ChevronDown, ChevronUp, Calendar, Edit, Clock } from 'lucide-react';
import { generateTaskBreakdown } from '../services/geminiService';
import { api } from '../services/api';

interface TaskBoardProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

// Helper for display
const formatDateTime = (isoString: string) => {
    try {
        const date = new Date(isoString);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch (e) {
        return isoString;
    }
};

export const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, setTasks }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Edit State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // New/Edit Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [newTaskTags, setNewTaskTags] = useState<string>('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  const [generatedSubtasks, setGeneratedSubtasks] = useState<string[]>([]);
  // Store existing subtasks when editing to preserve their completion state
  const [existingSubtasks, setExistingSubtasks] = useState<SubTask[]>([]);

  // Helper to get current User ID
  const getUserId = () => {
    const userStr = localStorage.getItem('cloudops_user');
    return userStr ? JSON.parse(userStr).id : 'unknown';
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Status change also counts as modification, so update timestamp
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now.getTime() - offset).toISOString().slice(0, -1);

    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus, createdAt: localNow } : t);
    setTasks(updatedTasks);
    
    // Sync with Backend
    const task = updatedTasks.find(t => t.id === taskId);
    if (task) {
      await api.tasks.save(getUserId(), task);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (window.confirm('정말 이 작업을 삭제하시겠습니까? 삭제된 작업은 복구할 수 없습니다.')) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      await api.tasks.delete(taskId);
    }
  };

  const handleEdit = (task: Task) => {
      setEditingTaskId(task.id);
      setNewTaskTitle(task.title);
      setNewTaskDesc(task.description || '');
      setNewTaskPriority(task.priority);
      setNewTaskDueDate(task.dueDate || '');
      setNewTaskTags(task.tags.join(', '));
      
      setExistingSubtasks(task.subTasks);
      setGeneratedSubtasks(task.subTasks.map(st => st.title));
      
      setIsModalOpen(true);
  };

  const handleAiBreakdown = async () => {
    if (!newTaskTitle) return;
    setIsAiLoading(true);
    const result = await generateTaskBreakdown(newTaskTitle, newTaskDesc);
    setIsAiLoading(false);

    if (result) {
      // Append new suggestions to existing ones
      setGeneratedSubtasks(prev => [...prev, ...result.subtasks]);
      if (result.suggestedTags.length > 0) {
        const currentTags = newTaskTags ? newTaskTags.split(',').map(t => t.trim()) : [];
        const newTags = [...new Set([...currentTags, ...result.suggestedTags])];
        setNewTaskTags(newTags.join(', '));
      }
      
      const p = result.prioritySuggestion as keyof typeof TaskPriority;
      if (TaskPriority[p]) {
        setNewTaskPriority(TaskPriority[p]);
      }
    }
  };

  const handleSaveTask = async () => {
    if (!newTaskTitle) return;

    let subTasks: SubTask[];

    if (editingTaskId) {
        subTasks = generatedSubtasks.map((title, i) => {
            const existing = existingSubtasks.find(st => st.title === title);
            return existing ? existing : {
                id: `sub-${Date.now()}-${i}`,
                title: title,
                completed: false
            };
        });
    } else {
        // Create Mode
        subTasks = generatedSubtasks.map((st, i) => ({
            id: `sub-${Date.now()}-${i}`,
            title: st,
            completed: false
        }));
    }

    // [Fix] Generate Local Time String for DB storage (always update on save)
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now.getTime() - offset).toISOString().slice(0, -1);

    const task: Task = {
      id: editingTaskId || `task-${Date.now()}`,
      title: newTaskTitle,
      description: newTaskDesc,
      status: editingTaskId ? tasks.find(t => t.id === editingTaskId)?.status || TaskStatus.TODO : TaskStatus.TODO,
      priority: newTaskPriority,
      dueDate: newTaskDueDate || undefined,
      tags: newTaskTags.split(',').map(t => t.trim()).filter(Boolean),
      subTasks,
      createdAt: localNow, // Update timestamp on edit/create
    };

    setTasks(prev => {
        if (editingTaskId) {
            return prev.map(t => t.id === editingTaskId ? task : t);
        }
        return [...prev, task];
    });

    await api.tasks.save(getUserId(), task);
    
    resetForm();
    setIsModalOpen(false);
  };

  const resetForm = () => {
    setEditingTaskId(null);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskPriority(TaskPriority.MEDIUM);
    setNewTaskTags('');
    setNewTaskDueDate('');
    setGeneratedSubtasks([]);
    setExistingSubtasks([]);
  };

  const columns = [
    { id: TaskStatus.TODO, label: 'To Do', color: 'bg-gray-100 border-gray-200' },
    { id: TaskStatus.IN_PROGRESS, label: 'In Progress', color: 'bg-blue-50 border-blue-100' },
    { id: TaskStatus.REVIEW, label: 'Review', color: 'bg-yellow-50 border-yellow-100' },
    { id: TaskStatus.DONE, label: 'Done', color: 'bg-green-50 border-green-100' },
  ];

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">업무 보드</h2>
        <button
          onClick={() => {
              resetForm();
              setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={18} />
          새 작업
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 min-w-[1000px] h-full">
          {columns.map(col => (
            <div key={col.id} className={`flex-1 flex flex-col rounded-xl p-4 border ${col.color}`}>
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center justify-between">
                {col.label}
                <span className="bg-white px-2 py-0.5 rounded-full text-xs text-gray-500 shadow-sm">
                  {tasks.filter(t => t.status === col.id).length}
                </span>
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3">
                {tasks.filter(t => t.status === col.id).map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onStatusChange={handleStatusChange} 
                    onDelete={handleDelete}
                    onEdit={handleEdit} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">{editingTaskId ? '작업 수정' : '새 작업 추가'}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="예: AWS 비용 최적화 분석"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">우선순위</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg p-2"
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                    >
                      {Object.values(TaskPriority).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">마감일</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">태그 (쉼표로 구분)</label>
                   <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2"
                    value={newTaskTags}
                    onChange={(e) => setNewTaskTags(e.target.value)}
                    placeholder="EC2, Migration..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg p-2 h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="작업에 대한 상세 설명을 입력하세요."
                  />
                </div>

                {/* AI Assistant Section */}
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-indigo-800 font-semibold flex items-center gap-2">
                      <Sparkles size={16} /> Gemini Assistant
                    </span>
                    <button
                      onClick={handleAiBreakdown}
                      disabled={isAiLoading || !newTaskTitle}
                      className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {isAiLoading ? <Loader2 className="animate-spin" size={14} /> : 'AI 작업 분석 및 세분화'}
                    </button>
                  </div>
                  <p className="text-xs text-indigo-600 mb-3">제목과 설명을 기반으로 하위 작업을 자동으로 생성하고 태그를 추천합니다.</p>
                  
                  {generatedSubtasks.length > 0 && (
                    <div className="bg-white p-3 rounded-lg border border-indigo-100">
                      <p className="text-xs font-bold text-gray-500 mb-2">하위 작업 리스트:</p>
                      <ul className="space-y-1">
                        {generatedSubtasks.map((st, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                            <CheckSquare size={14} className="text-indigo-400" />
                            <input 
                              type="text" 
                              value={st} 
                              onChange={(e) => {
                                const newSubs = [...generatedSubtasks];
                                newSubs[i] = e.target.value;
                                setGeneratedSubtasks(newSubs);
                              }}
                              className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none"
                            />
                            <button 
                                onClick={() => {
                                    setGeneratedSubtasks(prev => prev.filter((_, idx) => idx !== i));
                                }}
                                className="text-gray-400 hover:text-red-500"
                            >
                                <Trash2 size={12} />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <button 
                        onClick={() => setGeneratedSubtasks(prev => [...prev, ''])}
                        className="mt-2 text-xs text-blue-600 flex items-center gap-1 hover:underline"
                      >
                          <Plus size={12} /> 항목 추가
                      </button>
                    </div>
                  )}
                </div>

              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {editingTaskId ? '수정 저장' : '작업 생성'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component for individual Task Card
const TaskCard: React.FC<{ 
  task: Task; 
  onStatusChange: (id: string, s: TaskStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}> = ({ task, onStatusChange, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(false);

  const priorityColor = {
    [TaskPriority.LOW]: 'text-gray-600 bg-gray-200',
    [TaskPriority.MEDIUM]: 'text-blue-600 bg-blue-100',
    [TaskPriority.HIGH]: 'text-orange-600 bg-orange-100',
    [TaskPriority.CRITICAL]: 'text-red-600 bg-red-100',
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${priorityColor[task.priority]}`}>
          {task.priority}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(task)} className="text-gray-300 hover:text-blue-500">
                <Edit size={14} />
            </button>
            <button onClick={() => onDelete(task.id)} className="text-gray-300 hover:text-red-500">
                <Trash2 size={14} />
            </button>
        </div>
      </div>
      
      <h4 className="font-semibold text-gray-800 mb-1">{task.title}</h4>
      
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2">
             {task.dueDate && (
              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                 <Calendar size={12} />
                 <span>{task.dueDate}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                 <Clock size={12} />
                 <span title="마지막 수정">{formatDateTime(task.createdAt)}</span>
            </div>
        </div>

        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map(tag => (
              <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-3">
        <select 
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
          className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-gray-50 text-gray-600 outline-none cursor-pointer"
        >
          {Object.values(TaskStatus).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        
        {task.subTasks.length > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
             {expanded ? <ChevronUp size={16} /> : <div className="flex items-center gap-1 text-xs"><CheckSquare size={12}/> {task.subTasks.filter(st => st.completed).length}/{task.subTasks.length}</div>}
          </button>
        )}
      </div>

      {expanded && task.subTasks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
          {task.subTasks.map(st => (
            <div key={st.id} className="flex items-center gap-2 text-xs text-gray-600">
              <div className={`w-3 h-3 border rounded-sm ${st.completed ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}></div>
              <span className={st.completed ? 'line-through text-gray-400' : ''}>{st.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};