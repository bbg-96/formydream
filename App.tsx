import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, ListTodo, Calendar as CalendarIcon, Bot, LogOut, Cloud, BookOpen, Settings, StickyNote, ChevronUp, ChevronDown, Palette, Check } from 'lucide-react';
import { Task, ViewMode, TaskStatus, TaskPriority, KnowledgeItem, User, MailAccount, ThemeConfig } from './types';
import { Dashboard } from './components/Dashboard';
import { TaskBoard } from './components/TaskBoard';
import { GeminiChat } from './components/GeminiChat';
import { Schedule } from './components/Schedule';
import { KnowledgeBase } from './components/KnowledgeBase';
import { MyPage } from './components/MyPage';
import { MemoBoard } from './components/MemoBoard';
// import { MailClient } from './components/MailClient'; // Hidden feature
import { Auth } from './components/Auth';
import { api } from './services/api';

// Helper to get local ISO string (KST)
const getLocalISOString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, -1); // Remove 'Z'
};

// Helper to get today's date in YYYY-MM-DD format (Local Time)
const getToday = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

const getFutureDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

// --- THEME DEFINITIONS ---
const THEMES: ThemeConfig[] = [
  {
    id: 'default',
    name: 'CloudOps Default',
    sidebarStyle: { backgroundColor: '#0f172a' }, // slate-900
    sidebarTextColor: 'text-slate-300',
    mainStyle: { backgroundColor: '#f9fafb' }, // gray-50
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    sidebarStyle: { 
      background: 'linear-gradient(180deg, #0f4c75 0%, #3282b8 100%)',
    },
    sidebarTextColor: 'text-blue-100',
    mainStyle: { 
      backgroundColor: '#f0f9ff',
      backgroundImage: 'radial-gradient(#e0f2fe 1px, transparent 1px)',
      backgroundSize: '20px 20px'
    },
  },
  {
    id: 'forest',
    name: 'Forest Serenity',
    sidebarStyle: { 
      backgroundColor: '#14532d',
      backgroundImage: 'url("https://images.unsplash.com/photo-1511497584788-876760111969?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60")', // Dark Forest
      backgroundSize: 'cover',
      backgroundBlendMode: 'overlay'
    },
    sidebarTextColor: 'text-green-100',
    mainStyle: { backgroundColor: '#f0fdf4' },
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    sidebarStyle: { 
      background: 'linear-gradient(135deg, #4c1d95 0%, #db2777 100%)', // Purple to Pink
    },
    sidebarTextColor: 'text-purple-100',
    mainStyle: { 
      backgroundColor: '#fff1f2',
    },
  },
  {
    id: 'nebula',
    name: 'Midnight Nebula',
    sidebarStyle: { 
      backgroundColor: '#000000',
      backgroundImage: 'url("https://images.unsplash.com/photo-1436891620584-47fd0e565afb?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60")', // Space
      backgroundSize: 'cover',
    },
    sidebarTextColor: 'text-gray-200',
    mainStyle: { 
       backgroundColor: '#f3f4f6', // Keep content light for readability
       borderLeft: '1px solid #e5e7eb'
    },
  }
];

// Fallback Mock Data for Tasks (Used if API connection fails)
const FALLBACK_TASKS: Task[] = [
  {
    id: 't1',
    title: 'EKS 클러스터 버전 업그레이드',
    description: 'v1.24에서 v1.27로 업그레이드 계획 수립 및 테스트',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    dueDate: getFutureDate(2),
    tags: ['EKS', 'Kubernetes', 'Maintenance'],
    subTasks: [{id: 's1', title: '릴리즈 노트 확인', completed: true}, {id: 's2', title: '백업 수행', completed: false}],
    createdAt: getLocalISOString()
  },
  {
    id: 't2',
    title: 'RDS 스토리지 오토스케일링 설정',
    description: 'Production DB 스토리지 임계치 설정 검토',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: getFutureDate(5),
    tags: ['AWS', 'RDS', 'Database'],
    subTasks: [],
    createdAt: getLocalISOString()
  },
  {
    id: 't3',
    title: '보안 그룹 감사(Audit)',
    description: '불필요한 인바운드 규칙 제거 (0.0.0.0/0 등)',
    status: TaskStatus.REVIEW,
    priority: TaskPriority.CRITICAL,
    dueDate: getToday(),
    tags: ['Security', 'Compliance'],
    subTasks: [],
    createdAt: getLocalISOString()
  },
    {
    id: 't4',
    title: '월간 비용 리포트 생성',
    description: 'Cost Explorer 데이터 기반 보고서 작성',
    status: TaskStatus.DONE,
    priority: TaskPriority.LOW,
    dueDate: getFutureDate(-1),
    tags: ['Cost', 'FinOps'],
    subTasks: [],
    createdAt: getLocalISOString()
  },
];

