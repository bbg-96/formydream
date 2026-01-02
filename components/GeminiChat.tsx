import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Plus, MessageSquare, Trash2, Menu, X, MoreVertical } from 'lucide-react';
import { chatWithAssistant } from '../services/geminiService';
import { Task, KnowledgeItem } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | Date; // Allow string for JSON parsed data
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  lastUpdatedAt: string;
}

interface GeminiChatProps {
  tasks: Task[];
  knowledgeItems: KnowledgeItem[];
}

export const GeminiChat: React.FC<GeminiChatProps> = ({ tasks, knowledgeItems }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Toggle for mobile/desktop
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Sessions from LocalStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('cloudops_chat_sessions');
    if (savedSessions) {
      try {
        const parsed: ChatSession[] = JSON.parse(savedSessions);
        // Sort by lastUpdatedAt desc
        parsed.sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
        } else {
          createNewSession();
        }
      } catch (e) {
        console.error("Failed to parse chat history", e);
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  // Save Sessions to LocalStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('cloudops_chat_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Scroll to bottom when messages change in current session
  useEffect(() => {
    scrollToBottom();
  }, [sessions, currentSessionId, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: '새로운 대화',
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: '안녕하세요! 클라우드 운영 관련 질문이나 업무 지원이 필요하시면 말씀해주세요. 현재 등록된 업무 및 지식 저장소 정보를 기반으로 답변해드립니다.',
          timestamp: new Date().toISOString(),
        }
      ],
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false); // Auto close sidebar on mobile
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('이 대화 기록을 삭제하시겠습니까?')) {
      const newSessions = sessions.filter(s => s.id !== id);
      setSessions(newSessions);
      if (currentSessionId === id) {
        if (newSessions.length > 0) {
          setCurrentSessionId(newSessions[0].id);
        } else {
          createNewSession(); // Ensure at least one session exists
        }
      }
      localStorage.setItem('cloudops_chat_sessions', JSON.stringify(newSessions));
    }
  };

  // Helper to strip HTML tags for cleaner context
  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const handleSend = async () => {
    if (!input.trim() || !currentSessionId) return;

    const userText = input;
    setInput('');
    setIsLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };

    // 1. Update Session with User Message & Title if needed
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        // Auto-generate title from first user message
        let newTitle = session.title;
        if (session.messages.length <= 1 && session.title === '새로운 대화') {
            newTitle = userText.length > 18 ? userText.substring(0, 18) + '...' : userText;
        }
        return {
          ...session,
          title: newTitle,
          messages: [...session.messages, userMsg],
          lastUpdatedAt: new Date().toISOString()
        };
      }
      return session;
    }));

    // 2. Prepare Context
    const taskContext = tasks.length > 0 
        ? "Current Tasks:\n" + tasks.map(t => `- [${t.status}] ${t.title} (Priority: ${t.priority})`).join('\n')
        : "Current Tasks: None";

    const knowledgeContext = knowledgeItems.length > 0
        ? "Knowledge Base Items:\n" + knowledgeItems.map(k => 
            `Title: [${k.category}] ${k.title}\nTags: ${k.tags.join(', ')}\nContent: ${stripHtml(k.content)}\n---`
          ).join('\n')
        : "Knowledge Base Items: None";
    
    // Retrieve previous conversation history for context (last 5 messages)
    const currentSession = sessions.find(s => s.id === currentSessionId);
    const historyContext = currentSession 
        ? currentSession.messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')
        : "";

    const fullContext = `${taskContext}\n\n${knowledgeContext}\n\nConversation History:\n${historyContext}`;
    
    // 3. Call API
    const responseText = await chatWithAssistant(userText, fullContext);

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: responseText,
      timestamp: new Date().toISOString(),
    };

    // 4. Update Session with AI Message
    setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
            return {
                ...session,
                messages: [...session.messages, aiMsg],
                lastUpdatedAt: new Date().toISOString()
            };
        }
        return session;
    }).sort((a, b) => {
        // Move updated session to top
        if (a.id === currentSessionId) return -1;
        if (b.id === currentSessionId) return 1;
        return 0;
    }));

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    // Removed margins (m-4 md:m-6), rounded corners (rounded-xl), borders, and shadows to create full-screen layout
    <div className="flex h-full bg-white overflow-hidden relative">
      
      {/* Sidebar (Chat History) */}
      <div 
        className={`
            absolute md:relative z-20 h-full w-64 bg-gray-50 border-r border-gray-200 flex flex-col transition-transform duration-300
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-64'} 
            ${!isSidebarOpen && 'md:hidden'} 
        `}
      >
        <div className="p-4 border-b border-gray-200 bg-gray-100/50 flex items-center justify-between">
            <h3 className="font-bold text-gray-700">대화 목록</h3>
            <button 
                onClick={() => setIsSidebarOpen(false)} 
                className="md:hidden p-1 text-gray-500"
            >
                <X size={20} />
            </button>
        </div>
        
        <div className="p-3">
            <button 
                onClick={createNewSession}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition-colors font-medium shadow-sm mb-2"
            >
                <Plus size={18} />
                새로운 대화
            </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 scrollbar-thin">
            {sessions.map(session => (
                <div 
                    key={session.id}
                    onClick={() => {
                        setCurrentSessionId(session.id);
                        if(window.innerWidth < 768) setIsSidebarOpen(false);
                    }}
                    className={`
                        group relative flex flex-col p-3 rounded-lg cursor-pointer transition-all border
                        ${currentSessionId === session.id 
                            ? 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-100' 
                            : 'bg-transparent border-transparent hover:bg-gray-200/50 hover:border-gray-200'}
                    `}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <MessageSquare size={14} className={currentSessionId === session.id ? 'text-blue-500' : 'text-gray-400'} />
                        <span className={`text-sm font-medium truncate flex-1 ${currentSessionId === session.id ? 'text-gray-800' : 'text-gray-600'}`}>
                            {session.title}
                        </span>
                    </div>
                    <span className="text-[10px] text-gray-400 pl-6">
                        {new Date(session.lastUpdatedAt).toLocaleDateString()}
                    </span>
                    
                    <button 
                        onClick={(e) => deleteSession(e, session.id)}
                        className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1 rounded hover:bg-gray-100"
                        title="대화 삭제"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white relative">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 p-4 flex items-center gap-3 shadow-sm z-10">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden mr-2 text-gray-500"
          >
            <Menu size={24} />
          </button>
          
          <div className="bg-indigo-500 p-2 rounded-lg text-white shadow-sm shadow-indigo-200">
            <Bot size={20} />
          </div>
          <div className="flex-1 overflow-hidden">
            <h2 className="text-gray-800 font-bold truncate">
                {currentSession?.title || 'CloudOps AI'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-400">
                 <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                 Powered by Gemini 1.5 Pro
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
          {currentSession?.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm relative group ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                }`}
              >
                <div className="flex items-center gap-2 mb-2 opacity-70 text-[10px] uppercase tracking-wider font-semibold">
                   {msg.role === 'assistant' ? (
                       <>
                        <Bot size={12} />
                        <span>Gemini</span>
                       </>
                   ) : (
                       <>
                        <span>You</span>
                        <User size={12} />
                       </>
                   )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                <div className={`text-[10px] mt-2 opacity-40 text-right ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-4 rounded-2xl rounded-bl-sm border border-gray-100 shadow-sm flex items-center gap-3">
                <Loader2 className="animate-spin text-indigo-500" size={18} />
                <span className="text-gray-500 text-sm animate-pulse">답변 생성 중...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
              placeholder="클라우드 업무에 대해 물어보세요..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-2">
            AI는 실수를 할 수 있습니다. 중요한 정보는 확인이 필요합니다.
          </p>
        </div>
      </div>
    </div>
  );
};