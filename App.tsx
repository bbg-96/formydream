import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, ListTodo, Calendar as CalendarIcon, Bot, LogOut, Cloud, BookOpen, Settings, StickyNote, ChevronUp, ChevronDown, Palette, Check, Upload, X, Image as ImageIcon, Trash2, Move, Menu, Home, Grid } from 'lucide-react';
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
  
  // View State (Persistent)
  // [수정됨] localStorage에서 저장된 뷰가 있으면 불러오고, 없으면 DASHBOARD를 기본값으로 사용
  const [currentView, setCurrentView] = useState<ViewMode>(() => {
    const savedView = localStorage.getItem('cloudops_active_view');
    return (savedView as ViewMode) || 'DASHBOARD';
  });
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  
  // Header Visibility State (Persistent)
  const [showHeader, setShowHeader] = useState(() => {
    const saved = localStorage.getItem('cloudops_header_visible');
    return saved === null ? true : saved === 'true';
  });
  
  // Theme State
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(THEMES[0]);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  
  // Mobile UX State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true); // New state for nav visibility
  const lastScrollY = useRef(0);

  // Custom Background State
  const [customSidebarImage, setCustomSidebarImage] = useState<string | null>(null);
  const [customMainImage, setCustomMainImage] = useState<string | null>(null);
  
  // Position State for Custom Images
  const [mainImagePos, setMainImagePos] = useState<{x: number, y: number}>({ x: 50, y: 50 });
  const [sidebarImagePos, setSidebarImagePos] = useState<{x: number, y: number}>({ x: 50, y: 50 });

  const sidebarFileRef = useRef<HTMLInputElement>(null);
  const mainFileRef = useRef<HTMLInputElement>(null);

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
    // Load Custom Images
    const savedSidebarBg = localStorage.getItem('cloudops_custom_sidebar_bg');
    if (savedSidebarBg) setCustomSidebarImage(savedSidebarBg);
    
    const savedMainBg = localStorage.getItem('cloudops_custom_main_bg');
    if (savedMainBg) setCustomMainImage(savedMainBg);

    // Load Positions
    const savedMainPos = localStorage.getItem('cloudops_custom_main_pos');
    if (savedMainPos) {
        try { setMainImagePos(JSON.parse(savedMainPos)); } catch(e) {}
    }
    const savedSidebarPos = localStorage.getItem('cloudops_custom_sidebar_pos');
    if (savedSidebarPos) {
        try { setSidebarImagePos(JSON.parse(savedSidebarPos)); } catch(e) {}
    }
  }, []);

  // [수정됨] currentView가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('cloudops_active_view', currentView);
  }, [currentView]);

  // Toggle Header and Save to LocalStorage
  const toggleHeader = (visible: boolean) => {
      setShowHeader(visible);
      localStorage.setItem('cloudops_header_visible', String(visible));
  };

  // Scroll Handler for Mobile Nav
  useEffect(() => {
    const handleScroll = () => {
        if (window.innerWidth >= 768) return; // Mobile only logic
        
        const currentScrollY = window.scrollY;
        
        // Ignore small movements (bounce effect)
        if (Math.abs(currentScrollY - lastScrollY.current) < 10) return;

        // Hide on scroll down, Show on scroll up
        if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
            setIsNavVisible(false);
            setIsMobileMenuOpen(false); // Close menu if open when scrolling down
        } else if (currentScrollY < lastScrollY.current) {
            setIsNavVisible(true);
        }
        lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
    localStorage.removeItem('cloudops_active_view'); // [선택] 로그아웃 시 뷰 설정도 초기화
    setTasks([]);
    setKnowledgeItems([]);
  };

  const changeTheme = (theme: ThemeConfig) => {
      setCurrentTheme(theme);
      localStorage.setItem('cloudops_theme_id', theme.id);
      // setIsThemeMenuOpen(false); // Keep open to adjust custom images
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'SIDEBAR' | 'MAIN') => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 4 * 1024 * 1024) { // 4MB Limit
          alert("이미지 용량이 너무 큽니다. (최대 4MB)");
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
          const base64 = reader.result as string;
          if (type === 'SIDEBAR') {
              setCustomSidebarImage(base64);
              localStorage.setItem('cloudops_custom_sidebar_bg', base64);
          } else {
              setCustomMainImage(base64);
              localStorage.setItem('cloudops_custom_main_bg', base64);
          }
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset input
  };

  const clearCustomImage = (type: 'SIDEBAR' | 'MAIN') => {
      if (type === 'SIDEBAR') {
          setCustomSidebarImage(null);
          localStorage.removeItem('cloudops_custom_sidebar_bg');
      } else {
          setCustomMainImage(null);
          localStorage.removeItem('cloudops_custom_main_bg');
      }
  };

  const handleMainPosChange = (axis: 'x' | 'y', value: number) => {
      const newPos = { ...mainImagePos, [axis]: value };
      setMainImagePos(newPos);
      localStorage.setItem('cloudops_custom_main_pos', JSON.stringify(newPos));
  };

  const handleSidebarPosChange = (axis: 'x' | 'y', value: number) => {
      const newPos = { ...sidebarImagePos, [axis]: value };
      setSidebarImagePos(newPos);
      localStorage.setItem('cloudops_custom_sidebar_pos', JSON.stringify(newPos));
  };

  // Construct Final Styles combining Theme + Custom Images
  const finalSidebarStyle: React.CSSProperties = {
      ...currentTheme.sidebarStyle,
      ...(customSidebarImage ? {
          backgroundImage: `url(${customSidebarImage})`,
          backgroundSize: 'cover',
          backgroundPosition: `${sidebarImagePos.x}% ${sidebarImagePos.y}%`,
          backgroundBlendMode: 'normal', // Ensure image shows normally without heavy blending
      } : {})
  };

  // For readability, if custom image is present on sidebar, force text to white and add overlay
  const finalSidebarTextColor = customSidebarImage ? 'text-white shadow-sm' : currentTheme.sidebarTextColor;
  
  const finalMainStyle: React.CSSProperties = {
      ...currentTheme.mainStyle,
      ...(customMainImage ? {
          backgroundImage: `url(${customMainImage})`,
          backgroundSize: 'cover',
          backgroundPosition: `${mainImagePos.x}% ${mainImagePos.y}%`,
          backgroundAttachment: 'fixed' // Parallax feel
      } : {})
  };


  // Layout Components
  const SidebarItem: React.FC<{ view: ViewMode; icon: React.ReactNode; label: string; onClick?: () => void }> = ({ view, icon, label, onClick }) => {
    const isSelected = currentView === view;
    return (
      <button
        onClick={() => {
            setCurrentView(view);
            if (onClick) onClick();
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 
          ${isSelected 
            ? 'bg-white/20 shadow-sm text-white font-bold backdrop-blur-sm' 
            : `${finalSidebarTextColor} hover:bg-white/10 hover:text-white`
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
    // Changed to min-h-screen for mobile to allow body scroll, h-screen for desktop
    <div className="flex min-h-screen md:h-screen bg-gray-100 md:overflow-hidden font-sans">
      
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside 
        className="hidden md:flex w-64 flex-col shadow-xl z-20 transition-all duration-500 ease-in-out relative"
        style={finalSidebarStyle}
      >
        {/* Dark overlay for readability if custom image exists */}
        {customSidebarImage && (
            <div className="absolute inset-0 bg-black/40 pointer-events-none z-0"></div>
        )}

        <div className="p-6 flex items-center gap-3 border-b border-white/10 relative z-10 justify-between md:justify-start">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg shadow-sm">
                <Cloud size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-wide text-white">CloudOps</h1>
                <p className="text-xs text-white/60">Mate v1.0</p>
              </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4 relative z-10 overflow-y-auto">
          <SidebarItem view="DASHBOARD" icon={<LayoutDashboard size={20} />} label="대시보드" />
          <SidebarItem view="TASKS" icon={<ListTodo size={20} />} label="업무 관리" />
          <SidebarItem view="SCHEDULE" icon={<CalendarIcon size={20} />} label="일정" />
          <SidebarItem view="MEMO" icon={<StickyNote size={20} />} label="퀵 메모" />
          {/* <SidebarItem view="MAIL" icon={<Mail size={20} />} label="메일함" /> */}
          <SidebarItem view="KNOWLEDGE" icon={<BookOpen size={20} />} label="지식 저장소" />
          <SidebarItem view="AI_CHAT" icon={<Bot size={20} />} label="AI 어시스턴트" />
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2 relative z-10">
          <button 
            onClick={handleLogout}
            className={`flex items-center gap-2 transition-colors w-full px-4 py-2 ${finalSidebarTextColor} hover:text-white hover:bg-white/10 rounded-lg`}
          >
            <LogOut size={18} />
            <span className="text-sm">로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        // Changed overflow handling for mobile: Allow body scroll
        className="flex-1 flex flex-col min-w-0 md:overflow-hidden relative transition-all duration-500 w-full pb-16 md:pb-0"
        style={finalMainStyle}
      >
        
        {/* Floating Restore Button (Centered Top Tab) - Fixed position to avoid overlap with right-side buttons */}
        {!showHeader && (
          <button
            onClick={() => toggleHeader(true)}
            className="hidden md:flex absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-white/80 hover:bg-white backdrop-blur-sm border-x border-b border-gray-200 shadow-sm rounded-b-xl px-4 py-1.5 text-gray-400 hover:text-blue-600 transition-all duration-300 items-center gap-1.5 group"
            title="상단바 보이기"
          >
            <span className="text-[10px] font-semibold opacity-0 group-hover:opacity-100 -ml-4 group-hover:ml-0 transition-all duration-300">Show Header</span>
            <ChevronDown size={16} />
          </button>
        )}

        {/* Header - Hidden on Mobile */}
        {showHeader && (
          <header className="hidden md:flex bg-white/90 backdrop-blur-sm border-b border-gray-200/50 h-16 items-center justify-between px-4 sm:px-8 shadow-sm z-10 transition-all">
            <div className="flex items-center gap-3">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight truncate">
                {currentView === 'DASHBOARD' && 'Dashboard'}
                {currentView === 'TASKS' && 'Task Board'}
                {currentView === 'SCHEDULE' && 'Schedule'}
                {currentView === 'MAIL' && 'Mail Inbox'}
                {currentView === 'MEMO' && 'Quick Sticky Notes'}
                {currentView === 'KNOWLEDGE' && 'Knowledge Base'}
                {currentView === 'AI_CHAT' && 'AI Support'}
                {currentView === 'MY_PAGE' && 'My Page'}
                </h2>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              
              {/* Theme Selector */}
              <div className="relative" ref={themeMenuRef}>
                 <button 
                    onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2"
                    title="테마 및 배경 설정"
                 >
                     <Palette size={20} />
                 </button>

                 {isThemeMenuOpen && (
                     <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in-up">
                         {/* Default Themes */}
                         <div className="px-4 py-2 border-b border-gray-50 mb-1">
                             <span className="text-xs font-bold text-gray-500 uppercase">기본 테마 선택</span>
                         </div>
                         <div className="max-h-48 overflow-y-auto scrollbar-thin">
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

                         {/* Custom Backgrounds */}
                         <div className="px-4 py-2 border-t border-b border-gray-50 my-1 bg-gray-50/50">
                             <span className="text-xs font-bold text-gray-500 uppercase">커스텀 배경 설정</span>
                         </div>
                         <div className="p-3 space-y-4 max-h-64 overflow-y-auto">
                             {/* Sidebar Custom */}
                             <div>
                                 <div className="flex justify-between items-center mb-1">
                                     <span className="text-xs text-gray-600 flex items-center gap-1"><ImageIcon size={12}/> 사이드바 배경</span>
                                     {customSidebarImage && (
                                         <button onClick={() => clearCustomImage('SIDEBAR')} className="text-red-500 text-[10px] hover:underline flex items-center">
                                             <X size={10} /> 삭제
                                         </button>
                                     )}
                                 </div>
                                 <div className="flex items-center gap-2 mb-2">
                                     <button 
                                        onClick={() => sidebarFileRef.current?.click()}
                                        className="flex-1 border border-dashed border-gray-300 rounded-md p-1.5 text-xs text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors text-center"
                                     >
                                         {customSidebarImage ? '이미지 변경' : '이미지 업로드'}
                                     </button>
                                     <input type="file" ref={sidebarFileRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'SIDEBAR')} />
                                 </div>
                                 {/* Sidebar Position Controls */}
                                 {customSidebarImage && (
                                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                            <Move size={10} /> <span>위치 조절 ({sidebarImagePos.x}%, {sidebarImagePos.y}%)</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400 w-3">X</span>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max="100" 
                                                    value={sidebarImagePos.x}
                                                    onChange={(e) => handleSidebarPosChange('x', parseInt(e.target.value))}
                                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400 w-3">Y</span>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max="100" 
                                                    value={sidebarImagePos.y}
                                                    onChange={(e) => handleSidebarPosChange('y', parseInt(e.target.value))}
                                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                 )}
                             </div>

                             {/* Main Content Custom */}
                             <div>
                                 <div className="flex justify-between items-center mb-1">
                                     <span className="text-xs text-gray-600 flex items-center gap-1"><ImageIcon size={12}/> 메인 화면 배경</span>
                                     {customMainImage && (
                                         <button onClick={() => clearCustomImage('MAIN')} className="text-red-500 text-[10px] hover:underline flex items-center">
                                             <X size={10} /> 삭제
                                         </button>
                                     )}
                                 </div>
                                 <div className="flex items-center gap-2 mb-2">
                                     <button 
                                        onClick={() => mainFileRef.current?.click()}
                                        className="flex-1 border border-dashed border-gray-300 rounded-md p-1.5 text-xs text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors text-center"
                                     >
                                         {customMainImage ? '이미지 변경' : '이미지 업로드'}
                                     </button>
                                     <input type="file" ref={mainFileRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'MAIN')} />
                                 </div>
                                 
                                 {/* Main Position Controls */}
                                 {customMainImage && (
                                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                            <Move size={10} /> <span>위치 조절 ({mainImagePos.x}%, {mainImagePos.y}%)</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400 w-3">X</span>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max="100" 
                                                    value={mainImagePos.x}
                                                    onChange={(e) => handleMainPosChange('x', parseInt(e.target.value))}
                                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400 w-3">Y</span>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max="100" 
                                                    value={mainImagePos.y}
                                                    onChange={(e) => handleMainPosChange('y', parseInt(e.target.value))}
                                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                 )}
                             </div>
                         </div>
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

              <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>

              {/* Header Hide Button */}
              <button
                onClick={() => toggleHeader(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors hidden sm:block"
                title="상단바 숨기기"
              >
                <ChevronUp size={20} />
              </button>
            </div>
          </header>
        )}

        {/* View Content */}
        {/* Changed overflow handling for mobile: Allow body scroll by removing md:overflow-auto on mobile */}
        {/* Added conditional padding removal for AI_CHAT to enable full layout */}
        <div className={`flex-1 md:overflow-auto ${currentView === 'AI_CHAT' ? 'p-0' : 'p-2 sm:p-4'} scrollbar-thin scrollbar-thumb-gray-300 ${customMainImage ? 'bg-white/80 backdrop-blur-sm rounded-tl-2xl mt-2 ml-2 shadow-inner' : ''}`}>
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

      {/* Mobile Bottom Navigation */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-30 px-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-transform duration-300 ${isNavVisible ? 'translate-y-0' : 'translate-y-full'}`}>
         <button onClick={() => setCurrentView('DASHBOARD')} className={`flex flex-col items-center p-2 w-16 ${currentView === 'DASHBOARD' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
           <Home size={22} strokeWidth={currentView === 'DASHBOARD' ? 2.5 : 2} />
           <span className="text-[10px] mt-1 font-medium">홈</span>
         </button>
         <button onClick={() => setCurrentView('TASKS')} className={`flex flex-col items-center p-2 w-16 ${currentView === 'TASKS' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
           <ListTodo size={22} strokeWidth={currentView === 'TASKS' ? 2.5 : 2} />
           <span className="text-[10px] mt-1 font-medium">업무</span>
         </button>
         <button onClick={() => setCurrentView('AI_CHAT')} className={`flex flex-col items-center p-2 w-16 ${currentView === 'AI_CHAT' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
           <Bot size={22} strokeWidth={currentView === 'AI_CHAT' ? 2.5 : 2} />
           <span className="text-[10px] mt-1 font-medium">AI</span>
         </button>
         <button onClick={() => setCurrentView('SCHEDULE')} className={`flex flex-col items-center p-2 w-16 ${currentView === 'SCHEDULE' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
           <CalendarIcon size={22} strokeWidth={currentView === 'SCHEDULE' ? 2.5 : 2} />
           <span className="text-[10px] mt-1 font-medium">일정</span>
         </button>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`flex flex-col items-center p-2 w-16 ${isMobileMenuOpen ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
           <Menu size={22} />
           <span className="text-[10px] mt-1 font-medium">전체</span>
         </button>
      </nav>

      {/* Mobile Bottom Sheet Menu (Replaces Full Screen Overlay) */}
      {isMobileMenuOpen && (
        <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>

            {/* Bottom Sheet Menu */}
            <div className={`fixed left-0 right-0 z-50 bg-white rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-gray-100 p-6 md:hidden animate-fade-in-up transition-all duration-300 ${isNavVisible ? 'bottom-16' : 'bottom-0'}`}>
               <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>

               {/* User Profile Summary */}
               <div className="flex items-center gap-3 mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100 active:bg-gray-100" onClick={() => { setCurrentView('MY_PAGE'); setIsMobileMenuOpen(false); }}>
                   <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                       {user.name.charAt(0).toUpperCase()}
                   </div>
                   <div className="flex-1">
                       <h3 className="text-sm font-bold text-gray-800">{user.name}</h3>
                       <p className="text-xs text-gray-500">{user.email}</p>
                   </div>
                   <Settings size={16} className="text-gray-400" />
               </div>

               {/* Icon Grid */}
               <div className="grid grid-cols-4 gap-2">
                  <button 
                    onClick={() => { setCurrentView('MEMO'); setIsMobileMenuOpen(false); }} 
                    className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                     <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center text-yellow-600 shadow-sm">
                        <StickyNote size={24} />
                     </div>
                     <span className="text-xs font-medium text-gray-600">메모</span>
                  </button>

                  <button 
                    onClick={() => { setCurrentView('KNOWLEDGE'); setIsMobileMenuOpen(false); }} 
                    className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                     <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 shadow-sm">
                        <BookOpen size={24} />
                     </div>
                     <span className="text-xs font-medium text-gray-600">지식</span>
                  </button>

                  <button 
                    onClick={() => { setCurrentView('MY_PAGE'); setIsMobileMenuOpen(false); }} 
                    className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                     <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-600 shadow-sm">
                        <Settings size={24} />
                     </div>
                     <span className="text-xs font-medium text-gray-600">설정</span>
                  </button>

                  <button 
                    onClick={handleLogout} 
                    className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                     <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-sm">
                        <LogOut size={24} />
                     </div>
                     <span className="text-xs font-medium text-gray-600">로그아웃</span>
                  </button>
               </div>
            </div>
        </>
      )}

    </div>
  );
};

export default App;