// Fallback Mock Data for Knowledge Base
const FALLBACK_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: 'k1',
    title: 'S3 Bucket Policy 예제 (CloudFront OAC)',
    content: 'CloudFront Origin Access Control(OAC)을 사용할 때 S3 버킷 정책 설정 예시입니다.\n\n{\n  "Version": "2012-10-17",\n  "Statement": {\n    "Sid": "AllowCloudFrontServicePrincipalReadOnly",\n    "Effect": "Allow",\n    "Principal": {\n      "Service": "cloudfront.amazonaws.com"\n    },\n    "Action": "s3:GetObject",\n    "Resource": "arn:aws:s3:::my-bucket/*",\n    "Condition": {\n      "StringEquals": {\n        "AWS:SourceArn": "arn:aws:cloudfront::111122223333:distribution/ABCDEF123456"\n      }\n    }\n  }\n}',
    category: 'AWS',
    tags: ['S3', 'CloudFront', 'Security', 'Policy'],
    createdAt: getToday()
  },
  {
    id: 'k2',
    title: 'Kubectl 자주 사용하는 명령어 모음',
    content: '1. 리소스 강제 삭제\nkubectl delete pod [pod-name] --grace-period=0 --force\n\n2. 특정 노드의 파드 조회\nkubectl get pods --all-namespaces -o wide --field-selector spec.nodeName=[node-name]\n\n3. 컨텍스트 변경\nkubectl config use-context [context-name]',
    category: 'Kubernetes',
    tags: ['CLI', 'CheatSheet', 'Kubectl'],
    createdAt: getFutureDate(-5)
  }
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('DASHBOARD');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [showHeader, setShowHeader] = useState(true);
  
  // Theme State
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(THEMES[0]);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  
  // Mail State (Lifted Up) with Persistence
  const [mailAccounts, setMailAccounts] = useState<MailAccount[]>([]);
  
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check local storage for existing session
    const savedUser = localStorage.getItem('cloudops_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      loadData(parsedUser.id);
    }
    // Load theme
    const savedThemeId = localStorage.getItem('cloudops_theme_id');
    if (savedThemeId) {
      const found = THEMES.find(t => t.id === savedThemeId);
      if (found) setCurrentTheme(found);
    }
  }, []);

  // Handle click outside for theme menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Persist Mail Accounts Logic
  useEffect(() => {
    // Load accounts on startup
    const savedAccounts = localStorage.getItem('cloudops_mail_accounts');
    if (savedAccounts) {
        try {
            setMailAccounts(JSON.parse(savedAccounts));
        } catch(e) {
            console.error("Failed to load mail accounts", e);
        }
    }
  }, []);

  useEffect(() => {
    // Save accounts whenever they change
    if (mailAccounts.length > 0) {
        localStorage.setItem('cloudops_mail_accounts', JSON.stringify(mailAccounts));
    }
  }, [mailAccounts]);


  const loadData = async (userId: string) => {
    try {
      const fetchedTasks = await api.tasks.getAll(userId);
      setTasks(fetchedTasks);
    } catch (e) {
      // If API fails (e.g. backend not running), use fallback
      setTasks(FALLBACK_TASKS);
    }

    try {
       const fetchedKnowledge = await api.knowledge.getAll(userId);
       setKnowledgeItems(fetchedKnowledge);
    } catch (e) {
       setKnowledgeItems(FALLBACK_KNOWLEDGE);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('cloudops_user', JSON.stringify(loggedInUser));
    loadData(loggedInUser.id);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('cloudops_user');
    setCurrentView('DASHBOARD');
    setTasks([]);
    setKnowledgeItems([]);
  };

  const changeTheme = (theme: ThemeConfig) => {
      setCurrentTheme(theme);
      localStorage.setItem('cloudops_theme_id', theme.id);
      setIsThemeMenuOpen(false);
  };

  // Layout Components
  const SidebarItem: React.FC<{ view: ViewMode; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => {
    const isSelected = currentView === view;
    // Calculate dynamic hover/active styles based on theme brightness could be complex, 
    // so we use semi-transparent white/black overlays.
    return (
      <button
        onClick={() => setCurrentView(view)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 
          ${isSelected 
            ? 'bg-white/20 shadow-sm text-white font-bold backdrop-blur-sm' 
            : `${currentTheme.sidebarTextColor} hover:bg-white/10 hover:text-white`
          }`}
      >
        {icon}
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className="w-64 flex flex-col shadow-xl z-20 transition-all duration-500 ease-in-out"
        style={currentTheme.sidebarStyle}
      >
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg shadow-sm">
            <Cloud size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide text-white">CloudOps</h1>
            <p className="text-xs text-white/60">Mate v1.0</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <SidebarItem view="DASHBOARD" icon={<LayoutDashboard size={20} />} label="대시보드" />
          <SidebarItem view="TASKS" icon={<ListTodo size={20} />} label="업무 관리" />
          <SidebarItem view="SCHEDULE" icon={<CalendarIcon size={20} />} label="일정" />
          <SidebarItem view="MEMO" icon={<StickyNote size={20} />} label="퀵 메모" />
          {/* <SidebarItem view="MAIL" icon={<Mail size={20} />} label="메일함" /> */}
          <SidebarItem view="KNOWLEDGE" icon={<BookOpen size={20} />} label="지식 저장소" />
          <SidebarItem view="AI_CHAT" icon={<Bot size={20} />} label="AI 어시스턴트" />
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <button 
            onClick={handleLogout}
            className={`flex items-center gap-2 transition-colors w-full px-4 py-2 ${currentTheme.sidebarTextColor} hover:text-white hover:bg-white/10 rounded-lg`}
          >
            <LogOut size={18} />
            <span className="text-sm">로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className="flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-500"
        style={currentTheme.mainStyle}
      >
        
        {/* Floating Restore Button (Visible when header is hidden) */}
        {!showHeader && (
          <button
            onClick={() => setShowHeader(true)}
            className="absolute top-4 right-6 z-50 p-2 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md rounded-full text-gray-500 hover:text-blue-600 transition-all hover:scale-110"
            title="상단바 보이기"
          >
            <ChevronDown size={20} />
          </button>
        )}

        {/* Header */}
        {showHeader && (
          <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200/50 h-16 flex items-center justify-between px-8 shadow-sm z-10 transition-all">
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">
              {currentView === 'DASHBOARD' && 'Dashboard'}
              {currentView === 'TASKS' && 'Task Board'}
              {currentView === 'SCHEDULE' && 'Schedule'}
              {currentView === 'MAIL' && 'Mail Inbox'}
              {currentView === 'MEMO' && 'Quick Sticky Notes'}
              {currentView === 'KNOWLEDGE' && 'Knowledge Base'}
              {currentView === 'AI_CHAT' && 'AI Support'}
              {currentView === 'MY_PAGE' && 'My Page'}
            </h2>
            <div className="flex items-center gap-4">
              
              {/* Theme Selector */}
              <div className="relative" ref={themeMenuRef}>
                 <button 
                    onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2"
                    title="테마 변경"
                 >
                     <Palette size={20} />
                 </button>

                 {isThemeMenuOpen && (
                     <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in-up">
                         <div className="px-4 py-2 border-b border-gray-50 mb-1">
                             <span className="text-xs font-bold text-gray-500">테마 선택</span>
                         </div>
                         {THEMES.map(theme => (
                             <button
                                key={theme.id}
                                onClick={() => changeTheme(theme)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between group"
                             >
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="w-4 h-4 rounded-full border border-gray-200"
                                        style={{ background: theme.sidebarStyle.background || theme.sidebarStyle.backgroundColor }}
                                    ></div>
                                    {theme.name}
                                </div>
                                {currentTheme.id === theme.id && <Check size={14} className="text-blue-600" />}
                             </button>
                         ))}
                     </div>
                 )}
              </div>

              <div 
                className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 p-1.5 pr-4 rounded-full transition-colors group"
                onClick={() => setCurrentView('MY_PAGE')}
                title="마이페이지 / 설정"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-slate-600 font-bold overflow-hidden relative">
                  {user.name.charAt(0).toUpperCase()}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <Settings size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>

              <div className="w-px h-6 bg-gray-200 mx-1"></div>

              {/* Header Hide Button */}
              <button
                onClick={() => setShowHeader(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="상단바 숨기기"
              >
                <ChevronUp size={20} />
              </button>
            </div>
          </header>
        )}

        {/* View Content */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 scrollbar-thin scrollbar-thumb-gray-300">
          {currentView === 'DASHBOARD' && <Dashboard tasks={tasks} />}
          {currentView === 'TASKS' && <TaskBoard tasks={tasks} setTasks={setTasks} />}
          {currentView === 'AI_CHAT' && <GeminiChat tasks={tasks} knowledgeItems={knowledgeItems} />}
          {currentView === 'SCHEDULE' && <Schedule tasks={tasks} />}
          {currentView === 'MEMO' && <MemoBoard userId={user.id} />}
          {/* {currentView === 'MAIL' && (
            <MailClient 
              user={user} 
              setTasks={setTasks} 
              mailAccounts={mailAccounts} 
              setMailAccounts={setMailAccounts} 
            />
          )} */}
          {currentView === 'KNOWLEDGE' && <KnowledgeBase items={knowledgeItems} setItems={setKnowledgeItems} />}
          {currentView === 'MY_PAGE' && <MyPage user={user} />}
        </div>
      </main>
    </div>
  );
};

export default App;