import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ListTodo, Calendar as CalendarIcon, Bot, LogOut, Cloud, BookOpen, Settings, Mail } from 'lucide-react';
import { Task, ViewMode, TaskStatus, TaskPriority, KnowledgeItem, User, MailAccount } from './types';
import { Dashboard } from './components/Dashboard';
import { TaskBoard } from './components/TaskBoard';
import { GeminiChat } from './components/GeminiChat';
import { Schedule } from './components/Schedule';
import { KnowledgeBase } from './components/KnowledgeBase';
import { MyPage } from './components/MyPage';
import { MailClient } from './components/MailClient';
import { Auth } from './components/Auth';
import { api } from './services/api';

// Helper to get today's date in YYYY-MM-DD format
const getToday = () => new Date().toISOString().split('T')[0];
const getFutureDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

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
    createdAt: new Date().toISOString()
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
    createdAt: new Date().toISOString()
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
    createdAt: new Date().toISOString()
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
    createdAt: new Date().toISOString()
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
  
  // Mail State (Lifted Up)
  const [mailAccounts, setMailAccounts] = useState<MailAccount[]>([]);

  useEffect(() => {
    // Check local storage for existing session
    const savedUser = localStorage.getItem('cloudops_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      loadData(parsedUser.id);
    }
  }, []);

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
    setMailAccounts([]); // Clear mail session on logout
  };

  // Layout Components
  const SidebarItem: React.FC<{ view: ViewMode; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        currentView === view 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-gray-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-700">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Cloud size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">CloudOps</h1>
            <p className="text-xs text-slate-400">Mate v1.0</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <SidebarItem view="DASHBOARD" icon={<LayoutDashboard size={20} />} label="대시보드" />
          <SidebarItem view="TASKS" icon={<ListTodo size={20} />} label="업무 관리" />
          <SidebarItem view="SCHEDULE" icon={<CalendarIcon size={20} />} label="일정" />
          <SidebarItem view="MAIL" icon={<Mail size={20} />} label="메일함" />
          <SidebarItem view="KNOWLEDGE" icon={<BookOpen size={20} />} label="지식 저장소" />
          <SidebarItem view="AI_CHAT" icon={<Bot size={20} />} label="AI 어시스턴트" />
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-full px-4 py-2"
          >
            <LogOut size={18} />
            <span className="text-sm">로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 shadow-sm z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {currentView === 'DASHBOARD' && 'Dashboard'}
            {currentView === 'TASKS' && 'Task Board'}
            {currentView === 'SCHEDULE' && 'Schedule'}
            {currentView === 'MAIL' && 'Mail Inbox'}
            {currentView === 'KNOWLEDGE' && 'Knowledge Base'}
            {currentView === 'AI_CHAT' && 'AI Support'}
            {currentView === 'MY_PAGE' && 'My Page'}
          </h2>
          <div className="flex items-center gap-4">
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
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-auto bg-gray-50/50 p-2 sm:p-4">
          {currentView === 'DASHBOARD' && <Dashboard tasks={tasks} />}
          {currentView === 'TASKS' && <TaskBoard tasks={tasks} setTasks={setTasks} />}
          {currentView === 'AI_CHAT' && <GeminiChat tasks={tasks} />}
          {currentView === 'SCHEDULE' && <Schedule tasks={tasks} />}
          {currentView === 'MAIL' && (
            <MailClient 
              user={user} 
              setTasks={setTasks} 
              mailAccounts={mailAccounts} 
              setMailAccounts={setMailAccounts} 
            />
          )}
          {currentView === 'KNOWLEDGE' && <KnowledgeBase items={knowledgeItems} setItems={setKnowledgeItems} />}
          {currentView === 'MY_PAGE' && <MyPage user={user} />}
        </div>
      </main>
    </div>
  );
};

export default App;