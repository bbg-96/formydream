import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, Plus, Calendar, CheckSquare, Search, User, Clock, AlertCircle, Inbox, Send, Loader2, Server, ShieldCheck, ChevronDown, Trash2 } from 'lucide-react';
import { Email, Task, TaskPriority, TaskStatus, MailAccount, MailConfig } from '../types';
import { api } from '../services/api';

interface MailClientProps {
  user: any;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  mailAccounts: MailAccount[];
  setMailAccounts: React.Dispatch<React.SetStateAction<MailAccount[]>>;
}

export const MailClient: React.FC<MailClientProps> = ({ user, setTasks, mailAccounts, setMailAccounts }) => {
  // If no accounts, default to 'adding' state
  const [isAddingAccount, setIsAddingAccount] = useState(mailAccounts.length === 0);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(mailAccounts.length > 0 ? mailAccounts[0].id : null);
  
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);

  // Connection Form State
  const [mailConfig, setMailConfig] = useState<MailConfig>({
    protocol: 'IMAP',
    host: 'mail.company.com',
    port: '993',
    useSSL: true,
    email: user.email,
    password: ''
  });
  const [accountAlias, setAccountAlias] = useState('');

  // Convert to Task State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const getStandardPort = (protocol: string, useSSL: boolean) => {
    if (protocol === 'IMAP') return useSSL ? '993' : '143';
    if (protocol === 'POP3') return useSSL ? '995' : '110';
    return '';
  };

  const handleProtocolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const protocol = e.target.value as 'IMAP' | 'POP3';
    const defaultHost = protocol === 'IMAP' ? 'imap.company.com' : 'pop.company.com';
    const newPort = getStandardPort(protocol, mailConfig.useSSL);
    
    setMailConfig({
        ...mailConfig,
        protocol,
        port: newPort,
        host: defaultHost
    });
  };

  const handleSSLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const useSSL = e.target.checked;
      const newPort = getStandardPort(mailConfig.protocol, useSSL);
      setMailConfig({
          ...mailConfig,
          useSSL,
          port: newPort
      });
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await api.mail.connect(user.id, mailConfig);
    
    if (success) {
      // First Fetch
      const msgs = await api.mail.getMessages(user.id, mailConfig);
      
      const newAccount: MailAccount = {
        id: `acc-${Date.now()}`,
        name: accountAlias || mailConfig.email,
        config: mailConfig,
        emails: msgs,
        lastUpdated: new Date(),
        isConnected: true
      };

      setMailAccounts(prev => [...prev, newAccount]);
      setSelectedAccountId(newAccount.id);
      setIsAddingAccount(false);
      
      // Reset Form
      setMailConfig({
        protocol: 'IMAP',
        host: 'mail.company.com',
        port: '993',
        useSSL: true,
        email: '',
        password: ''
      });
      setAccountAlias('');
    } else {
      alert('메일 서버 연결에 실패했습니다. 설정을 확인해주세요.');
    }
    setLoading(false);
  };

  const refreshCurrentAccount = async () => {
    if (!selectedAccountId) return;
    const account = mailAccounts.find(a => a.id === selectedAccountId);
    if (!account) return;

    setLoading(true);
    const msgs = await api.mail.getMessages(user.id, account.config);
    
    setMailAccounts(prev => prev.map(a => {
      if (a.id === selectedAccountId) {
        return { ...a, emails: msgs, lastUpdated: new Date() };
      }
      return a;
    }));
    setLoading(false);
  };

  const deleteAccount = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('이 계정을 삭제하시겠습니까?')) {
        setMailAccounts(prev => prev.filter(a => a.id !== id));
        if (selectedAccountId === id) {
            setSelectedAccountId(null);
            setIsAddingAccount(true);
        }
    }
  };

  const activeAccount = mailAccounts.find(a => a.id === selectedAccountId);
  
  // Task conversion logic
  const handleOpenTaskModal = (email: Email) => {
    setNewTaskTitle(email.subject);
    setNewTaskDesc(`[Source Email]\nFrom: ${email.senderName} (${email.senderAddress})\nSent: ${email.receivedAt}\n\n${email.body}`);
    setNewTaskDueDate(new Date().toISOString().split('T')[0]);
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      description: newTaskDesc,
      status: TaskStatus.TODO,
      priority: newTaskPriority,
      dueDate: newTaskDueDate,
      tags: ['Email-Import'],
      subTasks: [],
      createdAt: new Date().toISOString(),
    };

    try {
      await api.tasks.save(user.id, newTask);
      setTasks(prev => [...prev, newTask]);
      setIsTaskModalOpen(false);
      alert('업무 리스트에 추가되었습니다.');
    } catch (e) {
      alert('업무 생성 실패');
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row p-4 gap-4 animate-fade-in relative">
      
      {/* 1. Account & Mail List Sidebar */}
      <div className={`flex-1 md:flex-none md:w-80 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Account Switcher Header */}
        <div className="p-4 border-b border-gray-100">
             <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Inbox size={20} className="text-blue-600" />
                    계정 목록
                 </h3>
                 <button 
                    onClick={() => {
                        setIsAddingAccount(true);
                        setSelectedAccountId(null);
                        setSelectedEmail(null);
                    }}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    title="계정 추가"
                 >
                    <Plus size={16} />
                 </button>
             </div>

             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                 {mailAccounts.map(acc => (
                     <button
                        key={acc.id}
                        onClick={() => {
                            setSelectedAccountId(acc.id);
                            setIsAddingAccount(false);
                            setSelectedEmail(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap border flex items-center gap-2 transition-all ${
                            selectedAccountId === acc.id 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                     >
                         {acc.name}
                         <span onClick={(e) => deleteAccount(acc.id, e)} className="opacity-60 hover:opacity-100 hover:text-red-300">
                             <Trash2 size={12} />
                         </span>
                     </button>
                 ))}
             </div>
        </div>

        {isAddingAccount ? (
             <div className="p-4 flex-1 overflow-y-auto">
                 <div className="text-center mb-6">
                    <div className="inline-flex p-3 bg-blue-100 rounded-full mb-3">
                        <Mail size={24} className="text-blue-600" />
                    </div>
                    <h3 className="font-bold text-gray-800">새 계정 연결</h3>
                    <p className="text-xs text-gray-500 mt-1">IMAP/POP3 정보를 입력하세요</p>
                 </div>
                 
                 <form onSubmit={handleConnect} className="space-y-3">
                     <div>
                         <label className="text-xs font-bold text-gray-500">계정 별칭</label>
                         <input 
                            type="text" 
                            className="w-full border rounded p-2 text-sm mt-1" 
                            placeholder="예: 회사 메일"
                            value={accountAlias}
                            onChange={e => setAccountAlias(e.target.value)}
                         />
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-bold text-gray-500">프로토콜</label>
                            <select 
                                value={mailConfig.protocol}
                                onChange={handleProtocolChange}
                                className="w-full border rounded p-2 text-sm mt-1 bg-white"
                            >
                                <option value="IMAP">IMAP</option>
                                <option value="POP3">POP3</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500">포트</label>
                            <input 
                                type="text"
                                value={mailConfig.port}
                                onChange={e => setMailConfig({...mailConfig, port: e.target.value})}
                                className="w-full border rounded p-2 text-sm mt-1"
                            />
                        </div>
                     </div>
                     <div>
                         <label className="text-xs font-bold text-gray-500">호스트</label>
                         <input 
                            type="text"
                            value={mailConfig.host}
                            onChange={e => setMailConfig({...mailConfig, host: e.target.value})}
                            className="w-full border rounded p-2 text-sm mt-1"
                         />
                     </div>
                     <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="ssl"
                            checked={mailConfig.useSSL}
                            onChange={handleSSLChange}
                            className="rounded text-blue-600"
                        />
                        <label htmlFor="ssl" className="text-xs text-gray-600 cursor-pointer">SSL 사용</label>
                     </div>
                     <div>
                         <label className="text-xs font-bold text-gray-500">이메일</label>
                         <input 
                            type="email"
                            value={mailConfig.email}
                            onChange={e => setMailConfig({...mailConfig, email: e.target.value})}
                            className="w-full border rounded p-2 text-sm mt-1"
                         />
                     </div>
                     <div>
                         <label className="text-xs font-bold text-gray-500">비밀번호</label>
                         <input 
                            type="password"
                            value={mailConfig.password}
                            onChange={e => setMailConfig({...mailConfig, password: e.target.value})}
                            className="w-full border rounded p-2 text-sm mt-1"
                         />
                     </div>

                     <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold mt-2 flex justify-center items-center gap-2"
                     >
                        {loading && <Loader2 className="animate-spin" size={14} />}
                        연동하기
                     </button>
                 </form>
             </div>
        ) : activeAccount ? (
            <>
                <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="relative flex-1 mr-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="메일 검색..." 
                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                        />
                    </div>
                    <button 
                        onClick={refreshCurrentAccount} 
                        className={`p-2 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-gray-500 transition-all ${loading ? 'animate-spin' : ''}`}
                        title="새로고침"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {activeAccount.emails.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                        <Mail size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">메일이 없습니다.</p>
                        </div>
                    ) : (
                        activeAccount.emails.map(email => (
                        <div 
                            key={email.id}
                            onClick={() => setSelectedEmail(email)}
                            className={`p-4 border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors ${selectedEmail?.id === email.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                            <span className={`text-sm font-semibold truncate max-w-[70%] ${email.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                                {email.senderName}
                            </span>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                {new Date(email.receivedAt).toLocaleDateString()}
                            </span>
                            </div>
                            <h4 className={`text-sm mb-1 truncate ${email.isRead ? 'text-gray-500 font-normal' : 'text-gray-800 font-bold'}`}>
                            {email.subject}
                            </h4>
                            <p className="text-xs text-gray-400 line-clamp-2">
                            {email.body}
                            </p>
                        </div>
                        ))
                    )}
                </div>
            </>
        ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                계정을 선택하거나 추가하세요.
            </div>
        )}
      </div>

      {/* 2. Mail Detail View */}
      <div className={`flex-[2] bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col ${!selectedEmail ? 'hidden md:flex' : 'flex'}`}>
        {selectedEmail ? (
          <>
            {/* Detail Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
               <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4">{selectedEmail.subject}</h2>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg">
                      {selectedEmail.senderName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {selectedEmail.senderName} <span className="text-gray-400 font-normal text-xs">&lt;{selectedEmail.senderAddress}&gt;</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(selectedEmail.receivedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
               </div>
               <div className="flex gap-2">
                 <button 
                   onClick={() => setSelectedEmail(null)}
                   className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                 >
                   목록으로
                 </button>
                 <button 
                    onClick={() => handleOpenTaskModal(selectedEmail)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                 >
                   <CheckSquare size={16} />
                   작업/일정 추가
                 </button>
               </div>
            </div>

            {/* Detail Body */}
            <div className="p-8 flex-1 overflow-y-auto whitespace-pre-wrap text-gray-700 leading-relaxed text-sm">
               {selectedEmail.body}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
            <Mail size={64} className="mb-4 opacity-20" />
            <p className="text-lg">메일을 선택하여 내용을 확인하세요.</p>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                    <h3 className="text-lg font-bold text-gray-800">메일을 업무로 변환</h3>
                    <button onClick={() => setIsTaskModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <AlertCircle className="rotate-45" size={24} />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">업무 제목</label>
                        <input 
                            type="text" 
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
                             <label className="block text-sm font-medium text-gray-700 mb-1">마감일 (일정)</label>
                             <input
                                type="date"
                                className="w-full border border-gray-300 rounded-lg p-2"
                                value={newTaskDueDate}
                                onChange={(e) => setNewTaskDueDate(e.target.value)}
                                />
                        </div>
                    </div>

                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">설명 / 내용</label>
                         <textarea 
                            value={newTaskDesc}
                            onChange={(e) => setNewTaskDesc(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 h-32 resize-none focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                         />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button 
                        onClick={() => setIsTaskModalOpen(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        취소
                    </button>
                    <button 
                        onClick={handleCreateTask}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                    >
                        <Plus size={16} />
                        업무 리스트에 추가
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};